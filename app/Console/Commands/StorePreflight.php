<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\TenantApiKey;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * READ-ONLY health check of an environment before (or after) deploying the
 * storefront API. Prints what it finds — never a secret: no APP_KEY, no
 * database credentials, no API keys or their hashes or prefixes — and ends
 * with exactly one verdict line: `PREFLIGHT OK` or `PREFLIGHT ATENCION: …`.
 * Exit code 0 on OK, 1 on ATENCION.
 */
class StorePreflight extends Command
{
    /** Cache drivers whose data is visible to every app instance. */
    /** Production calls Lu's business `lu-accesorios`; local databases use `luaccesorios`. */
    private const DEFAULT_TENANT_SLUGS = ['lu-accesorios', 'luaccesorios'];

    private const SHARED_CACHE_DRIVERS = ['database', 'redis', 'memcached', 'dynamodb', 'mongodb'];

    protected $signature = 'store:preflight
                            {--tenant= : Slug of the business that must exist (default: lu-accesorios or luaccesorios)}
                            {--expect-migrated : Treat pending migrations as a problem (use after deploying)}';

    protected $description = 'Read-only environment check for the storefront API (prints PREFLIGHT OK or PREFLIGHT ATENCION)';

    /** @var list<string> */
    private array $problems = [];

    public function handle(): int
    {
        $this->problems = [];

        $this->section('Aplicación');
        $this->checkApplication();

        $this->section('Caché y límites de peticiones');
        $this->checkCache();

        $this->section('Base de datos');
        $databaseReachable = $this->checkDatabase();

        if ($databaseReachable) {
            $this->section('Migraciones');
            $this->checkMigrations();

            $this->section('Negocios y llaves');
            $this->checkTenants((string) $this->option('tenant'));
        }

        $this->newLine();

        if ($this->problems === []) {
            $this->info('PREFLIGHT OK');

            return self::SUCCESS;
        }

        $this->error('PREFLIGHT ATENCION: '.implode('; ', $this->problems));

        return self::FAILURE;
    }

    private function checkApplication(): void
    {
        $this->line('Entorno (APP_ENV): '.config('app.env'));
        $this->line('Versión de la aplicación: '.config('app.version'));
        $this->line('Zona horaria: '.config('app.timezone'));
        $this->line('APP_DEBUG: '.(config('app.debug') ? 'true' : 'false'));
        $this->line('PHP: '.PHP_VERSION);

        if (config('app.env') !== 'production') {
            $this->problems[] = 'APP_ENV es "'.config('app.env').'", no "production"';
        }

        if (config('app.debug')) {
            $this->problems[] = 'APP_DEBUG está en true (los errores JSON exponen el trazado de la excepción)';
        }
    }

    private function checkCache(): void
    {
        $storeName = config('cache.limiter') ?: config('cache.default');
        $driver = (string) config("cache.stores.{$storeName}.driver", $storeName);
        $shared = in_array($driver, self::SHARED_CACHE_DRIVERS, true);

        $this->line("Caché del limitador: {$storeName} (driver {$driver})");
        $this->line('Compartido entre réplicas: '.($shared ? 'sí' : 'NO'));
        $this->line('Réplicas del servicio: no se pueden saber desde aquí; confírmalas en Railway');

        if (! $shared) {
            $this->problems[] = "el caché \"{$driver}\" no es compartido entre réplicas: los límites de peticiones se contarían por instancia";
        }

        try {
            Cache::store($storeName)->get('store-preflight-probe');
            $this->line('Lectura del caché: ok');
        } catch (Throwable $e) {
            $this->line('Lectura del caché: ERROR ('.class_basename($e).')');
            $this->problems[] = 'el caché del limitador no responde';
        }
    }

    private function checkDatabase(): bool
    {
        $connection = DB::connection();
        $driver = $connection->getDriverName();

        $this->line('Driver: '.$driver);

        try {
            $connection->select('select 1');
        } catch (Throwable $e) {
            $this->line('Conexión: ERROR ('.class_basename($e).')');
            $this->problems[] = 'no se pudo conectar a la base de datos';

            return false;
        }

        $this->line('Conexión: ok');

        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            $this->problems[] = "la base es \"{$driver}\", no MySQL (la búsqueda sin tildes y la concurrencia se probaron en MySQL)";

            return true;
        }

        $version = (string) $connection->selectOne('select version() as v')->v;
        $settings = $connection->selectOne('select @@character_set_database as charset, @@collation_database as db_collation, @@collation_connection as conn_collation');

        $this->line('Versión: '.$version);
        $this->line('Charset de la base: '.$settings->charset);
        $this->line('Collation de la base: '.$settings->db_collation);
        $this->line('Collation de la conexión: '.$settings->conn_collation);

        $productsCollation = $connection->selectOne(
            'select collation_name as c from information_schema.columns where table_schema = database() and table_name = ? and column_name = ?',
            ['products', 'name'],
        )->c ?? null;
        $this->line('Collation de products.name: '.($productsCollation ?? 'desconocida'));

        if (version_compare($version, '8.0', '<')) {
            $this->problems[] = "MySQL {$version} es anterior a 8.0";
        }

        if ($settings->charset !== 'utf8mb4') {
            $this->problems[] = "el charset de la base es {$settings->charset}, se esperaba utf8mb4";
        }

        return true;
    }

    private function checkMigrations(): void
    {
        $migrator = app('migrator');
        $repository = $migrator->getRepository();

        $files = array_keys($migrator->getMigrationFiles($migrator->paths() + [database_path('migrations')]));
        $ran = $repository->repositoryExists() ? $repository->getRan() : [];
        $pending = array_values(array_diff($files, $ran));

        $this->line('Aplicadas: '.count($ran).' · Pendientes: '.count($pending));

        foreach ($pending as $name) {
            $this->line("  pendiente: {$name}");
        }

        if ($pending !== [] && $this->option('expect-migrated')) {
            $this->problems[] = count($pending).' migraciones pendientes (se esperaban todas aplicadas)';
        }
    }

    private function checkTenants(string $requiredSlug): void
    {
        $tenants = Tenant::query()->orderBy('id')->get(['id', 'slug', 'status']);

        $this->line('Negocios: '.$tenants->count());

        foreach ($tenants as $tenant) {
            $this->line("  #{$tenant->id} {$tenant->slug} ({$tenant->status})");
            $this->describeKeys($tenant->id);
        }

        $accepted = $requiredSlug !== '' ? [$requiredSlug] : self::DEFAULT_TENANT_SLUGS;

        if ($tenants->whereIn('slug', $accepted)->isEmpty()) {
            $this->problems[] = 'no existe el negocio con slug "'.implode('" ni "', $accepted).'"';
        }
    }

    /**
     * Counts a tenant's keys by profile without ever reading a key's secret
     * material. Works before the newest columns exist (a pre-deploy run).
     */
    private function describeKeys(int $tenantId): void
    {
        $hasReadFlag = Schema::hasColumn('tenant_api_keys', 'can_read_catalog');
        $hasLimit = Schema::hasColumn('tenant_api_keys', 'rate_limit_per_minute');

        $columns = ['id', 'name', 'can_manage_media', 'can_generate_order_references', 'revoked_at'];
        $hasReadFlag && $columns[] = 'can_read_catalog';
        $hasLimit && $columns[] = 'rate_limit_per_minute';

        $keys = TenantApiKey::allTenants()->where('tenant_id', $tenantId)->get($columns);

        if ($keys->isEmpty()) {
            $this->line('    llaves: ninguna');

            return;
        }

        $active = $keys->whereNull('revoked_at');
        $counts = ['lectura' => 0, 'administración' => 0, 'solo pedidos' => 0, 'mixta/antigua' => 0];

        foreach ($active as $key) {
            $counts[$this->profileOf($key, $hasReadFlag)]++;
        }

        $this->line(sprintf(
            '    llaves activas: %d (lectura %d · administración %d · solo pedidos %d · mixta/antigua %d) · revocadas: %d',
            $active->count(),
            $counts['lectura'],
            $counts['administración'],
            $counts['solo pedidos'],
            $counts['mixta/antigua'],
            $keys->count() - $active->count(),
        ));

        foreach ($active as $key) {
            $limit = $hasLimit ? ($key->rate_limit_per_minute ?? 60) : 60;
            $this->line("      id {$key->id} «{$key->name}» → {$this->profileOf($key, $hasReadFlag)}, {$limit}/min");
        }
    }

    private function profileOf(TenantApiKey $key, bool $hasReadFlag): string
    {
        $canRead = $hasReadFlag ? (bool) $key->can_read_catalog : true;
        $media = (bool) $key->can_manage_media;
        $orders = (bool) $key->can_generate_order_references;

        return match (true) {
            $canRead && ! $media && ! $orders => 'lectura',
            $canRead && $media && ! $orders => 'administración',
            ! $canRead && ! $media && $orders => 'solo pedidos',
            default => 'mixta/antigua',
        };
    }

    private function section(string $title): void
    {
        $this->newLine();
        $this->line("<comment>== {$title} ==</comment>");
    }
}
