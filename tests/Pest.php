<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Models\User;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

uses(Tests\TestCase::class)->in('Feature', 'Unit');
uses(RefreshDatabase::class)->in('Feature');

/*
 * The suite runs on SQLite while production is MySQL. The period reports group by
 * MySQL's DATE_FORMAT, so emulate the few formats the app uses; otherwise those
 * queries cannot run in tests at all.
 */
uses()->beforeEach(function () {
    $connection = DB::connection();

    if ($connection->getDriverName() !== 'sqlite') {
        return;
    }

    $connection->getPdo()->sqliteCreateFunction('DATE_FORMAT', function (?string $date, string $format): ?string {
        if ($date === null) {
            return null;
        }

        return date(strtr($format, ['%Y' => 'Y', '%m' => 'm', '%d' => 'd', '%u' => 'W']), strtotime($date));
    }, 2);
})->in('Feature');

function adminUser(?Branch $branch = null): User
{
    $branch ??= Branch::factory()->create();

    return User::factory()->create([
        'role' => 'administrador',
        'branch_id' => $branch->id,
        'status' => true,
    ]);
}

function managerUser(?Branch $branch = null): User
{
    $branch ??= Branch::factory()->create();

    return User::factory()->create([
        'role' => 'encargado',
        'branch_id' => $branch->id,
        'status' => true,
    ]);
}

function vendedorUser(?Branch $branch = null): User
{
    $branch ??= Branch::factory()->create();

    return User::factory()->create([
        'role' => 'vendedor',
        'branch_id' => $branch->id,
        'status' => true,
    ]);
}

// ─── Public storefront API (api/v1/store) helpers ───────────────────────────

/**
 * Every image_url the tests below expect to be ACCEPTED must have a
 * matching Http::fake() entry returning 200 to a HEAD request —
 * ExistingHttpsBlobUrl (app/Rules/ExistingHttpsBlobUrl.php) verifies the
 * URL is actually reachable before saving it. Http::fake() with no
 * matching URL pattern 404s by default, which is also exactly what a test
 * asserting rejection wants — no explicit fake needed for those.
 */
function fakeReachableImageUrl(string $url): void
{
    Http::fake([$url => Http::response('', 200)]);
}

/**
 * Mirrors tests/Feature/Tenancy/TenantIsolationTest.php's makeTenantWorld(),
 * but for the public storefront API: builds a tenant with one product
 * curated for the storefront (show_in_storefront=true, so it gets a slug)
 * and one that deliberately isn't, plus a live API key for that tenant.
 *
 * $canManageMedia and $canGenerateOrderReferences default to false to
 * match a real freshly-issued key's defaults — tests exercising either
 * write surface must opt in explicitly, same as a SuperAdmin checking the
 * corresponding box in the panel.
 *
 * @return array{tenant: Tenant, apiKey: TenantApiKey, plainKey: string, visibleProduct: Product, hiddenProduct: Product}
 */
function makeStoreWorld(string $slug, bool $canManageMedia = false, bool $canGenerateOrderReferences = false): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    return app(TenantManager::class)->runAs($tenant, function () use ($tenant, $slug, $canManageMedia, $canGenerateOrderReferences) {
        $branch = Branch::factory()->create();
        $category = Category::factory()->create();

        $visibleProduct = Product::factory()->create([
            'branch_id' => $branch->id,
            'category_id' => $category->id,
            'code' => 'PUB-'.strtoupper($slug),
            'name' => 'Producto público '.$slug,
            'show_in_storefront' => true,
            'status' => true,
            'stock' => 10,
        ]);

        $hiddenProduct = Product::factory()->create([
            'branch_id' => $branch->id,
            'category_id' => $category->id,
            'code' => 'PRIV-'.strtoupper($slug),
            'show_in_storefront' => false,
            'status' => true,
        ]);

        $generated = TenantApiKey::generate($tenant, 'test key', null, $canManageMedia, $canGenerateOrderReferences);

        return [
            'tenant' => $tenant,
            'apiKey' => $generated['key'],
            'plainKey' => $generated['plainTextKey'],
            'visibleProduct' => $visibleProduct,
            'hiddenProduct' => $hiddenProduct,
        ];
    });
}
