<?php

namespace App\Authorization;

/**
 * Single source of truth for every permission in the system. The permission
 * seeder and the future role-management UI both read from here — no
 * permission name should ever be hardcoded anywhere else.
 *
 * Entry shape:
 * - module:   groups permissions in the UI matrix and in the sidebar mapping.
 * - label:    human-readable name shown in the role editor.
 * - type:     'action' (default, gates a route/policy) or 'field' (does NOT
 *             gate access — it gates whether a sensitive column is included
 *             in a response, e.g. purchase_price). Omit for 'action'.
 * - requires: other permission names this one depends on operationally. The
 *             role editor won't let a role hold this permission without also
 *             holding its dependencies — see ROLES_PERMISSIONS_ARCHITECTURE.md
 *             §6.3 for why (e.g. pos.access is useless without sales.create).
 *
 * Permissions are global (same catalog for every tenant); what varies per
 * tenant is which ROLE holds which permission.
 *
 * Adding an entry here is enough on its own — DefaultRoleProvisioner::
 * ensurePermissionsExist() creates any missing row in `permissions` the next
 * time any tenant's roles are (re)synced, so a new permission never needs its
 * own migration to actually take effect.
 */
class PermissionCatalog
{
    /**
     * @return array<string, array{module: string, label: string, type?: string, requires?: list<string>}>
     */
    public static function all(): array
    {
        return array_merge(
            self::dashboard(),
            self::pos(),
            self::products(),
            self::categories(),
            self::clients(),
            self::sales(),
            self::credits(),
            self::suppliers(),
            self::stockMovements(),
            self::paymentMethods(),
            self::cashSessions(),
            self::finances(),
            self::expenses(),
            self::reports(),
            self::users(),
            self::branches(),
            self::settings(),
            self::profile(),
        );
    }

    /** @return list<string> */
    public static function names(): array
    {
        return array_keys(self::all());
    }

    /**
     * Permissions grouped by module, for the role-editor matrix. Excludes
     * alwaysGranted() (profile.*) — every user gets those regardless of
     * role, so they have no business being a checkbox any admin could
     * accidentally uncheck.
     *
     * @return array<string, array<string, array{module: string, label: string, type?: string, requires?: list<string>}>>
     */
    public static function byModule(): array
    {
        $grouped = [];
        $alwaysGranted = self::alwaysGranted();

        foreach (self::all() as $name => $meta) {
            if (in_array($name, $alwaysGranted, true)) {
                continue;
            }
            $grouped[$meta['module']][$name] = $meta;
        }

        return $grouped;
    }

    /**
     * Permissions never assigned to a tenant role: every authenticated user
     * gets them regardless of role, because they gate managing your own
     * account, not the business. Kept out of the role editor entirely.
     *
     * @return list<string>
     */
    public static function alwaysGranted(): array
    {
        return array_keys(self::profile());
    }

    /**
     * Expands a requested permission set to also include every transitive
     * `requires` dependency — e.g. requesting just `pos.apply_discount`
     * also pulls in `pos.access`, which itself pulls in `sales.create`,
     * `products.view`, `payment_methods.view`, `clients.view`. This is the
     * role editor's server-side safety net: the frontend UI should already
     * auto-check dependencies as the admin clicks, but a role saved via a
     * direct request must never end up with a permission whose
     * prerequisite it lacks (the individual controllers only check the
     * leaf permission, not its chain).
     *
     * Unknown permission names are dropped silently rather than rejected —
     * validation catches those before this ever runs.
     *
     * @param  list<string>  $names
     * @return list<string>
     */
    public static function expandWithDependencies(array $names): array
    {
        $catalog = self::all();
        $result = array_values(array_intersect($names, array_keys($catalog)));

        for ($i = 0; $i < count($result); $i++) {
            foreach ($catalog[$result[$i]]['requires'] ?? [] as $dependency) {
                if (! in_array($dependency, $result, true)) {
                    $result[] = $dependency;
                }
            }
        }

        return $result;
    }

    /** @return array<string, array{module: string, label: string}> */
    private static function dashboard(): array
    {
        return [
            'dashboard.view' => ['module' => 'dashboard', 'label' => 'Ver dashboard'],
            'dashboard.revenue.view' => ['module' => 'dashboard', 'label' => 'Ver ingresos del mes'],
            'dashboard.top_products.view' => ['module' => 'dashboard', 'label' => 'Ver productos más vendidos'],
            'dashboard.low_stock.view' => ['module' => 'dashboard', 'label' => 'Ver productos con bajo stock'],
            'dashboard.branch_sales.view' => ['module' => 'dashboard', 'label' => 'Ver ventas por sucursal (todas)'],
            'dashboard.pending_sales.view' => ['module' => 'dashboard', 'label' => 'Ver ventas pendientes'],
        ];
    }

    /** @return array<string, array{module: string, label: string, requires?: list<string>}> */
    private static function pos(): array
    {
        return [
            'pos.access' => [
                'module' => 'pos', 'label' => 'Usar el punto de venta',
                'requires' => ['products.view', 'sales.create', 'payment_methods.view', 'clients.view'],
            ],
            'pos.apply_discount' => ['module' => 'pos', 'label' => 'Aplicar descuentos en el POS', 'requires' => ['pos.access']],
            'pos.open_drawer' => ['module' => 'pos', 'label' => 'Abrir el cajón sin una venta'],
            'pos.sell_variable_price' => ['module' => 'pos', 'label' => 'Vender a precio variable', 'requires' => ['pos.access']],
        ];
    }

    /** @return array<string, array{module: string, label: string, type?: string}> */
    private static function products(): array
    {
        return [
            'products.view' => ['module' => 'products', 'label' => 'Ver catálogo'],
            'products.create' => ['module' => 'products', 'label' => 'Crear productos', 'requires' => ['products.view']],
            'products.update' => ['module' => 'products', 'label' => 'Editar productos', 'requires' => ['products.view']],
            'products.delete' => ['module' => 'products', 'label' => 'Eliminar productos', 'requires' => ['products.view']],
            'products.restore' => ['module' => 'products', 'label' => 'Restaurar productos (papelera)', 'requires' => ['products.delete']],
            'products.force_delete' => ['module' => 'products', 'label' => 'Eliminar productos permanentemente', 'requires' => ['products.restore']],
            'products.update_stock' => ['module' => 'products', 'label' => 'Ajustar stock desde el producto', 'requires' => ['products.view']],
            'products.sync_suppliers' => ['module' => 'products', 'label' => 'Vincular proveedores a productos', 'requires' => ['products.update', 'suppliers.view']],
            'products.export' => ['module' => 'products', 'label' => 'Exportar catálogo', 'requires' => ['products.view']],
            'products.view_purchase_price' => ['module' => 'products', 'label' => 'Ver precio de compra / margen', 'type' => 'field', 'requires' => ['products.view']],
        ];
    }

    /** @return array<string, array{module: string, label: string, requires?: list<string>}> */
    private static function categories(): array
    {
        return [
            'categories.view' => ['module' => 'categories', 'label' => 'Ver categorías'],
            'categories.create' => ['module' => 'categories', 'label' => 'Crear categorías', 'requires' => ['categories.view']],
            'categories.update' => ['module' => 'categories', 'label' => 'Editar categorías', 'requires' => ['categories.view']],
            'categories.delete' => ['module' => 'categories', 'label' => 'Eliminar categorías', 'requires' => ['categories.view']],
            'categories.restore' => ['module' => 'categories', 'label' => 'Restaurar categorías (papelera)', 'requires' => ['categories.delete']],
        ];
    }

    /** @return array<string, array{module: string, label: string, requires?: list<string>}> */
    private static function clients(): array
    {
        return [
            'clients.view' => ['module' => 'clients', 'label' => 'Ver clientes'],
            'clients.create' => ['module' => 'clients', 'label' => 'Crear clientes', 'requires' => ['clients.view']],
            'clients.update' => ['module' => 'clients', 'label' => 'Editar clientes', 'requires' => ['clients.view']],
            'clients.delete' => ['module' => 'clients', 'label' => 'Eliminar clientes', 'requires' => ['clients.view']],
            'clients.view_history' => ['module' => 'clients', 'label' => 'Ver historial de compras del cliente', 'requires' => ['clients.view']],
            'clients.wholesale.manage' => ['module' => 'clients', 'label' => 'Marcar clientes mayoristas y su % de descuento', 'requires' => ['clients.update']],
        ];
    }

    /** @return array<string, array{module: string, label: string, type?: string, requires?: list<string>}> */
    private static function sales(): array
    {
        return [
            'sales.view' => ['module' => 'sales', 'label' => 'Ver ventas'],
            'sales.create' => ['module' => 'sales', 'label' => 'Crear ventas'],
            'sales.update' => ['module' => 'sales', 'label' => 'Editar ventas', 'requires' => ['sales.view']],
            'sales.delete' => ['module' => 'sales', 'label' => 'Eliminar ventas', 'requires' => ['sales.view']],
            'sales.manage_pending' => ['module' => 'sales', 'label' => 'Completar/editar ventas pendientes', 'requires' => ['sales.create']],
            'sales.view_deleted' => ['module' => 'sales', 'label' => 'Ver ventas eliminadas', 'requires' => ['sales.delete']],
            'sales.refund' => ['module' => 'sales', 'label' => 'Registrar devoluciones', 'requires' => ['sales.view']],
            'sales.view_profit' => ['module' => 'sales', 'label' => 'Ver utilidad de la venta', 'type' => 'field', 'requires' => ['sales.view']],
        ];
    }

    /** @return array<string, array{module: string, label: string, requires?: list<string>}> */
    private static function credits(): array
    {
        return [
            'credits.view' => ['module' => 'credits', 'label' => 'Ver créditos'],
            'credits.create' => ['module' => 'credits', 'label' => 'Crear ventas a crédito', 'requires' => ['credits.view', 'sales.create']],
            'credits.register_payment' => ['module' => 'credits', 'label' => 'Registrar abonos', 'requires' => ['credits.view']],
            'credits.cancel' => ['module' => 'credits', 'label' => 'Cancelar créditos', 'requires' => ['credits.view']],
            'credits.view_receivables' => ['module' => 'credits', 'label' => 'Ver cartera por cobrar', 'requires' => ['credits.view']],
        ];
    }

    /** @return array<string, array{module: string, label: string, type?: string, requires?: list<string>}> */
    private static function suppliers(): array
    {
        return [
            'suppliers.view' => ['module' => 'suppliers', 'label' => 'Ver proveedores'],
            'suppliers.create' => ['module' => 'suppliers', 'label' => 'Crear proveedores', 'requires' => ['suppliers.view']],
            'suppliers.update' => ['module' => 'suppliers', 'label' => 'Editar proveedores', 'requires' => ['suppliers.view']],
            'suppliers.delete' => ['module' => 'suppliers', 'label' => 'Eliminar proveedores', 'requires' => ['suppliers.view']],
            'suppliers.view_purchase_price' => ['module' => 'suppliers', 'label' => 'Ver precios de compra del proveedor', 'type' => 'field', 'requires' => ['suppliers.view']],
        ];
    }

    /** @return array<string, array{module: string, label: string, requires?: list<string>}> */
    private static function stockMovements(): array
    {
        return [
            'stock_movements.view' => ['module' => 'stock_movements', 'label' => 'Ver movimientos de stock'],
            'stock_movements.create' => ['module' => 'stock_movements', 'label' => 'Registrar movimientos de stock', 'requires' => ['stock_movements.view', 'products.view']],
            'stock_movements.view_statistics' => ['module' => 'stock_movements', 'label' => 'Ver estadísticas de stock', 'requires' => ['stock_movements.view']],
        ];
    }

    /** @return array<string, array{module: string, label: string, requires?: list<string>}> */
    private static function paymentMethods(): array
    {
        return [
            'payment_methods.view' => ['module' => 'payment_methods', 'label' => 'Ver métodos de pago'],
            'payment_methods.create' => ['module' => 'payment_methods', 'label' => 'Crear métodos de pago', 'requires' => ['payment_methods.view']],
            'payment_methods.update' => ['module' => 'payment_methods', 'label' => 'Editar métodos de pago', 'requires' => ['payment_methods.view']],
            'payment_methods.delete' => ['module' => 'payment_methods', 'label' => 'Eliminar métodos de pago', 'requires' => ['payment_methods.view']],
        ];
    }

    /** @return array<string, array{module: string, label: string, type?: string, requires?: list<string>}> */
    private static function cashSessions(): array
    {
        return [
            'cash_sessions.view' => ['module' => 'cash_sessions', 'label' => 'Ver sesiones de caja propias'],
            'cash_sessions.view_all' => ['module' => 'cash_sessions', 'label' => 'Ver sesiones de caja de todos', 'requires' => ['cash_sessions.view']],
            'cash_sessions.open' => ['module' => 'cash_sessions', 'label' => 'Abrir caja', 'requires' => ['cash_sessions.view']],
            'cash_sessions.close' => ['module' => 'cash_sessions', 'label' => 'Cerrar caja', 'requires' => ['cash_sessions.view']],
            'cash_sessions.close_any' => ['module' => 'cash_sessions', 'label' => 'Cerrar la caja de cualquier usuario', 'requires' => ['cash_sessions.close']],
            'cash_sessions.movements' => ['module' => 'cash_sessions', 'label' => 'Registrar entradas/salidas de caja', 'requires' => ['cash_sessions.view']],
            'cash_sessions.view_expected' => ['module' => 'cash_sessions', 'label' => 'Ver efectivo esperado al cerrar (vs. cierre ciego)', 'type' => 'field', 'requires' => ['cash_sessions.close']],
        ];
    }

    /** @return array<string, array{module: string, label: string, type?: string}> */
    private static function finances(): array
    {
        return [
            'finances.view' => ['module' => 'finances', 'label' => 'Ver panel financiero (P&L)'],
            'finances.view_cogs' => ['module' => 'finances', 'label' => 'Ver costo de ventas (COGS)', 'type' => 'field', 'requires' => ['finances.view']],
            'finances.view_profit' => ['module' => 'finances', 'label' => 'Ver utilidad', 'type' => 'field', 'requires' => ['finances.view']],
        ];
    }

    /** @return array<string, array{module: string, label: string, requires?: list<string>}> */
    private static function expenses(): array
    {
        return [
            'expenses.view' => ['module' => 'expenses', 'label' => 'Ver gastos'],
            'expenses.create' => ['module' => 'expenses', 'label' => 'Registrar gastos', 'requires' => ['expenses.view']],
            'expenses.update' => ['module' => 'expenses', 'label' => 'Editar gastos', 'requires' => ['expenses.view']],
            'expenses.delete' => ['module' => 'expenses', 'label' => 'Eliminar gastos', 'requires' => ['expenses.view']],
            'expense_templates.manage' => ['module' => 'expenses', 'label' => 'Gestionar gastos fijos (plantillas)', 'requires' => ['expenses.view']],
            'expense_categories.manage' => ['module' => 'expenses', 'label' => 'Gestionar categorías de gasto', 'requires' => ['expenses.view']],
        ];
    }

    /** @return array<string, array{module: string, label: string, requires?: list<string>}> */
    private static function reports(): array
    {
        return [
            'reports.view' => ['module' => 'reports', 'label' => 'Ver reportes (principal)'],
            'reports.sales_detail.view' => ['module' => 'reports', 'label' => 'Reporte: detalle de ventas', 'requires' => ['reports.view']],
            'reports.products.view' => ['module' => 'reports', 'label' => 'Reporte: productos', 'requires' => ['reports.view']],
            'reports.sellers.view' => ['module' => 'reports', 'label' => 'Reporte: vendedores', 'requires' => ['reports.view']],
            'reports.branches.view' => ['module' => 'reports', 'label' => 'Reporte: sucursales (comparativo)', 'requires' => ['reports.view']],
            'reports.cash_balance.view' => ['module' => 'reports', 'label' => 'Reporte: balance de caja', 'requires' => ['reports.view']],
            'reports.returns.view' => ['module' => 'reports', 'label' => 'Reporte: devoluciones', 'requires' => ['reports.view']],
            'reports.export' => ['module' => 'reports', 'label' => 'Exportar reportes (PDF/Excel)', 'requires' => ['reports.view']],
        ];
    }

    /** @return array<string, array{module: string, label: string, requires?: list<string>}> */
    private static function users(): array
    {
        return [
            'users.view' => ['module' => 'users', 'label' => 'Ver usuarios'],
            'users.create' => ['module' => 'users', 'label' => 'Crear usuarios', 'requires' => ['users.view']],
            'users.update' => ['module' => 'users', 'label' => 'Editar usuarios', 'requires' => ['users.view']],
            'users.delete' => ['module' => 'users', 'label' => 'Eliminar usuarios', 'requires' => ['users.view']],
            'users.restore' => ['module' => 'users', 'label' => 'Restaurar usuarios', 'requires' => ['users.delete']],
            'users.assign_role' => ['module' => 'users', 'label' => 'Asignar roles a usuarios', 'requires' => ['users.update']],
        ];
    }

    /** @return array<string, array{module: string, label: string, requires?: list<string>}> */
    private static function branches(): array
    {
        return [
            'branches.view' => ['module' => 'branches', 'label' => 'Ver sucursales'],
            'branches.create' => ['module' => 'branches', 'label' => 'Crear sucursales', 'requires' => ['branches.view']],
            'branches.update' => ['module' => 'branches', 'label' => 'Editar sucursales', 'requires' => ['branches.view']],
            'branches.delete' => ['module' => 'branches', 'label' => 'Eliminar sucursales', 'requires' => ['branches.view']],
            'branches.restore' => ['module' => 'branches', 'label' => 'Restaurar sucursales', 'requires' => ['branches.delete']],
        ];
    }

    /** @return array<string, array{module: string, label: string, requires?: list<string>}> */
    private static function settings(): array
    {
        return [
            'settings.business.view' => ['module' => 'settings', 'label' => 'Ver configuración del negocio'],
            'settings.business.update' => ['module' => 'settings', 'label' => 'Editar configuración del negocio', 'requires' => ['settings.business.view']],
            'settings.ticket.update' => ['module' => 'settings', 'label' => 'Editar formato de ticket', 'requires' => ['settings.business.view']],
            'settings.appearance.update' => ['module' => 'settings', 'label' => 'Editar apariencia/colores de marca', 'requires' => ['settings.business.view']],
            'settings.printer.manage' => ['module' => 'settings', 'label' => 'Configurar impresora'],
            'settings.roles.manage' => ['module' => 'settings', 'label' => 'Gestionar roles y permisos'],
            'settings.modules.manage' => ['module' => 'settings', 'label' => 'Activar/desactivar módulos del negocio', 'requires' => ['settings.roles.manage']],
        ];
    }

    /**
     * Not part of the role editor — every authenticated user gets these
     * regardless of role. See PR-0 (the settings/profile split): an
     * encargado or vendedor must always be able to reach their own account.
     *
     * @return array<string, array{module: string, label: string}>
     */
    private static function profile(): array
    {
        return [
            'profile.view' => ['module' => 'profile', 'label' => 'Ver mi perfil'],
            'profile.update' => ['module' => 'profile', 'label' => 'Editar mi perfil'],
            'profile.change_password' => ['module' => 'profile', 'label' => 'Cambiar mi contraseña'],
        ];
    }
}
