<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

afterEach(fn () => app(TenantManager::class)->forget());

/**
 * @param  array<int, string>  $names
 * @return array{tenant: Tenant, plain: string, branch: Branch, category: Category}
 */
function makeSearchWorld(string $slug, array $names = []): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    $world = app(TenantManager::class)->runAs($tenant, function () use ($tenant) {
        return [
            'tenant' => $tenant,
            'plain' => TenantApiKey::generate($tenant, 'reader')['plainTextKey'],
            'branch' => Branch::factory()->create(),
            'category' => Category::factory()->create(),
        ];
    });

    foreach ($names as $name) {
        searchProduct($world, $name);
    }

    return $world;
}

function searchProduct(array $world, string $name, array $attributes = []): Product
{
    return app(TenantManager::class)->runAs($world['tenant'], fn () => Product::factory()->create(array_merge([
        'branch_id' => $world['branch']->id,
        'category_id' => $world['category']->id,
        'name' => $name,
        'show_in_storefront' => true,
        'status' => true,
    ], $attributes)));
}

/** @return array<int, string> */
function searchNames(array $world, string $query): array
{
    return collect(test()->withHeader('Authorization', 'Bearer '.$world['plain'])->getJson('/api/v1/store/products?'.$query)->assertOk()->json('data'))
        ->pluck('name')->sort()->values()->all();
}

it('finds products with ?search, ignoring case', function () {
    $w = makeSearchWorld('search-basic', ['Brazalete dorado', 'Collar de perlas', 'BRAZALETE plata']);

    expect(searchNames($w, 'search=brazalete'))->toBe(['BRAZALETE plata', 'Brazalete dorado'])
        ->and(searchNames($w, 'search=DORADO'))->toBe(['Brazalete dorado'])
        ->and(searchNames($w, 'search=perl'))->toBe(['Collar de perlas'])
        ->and(searchNames($w, 'search=zzz'))->toBe([]);
});

it('keeps ?q working exactly as before', function () {
    $w = makeSearchWorld('search-q', ['Brazalete dorado', 'Collar de perlas']);

    expect(searchNames($w, 'q=collar'))->toBe(['Collar de perlas'])
        ->and(searchNames($w, 'q='.str_repeat('a', 100)))->toBe([]);

    $this->withHeader('Authorization', 'Bearer '.$w['plain'])->getJson('/api/v1/store/products?q='.str_repeat('a', 101))->assertUnprocessable();
});

it('limits ?search to 80 characters', function () {
    $w = makeSearchWorld('search-limit', ['Brazalete']);

    $this->withHeader('Authorization', 'Bearer '.$w['plain'])->getJson('/api/v1/store/products?search='.str_repeat('a', 80))->assertOk();
    $this->withHeader('Authorization', 'Bearer '.$w['plain'])->getJson('/api/v1/store/products?search='.str_repeat('a', 81))
        ->assertUnprocessable()->assertJsonValidationErrors('search');
});

it('prefers ?search over ?q when both are sent', function () {
    $w = makeSearchWorld('search-both', ['Brazalete dorado', 'Collar de perlas']);

    expect(searchNames($w, 'search=collar&q=brazalete'))->toBe(['Collar de perlas']);
});

it('MySQL: treats LIKE wildcards in the term literally', function () {
    $w = makeSearchWorld('search-wild', ['Oferta 50% off', 'Oferta 50 pesos', 'Aro_pequeño', 'Aro grande']);

    expect(searchNames($w, 'search='.urlencode('50%')))->toBe(['Oferta 50% off'])
        ->and(searchNames($w, 'search='.urlencode('aro_')))->toBe(['Aro_pequeño'])
        ->and(searchNames($w, 'search='.urlencode('%')))->toBe(['Oferta 50% off']);
})->skip(fn () => DB::connection()->getDriverName() !== 'mysql', 'SQLite has no default LIKE escape character');

it('only returns products that are visible in the storefront', function () {
    $w = makeSearchWorld('search-visible', ['Brazalete visible']);
    searchProduct($w, 'Brazalete oculto', ['show_in_storefront' => false]);
    searchProduct($w, 'Brazalete inactivo', ['status' => false]);
    app(TenantManager::class)->runAs($w['tenant'], fn () => searchProduct($w, 'Brazalete borrado')->delete());

    expect(searchNames($w, 'search=brazalete'))->toBe(['Brazalete visible']);
});

it('never finds products of another business', function () {
    $a = makeSearchWorld('search-iso-a', ['Brazalete A']);
    $b = makeSearchWorld('search-iso-b', ['Brazalete B']);

    expect(searchNames($a, 'search=brazalete'))->toBe(['Brazalete A'])
        ->and(searchNames($b, 'search=brazalete'))->toBe(['Brazalete B']);
});

/*
 * The next tests depend on the database's text comparison, which SQLite (the
 * default for this suite) does not do. Run them against MySQL with, e.g.:
 *   DB_CONNECTION=mysql DB_DATABASE=<a scratch database> php artisan test --filter=MySQL
 * NEVER point that at a database with data you want to keep: RefreshDatabase wipes it.
 */
it('MySQL: ignores accents and case in both directions', function () {
    $w = makeSearchWorld('search-accents', ['Brazaléte dorado', 'BRAZALETE plata', 'brazalete negro', 'Piñata de fiesta', 'Camión']);

    expect(searchNames($w, 'search=brazalete'))->toBe(['BRAZALETE plata', 'Brazaléte dorado', 'brazalete negro'])
        ->and(searchNames($w, 'search='.urlencode('Brazaléte')))->toBe(['BRAZALETE plata', 'Brazaléte dorado', 'brazalete negro'])
        ->and(searchNames($w, 'search='.urlencode('BRAZALÉTE')))->toBe(['BRAZALETE plata', 'Brazaléte dorado', 'brazalete negro'])
        ->and(searchNames($w, 'search=pinata'))->toBe(['Piñata de fiesta'])
        ->and(searchNames($w, 'search='.urlencode('camion')))->toBe(['Camión']);
})->skip(fn () => DB::connection()->getDriverName() !== 'mysql', 'Needs MySQL');

it('MySQL: stays insensitive even if the column was created with a case-sensitive collation', function () {
    $w = makeSearchWorld('search-binary', ['Brazaléte dorado']);
    DB::statement('ALTER TABLE products MODIFY name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL');

    expect(searchNames($w, 'search=BRAZALETE'))->toBe(['Brazaléte dorado']);
})->skip(fn () => DB::connection()->getDriverName() !== 'mysql', 'Needs MySQL');

it('MySQL: answers a search over 1,000 products in under 300 ms', function () {
    $w = makeSearchWorld('search-perf');
    $now = now();

    foreach (array_chunk(range(1, 1000), 250) as $chunk) {
        DB::table('products')->insert(array_map(fn (int $i) => [
            'tenant_id' => $w['tenant']->id,
            'branch_id' => $w['branch']->id,
            'category_id' => $w['category']->id,
            'code' => "P-{$i}",
            'name' => $i % 10 === 0 ? "Brazaléte número {$i}" : "Artículo de bisutería {$i}",
            'slug' => "producto-{$i}",
            'sale_price' => 10000,
            'purchase_price' => 5000,
            'tax' => 0,
            'stock' => 5,
            'reserved_stock' => 0,
            'min_stock' => 1,
            'status' => true,
            'show_in_storefront' => true,
            'type' => 'producto',
            'created_at' => $now,
            'updated_at' => $now,
        ], $chunk));
    }

    $timings = [];
    foreach (range(1, 7) as $run) {
        $start = hrtime(true);
        $count = count(test()->withHeader('Authorization', 'Bearer '.$w['plain'])->getJson('/api/v1/store/products?search=BRAZALETE&per_page=100')->assertOk()->json('data'));
        $timings[] = (hrtime(true) - $start) / 1e6;
        expect($count)->toBe(100);
    }

    sort($timings);
    $median = $timings[3];
    fwrite(STDERR, sprintf("\n[R9] search over 1000 products: median %.1f ms, worst %.1f ms (7 runs)\n", $median, end($timings)));

    expect($median)->toBeLessThan(300);
})->skip(fn () => DB::connection()->getDriverName() !== 'mysql', 'Needs MySQL');
