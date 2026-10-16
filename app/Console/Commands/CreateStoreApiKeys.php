<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\TenantApiKey;
use Illuminate\Console\Command;

/**
 * Issues the three storefront API keys of a business — read-only,
 * admin (media/visibility) and orders-only — each printed exactly once on the
 * terminal of whoever runs this. Nothing is written to files or logs.
 *
 * `--rotate=<profile>` issues just one new key of that profile WITHOUT
 * touching the old one, so the storefront can switch over with zero downtime;
 * the old one is retired afterwards with store:keys:revoke.
 */
class CreateStoreApiKeys extends Command
{
    /**
     * Profile => [name suffix, can_read_catalog, can_manage_media, can_generate_order_references, default requests/min].
     *
     * @var array<string, array{suffix: string, read: bool, media: bool, orders: bool, limit: int}>
     */
    public const PROFILES = [
        'lectura' => ['suffix' => 'lectura', 'read' => true, 'media' => false, 'orders' => false, 'limit' => 300],
        'admin' => ['suffix' => 'admin', 'read' => true, 'media' => true, 'orders' => false, 'limit' => 120],
        'pedidos' => ['suffix' => 'pedidos', 'read' => false, 'media' => false, 'orders' => true, 'limit' => 30],
    ];

    protected $signature = 'store:keys:create
                            {tenant : Tenant slug or id}
                            {--prefix=lu : Name prefix of the keys (lu => lu-lectura, lu-admin, lu-pedidos)}
                            {--rotate= : Issue only one new key of this profile (lectura|admin|pedidos) and keep the old one active}
                            {--read-limit= : Requests/min for the read key (default 300)}
                            {--admin-limit= : Requests/min for the admin key (default 120)}
                            {--orders-limit= : Requests/min for the orders key (default 30)}';

    protected $description = 'Create the read / admin / orders-only storefront API keys of a tenant (each shown once)';

    public function handle(): int
    {
        $identifier = (string) $this->argument('tenant');
        $tenant = Tenant::query()->where('slug', $identifier)->orWhere('id', ctype_digit($identifier) ? (int) $identifier : 0)->first();

        if (! $tenant) {
            $this->error("No existe el negocio '{$identifier}'.");

            return self::FAILURE;
        }

        $rotate = $this->option('rotate');

        if ($rotate !== null && ! isset(self::PROFILES[$rotate])) {
            $this->error('--rotate debe ser lectura, admin o pedidos.');

            return self::FAILURE;
        }

        $limits = [
            'lectura' => $this->option('read-limit'),
            'admin' => $this->option('admin-limit'),
            'pedidos' => $this->option('orders-limit'),
        ];

        foreach ($limits as $profile => $value) {
            if ($value !== null && (! ctype_digit((string) $value) || (int) $value < 1)) {
                $this->error("El límite de '{$profile}' debe ser un entero positivo.");

                return self::FAILURE;
            }
        }

        $profiles = $rotate !== null ? [$rotate] : array_keys(self::PROFILES);
        $prefix = (string) $this->option('prefix');

        if ($rotate === null) {
            $names = array_map(fn (string $p) => "{$prefix}-".self::PROFILES[$p]['suffix'], $profiles);
            $existing = TenantApiKey::allTenants()
                ->where('tenant_id', $tenant->id)
                ->whereNull('revoked_at')
                ->whereIn('name', $names)
                ->pluck('name');

            if ($existing->isNotEmpty()) {
                $this->error('Ya hay llaves activas con estos nombres: '.$existing->implode(', ').'. Usa --rotate=<perfil> para emitir una nueva sin caída.');

                return self::FAILURE;
            }
        }

        $this->warn('Cada llave se muestra UNA sola vez. Cópiala ahora; no se puede volver a ver.');

        foreach ($profiles as $profile) {
            $spec = self::PROFILES[$profile];
            $name = "{$prefix}-{$spec['suffix']}".($rotate !== null ? '-'.now()->format('Ymd-His') : '');
            $limit = $limits[$profile] !== null ? (int) $limits[$profile] : $spec['limit'];

            $generated = TenantApiKey::generate(
                $tenant,
                $name,
                null,
                $spec['media'],
                $spec['orders'],
                $limit,
                $spec['read'],
            );

            $this->newLine();
            $this->line("<info>{$name}</info>  (id {$generated['key']->id}, {$limit} peticiones/min por cubeta)");
            $this->line($generated['plainTextKey']);
        }

        $this->newLine();
        $this->info('Listo. Para retirar una llave vieja después de cambiar la tienda: php artisan store:keys:revoke <id>');

        return self::SUCCESS;
    }
}
