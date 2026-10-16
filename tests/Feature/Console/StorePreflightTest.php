<?php

use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Console\Output\BufferedOutput;

uses(RefreshDatabase::class);

afterEach(fn () => app(TenantManager::class)->forget());

/**
 * @return array{output: string, exit: int}
 */
function runPreflight(array $options = []): array
{
    $buffer = new BufferedOutput;
    $exit = Artisan::call('store:preflight', $options, $buffer);

    return ['output' => $buffer->fetch(), 'exit' => $exit];
}

/** Makes every check pass that does not depend on the database engine. */
function healthyEnvironment(): void
{
    config([
        'app.env' => 'production',
        'app.debug' => false,
        'cache.default' => 'database',
        'cache.limiter' => null,
    ]);
}

it('prints a PREFLIGHT ATENCION verdict with exit code 1 when APP_DEBUG is on', function () {
    Tenant::create(['name' => 'Lu', 'slug' => 'luaccesorios', 'status' => 'active']);
    healthyEnvironment();
    config(['app.debug' => true]);

    $result = runPreflight();

    expect($result['exit'])->toBe(1)
        ->and($result['output'])->toContain('APP_DEBUG: true')
        ->and($result['output'])->toContain('PREFLIGHT ATENCION:')
        ->and($result['output'])->toContain('APP_DEBUG está en true');
});

it('flags an environment that is not production', function () {
    healthyEnvironment();
    config(['app.env' => 'local']);

    expect(runPreflight()['output'])->toContain('APP_ENV es "local"');
});

it('flags a cache that is not shared between replicas', function (string $driver) {
    healthyEnvironment();
    config(['cache.default' => $driver, 'cache.stores.'.$driver.'.driver' => $driver]);

    $output = runPreflight()['output'];

    expect($output)->toContain('Compartido entre réplicas: NO')
        ->and($output)->toContain("el caché \"{$driver}\" no es compartido");
})->with(['array', 'file']);

it('accepts a shared cache driver', function () {
    healthyEnvironment();

    $output = runPreflight()['output'];

    expect($output)->toContain('Compartido entre réplicas: sí')->and($output)->not->toContain('no es compartido');
});

it('flags a missing business slug and accepts the one passed with --tenant', function () {
    healthyEnvironment();
    Tenant::create(['name' => 'Otro', 'slug' => 'otro-negocio', 'status' => 'active']);

    expect(runPreflight()['output'])->toContain('no existe el negocio con slug "lu-accesorios" ni "luaccesorios"')
        ->and(runPreflight(['--tenant' => 'otro-negocio'])['output'])->not->toContain('no existe el negocio');
});

it('accepts either spelling of the Lu business by default: lu-accesorios in production, luaccesorios locally', function (string $slug) {
    healthyEnvironment();
    Tenant::create(['name' => 'Lu', 'slug' => $slug, 'status' => 'active']);

    expect(runPreflight()['output'])->not->toContain('no existe el negocio');
})->with(['production' => 'lu-accesorios', 'local' => 'luaccesorios']);

it('lists businesses and counts their active keys by profile, without printing any key', function () {
    healthyEnvironment();
    $tenant = Tenant::create(['name' => 'Lu', 'slug' => 'luaccesorios', 'status' => 'active']);
    $other = Tenant::create(['name' => 'Otro', 'slug' => 'otro', 'status' => 'active']);
    // (the migrations already create the platform's own "stokity" business, hence 3)

    $secrets = [
        TenantApiKey::generate($tenant, 'lu-lectura', null, false, false, 300, true),
        TenantApiKey::generate($tenant, 'lu-admin', null, true, false, 120, true),
        TenantApiKey::generate($tenant, 'lu-pedidos', null, false, true, 30, false),
        TenantApiKey::generate($tenant, 'vieja', null, true, true),
        TenantApiKey::generate($tenant, 'revocada', null, false, false),
        TenantApiKey::generate($other, 'otro-lectura'),
    ];
    $secrets[4]['key']->revoke();

    $output = runPreflight()['output'];

    expect($output)->toContain('Negocios: 3')
        ->and($output)->toContain('#'.$tenant->id.' luaccesorios (active)')
        ->and($output)->toContain('llaves activas: 4 (lectura 1 · administración 1 · solo pedidos 1 · mixta/antigua 1) · revocadas: 1')
        ->and($output)->toContain('«lu-pedidos» → solo pedidos, 30/min')
        ->and($output)->toContain('«vieja» → mixta/antigua, 60/min')
        ->and($output)->toContain('llaves activas: 1 (lectura 1');

    foreach ($secrets as $generated) {
        expect($output)->not->toContain($generated['plainTextKey'])
            ->and($output)->not->toContain($generated['key']->hashed_key)
            ->and($output)->not->toContain($generated['key']->key_prefix);
    }
});

it('never prints the app key or database credentials', function () {
    healthyEnvironment();
    config([
        'database.connections.'.config('database.default').'.password' => 'S3CRET-DB-PASS',
        'database.connections.'.config('database.default').'.username' => 'secret-db-user',
    ]);

    $output = runPreflight()['output'];

    expect($output)->not->toContain((string) config('app.key'))
        ->and($output)->not->toContain('S3CRET-DB-PASS')
        ->and($output)->not->toContain('secret-db-user');
});

it('reports pending migrations as information, and as a problem only with --expect-migrated', function () {
    healthyEnvironment();
    DB::table('migrations')->where('migration', 'like', '%add_slug_to_categories%')->delete();

    $plain = runPreflight();
    $strict = runPreflight(['--expect-migrated' => true]);

    expect($plain['output'])->toContain('Pendientes: 1')
        ->and($plain['output'])->toContain('pendiente: 2026_10_16_144751_add_slug_to_categories_table')
        ->and($plain['output'])->not->toContain('migraciones pendientes')
        ->and($strict['output'])->toContain('1 migraciones pendientes');
});

it('does not write anything to the database', function () {
    healthyEnvironment();
    $tenant = Tenant::create(['name' => 'Lu', 'slug' => 'luaccesorios', 'status' => 'active']);
    TenantApiKey::generate($tenant, 'lu-lectura');

    DB::enableQueryLog();
    runPreflight();
    $statements = collect(DB::getQueryLog())->pluck('query')->map(fn ($q) => strtolower(ltrim($q)));
    DB::disableQueryLog();

    expect($statements->filter(fn ($q) => preg_match('/^(insert|update|delete|replace|alter|create|drop|truncate)\b/', $q)))->toBeEmpty();
});

it('flags a database that is not MySQL', function () {
    healthyEnvironment();

    $output = runPreflight()['output'];

    DB::connection()->getDriverName() === 'mysql'
        ? expect($output)->not->toContain('no MySQL')
        : expect($output)->toContain('no MySQL');
});

it('MySQL: ends with PREFLIGHT OK and exit 0 on a healthy production-like setup', function () {
    healthyEnvironment();
    Tenant::create(['name' => 'Lu', 'slug' => 'luaccesorios', 'status' => 'active']);

    $result = runPreflight(['--expect-migrated' => true]);

    expect($result['exit'])->toBe(0)
        ->and(trim($result['output']))->toEndWith('PREFLIGHT OK')
        ->and($result['output'])->toContain('Versión: ')
        ->and($result['output'])->toContain('Collation de products.name: ');
})->skip(fn () => DB::connection()->getDriverName() !== 'mysql', 'Needs MySQL');
