<?php

namespace App\Authorization;

use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * Seeds the 3 default roles (Administrador, Encargado, Vendedor) for one
 * tenant, replicating today's hardcoded role behaviour exactly — see
 * ROLES_PERMISSIONS_ARCHITECTURE.md §3 (Apéndice B) for the module-by-module
 * source of each mapping decision below.
 *
 * Called from:
 * - TenantProvisioner, when a new tenant is created (Bloque 9 of the plan).
 * - The `roles:seed-defaults` console command, once per existing tenant
 *   during the PR-2 data migration.
 *
 * Idempotent: re-running syncs permissions on the 3 roles without creating
 * duplicates or touching any custom role the tenant may have added since.
 */
class DefaultRoleProvisioner
{
    public const ADMINISTRADOR = 'Administrador';

    public const ENCARGADO = 'Encargado';

    public const VENDEDOR = 'Vendedor';

    public function seedFor(Tenant $tenant): void
    {
        DB::transaction(function () use ($tenant) {
            app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);

            $this->syncRole(self::ADMINISTRADOR, 'all', PermissionCatalog::names(), 'Control total del negocio.');
            $this->syncRole(self::ENCARGADO, 'branch', $this->encargadoPermissions(), 'Opera la sucursal: catálogo, ventas, inventario, finanzas — sin usuarios, sucursales ni ajustes globales.');
            $this->syncRole(self::VENDEDOR, 'branch', $this->vendedorPermissions(), 'Vende en el punto de venta y atiende clientes — sin precios de compra ni reportes.');

            app(PermissionRegistrar::class)->forgetCachedPermissions();
        });
    }

    /**
     * @param  list<string>  $permissions
     */
    private function syncRole(string $name, string $dataScope, array $permissions, string $description): void
    {
        // Role::firstOrCreate() would silently skip Spatie's team stamping:
        // Eloquent's firstOrCreate() saves via newModelInstance()+save(), not
        // through Role's overridden static create(), so tenant_id would stay
        // null. findOrCreate() is Spatie's own team-aware lookup/creation path.
        $role = Role::findOrCreate($name, 'web');

        // Keep metadata in sync even if the role already existed (re-seed).
        $role->forceFill([
            'is_default' => true,
            'is_system' => true,
            'data_scope' => $dataScope,
            'description' => $description,
        ])->save();

        // Permissions are global (not team-scoped rows), so no team filtering needed here.
        $role->syncPermissions($permissions);
    }

    /**
     * Everything except: users.*, branches.*, payment_methods.*,
     * settings.roles.manage, settings.modules.manage, reports.branches.view,
     * sales.view_deleted, sales.delete — matches AdminOrManagerMiddleware's
     * reach today, minus the admin-only slices AdminMiddleware still guards.
     *
     * @return list<string>
     */
    private function encargadoPermissions(): array
    {
        $excluded = [
            'sales.view_deleted', 'sales.delete', 'reports.branches.view',
            'settings.roles.manage', 'settings.modules.manage',
        ];

        return collect(PermissionCatalog::names())
            ->reject(fn (string $name) => str_starts_with($name, 'users.')
                || str_starts_with($name, 'branches.')
                || str_starts_with($name, 'payment_methods.')
                || in_array($name, $excluded, true))
            ->values()
            ->all();
    }

    /**
     * Matches the seller's reach today: POS, sell/refund, clients, cash
     * session lifecycle (blind close — no view_expected, no view_all), and
     * credits without cancellation. No catalog editing, no purchase prices,
     * no reports, no finances, no stock, no suppliers.
     *
     * @return list<string>
     */
    private function vendedorPermissions(): array
    {
        return [
            'dashboard.view',
            'pos.access', 'pos.apply_discount', 'pos.sell_variable_price',
            'products.view',
            'clients.view', 'clients.create', 'clients.update', 'clients.view_history',
            'sales.view', 'sales.create', 'sales.manage_pending', 'sales.refund',
            'credits.view', 'credits.create', 'credits.register_payment', 'credits.view_receivables',
            'cash_sessions.view', 'cash_sessions.open', 'cash_sessions.close', 'cash_sessions.movements',
            'payment_methods.view',
        ];
    }
}
