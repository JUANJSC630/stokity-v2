# Plan Maestro — Sistema de Roles y Permisos Granular (Stokity v2)

> Objetivo: reemplazar los **3 roles fijos hardcodeados** (`administrador`/`encargado`/`vendedor`) por un sistema de **roles y permisos granular, configurable por cliente (tenant)**, para poder **mostrar/ocultar/habilitar/deshabilitar** módulos y secciones según lo pida cada negocio — de forma profesional y mantenible.
>
> **Dolor actual:** cada cliente pide ocultar/mover/mostrar secciones distintas de distintos módulos. Hoy eso es imposible sin tocar código, porque el acceso está cableado a 3 roles.
>
> **Punto de partida (medido en el código):**
> - Backend: **129 checks inline** `isAdmin()/isManager()/isSeller()` en ~23 archivos + 2 middlewares (`AdminMiddleware`, `AdminOrManagerMiddleware`).
> - Frontend: **128 condicionales de rol** en ~30 páginas + `app-sidebar.tsx` con `roles: [...]` por ítem.
> - **No hay** paquete de permisos instalado.
>
> **Relación con multitenancy:** este sistema se integra con `MULTITENANCY_PLAN.md`. Los roles/permisos son **por tenant** (cada negocio define los suyos). Ver Bloque 10.

---

## Bloque 0 — Decisiones de arquitectura

| Decisión | Resolución | Razón |
|---|---|---|
| Motor de permisos | **`spatie/laravel-permission`** | Estándar de facto, mantenido, integra con Gate/`@can`, soporta **teams** (= tenant) |
| Aislamiento por tenant | **Feature "teams"** de Spatie con `team_id = tenant_id` | Roles y permisos por negocio sin colisión |
| Unidad de autorización | **Permisos** (no roles) en TODO el código | Roles = colecciones de permisos editables; el código verifica `can('products.create')`, nunca `role === 'administrador'` |
| Convención de nombres | `modulo.accion` y `modulo.seccion.accion` | Ej. `products.view`, `products.create`, `dashboard.revenue.view` |
| Roles por defecto | Sembrados por tenant: Administrador (todos), Encargado, Vendedor | Editables por el Admin del tenant o el SuperAdmin |
| Personalización por cliente | Admin del tenant **y** SuperAdmin editan roles/permisos | El SuperAdmin es el power-user que atiende pedidos de clientes |
| Capa de "ocultar/mostrar/mover" | **2 capas**: (1) Permisos = seguridad; (2) Preferencias de UI = layout/orden (Bloque 8) | Separar autorización de personalización visual |
| Frontend | Inertia comparte `auth.permissions`; hook `usePermissions()` + `<Can>` | UI gatea por permiso, no por rol |
| Seguridad | **Backend SIEMPRE valida** (Policies + `can:` middleware) | El frontend solo oculta; nunca es la barrera de seguridad |

> ⚠️ **Principio rector:** el frontend **oculta** por UX, el backend **autoriza** por seguridad. Cada permiso se valida en ambos lados, pero la verdad está en el servidor.

---

## Bloque 1 — Paquete y configuración base

1. `composer require spatie/laravel-permission`.
2. Publicar config + migraciones.
3. **Activar teams** en `config/permission.php`: `'teams' => true`, `'team_foreign_key' => 'tenant_id'`.
4. `User` usa `use HasRoles;` (trait de Spatie).
5. Configurar el **team resolver**: que Spatie tome el `team_id` actual del `TenantManager` (del plan de multitenancy). Si aún no existe multitenancy, usar `tenant_id` directo del usuario.
6. Registrar el `PermissionRegistrar::setPermissionsTeamId()` en el middleware `IdentifyTenant` (o uno nuevo `SetSpatieTeam`).

> Si se implementa **antes** que multitenancy, `team_id` puede ser un placeholder global (`1`) y migrar luego. **Recomendado:** hacerlo junto/después de multitenancy para que `team_id = tenant_id` desde el inicio.

---

## Bloque 2 — Taxonomía de permisos (catálogo completo, sin huecos)

Convención: `modulo.accion`. Acciones estándar: `view` (listar/ver), `create`, `update`, `delete`, `restore` (papelera), `export`. Permisos de **sección/UI** usan un tercer nivel: `modulo.seccion.accion`.

### 2.1 Permisos por módulo (CRUD + acciones)

| Módulo | Permisos |
|---|---|
| **dashboard** | `dashboard.view` |
| **pos** | `pos.access`, `pos.sell`, `pos.apply_discount`, `pos.open_drawer` |
| **products** (catálogo) | `products.view`, `products.create`, `products.update`, `products.delete`, `products.restore`, `products.export`, `products.view_purchase_price` (sección sensible) |
| **categories** | `categories.view`, `categories.create`, `categories.update`, `categories.delete`, `categories.restore` |
| **clients** | `clients.view`, `clients.create`, `clients.update`, `clients.delete`, `clients.view_history` |
| **sales** | `sales.view`, `sales.create`, `sales.update`, `sales.delete` (eliminadas — hoy solo admin), `sales.view_deleted`, `sales.refund` (devoluciones), `sales.view_profit` |
| **credits** | `credits.view`, `credits.create`, `credits.register_payment`, `credits.cancel` |
| **suppliers** | `suppliers.view`, `suppliers.create`, `suppliers.update`, `suppliers.delete` |
| **stock_movements** | `stock_movements.view`, `stock_movements.create`, `stock_movements.adjust`, `stock_movements.write_off` |
| **payment_methods** | `payment_methods.view`, `payment_methods.create`, `payment_methods.update`, `payment_methods.delete` |
| **cash_sessions** | `cash_sessions.view`, `cash_sessions.open`, `cash_sessions.close`, `cash_sessions.view_expected` (cierre ciego vs. ver esperado), `cash_sessions.movements` |
| **finances** | `finances.view`, `finances.view_cogs`, `finances.view_profit` |
| **expenses** | `expenses.view`, `expenses.create`, `expenses.update`, `expenses.delete`, `expense_templates.manage`, `expense_categories.manage` |
| **reports** | `reports.view`, `reports.sales_detail.view`, `reports.products.view`, `reports.sellers.view`, `reports.branches.view`, `reports.cash_balance.view`, `reports.returns.view`, `reports.export` |
| **users** | `users.view`, `users.create`, `users.update`, `users.delete`, `users.restore` |
| **branches** | `branches.view`, `branches.create`, `branches.update`, `branches.delete` |
| **settings** | `settings.business.view`, `settings.business.update`, `settings.ticket.update`, `settings.roles.manage` (gestionar roles/permisos del tenant) |

### 2.2 Permisos de sección/visibilidad (el "ocultar/mostrar random")

Estos cubren los pedidos de clientes para esconder pedazos concretos:
- `dashboard.revenue.view` — ver ingresos/ventas del mes en el dashboard
- `dashboard.top_products.view`, `dashboard.low_stock.view`, `dashboard.sellers.view`
- `products.view_purchase_price` — ver precio de compra/margen
- `sales.view_profit`, `finances.view_profit`, `finances.view_cogs`
- `cash_sessions.view_expected` — ver efectivo esperado en cierre (vs. cierre ciego)

> **Regla:** si un cliente pide "que el vendedor no vea X sección", se traduce a **revocar el permiso correspondiente** a su rol — sin tocar código.

### 2.3 Registro del catálogo
- Un archivo único `app/Authorization/PermissionCatalog.php` (array constante con todos los permisos agrupados por módulo) = **fuente de verdad**.
- El seeder y la UI de gestión leen de ahí (no duplicar listas).

---

## Bloque 3 — Modelo de roles

### 3.1 Roles por defecto (sembrados por tenant)
| Rol | Permisos por defecto |
|---|---|
| **Administrador** | TODOS los del catálogo (del tenant) |
| **Encargado** | Operación + reportes + catálogo + finanzas, sin `users`, `branches`, `payment_methods`, `settings.roles` |
| **Vendedor** | `pos.*`, `sales.create/view`, `clients.*`, `cash_sessions.open/close`, `credits.view/register_payment` — sin precios de compra, sin finanzas, sin reportes sensibles |

> El mapeo exacto sale del Apéndice B (rol actual → permisos), para **replicar el comportamiento de hoy** tras la migración.

### 3.2 Roles personalizados
- El Admin del tenant (con `settings.roles.manage`) puede **crear roles nuevos** (ej. "Cajero", "Bodeguero") y asignar permisos a la carta.
- El SuperAdmin puede hacerlo para cualquier tenant.
- Los 3 roles por defecto son editables pero **no eliminables** (flag `is_default`) para no romper la operación.

### 3.3 Asignación
- Un `User` tiene **un rol** (o varios, Spatie lo permite; recomendado **uno** para simplicidad).
- El campo legacy `users.role` (string) se **mantiene temporalmente** para no romper, pero la verdad pasa a ser Spatie. Plan de retiro en Bloque 9.

---

## Bloque 4 — Esquema de base de datos

Spatie crea: `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`. Con teams activado, `roles` y las pivote llevan `team_id` (= `tenant_id`).

- `roles`: añadir `is_default` (boolean) y `description` (nullable).
- `permissions`: se siembran desde `PermissionCatalog` (globales, **no** por tenant — los permisos son el catálogo fijo; lo que varía por tenant es **qué rol los tiene**).
- Índices: Spatie ya define los necesarios; verificar `(team_id, name, guard_name)`.

> Decisión: **permisos globales, roles por tenant.** El catálogo de permisos es el mismo para todos (define qué *puede existir*); cada tenant arma sus roles con subconjuntos. Esto simplifica el seeding y la UI.

---

## Bloque 5 — Enforcement en el BACKEND

### 5.1 Reemplazar los 2 middlewares de rol
- `AdminMiddleware` y `AdminOrManagerMiddleware` → **eliminar** y usar el middleware `can:` de Spatie/Laravel en las rutas.
- Ejemplo en `routes/products.php`:
  ```php
  // Antes: ->middleware(AdminOrManagerMiddleware::class)
  Route::middleware('can:products.update')->group(fn () => /* create/edit/delete */);
  Route::get('products', ...)->middleware('can:products.view');
  ```
- Mapear cada grupo de rutas a su permiso. Tabla de mapeo en Apéndice A.

### 5.2 Policies por modelo
- Crear Policies (`ProductPolicy`, `SalePolicy`, etc.) que deleguen en permisos:
  ```php
  public function update(User $u, Product $p): bool { return $u->can('products.update'); }
  ```
- Usar en controladores: `$this->authorize('update', $product)`.
- Route Model Binding + Policy = autorización declarativa y testeable.

### 5.3 Reemplazar los 129 checks inline
- `if ($user->isAdmin())` → `if ($user->can('reports.branches.view'))` (el permiso correcto según el contexto).
- **No** traducir 1:1 a "es admin"; traducir a la **capacidad real** que protege ese bloque (ej. ver precio de compra → `products.view_purchase_price`).
- Mantener `isAdmin()/isManager()/isSeller()` como helpers **deprecados** durante la transición; marcarlos `@deprecated` y migrar archivo por archivo.

### 5.4 Form Requests
- En `ProductRequest`, `BranchRequest`, etc., `authorize()` debe consultar permisos.

### 5.5 Datos sensibles en respuestas
- Ojo: ocultar en UI no basta. Si un vendedor no debe ver `purchase_price`, el controlador/recurso **no debe enviar** ese campo (no solo ocultarlo en React). Usar API Resources condicionales o `makeHidden()` según permiso.

---

## Bloque 6 — Enforcement en el FRONTEND

### 6.1 Compartir permisos vía Inertia
En `HandleInertiaRequests@share`:
```php
'auth' => [
    'user' => $request->user(),
    'permissions' => fn () => $request->user()?->getAllPermissions()->pluck('name') ?? [],
    'roles' => fn () => $request->user()?->getRoleNames() ?? [],
],
```
(Lazy + cacheable por request.)

### 6.2 Hook + componente
```tsx
// usePermissions()
const { can } = usePermissions();
can('products.create'); // boolean

// <Can> component
<Can permission="products.create"><Button>Nuevo</Button></Can>
<Can permission="products.view_purchase_price"><PriceColumn/></Can>
```
- `usePermissions` lee `auth.permissions` de `usePage()`.
- Soportar `can('a') && can('b')`, `canAny([...])`.

### 6.3 Refactor del sidebar (`app-sidebar.tsx`)
- Cambiar `roles: ['administrador', ...]` por `permission: 'products.view'` en cada `NavItem`.
- El filtro pasa de `item.roles.includes(userRole)` a `can(item.permission)`.
- Ítems con hijos: el padre se muestra si hay ≥1 hijo permitido.
- Actualizar el tipo `NavItem` en `resources/js/types`.

### 6.4 Reemplazar los 128 condicionales de rol
- Buscar `role === 'administrador'` / `auth.user.role` y cambiar por `can('permiso.correcto')`.
- Página por página (clients, products, sales, reports, users, branches, dashboard, settings, …).
- Lint rule opcional: prohibir `auth.user.role ===` para evitar regresiones.

---

## Bloque 7 — UI de gestión de roles y permisos

### 7.1 Para el Admin del tenant (`/settings/roles`)
- Requiere `settings.roles.manage`.
- Lista de roles del tenant; crear/editar/eliminar (salvo defaults).
- Editor de permisos: matriz **módulos × acciones** con checkboxes, agrupada por el `PermissionCatalog`.
- Asignar rol a empleados (integra con `UserController`).

### 7.2 Para el SuperAdmin (`/admin/tenants/{tenant}/roles`)
- Mismo editor pero para cualquier tenant (atiende pedidos de clientes).
- Acción rápida: "duplicar set de permisos de un tenant a otro".

### 7.3 UX del editor
- Presets ("Vendedor básico", "Cajero", "Solo lectura").
- Vista previa: "qué verá este rol" (simula el sidebar resultante).

---

## Bloque 8 — Capa de personalización visual (mover/ordenar/ocultar por preferencia)

Separada de la seguridad. Cubre "mover" y "ocultar por gusto, no por permiso".

- **Toggle de módulos por tenant:** tabla `tenant_modules` (o JSON en `business_settings.module_config`) que enciende/apaga módulos completos para un negocio, **independiente** de permisos. Útil si un cliente "no usa Créditos".
- **Orden/visibilidad del sidebar y widgets del dashboard:** preferencias por tenant (o por usuario) en JSON. Ej. `dashboard_layout`, `sidebar_order`.
- **Regla de composición final:** un ítem se muestra si `móduloHabilitado(tenant) && can(permiso) && preferenciaVisible`.
- **Prioridad:** implementar esta capa **después** del core de permisos (Bloques 1–7). Es "nice to have" para el pedido de "mover/ordenar".

---

## Bloque 9 — Migración de datos (proteger usuarios existentes)

> Objetivo: tras instalar el sistema, los 5 usuarios actuales **siguen operando igual** que hoy.

**Pasos (transaccional, idempotente):**
1. Instalar Spatie + migraciones (Bloque 1).
2. Seeder de **permisos** desde `PermissionCatalog` (guard `web`).
3. Por cada tenant existente (hoy: tenant 1), crear los **3 roles por defecto** con sus permisos (Apéndice B).
4. **Mapear cada usuario** según su `users.role` legacy:
   - `administrador` → rol Administrador
   - `encargado` → rol Encargado
   - `vendedor` → rol Vendedor
   - `super_admin` → NO recibe roles de tenant (opera fuera).
5. **Verificar**: cada usuario tiene exactamente 1 rol; los permisos resultantes replican el acceso actual (test de regresión, Bloque 11).
6. Dejar `users.role` intacto por ahora (fuente legacy); retirarlo en una fase posterior cuando todo consuma Spatie.

**Backup previo** del MySQL (Railway) antes de sembrar en producción.

---

## Bloque 10 — Integración con Multitenancy

- `team_id` de Spatie = `tenant_id`. El team actual se fija en el mismo middleware que resuelve el tenant (`IdentifyTenant` → `PermissionRegistrar::setPermissionsTeamId($tenantId)`).
- **Orden recomendado:** implementar **multitenancy primero** (o al menos la infra de tenant), luego este sistema con `team_id = tenant_id` desde el día 1.
- El SuperAdmin (`tenant_id NULL`) no tiene team → sus permisos se manejan aparte (acceso total al panel `/admin` vía middleware `EnsureSuperAdmin`, no vía Spatie del tenant).
- Onboarding de tenant (`TenantProvisioner`, Bloque 9 del plan multitenancy) debe **sembrar los 3 roles** del nuevo tenant.

---

## Bloque 11 — Pruebas

1. **Regresión de acceso:** para cada uno de los 3 roles por defecto, verificar que ve/accede exactamente lo mismo que hoy (snapshot de rutas permitidas/denegadas).
2. **Permiso por endpoint:** cada ruta protegida responde 403 sin el permiso y 200 con él.
3. **Aislamiento por tenant:** un rol "Administrador" del tenant A no otorga permisos en el tenant B (teams).
4. **Frontend:** `<Can>` oculta/muestra correctamente; el sidebar refleja permisos.
5. **Datos sensibles:** un rol sin `products.view_purchase_price` **no recibe** el campo en la respuesta (no solo oculto en UI).
6. **Gestión de roles:** crear rol, asignar permisos, asignar a usuario, y que el acceso cambie en caliente.
7. `php artisan test` + `composer analyse` por bloque.

---

## Bloque 12 — Secuencia de implementación (PRs)

> **Decisión confirmada:** se implementa **multitenancy PRIMERO** y luego este sistema con `team_id = tenant_id` desde el día 1 (no se migra el team dos veces). La edición de roles la harán **tanto el SuperAdmin como el Admin de cada tenant** (Bloque 7).


1. **PR‑1 Base:** instalar Spatie (teams), `PermissionCatalog`, seeder de permisos, `User` con `HasRoles`, team resolver.
2. **PR‑2 Roles por defecto + migración de datos:** seeder de 3 roles por tenant + mapeo de usuarios actuales (Bloque 9). **Backup.**
3. **PR‑3 Backend enforcement:** rutas con `can:`, Policies, retirar `AdminMiddleware`/`AdminOrManagerMiddleware`, migrar los 129 checks (por módulos).
4. **PR‑4 Frontend core:** compartir permisos por Inertia, `usePermissions` + `<Can>`, refactor `app-sidebar.tsx`.
5. **PR‑5 Frontend páginas:** migrar los 128 condicionales (por carpeta de módulo).
6. **PR‑6 UI de gestión:** editor de roles/permisos (tenant Admin + SuperAdmin).
7. **PR‑7 (opcional) Capa visual:** toggles de módulos + orden de sidebar/dashboard (Bloque 8).
8. **PR‑8 Limpieza:** retirar `users.role` legacy y helpers `isAdmin()` deprecados.

---

## Bloque 13 — Riesgos y gotchas

- **Frontend NO es seguridad:** si solo se oculta en React, un usuario puede llamar la ruta. Backend SIEMPRE valida (Policies/`can:`). Riesgo #1.
- **Datos sensibles en payload:** ocultar columna ≠ no enviar el dato. Filtrar en backend según permiso (precio de compra, márgenes, efectivo esperado).
- **Migrar checks ≠ "es admin":** traducir cada `isAdmin()` al **permiso real** que protege; si no, se pierde granularidad y se replica el problema.
- **Teams de Spatie y caché de permisos:** Spatie cachea permisos; al cambiar el team (tenant) hay que `forgetCachedPermissions()` o setear el team **antes** de resolver permisos. Configurar bien el middleware.
- **Caché por request del usuario:** `getAllPermissions()` puede ser costoso; cachear por request y/o por usuario con invalidación al editar roles.
- **Roles default no eliminables:** proteger con `is_default` para no dejar a un tenant sin Administrador.
- **Orden con multitenancy:** si se hace antes de multitenancy, planear el `team_id` para no migrar dos veces.
- **129 + 128 puntos = superficie grande:** migrar por módulos con tests de regresión; no hacer todo en un PR gigante.
- **SuperAdmin fuera de Spatie‑teams:** su acceso al panel `/admin` no depende de permisos de tenant; no mezclar.

---

## Apéndice A — Mapeo ruta/módulo → permiso (para retirar los middlewares)

| Archivo de rutas | Middleware hoy | Permiso(s) destino |
|---|---|---|
| `branches.php` | AdminMiddleware | `branches.view` / `branches.create` / `branches.update` / `branches.delete` |
| `users.php` | (admin) | `users.*` |
| `payment-methods.php` | AdminMiddleware | `payment_methods.*` |
| `settings.php` | AdminMiddleware | `settings.business.*`, `settings.roles.manage` |
| `categories.php` | AdminOrManager | `categories.*` |
| `products.php` | AdminOrManager (subgrupo) | `products.view` / `products.create|update|delete` |
| `stock-movements.php` | AdminOrManager (subgrupo) | `stock_movements.*` |
| `finances.php` | AdminOrManager | `finances.view` |
| `sales.php` (eliminadas) | AdminMiddleware | `sales.view_deleted`, `sales.delete` |
| `reports.php` | (mixto) | `reports.*` (por sub-reporte) |
| `clients.php` | (auth) | `clients.*` |
| `credits.php` | (auth) | `credits.*` |
| `suppliers.php` | (auth) | `suppliers.*` |
| `cash-sessions.php` | (auth) | `cash_sessions.*` |
| `expenses`/`finances` | AdminOrManager | `expenses.*`, `finances.*` |

## Apéndice B — Mapeo rol actual → permisos (replicar comportamiento de hoy)

> Derivar de `app-sidebar.tsx` (`roles: [...]`) + los middlewares + los 129 checks. Resumen:

- **administrador** → catálogo completo (todos los permisos del tenant).
- **encargado** → todo lo de `administrador` **menos**: `users.*`, `branches.*`, `payment_methods.*`, `settings.roles.manage`, `reports.branches.view`, `sales.view_deleted`/`sales.delete`.
- **vendedor** → `dashboard.view`, `pos.*`, `sales.view/create`, `sales.refund`, `clients.*`, `cash_sessions.open/close/movements`, `credits.view/register_payment`. **Sin**: catálogo (edición), reportes, finanzas, stock, proveedores, precios de compra.

> ⚠️ Validar este mapeo contra el código real módulo por módulo durante PR‑2/PR‑3 (los 129 checks son la fuente exacta).

---

## Apéndice C — Checklist de "cero huecos"

- [ ] Spatie instalado con teams (`team_id = tenant_id`)
- [ ] `PermissionCatalog` como fuente única de verdad
- [ ] Seeder de permisos + 3 roles default por tenant
- [ ] Usuarios actuales mapeados a roles (regresión verde)
- [ ] `AdminMiddleware`/`AdminOrManagerMiddleware` retirados → `can:`
- [ ] Policies por modelo
- [ ] 129 checks backend migrados a `can()`
- [ ] Datos sensibles filtrados en backend según permiso
- [ ] Permisos compartidos por Inertia + `usePermissions`/`<Can>`
- [ ] `app-sidebar.tsx` por permisos
- [ ] 128 condicionales frontend migrados
- [ ] UI de gestión de roles (Admin tenant + SuperAdmin)
- [ ] (Opcional) capa visual: toggle módulos + orden
- [ ] `users.role` legacy retirado al final
- [ ] **Usuarios existentes operan igual que antes** ✅
```
