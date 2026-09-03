<?php

namespace App\Authorization;

use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
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

    /**
     * Single source of truth for legacy `users.role` string → default Spatie
     * role name. Used by roles:assign-legacy (one-time backfill) and by
     * UserController (every create/update from here on) — those two MUST
     * agree, or an employee's actual permissions silently drift from what
     * the "Rol" field in the UI claims.
     *
     * @return array<string, string>
     */
    public static function legacyRoleMap(): array
    {
        return [
            'administrador' => self::ADMINISTRADOR,
            'encargado' => self::ENCARGADO,
            'vendedor' => self::VENDEDOR,
        ];
    }

    public static function roleNameForLegacy(string $legacyRole): ?string
    {
        return self::legacyRoleMap()[$legacyRole] ?? null;
    }

    /**
     * The default permission set for a legacy role string, computed without
     * touching the database. Backs User::hasPermissionTo()'s fallback: a
     * tenant that hasn't run roles:assign-legacy yet (or a bare test fixture)
     * has no Spatie role row to read from, but must still behave exactly
     * like it will once migrated — same source these 3 sets seed into real
     * roles via seedFor() below, just evaluated in memory instead of synced
     * onto a Role.
     *
     * @return list<string>
     */
    public static function defaultPermissionsForLegacyRole(string $legacyRole): array
    {
        return match ($legacyRole) {
            'administrador' => PermissionCatalog::names(),
            'encargado' => self::encargadoPermissions(),
            'vendedor' => self::vendedorPermissions(),
            default => [],
        };
    }

    public function seedFor(Tenant $tenant): void
    {
        DB::transaction(function () use ($tenant) {
            app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);

            // Laravel never re-runs a migration once it's recorded in the
            // `migrations` table — so a permission added to PermissionCatalog
            // in a future deploy needs its OWN new migration to actually reach
            // the `permissions` table, or Role::syncPermissions() below throws
            // PermissionDoesNotExist the moment any tenant is (re)seeded.
            // Self-healing here removes that footgun: any catalog name still
            // missing gets created before it's ever synced onto a role.
            $this->ensurePermissionsExist();

            $this->syncRole(self::ADMINISTRADOR, 'all', PermissionCatalog::names(), 'Control total del negocio.');
            $this->syncRole(self::ENCARGADO, 'branch', self::encargadoPermissions(), 'Opera la sucursal: catálogo, ventas, inventario, finanzas — sin usuarios, sucursales ni ajustes globales.');
            $this->syncRole(self::VENDEDOR, 'branch', self::vendedorPermissions(), 'Vende en el punto de venta y atiende clientes — sin precios de compra ni reportes.');

            app(PermissionRegistrar::class)->forgetCachedPermissions();
        });
    }

    private function ensurePermissionsExist(): void
    {
        $existing = Permission::where('guard_name', 'web')->pluck('name')->all();

        foreach (array_diff(PermissionCatalog::names(), $existing) as $name) {
            Permission::create(['name' => $name, 'guard_name' => 'web']);
        }
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
     * Everything except: users.*, branches.*, payment_methods.create/update/
     * delete, settings.* (business/ticket/appearance/printer/roles/modules),
     * reports.branches.view, sales.view_deleted/update/delete — matches
     * AdminOrManagerMiddleware's reach today, minus the admin-only slices
     * AdminMiddleware still guards (routes/settings.php, routes/payment-
     * methods.php's Route::resource — but NOT its auth-only `active` list
     * endpoint, which is why payment_methods.view is NOT excluded: pos.access
     * declares it as a hard requirement, and stripping the whole
     * payment_methods.* prefix silently broke that dependency).
     *
     * sales.update is excluded too: SaleController::edit()/update() gate on
     * `! auth()->user()->isAdmin()` alone (editing a *completed* sale is
     * admin-only today) — sales.create/manage_pending (POS, pending-sale
     * flow) stay granted, this only removes editing an already-completed one.
     *
     * cash_sessions.view_all is excluded too: CashSessionController::index()/
     * show()/addMovement() gate their "see someone else's session" check on
     * isAdmin() alone — Encargado is restricted to their own sessions there,
     * same as Vendedor. (closeForm()/close() DO let Encargado close someone
     * else's session — a genuinely different, action-specific rule with no
     * catalog permission of its own yet, deliberately left as a literal
     * isAdmin()||isManager() check rather than force-fit into this one.)
     *
     * dashboard.low_stock.view and dashboard.branch_sales.view are excluded
     * too: dashboard.tsx gates the "Productos en inventario" and "Ventas por
     * sucursal" cards on `userRole === 'administrador'` — admin-only today,
     * even though DashboardController computes both regardless of role.
     *
     * @return list<string>
     */
    public static function encargadoPermissions(): array
    {
        $excluded = [
            'payment_methods.create', 'payment_methods.update', 'payment_methods.delete',
            'settings.business.view', 'settings.business.update', 'settings.ticket.update',
            'settings.appearance.update', 'settings.printer.manage',
            'settings.roles.manage', 'settings.modules.manage',
            'sales.view_deleted', 'sales.update', 'sales.delete', 'reports.branches.view',
            'cash_sessions.view_all',
            'dashboard.low_stock.view', 'dashboard.branch_sales.view',
        ];

        return collect(PermissionCatalog::names())
            ->reject(fn (string $name) => str_starts_with($name, 'users.')
                || str_starts_with($name, 'branches.')
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
    public static function vendedorPermissions(): array
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
