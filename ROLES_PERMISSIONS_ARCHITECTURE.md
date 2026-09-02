# Arquitectura de Roles y Permisos — Estado real + Diseño completo

> **Fecha de auditoría:** 2 de septiembre de 2026
> **Rama auditada:** `master` (+ comparación con `feature/multitenancy-infra`)
> **Método:** verificación línea por línea del código, no del plan previo.

---

## 0. Qué ya existe (documentos previos)

| Documento | Fecha | Qué aporta | Estado |
|---|---|---|---|
| `ROLES-AUDIT.md` | Abril 2026 | Matriz descriptiva de qué ve cada rol por módulo. Útil como *snapshot funcional* de referencia | Vigente como descripción, sin diseño técnico |
| `ROLES_PERMISSIONS_PLAN.md` | Junio 2026 (commit `0a07f86`) | Plan maestro: Spatie + teams, catálogo de permisos, 13 bloques, secuencia de PRs | **Buena base, pero incompleto e impreciso** — ver §7 |
| `MULTITENANCY_PLAN.md` + rama `feature/multitenancy-infra` | Junio–Sept 2026 | Infra de tenant **ya implementada en rama**: `Tenant`, `TenantManager`, `TenantScope`, `BelongsToTenant`, `IdentifyTenant`, `EnsureSuperAdmin`, panel `/admin`, 5 migraciones, tests | **Implementado, sin mergear a master** |

**Conclusión:** no hay nada de permisos granulares implementado. **Cero paquetes** de permisos instalados (`composer.json` no tiene `spatie/laravel-permission`). Todo el control de acceso hoy es rol-string cableado.

---

## 1. Estado real verificado (cifras medidas hoy, no las del plan)

| Métrica | Plan decía | **Real medido** | Comando |
|---|---|---|---|
| Checks de rol en backend | 129 | **113** en 23 archivos | `grep -rEc "isAdmin\(\)\|isManager\(\)\|isSeller\(\)" app routes` |
| — de esos, que son **alcance de sucursal** | (no distinguía) | **74 (65%)** | los que llevan `branch` en la misma línea |
| — de esos, que son **permiso real** | (no distinguía) | **~24** | ver §4 |
| Condicionales de rol en frontend | 128 | **54** en 19 archivos | `grep -rEc "\.role\b\|roles\.includes\|isAdmin" resources/js` |
| Middlewares de rol | 2 | 2 (`AdminMiddleware`, `AdminOrManagerMiddleware`) | + `BranchFilterMiddleware` (no bloquea) |
| Policies | — | **0** | `app/Policies/` no existe |
| Form Requests con `authorize()` por rol | — | 2 (`BranchRequest`, `ProductRequest`) | |

### Fuente de verdad actual
- `users.role` — string libre, validado solo en `UserController` (`in:administrador,encargado,vendedor`, [UserController.php:86](app/Http/Controllers/UserController.php#L86) y [:179](app/Http/Controllers/UserController.php#L179)).
- Helpers: `isAdmin()` / `isManager()` / `isSeller()` en [User.php:82-101](app/Models/User.php#L82-L101).
- En la rama de multitenancy se suma `isSuperAdmin()` (`role === 'super_admin'`, `tenant_id = NULL`).

### Distribución de los 113 checks
```
SupplierController      11    ExpenseTemplateController  6
CreditSaleController    11    PrintController            5
StockMovementController 10    PosController              2
SaleController          10    FinanceController          2
ReportController        10    DashboardController        2
CashSessionController   10    ReportQueryService         1
ProductController        8    ProductRequest             1
ExpenseController        8    BranchRequest              1
UserController           7    BranchFilterMiddleware     1
```

---

## 2. Inventario de módulos, rutas y protección actual

| # | Módulo | Archivo de rutas | Protección en ruta | Protección real | Sidebar (`roles`) | ⚠️ Hueco |
|---|---|---|---|---|---|---|
| 1 | Dashboard | `web.php` | `auth, verified` | ninguna | todos | — |
| 2 | POS | `sales.php` | `auth, verified, BranchFilter` | ninguna | **sin `roles`** → todos | — |
| 3 | Ventas | `sales.php` | ídem | inline branch | todos | — |
| 3b | Ventas eliminadas | `sales.php` | `AdminMiddleware` | + 3 `isAdmin()` en controller | — | — |
| 4 | Devoluciones | `sales.php` (`sales/{sale}/returns`) | `auth` | 1 check branch | — | vendedor puede devolver |
| 5 | Créditos | `credits.php` | `auth, verified, BranchFilter` | `cancel` = admin/encargado inline ([:258](app/Http/Controllers/CreditSaleController.php#L258)) | todos | — |
| 6 | Caja (sesiones) | `cash-sessions.php` | `auth, verified, BranchFilter` | ownership + ciego por `isSeller()` | todos | — |
| 7 | Catálogo/Productos | `products.php` | index: `auth`; CRUD: `AdminOrManager` | + 8 checks branch | admin, encargado | **`/products` index abierto a vendedor** y envía `purchase_price` |
| 8 | Categorías | `categories.php` | `AdminOrManager` (todo) | — | admin, encargado | — |
| 9 | Clientes | `clients.php` | `auth` | 1 filtro branch | todos | — |
| 10 | Proveedores | `suppliers.php` | **`auth` solamente** | 11 checks, ninguno bloquea acceso | admin, encargado | **vendedor entra y crea proveedores por URL** |
| 11 | Movimientos de stock | `stock-movements.php` | index: `auth`; create/store/show: `AdminOrManager` | + checks branch | admin, encargado | **index abierto a vendedor** |
| 12 | Métodos de pago | `payment-methods.php` | `AdminMiddleware` | — | admin | — |
| 13 | Finanzas (P&L) | `finances.php` | `AdminOrManager` | 2 checks branch | admin, encargado | — |
| 14 | Gastos + plantillas + categorías de gasto | `finances.php` | `AdminOrManager` | 14 checks branch | admin, encargado | — |
| 15 | Reportes (7 sub-reportes) | `reports.php` | **`auth, verified` solamente** | **cero `abort`** en `ReportController` | admin, encargado (+ *Sucursales* solo admin) | **vendedor accede a TODOS los reportes por URL, incl. exports PDF/Excel** |
| 16 | Usuarios | `users.php` | **ninguna** | 7 × `abort(403)` inline | admin | cubierto por controller |
| 17 | Sucursales | `branches.php` | `AdminMiddleware` | `BranchRequest::authorize()` | admin | — |
| 18 | Ajustes (negocio, ticket, apariencia, impresora) | `settings.php` | `AdminMiddleware` **(grupo completo)** | — | no está en sidebar | — |
| 18b | **Perfil y contraseña propios** | `settings.php` | **`AdminMiddleware`** ← | — | link visible a todos | **🔴 encargado/vendedor NO pueden cambiar su contraseña ni foto** |
| 19 | Impresión (QZ Tray) | `printing.php` | `auth, verified` | 5 checks branch | — | — |

### Secciones ocultables *dentro* de páginas (lo que hoy se esconde a mano)
| Página | Sección condicionada | Condición actual |
|---|---|---|
| Dashboard | Ventas por sucursal | `isAdmin()` ([DashboardController.php:85](app/Http/Controllers/DashboardController.php#L85)) |
| Productos index | Filtro y columna de sucursal, acciones CRUD | `role === 'administrador'` ([index.tsx:76-78](resources/js/pages/products/index.tsx#L76-L78)) |
| Ventas index/show | Acciones de admin | `isAdmin` ([sales/index.tsx:338](resources/js/pages/sales/index.tsx#L338)) |
| Cierre de caja | Efectivo esperado (cierre ciego) | `isSeller()` ([CashSessionController.php:192](app/Http/Controllers/CashSessionController.php#L192)) |
| Créditos show | Botón cancelar | `canCancel` calculado en backend ([:201](app/Http/Controllers/CreditSaleController.php#L201)) |
| Reportes (todos) | Selector de sucursal | prop `is_admin` |
| Finanzas / Gastos / Plantillas | Selector de sucursal | **`branches.length > 0`** ⚠️ permiso inferido de los datos ([finances/index.tsx:229](resources/js/pages/finances/index.tsx#L229)) |
| Categorías index | Botón crear / papelera | `role === 'administrador' \|\| 'encargado'` |
| Sidebar → Reportes → Sucursales | Sub-ítem | `roles: ['administrador']` en el hijo |

---

## 3. Cómo se comunican los módulos (qué depende de qué)

```
                       ┌──────────────┐
                       │ BusinessSet. │ (require_cash_session, ticket, logo)
                       └──────┬───────┘
                              │ consumido por POS, Print, Settings
   Categorías ──► Productos ──┼──► POS ──► Ventas ──┬──► Devoluciones
        │             │  ▲    │      ▲      │  │    └──► Impresión (QZ)
        │             │  │    │      │      │  └───────► Créditos ──► Pagos de crédito
        │             │  │    │      │      │                 │
   Proveedores ───────┘  │    │   Clientes ─┘                 │
        │                │    │                               │
        └──► Movimientos de stock ◄── StockMovementService ◄───┘
                    │                        (descuenta/repone stock)
                    ▼
   Sucursales ──► Sesiones de caja ──► Movimientos de caja
        │              │  ▲                     │
        │              │  └── Ventas (session_id) y pagos de crédito
        ▼              ▼
     Usuarios      Reportes ◄── ReportQueryService ◄── Ventas/Productos/Caja/Devoluciones
                       │
                   Finanzas (P&L) ◄── Gastos ◄── Plantillas ◄── Categorías de gasto
```

**Acoplamientos que condicionan el diseño de permisos:**

1. **`branch_id` es el eje transversal.** Casi todo modelo lo lleva; `BranchFilterMiddleware` inyecta `user_branch_id` y cada controlador filtra a mano. **65% de los "checks de rol" son en realidad esto.**
2. **POS es un agregador**: necesita Productos (lectura), Clientes (lectura+alta), Métodos de pago, Sesión de caja abierta, Ventas (escritura), Créditos e Impresión. Un permiso `pos.access` sin sus dependencias deja el POS inutilizable → **los permisos necesitan dependencias declaradas** (§6.3).
3. **Venta → stock → caja** es una cadena transaccional (`StockMovementService`, `session_id` en `sales`). Quitar `stock_movements.create` a un rol **no** debe romper la venta: el movimiento lo genera el servicio, no el usuario → distinguir **permiso de usuario** vs **acción del sistema**.
4. **Créditos escriben en caja** (los pagos entran a la sesión) y en ventas (la venta queda pendiente hasta pagarse).
5. **Finanzas depende de `purchase_price_snapshot`** en `sale_products` (COGS). Ocultar el precio de compra en UI **no** basta: el margen sigue siendo derivable.
6. **Reportes** pasan por `ReportQueryService`, que ya centraliza el filtro por sucursal ([:36](app/Services/ReportQueryService.php#L36)) — es el mejor punto para inyectar alcance.

---

## 4. El hallazgo principal: no es un eje, son cuatro

El plan actual (`ROLES_PERMISSIONS_PLAN.md`) trata los 113 checks como si todos fueran permisos. **No lo son.** Al clasificarlos:

| Eje | Qué controla | Cuántos checks hoy | Ejemplo | ¿Lo cubre Spatie? |
|---|---|---|---|---|
| **A. Permiso** (¿puede ejecutar la acción?) | acceso a ruta/acción | ~24 | `UserController` → `abort(403)` | ✅ sí |
| **B. Alcance de datos** (¿sobre qué filas?) | `branch_id`, propiedad | **74** | `->when(!isAdmin(), fn($q) => $q->where('branch_id', ...))` | ❌ **no** |
| **C. Visibilidad de campo** (¿qué columnas recibe?) | payload | ~6 | `expectedCash`, `purchase_price` | ❌ no |
| **D. Visibilidad de UI** (¿qué se muestra?) | layout/orden | 54 (frontend) | sidebar, botones, tabs | ❌ no |

**Si solo se instala Spatie y se traducen los `isAdmin()` a `can()`, se rompe el eje B**: un "encargado" con permiso `sales.view` vería las ventas de *todas* las sucursales. Este es el riesgo #1 de la migración y el plan actual no lo nombra.

**Diseño correcto:** el permiso responde *qué acción*; un **scope** independiente responde *sobre qué datos*.

---

## 5. Huecos de seguridad y bugs detectados (antes de tocar nada)

| # | Severidad | Hallazgo | Evidencia |
|---|---|---|---|
| H-1 | 🔴 Alta | **Reportes sin protección de ruta ni controlador.** Un vendedor puede abrir `/reports`, `/reports/sales-detail`, `/reports/sellers`, `/reports/branches` y sus exports PDF/Excel escribiendo la URL. Solo se oculta en el sidebar | `routes/reports.php` = `auth, verified`; `grep abort ReportController` → 0 resultados |
| H-2 | 🔴 Alta | **Proveedores abierto a vendedor**: `GET/POST/PUT/DELETE /suppliers` solo pide `auth`; los 11 `isAdmin()` del controlador solo fuerzan `branch_id`, no bloquean | `routes/suppliers.php`, [SupplierController.php:103](app/Http/Controllers/SupplierController.php#L103) |
| H-3 | 🟠 Media | **`/products` index expone `purchase_price`** a cualquier autenticado: `paginate()` sobre el modelo completo, sin `select` ni Resource | [ProductController.php:76](app/Http/Controllers/ProductController.php#L76) |
| H-4 | 🟠 Media | **`/stock-movements` index abierto** a vendedor (solo create/store/show están protegidos) | `routes/stock-movements.php` |
| H-5 | 🔴 Alta (UX) | **Encargado y vendedor no pueden cambiar su contraseña ni su perfil**: todo `routes/settings.php` está bajo `AdminMiddleware`, incluidos `settings/profile` y `settings/password`, pero el menú de usuario enlaza `profile.edit` para todos → redirect a dashboard con error | [settings.php:12](routes/settings.php#L12) vs [user-menu-content.tsx:33](resources/js/components/user-menu-content.tsx#L33) |
| H-6 | 🟡 Baja | **Permiso inferido de los datos**: Finanzas/Gastos/Plantillas deciden `isAdmin` con `branches.length > 0`. Si un día se le pasan sucursales a un encargado, hereda UI de admin | [finances/index.tsx:229](resources/js/pages/finances/index.tsx#L229), [expenses/index.tsx:178](resources/js/pages/expenses/index.tsx#L178) |
| H-7 | 🟡 Baja | `routes/users.php` sin middleware: depende de 7 `abort()` repetidos. Si se añade un método sin el check, queda abierto | `routes/users.php` |
| H-8 | 🟡 Baja | `AdminMiddleware` responde con **redirect 302**, no 403, en peticiones no-JSON. Los tests lo asumen; una futura UI SPA lo verá como éxito | [AdminMiddleware.php:20-24](app/Http/Middleware/AdminMiddleware.php#L20-L24) |

> Estos 8 puntos deben corregirse **como parte de** la migración (el nuevo sistema los cierra estructuralmente), no antes ni después.

---

## 6. Arquitectura propuesta (completa)

### 6.1 Modelo mental

```
Usuario ─┬─ tenant_id ──────────► aislamiento (ya resuelto por TenantScope)
         ├─ Rol(es) ────────────► conjunto de PERMISOS   (eje A)  ← Spatie
         ├─ scope de datos ─────► all | branch | own      (eje B)  ← propio
         ├─ permisos de campo ──► subset de A            (eje C)  ← propio
         └─ preferencias UI ────► orden/oculto           (eje D)  ← propio
```

### 6.2 Base de datos

```
tenants                (ya existe en la rama)
permissions            (Spatie, GLOBAL, sembrado desde PermissionCatalog)
roles                  (Spatie, team_id = tenant_id)
  + is_default  bool          → no eliminable
  + is_system   bool          → no editable (Administrador del tenant)
  + description string|null
  + data_scope  enum('all','branch','own') default 'branch'   ← EJE B
role_has_permissions / model_has_roles / model_has_permissions (Spatie)

tenant_modules         (id, tenant_id, module, enabled)        ← EJE D (por negocio)
ui_preferences         (id, tenant_id, user_id|null, key, value json) ← EJE D (orden/oculto)
```

`data_scope` en el **rol** (no en el usuario) mantiene una sola fuente de verdad y permite roles como "Encargado regional" (`all`) sin tocar código.

### 6.3 Catálogo de permisos — `app/Authorization/PermissionCatalog.php`

Fuente única de verdad. Cada permiso declara metadatos que la UI de gestión y el seeder consumen:

```php
'products.view' => [
    'module'   => 'products',
    'label'    => 'Ver catálogo',
    'group'    => 'Catálogo',
    'requires' => [],                 // dependencias duras
    'implies'  => [],                 // permisos que arrastra
],
'pos.access' => [
    'module'   => 'pos',
    'label'    => 'Usar el POS',
    'requires' => ['products.view', 'sales.create', 'payment_methods.view'],
],
'products.view_purchase_price' => [
    'module' => 'products',
    'type'   => 'field',              // EJE C: filtra payload, no rutas
    'fields' => ['products.purchase_price', 'products.margin'],
],
```

`requires` resuelve el acoplamiento del §3.2: la UI de gestión **no deja guardar** un rol con `pos.access` sin sus dependencias, y avisa qué se activará en cascada.

**Catálogo por módulo** (validado contra las rutas reales, §2):

| Módulo | Permisos |
|---|---|
| dashboard | `view`, `revenue.view`, `top_products.view`, `low_stock.view`, `branch_sales.view`, `pending_sales.view` |
| pos | `access`, `sell`, `apply_discount`, `open_drawer`, `sell_variable_price` |
| products | `view`, `create`, `update`, `delete`, `restore`, `force_delete`, `update_stock`, `sync_suppliers`, `view_purchase_price`*, `export` |
| categories | `view`, `create`, `update`, `delete`, `restore` |
| clients | `view`, `create`, `update`, `delete`, `view_history` |
| sales | `view`, `create`, `update`, `delete`, `complete_pending`, `manage_pending`, `view_deleted`, `refund`, `view_profit`* |
| credits | `view`, `create`, `register_payment`, `cancel`, `view_receivables` |
| suppliers | `view`, `create`, `update`, `delete`, `view_purchase_price`* |
| stock_movements | `view`, `create`, `view_detail`, `view_statistics` |
| payment_methods | `view`, `create`, `update`, `delete` |
| cash_sessions | `view`, `view_all`, `open`, `close`, `movements`, `view_expected`* |
| finances | `view`, `view_cogs`*, `view_profit`* |
| expenses | `view`, `create`, `update`, `delete`, `templates.manage`, `categories.manage` |
| reports | `view`, `sales_detail.view`, `products.view`, `sellers.view`, `branches.view`, `cash_balance.view`, `returns.view`, `export` |
| users | `view`, `create`, `update`, `delete`, `restore`, `assign_role` |
| branches | `view`, `create`, `update`, `delete`, `restore` |
| settings | `business.view`, `business.update`, `ticket.update`, `appearance.update`, `printer.manage`, `roles.manage`, `modules.manage` |
| profile | `view`, `update`, `change_password` ← **siempre concedido** (cierra H-5) |

`*` = permiso de tipo **field** (eje C): no bloquea la ruta, filtra el payload.

### 6.4 Enforcement backend (4 capas, todas obligatorias)

**Capa 1 — Ruta.** Sustituir `AdminMiddleware`/`AdminOrManagerMiddleware` por `can:`:
```php
Route::get('/suppliers', [SupplierController::class, 'index'])->middleware('can:suppliers.view');
Route::middleware('can:reports.view')->prefix('reports')->group(...);   // cierra H-1
```
Regla: **ninguna ruta autenticada sin `can:`**, salvo `dashboard`, `profile.*` y `logout`. Un test recorre `Route::getRoutes()` y falla si alguna queda sin permiso.

**Capa 2 — Policy por modelo.** `ProductPolicy`, `SalePolicy`, `SupplierPolicy`, `CashSessionPolicy`, `CreditSalePolicy`, `ExpensePolicy`, `UserPolicy`, `BranchPolicy`. Cada método combina permiso **y** alcance:
```php
public function view(User $u, Sale $sale): bool
{
    return $u->can('sales.view') && $this->inScope($u, $sale);   // ejes A + B juntos
}
```

**Capa 3 — Alcance de datos (eje B).** Un trait reemplaza los 74 checks dispersos:
```php
// app/Authorization/Concerns/ScopesToUserAccess.php
$query->scopeForUser($user);   // all → sin filtro | branch → where branch_id | own → where user_id
```
Aplicado en `ReportQueryService`, y en los `index()` de Ventas, Productos, Créditos, Gastos, Proveedores, Caja. `BranchFilterMiddleware` desaparece.

**Capa 4 — Filtrado de campos (eje C).** API Resources condicionales; nada de `Model::paginate()` crudo (cierra H-3):
```php
class ProductResource extends JsonResource {
    public function toArray($r): array {
        return [ /* ... */ ] + $this->mergeWhen(
            $r->user()->can('products.view_purchase_price'),
            ['purchase_price' => $this->purchase_price, 'margin' => $this->margin]
        );
    }
}
```

### 6.5 Enforcement frontend

`HandleInertiaRequests@share` añade (lazy, cacheado por request):
```php
'auth' => [
    'user'        => $request->user(),
    'permissions' => fn () => $this->permissionsFor($request->user()),   // string[]
    'scope'       => fn () => $request->user()?->dataScope(),            // 'all'|'branch'|'own'
    'modules'     => fn () => TenantModules::enabled(),                  // string[]
],
```
- `usePermissions()` → `can(p)`, `canAny([...])`, `canAll([...])`, `scope`.
- `<Can permission="products.create">…</Can>` y `<Can any={[...]}>`.
- `app-sidebar.tsx`: `roles: string[]` → `permission: string` en `NavItem`; el padre se muestra si algún hijo pasa; se compone con `modules`.
- Sustituir `branches.length > 0` por `can('...')` (cierra H-6).
- Regla ESLint que prohíbe `auth.user.role` fuera de `pages/users/*`.

**Regla de composición final de visibilidad:**
```
visible = moduloHabilitado(tenant) && can(permiso) && !ocultoPorPreferencia(user|tenant)
```

### 6.6 Capa de personalización (eje D) — el "quitar/ocultar/mover"

- **`tenant_modules`**: apagar módulos enteros por negocio ("este cliente no usa Créditos"). Se valida **también en backend** (middleware `module:credits`), no solo en el sidebar.
- **`ui_preferences`**: orden del sidebar, widgets del dashboard visibles y su orden, columnas de tabla. Nivel tenant (por defecto) y override por usuario.
- Panel: `/settings/appearance/modules` (admin del tenant) y `/admin/tenants/{tenant}/modules` (SuperAdmin).

### 6.7 UI de gestión de roles

- `/settings/roles` (requiere `settings.roles.manage`) — lista de roles, crear/duplicar/editar/eliminar (no los `is_system`).
- Editor = **matriz módulo × acción** con checkboxes, generada desde `PermissionCatalog`; selector de `data_scope`; validación de `requires` en vivo.
- **Vista previa**: renderiza el sidebar resultante y lista las rutas permitidas/denegadas antes de guardar.
- Presets: "Solo lectura", "Cajero", "Bodeguero".
- `/admin/tenants/{tenant}/roles` para el SuperAdmin + acción "copiar set de permisos de otro tenant".

### 6.8 Integración con multitenancy (dependencia dura)

- `config/permission.php`: `'teams' => true`, `'team_foreign_key' => 'tenant_id'`.
- `PermissionRegistrar::setPermissionsTeamId($tenant->id)` se llama **dentro de `IdentifyTenant`**, justo después de `$this->tenants->set($tenant)` ([IdentifyTenant.php:74](app/Http/Middleware/IdentifyTenant.php)) — antes de `SubstituteBindings`, para que las Policies vean el team correcto en route-model binding.
- `TenantProvisioner` (ya existe en la rama) debe sembrar los 3 roles por defecto + `tenant_modules` al crear un tenant.
- **SuperAdmin queda fuera de Spatie**: su acceso a `/admin` lo da `EnsureSuperAdmin`, no permisos de tenant. No mezclar.
- Spatie cachea permisos: `forgetCachedPermissions()` al cambiar de team y tras editar un rol.

> **Orden obligatorio:** mergear `feature/multitenancy-infra` **antes** de empezar. Si no, `team_id` habría que migrarlo dos veces.

---

## 7. Correcciones al `ROLES_PERMISSIONS_PLAN.md` existente

| # | El plan dice | Corrección |
|---|---|---|
| C-1 | "129 checks backend / 128 frontend" | **113 / 54**. Y sobre todo: **74 de los 113 son alcance de sucursal, no permisos** |
| C-2 | "traducir cada `isAdmin()` al permiso real" | Imposible para 74 de ellos: no hay permiso equivalente. Necesitan el **eje B (`data_scope`)** — ausente del plan. Sin esto, la migración rompe el aislamiento por sucursal |
| C-3 | Apéndice A: "`clients.php`/`suppliers.php`/`reports.php` → (auth)" | Lo lista como estado, pero no lo marca como **hueco de seguridad**. Reportes y Proveedores están abiertos hoy (H-1, H-2) |
| C-4 | No menciona `settings/profile` ni `settings/password` | Están bajo `AdminMiddleware`: 2 de cada 3 roles no pueden cambiar su contraseña (H-5). El catálogo necesita `profile.*` siempre concedido |
| C-5 | "permisos → `can()`; el frontend oculta" | Falta el **eje C**: `ProductController@index` pagina el modelo completo → `purchase_price` viaja al vendedor hoy mismo (H-3) |
| C-6 | Bloque 8 (capa visual) marcado "opcional / nice to have" | Es exactamente lo que pide el negocio ("quitar, ocultar o mostrar por cliente"). Debe entrar como `tenant_modules` desde PR-4, no al final |
| C-7 | No define dependencias entre permisos | POS depende de Productos + Ventas + Métodos de pago (§3.2). Sin `requires` en el catálogo, un admin puede dejar el POS roto sin saberlo |
| C-8 | Bloque 3.3: "un usuario, un rol" | Correcto, pero además hay que añadir `assign_role` como permiso: hoy `UserController` valida `in:administrador,encargado,vendedor` hardcodeado; con roles dinámicos debe validar contra los roles del tenant |

---

## 8. Secuencia de implementación

> Precondición: **`feature/multitenancy-infra` mergeado a master.**

| PR | Contenido | Dependencias | Riesgo |
|---|---|---|---|
| **PR-0** | ✅ **HECHO** — cierra H-1..H-5 y H-7 con los middlewares actuales (parche defensivo, sin arquitectura nueva) | — | Bajo. **Desplegable ya** |
| **PR-1** | Spatie + teams, `PermissionCatalog`, seeder de permisos, `HasRoles` en `User`, team resolver en `IdentifyTenant` | multitenancy | Bajo |
| **PR-2** | Roles por defecto + `data_scope` + migración de los usuarios actuales (`administrador`→all, `encargado`→branch, `vendedor`→branch/own). **Backup de Railway antes** | PR-1 | **Alto** — datos en producción |
| **PR-3** | Eje B: trait `ScopesToUserAccess`, aplicarlo en `ReportQueryService` + los `index()`; retirar `BranchFilterMiddleware`. Los 74 checks salen aquí | PR-2 | **Alto** — es donde se rompe el aislamiento si se hace mal |
| **PR-4** | Eje A backend: rutas con `can:`, Policies, retirar `AdminMiddleware`/`AdminOrManagerMiddleware`, los ~24 checks restantes | PR-3 | Medio |
| **PR-5** | Eje C: API Resources con campos condicionales (productos, ventas, finanzas, caja) | PR-4 | Medio |
| **PR-6** | Frontend core: compartir `permissions`/`scope`/`modules` por Inertia, `usePermissions`, `<Can>`, sidebar por permiso | PR-4 | Bajo |
| **PR-7** | Frontend páginas: los 54 condicionales + eliminar `branches.length > 0`; regla ESLint | PR-6 | Bajo |
| **PR-8** | UI de gestión de roles (tenant + SuperAdmin) con matriz, `requires` y vista previa | PR-6 | Medio |
| **PR-9** | Eje D: `tenant_modules` + `ui_preferences` + panel de módulos | PR-8 | Bajo |
| **PR-10** | Limpieza: retirar `users.role`, `isAdmin/isManager/isSeller` | todo | Medio |

**Camino corto si urge:** PR-0 (hoy) → PR-1 → PR-2 → PR-3 → PR-4 → PR-6 → PR-8. Con eso ya se puede "dar y quitar permisos por cliente" sin tocar código.

---

## 9. Pruebas (además de las existentes)

Ya existen `tests/Feature/RBAC/{Admin,Vendedor}PermissionsTest.php` y `BranchIsolation/BranchScopeTest.php` — **sirven de red de regresión**, pero solo cubren 13 casos.

1. **Snapshot de regresión** (antes de PR-1): recorrer todas las rutas con un usuario de cada rol y guardar el código de respuesta. PR-2..PR-7 no deben alterar ese snapshot.
2. **Cobertura de rutas**: test que falla si alguna ruta autenticada carece de `can:`.
3. **Aislamiento por alcance**: rol con `data_scope=branch` no ve filas de otra sucursal en cada `index()`.
4. **Aislamiento por tenant**: rol "Administrador" del tenant A no otorga permisos en B (extiende `TenantIsolationTest`).
5. **Campos sensibles**: la respuesta **no contiene** `purchase_price` / `expectedCash` sin el permiso (assert sobre el JSON, no sobre el render).
6. **Dependencias del catálogo**: guardar un rol con `pos.access` sin `products.view` es rechazado.
7. **Cambio en caliente**: quitar un permiso a un rol cambia el acceso en la siguiente petición (invalidación de caché de Spatie).
8. `php artisan test` + `composer analyse` (PHPStan) en cada PR.

---

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| **Perder el aislamiento por sucursal** al migrar los 74 checks | PR-3 aislado, con el snapshot del §9.1 como puerta |
| Migración de datos en producción (5 usuarios, Railway/MySQL) | Seeder idempotente y transaccional + backup + verificación post-deploy |
| Caché de permisos de Spatie con teams | `forgetCachedPermissions()` en `IdentifyTenant` al cambiar de tenant y tras editar roles |
| Superficie grande (167 puntos) | Migrar por módulo, un PR por eje, nunca todo junto |
| Admin del tenant se auto-bloquea | Rol `is_system` no editable + validación "siempre debe quedar ≥1 usuario con `settings.roles.manage`" |
| El frontend como falsa barrera | Regla: todo `<Can>` tiene su `can:`/Policy equivalente en backend; test §9.2 lo garantiza |
| Módulo apagado accesible por URL | `tenant_modules` validado en middleware, no solo en el sidebar |


---

## 11. Estado real de producción (verificado el 2/09/2026)

Consultado directamente contra Railway (`turntable.proxy.rlwy.net:42642`, base `railway`, MySQL 9.6.0) — **no confundir con la local** (`127.0.0.1/stokity_v2`), que sí tiene `tenants` y un `super_admin` porque quedó migrada con la rama de multitenancy.

### Usuarios en producción
| id | Nombre | Rol | Sucursal | Estado |
|---|---|---|---|---|
| 1 | Juan Jose Saldarriaga | `administrador` | Zarzal | activo |
| 4 | Daniela Sierra | `administrador` | Zarzal | activo |
| 5 | Mariana | `encargado` | Zarzal | activo |
| 7 | Kelly Castaneda | `encargado` | Zarzal | activo |
| 2 | Encargado User | `encargado` | Zarzal | soft-deleted 09/04 |
| 3 | Vendedor User | `vendedor` | — | soft-deleted 09/04 |

**Ningún vendedor activo.** Los 4 usuarios reales entraron el 2/09 entre 17:31 y 17:58 → la app está en uso diario.

### Volumen de datos
| Tabla | Filas |
|---|---|
| productos | 72 |
| categorías | 8 |
| sucursales | 5 |
| clientes | 1 |
| **ventas** | **0** |
| **sesiones de caja** | **0** |
| **movimientos de stock** | **0** |
| créditos / gastos | 0 / 0 |

### Consecuencias para la migración
1. **Están en fase de carga, no de operación.** Cero historial transaccional = la ventana más barata para el backfill de `tenant_id`. Cada semana que pase encarece PR-1.
2. **Producción NO tiene `tenants` ni `users.tenant_id`** — la rama `feature/multitenancy-infra` nunca se desplegó. Su merge es el primer cambio de esquema.
3. **PR-0 no le quita acceso a nadie**: los huecos cerrados (reportes, proveedores, movimientos de stock) solo estaban abiertos para vendedores, y no hay ninguno activo. Lo único que cambia para un usuario real es que **Mariana y Kelly ya pueden entrar a su perfil y cambiar su contraseña**.
4. Mapeo para PR-2: ids 1 y 4 → rol Administrador (`scope=all`); ids 5 y 7 → rol Encargado (`scope=branch`, Zarzal); el rol Vendedor se siembra sin asignar.
