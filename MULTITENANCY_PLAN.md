# Plan Maestro — Migración a Multi‑Tenancy (Stokity v2)

> Objetivo: convertir la app de **un solo negocio** (con multi‑sucursal) en una **plataforma multi‑tenant** (muchos negocios aislados) **sin perder ni mezclar** los datos del negocio que **ya existe en producción**.
>
> Estado actual: 1 tenant existente (negocio "Lu Accesorios"), 5 usuarios, sucursales y `business_settings` ya poblados. **Este tenant debe quedar intacto y aislado tras la escalación.**
>
> Estrategia elegida: **Single Database + `tenant_id` en cada tabla + Global Scope automático** (row‑level multitenancy). Es la opción más simple de operar en Railway/MySQL, con aislamiento por columna y scopes globales de Eloquent. (Descartadas: DB‑por‑tenant y schema‑por‑tenant por costo operativo en Railway.)

---

## 📍 ESTADO DE AVANCE (rama `feature/multitenancy-infra`, NO mergeada)

> Decisiones confirmadas: tenant por usuario logueado · jerarquía SuperAdmin → Admin → empleados · roles/permisos van DESPUÉS (ver `ROLES_PERMISSIONS_PLAN.md`).

| Fase | Estado | Resumen |
|---|---|---|
| **1** Infra | ✅ | `tenants`, `Tenant`, `TenantManager`, `TenantScope`, trait `BelongsToTenant`, middleware `IdentifyTenant`, `TenancyServiceProvider` |
| **2** Esquema | ✅ | `tenant_id` nullable + índice en 23 tablas |
| **3** Backfill + FK | ✅ | crea tenant inicial (del business_settings) + asigna TODO + FK nullable. No hardcodea id=1 |
| **4** Trait en modelos | ✅ | `BelongsToTenant` en los 22 modelos. `tenant_id` fuera de `$fillable` (seguridad) |
| **5a** business_settings | ✅ | `getSettings()` por‑tenant + cache key por tenant |
| **5b** Queries crudas | ✅ | 23 `DB::table()` scopeadas (Dashboard, Finance, ReportQueryService) + cache keys por tenant |
| **5c** Switch (middleware) | ✅ | `IdentifyTenant` activo, **corre antes de SubstituteBindings** → route binding cross‑tenant 404. Tests de aislamiento HTTP en verde |
| **6** Uniques por tenant | ✅ | uniques compuestos `(tenant_id, code/document/email)` en products/sales/credit_sales/payment_methods/clients + validaciones `Rule::unique()->where()` scopeadas. `users.email` sigue global. **`tenant_id` queda NULLABLE** (NOT NULL diferido hasta que las factories lo estampen) |
| **7** Login redirect | ✅ | super‑admin → `/admin`, tenant → `/dashboard` (en `AuthenticatedSessionController`) |
| **8** Onboarding + SuperAdmin panel | ✅ | `User::ROLE_SUPER_ADMIN` + `isSuperAdmin()`, middleware `EnsureSuperAdmin`, `TenantProvisioner` (negocio+admin+settings+sucursal+métodos de pago+Consumidor Final), `Admin\TenantController` + `routes/admin.php` (list/create/suspend/activate), páginas `admin/tenants/{index,create}`, comando `tenancy:make-super-admin`, **`/register` deshabilitado** |
| **9** `db:clean-transactional` tenant‑aware | ✅ | exige `--tenant=ID`, borra solo ese negocio (delete where tenant_id), conserva sus users/settings/branches; cross‑DB (rompe el ciclo FK sales↔credit_sales sin desactivar FKs) |

**Verificado:** 171 tests pasan (incl. 4 de aislamiento + 6 de SuperAdmin + 2 del comando de limpieza). Todo lo hecho es desplegable; el comportamiento del único tenant actual no cambia. El aislamiento ya es real para 2+ tenants.

### ✅ Migración multi‑tenant COMPLETA (Fases 1–9 + limpieza)
- Limpieza ✅: borrados `RegisteredUserController` + `auth/register.tsx` huérfanos; el `AppSidebar` muestra nav de plataforma (Negocios) para `super_admin`.
- **`tenant_id` NOT NULL: evaluado y NO aplicado a propósito.** Servicios de dominio y muchos setups de test crean filas hijas vía `Model::create()` directo fuera de un request (sin contexto de tenant). El aislamiento ya lo garantizan el global scope + FK (un `tenant_id` null nunca coincide con un tenant). Forzar NOT NULL exigiría refactor amplio sin beneficio real → se queda nullable.
- **171 tests pasan.**

> **Antes del merge a master: backup de producción** (la Fase 3 corre en `migrate --force` del deploy). Tras el deploy: `php artisan tenancy:make-super-admin "Nombre" email`.

> **Pendientes menores:** `RegisteredUserController` + `auth/register.tsx` quedan huérfanos (sin ruta) — borrar en limpieza. Panel `/admin` usa el `AppLayout` del tenant (sidebar muestra POS); convendría un layout propio de SuperAdmin. `db:clean-transactional` aún borra global (Fase 9). Forzar `tenant_id` NOT NULL requiere factories tenant‑aware.
>
> **Cómo crear el primer SuperAdmin (tras el deploy):** `php artisan tenancy:make-super-admin "Tu Nombre" tu@email.com` (pide contraseña). Luego entra a `/admin/tenants`.

> **Nota sobre NOT NULL (diferido):** `tenant_id` se deja nullable porque las factories de test crean filas sin contexto de tenant. El aislamiento NO depende de NOT NULL (lo garantizan el global scope + FK). Enforzar NOT NULL requiere primero hacer las factories tenant‑aware; se hará junto con la suite de tests de la Fase 8.

> ⚠️ Aún NO mergeado a master. La migración de datos (Fase 3) se ejecuta en el deploy (`migrate --force`); **hacer backup de producción antes del merge/deploy**.

---

## Bloque 0 — Decisiones de arquitectura (leer primero)

| Decisión | Resolución | Razón |
|---|---|---|
| Modelo de aislamiento | 1 BD, `tenant_id` por fila | Operación simple, backups únicos, migración incremental |
| ¿Quién es el "tenant"? | Tabla nueva `tenants` (el negocio/cuenta) | Hoy el "negocio" es el singleton `business_settings`; se promueve a entidad de primer nivel |
| Resolución de tenant | Por **usuario autenticado** (`users.tenant_id`) | Toda la app está detrás de `auth`; no requiere subdominios (se pueden añadir después) |
| `tenant_id` en tablas hijas (ej. `sale_products`) | **SÍ, denormalizado en TODAS** | Hay **23 queries crudas `DB::table()`** que saltan los global scopes; denormalizar hace el filtrado uniforme y a prueba de fugas |
| `users.email` | **Único GLOBAL** (no por tenant) | El login es por email; un email = un usuario = un tenant. Evita ambigüedad de login |
| `business_settings` | Pasa de **singleton** a **1 fila por tenant** | Cada negocio tiene su logo, ticket, moneda, colores, etc. |
| Tenant existente | `tenant_id = 1` y **backfill de TODO** a 1 | Protege y aísla el negocio actual |
| **Jerarquía de usuarios** | **SuperAdmin → Admin (tenant) → empleados** | El SuperAdmin (dueño de plataforma) crea tenants y su Admin; el Admin gestiona sus empleados internos (encargado/vendedor) |
| Onboarding | **SuperAdmin crea el tenant** (NO registro público) | Modelo controlado por venta directa; el registro público (`/register`) se deshabilita o se reconvierte a panel SuperAdmin |
| SuperAdmin | **Componente OBLIGATORIO** (Bloque 10) | Dashboard propio para gestionar todos los clientes, crear tenants, suspender, ver métricas |

---

## Bloque 1 — La entidad Tenant

### 1.1 Tabla `tenants` (NUEVA)
```php
Schema::create('tenants', function (Blueprint $table) {
    $table->id();
    $table->string('name');                 // Nombre comercial del negocio
    $table->string('slug')->unique();       // Para futuros subdominios / URLs
    $table->string('status')->default('active'); // active | suspended | trial
    $table->string('plan')->nullable();     // free | pro | ... (facturación futura)
    $table->timestamp('trial_ends_at')->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

### 1.2 Modelo `App\Models\Tenant`
- Relaciones `hasMany` hacia todas las entidades raíz (branches, users, products, clients, sales, …).
- `hasOne(BusinessSetting::class)` (settings por tenant).
- **NO** usa el trait `BelongsToTenant` (es la raíz).

### 1.3 Jerarquía resultante
```
Tenant (negocio / cuenta)
├── BusinessSetting (1:1)
├── Branches (1:N)
├── Users (1:N)            ── role: administrador | encargado | vendedor
├── Categories, Products, Clients, PaymentMethods, Suppliers
├── Sales → SaleProducts, SaleReturns → SaleReturnProducts
├── StockMovements
├── CashSessions → CashMovements
├── CreditSales → CreditSaleItems, CreditPayments
└── Expenses, ExpenseCategories, ExpenseTemplates
```

---

## Bloque 2 — Inventario COMPLETO de tablas (sin un solo hueco)

Leyenda: **+tid** = añadir `tenant_id`; **Unq→** = cambio de constraint único.

| # | Tabla | Hoy | Acción | Constraint único a cambiar |
|---|---|---|---|---|
| 1 | `tenants` | — | **CREAR** | `slug` único global |
| 2 | `business_settings` | singleton (1 fila) | **+tid** + 1 fila por tenant | `tenant_id` único (1:1) |
| 3 | `branches` | global | **+tid** | — |
| 4 | `users` | global | **+tid** | `email` **sigue global**; añadir índice `(tenant_id, role)` |
| 5 | `archived_users` | global | **+tid** | — |
| 6 | `categories` | **global (sin branch)** | **+tid** | — |
| 7 | `products` | branch_id | **+tid** | `code` Unq→ `(tenant_id, code)` |
| 8 | `clients` | **global (sin branch)** | **+tid** | `document` Unq→ `(tenant_id, document)`; `email` Unq→ `(tenant_id, email)` |
| 9 | `payment_methods` | **global** | **+tid** | `code` Unq→ `(tenant_id, code)` |
| 10 | `suppliers` | branch_id | **+tid** | — |
| 11 | `sales` | branch_id | **+tid** | `code` Unq→ `(tenant_id, code)` |
| 12 | `sale_products` | hijo de sale | **+tid** (denormalizado) | — |
| 13 | `sale_returns` | hijo de sale | **+tid** | — |
| 14 | `sale_return_products` | hijo | **+tid** | — |
| 15 | `stock_movements` | branch_id | **+tid** | — |
| 16 | `cash_sessions` | branch_id | **+tid** | — |
| 17 | `cash_movements` | hijo de session | **+tid** | — |
| 18 | `credit_sales` | branch_id | **+tid** | `code` Unq→ `(tenant_id, code)` |
| 19 | `credit_sale_items` | hijo | **+tid** | — |
| 20 | `credit_payments` | hijo | **+tid** | — |
| 21 | `expenses` | branch_id | **+tid** | — |
| 22 | `expense_categories` | **global** | **+tid** | `is_system` ahora es por tenant |
| 23 | `expense_templates` | branch_id | **+tid** | — |
| 24 | `product_supplier` (pivot) | pivot | **+tid** (denormalizado) | revisar unique `(product_id, supplier_id)` → `(tenant_id, product_id, supplier_id)` |

**Tablas de framework que NO llevan `tenant_id`:** `migrations`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `password_reset_tokens`.

> ⚠️ Cada `tenant_id` se crea con FK `->constrained('tenants')` y un índice. En tablas grandes (`sales`, `sale_products`, `stock_movements`) el índice `(tenant_id, ...)` es clave para el rendimiento.

---

## Bloque 3 — Infraestructura de tenancy (núcleo reutilizable)

### 3.1 `App\Tenancy\TenantManager` (singleton del contenedor)
Mantiene el tenant actual del request/proceso.
```php
class TenantManager {
    private ?Tenant $tenant = null;
    public function set(?Tenant $t): void { $this->tenant = $t; }
    public function get(): ?Tenant { return $this->tenant; }
    public function id(): ?int { return $this->tenant?->id; }
    public function check(): bool { return $this->tenant !== null; }
    public function forget(): void { $this->tenant = null; }
    /** Ejecuta un callback bajo un tenant específico (jobs, comandos). */
    public function runAs(Tenant $t, callable $cb) { /* set, try/finally forget/restore */ }
}
```
Registrar como singleton en un `TenancyServiceProvider`.

### 3.2 Trait `App\Models\Concerns\BelongsToTenant`
```php
trait BelongsToTenant {
    protected static function bootBelongsToTenant(): void {
        // 1) Scope global: filtra por tenant actual
        static::addGlobalScope(new TenantScope);
        // 2) Al crear, autocompleta tenant_id si hay tenant en contexto
        static::creating(function ($model) {
            if (! $model->tenant_id && app(TenantManager::class)->check()) {
                $model->tenant_id = app(TenantManager::class)->id();
            }
        });
    }
    public function tenant(): BelongsTo { return $this->belongsTo(Tenant::class); }
}
```

### 3.3 `App\Tenancy\TenantScope` (Global Scope)
```php
class TenantScope implements Scope {
    public function apply(Builder $builder, Model $model): void {
        $tm = app(TenantManager::class);
        if ($tm->check()) {
            $builder->where($model->getTable().'.tenant_id', $tm->id());
        }
        // Si NO hay tenant (consola/super-admin), no filtra — ver Bloque 5.
    }
}
```
Helpers en el scope para `withoutTenant()` (super‑admin) cuando haga falta.

### 3.4 Middleware `App\Http\Middleware\IdentifyTenant`
- Se ejecuta **después** de `auth`.
- `app(TenantManager::class)->set($request->user()->tenant)`.
- Si el usuario no tiene tenant → 403 / logout (estado inconsistente).
- Registrar en `bootstrap/app.php` dentro del grupo `web` (después de `HandleInertiaRequests`) o como middleware de ruta en los grupos `auth`.

> Detalle fino: el global scope debe activarse en cuanto el tenant está disponible. Como Inertia comparte `business` (settings) en `HandleInertiaRequests`, el `IdentifyTenant` debe correr **antes** de que se resuelva ese share. Ver Bloque 7.

---

## Bloque 4 — Cambios modelo por modelo

A cada modelo de negocio se le agrega `use BelongsToTenant;` y `tenant_id` en `$fillable`. Detalle de matices:

| Modelo | Cambios específicos |
|---|---|
| `Tenant` (nuevo) | Raíz; relaciones hasMany; `hasOne(BusinessSetting)` |
| `BusinessSetting` | `use BelongsToTenant`; **refactor `getSettings()`** (Bloque 7); cache key por tenant |
| `Branch` | `+BelongsToTenant`; `Branch::all()`/`where('status')` quedan auto‑scopeados (clave: hoy `ProductController` hace `Branch::where('status',true)->get()` para admin → con scope solo verá las de su tenant ✅) |
| `User` | `+BelongsToTenant`; `tenant_id` en fillable; **email único global** (no tocar). Login: ver Bloque 5.2 |
| `ArchivedUser` | `+BelongsToTenant` |
| `Category` | `+BelongsToTenant` (hoy global) |
| `Product` | `+BelongsToTenant`; `belongsTo(Category)->withTrashed()` sigue ok |
| `Client` | `+BelongsToTenant`; "Consumidor Final" pasa a ser **uno por tenant** |
| `PaymentMethod` | `+BelongsToTenant`; `getActive()`/`findByCode()` quedan auto‑scopeados |
| `Supplier` | `+BelongsToTenant` |
| `Sale` | `+BelongsToTenant`; generación de `code` debe ser única por tenant |
| `SaleProduct` | `+BelongsToTenant` (denormalizado) |
| `SaleReturn` / `SaleReturnProduct` | `+BelongsToTenant` |
| `StockMovement` | `+BelongsToTenant`; sus scopes (`forBranch`, etc.) conviven con el global |
| `CashSession` | `+BelongsToTenant`; `getOpenForUser()` queda auto‑scopeado |
| `CashMovement` | `+BelongsToTenant` |
| `CreditSale` | `+BelongsToTenant`; **`generateCode()` hoy usa `where('branch_id')->count()`** → debe scopearse también por tenant (el global scope lo hace, pero verificar) |
| `CreditSaleItem` / `CreditPayment` | `+BelongsToTenant` |
| `Expense` | `+BelongsToTenant` |
| `ExpenseCategory` | `+BelongsToTenant`; `is_system` ahora por tenant (cada tenant tiene sus categorías sistema) |
| `ExpenseTemplate` | `+BelongsToTenant`; `isRegisteredForMonth()` auto‑scopeado |

---

## Bloque 5 — Resolución de contexto (web, login, consola, jobs)

### 5.1 Web (request normal)
`auth` → `IdentifyTenant` (set TenantManager desde `user->tenant`) → controladores ya filtran solo.

### 5.2 Login (caso especial) + 3 niveles de acceso
El login ocurre **antes** de tener tenant. Como `users.email` es único global:
1. `AuthenticatedSessionController@store` valida credenciales (sin scope, porque aún no hay tenant — busca por email global).
2. Tras autenticar:
   - Si es **SuperAdmin** (`tenant_id = NULL` + flag) → redirige a `/admin` (panel de plataforma), sin fijar tenant.
   - Si es **Admin/empleado de un tenant** → `IdentifyTenant` fija el tenant del usuario y va al `dashboard` del negocio.
3. Bloquear login si `tenant.status !== 'active'` (suspendido/moroso) — no aplica al SuperAdmin.

**3 niveles de acceso:**
| Nivel | `tenant_id` | Rol | Alcance |
|---|---|---|---|
| SuperAdmin (tú) | `NULL` | `super_admin` | Todos los tenants; crea/gestiona negocios y sus Admins |
| Admin del negocio | `= su tenant` | `administrador` | Todo su negocio; crea/gestiona empleados |
| Empleado | `= su tenant` | `encargado` / `vendedor` | Su sucursal/operación |

> ⚠️ **Gotcha:** el `User` lleva `BelongsToTenant` con global scope. Durante el login NO hay tenant en contexto → el scope **no filtra** (ver `TenantScope`: si `!check()` no aplica `where`). Esto permite encontrar al usuario por email. Confirmar con test (Bloque 13).

### 5.3 Consola / Seeders / Comandos
No hay usuario → no hay tenant. Opciones:
- Comandos que tocan datos de un tenant deben usar `TenantManager::runAs($tenant, fn() => ...)`.
- El comando `db:clean-transactional` **debe volverse tenant‑aware** (hoy truncaría TODO de TODOS los tenants — peligroso). Añadir `--tenant=ID` y borrar solo ese tenant con `where('tenant_id', …)` en vez de `truncate()`.

### 5.4 Jobs / Colas
Los jobs serializan; el tenant **no** viaja solo. Patrón: el job guarda `tenant_id` en su payload y en `handle()` hace `TenantManager::runAs(Tenant::find($this->tenantId), …)`. (Hoy hay `queue:listen` en `composer dev`; revisar jobs existentes — actualmente parece no haber jobs de dominio, pero dejar el patrón listo.)

---

## Bloque 6 — Auditoría de queries crudas (CRÍTICO — saltan los scopes)

Los Global Scopes **solo aplican a Eloquent**. Hay **23 usos de `DB::table()`** que NO se filtran solos y son la principal fuente de fuga entre tenants. Todos deben recibir `->where('<tabla>.tenant_id', $tenantId)` explícito.

| Archivo | Líneas aprox. | Tablas crudas | Acción |
|---|---|---|---|
| `app/Http/Controllers/DashboardController.php` | 122, 214, 244, 340 (+ joins) | `sales`, `sale_products` | Añadir `where('sales.tenant_id', …)` y en joins |
| `app/Http/Controllers/FinanceController.php` | 35, 44, 60, 73 | `sales`, `sale_return_products`, `sale_products` | Igual |
| `app/Services/ReportQueryService.php` | 58, 71, 110, 149, 175, 266, 355, 417, 459, 534 (+) | `sales`, `products` | **Centralizar**: inyectar `tenant_id` en un helper base de la clase |
| `app/Services/ReportExportService.php` | (revisar) | `sales`, etc. | Igual |
| `app/Console/Commands/CleanTransactionalData.php` | 66, 74 | todas | Volver tenant‑aware (Bloque 5.3) |

**Recomendación fuerte:** crear un trait/helper `scopedToTenant(Builder $q, string $table)` y usarlo en TODA query cruda. Además, escribir un **test de aislamiento** que cree 2 tenants con datos y verifique que ningún reporte/endpoint cruce datos (Bloque 13).

> Nota: como denormalizamos `tenant_id` en `sale_products`, `sale_return_products`, etc. (Bloque 2), estas queries pueden filtrar directo por la tabla base sin depender del join a `sales`.

---

## Bloque 7 — Refactor de `business_settings` (singleton → por tenant)

Hoy (`app/Models/BusinessSetting.php`):
- `getSettings()` cachea **una** fila global (`CACHE_KEY = 'business_settings'`).
- `HandleInertiaRequests` comparte `'business' => BusinessSetting::getSettings()` en cada request.

Cambios:
1. `+BelongsToTenant` y `tenant_id` único.
2. `getSettings()` → resolver la fila **del tenant actual** y cachear con key por tenant:
   ```php
   public static function getSettings(): self {
       $tid = app(TenantManager::class)->id();
       return Cache::remember("business_settings:{$tid}", self::CACHE_TTL,
           fn () => static::firstOrCreate(['tenant_id' => $tid], [...defaults]));
   }
   ```
3. Invalidación: `saved()` debe limpiar `"business_settings:{tenant_id}"`.
4. `HandleInertiaRequests`: el share de `business` ya funciona si `IdentifyTenant` corrió antes. **Verificar el orden de middleware** (Bloque 3.4).
5. `Product::getImageUrlAttribute()` llama `BusinessSetting::getSettings()` → quedará por tenant automáticamente ✅.

---

## Bloque 8 — Constraints únicos e índices (detalle de migración)

Para cada constraint global que pasa a compuesto, la migración debe: **(a)** dropear el índice único viejo, **(b)** crear el compuesto. En MySQL hay que cuidar el nombre del índice y las FKs que dependen de él.

| Tabla | Drop | Add |
|---|---|---|
| `products` | unique `code` | `unique(['tenant_id','code'])` |
| `sales` | unique `code` | `unique(['tenant_id','code'])` |
| `credit_sales` | unique `code` | `unique(['tenant_id','code'])` |
| `payment_methods` | unique `code` | `unique(['tenant_id','code'])` |
| `clients` | unique `document`, unique `email` | `unique(['tenant_id','document'])`, `unique(['tenant_id','email'])` |
| `product_supplier` | unique `(product_id,supplier_id)` (si existe) | `unique(['tenant_id','product_id','supplier_id'])` |
| `users` | — (email sigue global) | add index `(tenant_id, role)` |

**Validaciones de formularios:** todas las `Rule::unique(...)` en Form Requests / controladores deben añadir `->where('tenant_id', $tenantId)` (ej. validación de `code` de producto, `document` de cliente, `email` de cliente). Auditar `app/Http/Requests/**` y `*Controller@store/@update`.

Índices de rendimiento (la migración `add_performance_indexes` ya existe): **recrear como compuestos con tenant_id al frente** donde aplique, p. ej. `sales (tenant_id, branch_id, status, date)`.

---

## Bloque 9 — Onboarding de nuevos tenants (lo hace el SuperAdmin)

**NO hay registro público self‑service.** El SuperAdmin crea el negocio desde su panel (`POST /admin/tenants`). El registro público `/register` se **deshabilita** (quitar las rutas `register` de `routes/auth.php`) o se reconvierte en login del panel.

Servicio `App\Tenancy\TenantProvisioner::create(array $data)` — envuelto en transacción:

1. Crear `Tenant` (name, slug único, status `active`/`trial`, plan).
2. `TenantManager::runAs($tenant, function () use ($data) { ... })` para que los defaults nazcan con `tenant_id` correcto:
   - Crear `User` **Admin** del negocio (`role = administrador`, `tenant_id`, email + password que define el SuperAdmin o invitación por correo).
   - Crear `BusinessSetting` del tenant (defaults: name, currency, ticket).
   - Crear **sucursal inicial** (`Branch`); el admin puede ir sin branch.
   - Sembrar **métodos de pago** base (efectivo, tarjeta, transferencia) — reusar `PaymentMethodSeeder` parametrizado.
   - Sembrar **categorías** base (opcional) — reusar `CategorySeeder` parametrizado.
   - Crear cliente **"Consumidor Final"** del tenant (idéntico al `ClientSeeder`, sin los clientes demo).
3. (Opcional) Enviar correo de invitación al Admin con enlace para fijar contraseña.

**Gestión de empleados (la hace el Admin, ya existe):** `UserController` actual crea usuarios; con el `BelongsToTenant` quedará auto‑scopeado al tenant del Admin → un Admin solo ve/crea empleados de su negocio ✅. Validar que un Admin **no** pueda crear otro `administrador` fuera de su tenant ni un `super_admin`.

> Reutilizar los seeders existentes parametrizándolos por tenant (hoy crean datos globales). Convertirlos en clases invocables que reciban `tenant_id` (o ejecutarlos dentro de `runAs`).

---

## Bloque 10 — Panel SuperAdmin (plataforma) — OBLIGATORIO

El SuperAdmin (tú) gestiona todos los clientes desde un dashboard propio, separado del POS.

### 10.1 Identidad del SuperAdmin
- `users.tenant_id = NULL` + `role = 'super_admin'` (o flag `is_super_admin`). Recomendado: usar el mismo campo `role` con valor `super_admin` para no añadir columnas, **pero** documentar que `super_admin` ⇒ `tenant_id NULL`.
- El `IdentifyTenant` middleware **no** fija tenant para super_admin (deja `TenantManager` vacío).
- El SuperAdmin NO opera el POS; tiene su propio set de rutas.

### 10.2 Rutas y panel
- Grupo `Route::prefix('admin')->middleware(['auth','super_admin'])` con páginas Inertia propias (`resources/js/pages/admin/*`).
- Middleware `EnsureSuperAdmin` (403 si no lo es).
- Vistas: **lista de tenants**, crear tenant (Bloque 9), ver detalle (usuarios, métricas: ventas, # productos, último acceso), **suspender/activar**, resetear contraseña del Admin, eliminar (soft delete) tenant.

### 10.3 Acceso cross‑tenant del SuperAdmin
- Para ver datos de un tenant, el panel usa scopes explícitos `Model::where('tenant_id', $id)` **o** `TenantManager::runAs($tenant, ...)` para "entrar" a un negocio.
- Métricas agregadas multi‑tenant: queries con `withoutGlobalScope(TenantScope::class)` + `groupBy('tenant_id')`.
- **Regla de oro:** el `withoutGlobalScope` SOLO se permite en código del panel SuperAdmin, nunca en controladores del POS.

### 10.4 Seguridad
- El Admin de un tenant **jamás** puede escalar a `super_admin` ni cambiar su `tenant_id` (validar en `UserController`).
- Auditar que ningún empleado pueda setear `role = super_admin` ni `tenant_id` ajeno (mass‑assignment: `tenant_id` lo pone el trait, no el request).

---

## Bloque 11 — 🔒 Migración de datos: PROTEGER el tenant existente (paso a paso)

Este es el bloque más delicado. Objetivo: el negocio actual queda como `tenant_id = 1`, con **cero pérdida** y **cero mezcla**.

**Orden estricto (una migración o varias, idempotentes):**

1. **Crear `tenants`** (tabla vacía).
2. **Insertar el tenant 1** a partir del `business_settings` actual:
   ```php
   $bs = DB::table('business_settings')->first();
   $tenantId = DB::table('tenants')->insertGetId([
       'name' => $bs->name ?? 'Lu Accesorios',
       'slug' => Str::slug($bs->name ?? 'lu-accesorios'),
       'status' => 'active',
       'created_at' => now(), 'updated_at' => now(),
   ]); // se espera id = 1
   ```
3. **Añadir `tenant_id` NULLABLE** (sin FK aún) a las 23 tablas de negocio.
4. **Backfill = 1** en TODAS las filas existentes de cada tabla:
   ```php
   foreach ($businessTables as $t) {
       DB::table($t)->update(['tenant_id' => 1]);
   }
   ```
   - Para tablas hijas con `tenant_id` denormalizado, el backfill directo a 1 es correcto (todo lo existente es del tenant 1).
5. **Asociar `business_settings.tenant_id = 1`** (y verificar 1:1).
6. **Añadir FK + índices** `tenant_id → tenants.id`.
7. **Volver `tenant_id` NOT NULL** (ya no hay nulos tras backfill).
8. **Reescribir constraints únicos** (Bloque 8): drop global → add compuesto. (Hacer **después** del backfill para no chocar.)
9. **Verificación post‑migración** (script):
   - `SELECT COUNT(*) FROM <tabla> WHERE tenant_id IS NULL` = 0 en todas.
   - Conteos por tabla **iguales** a los previos (no se perdió nada).
   - `tenants` tiene exactamente 1 fila; `business_settings` 1 fila con `tenant_id=1`.

**Backup previo OBLIGATORIO** (snapshot del MySQL en Railway) — esta vez sí es imprescindible: es irreversible y toca todas las tablas.

> Nota: la migración debe ser **segura para correr en el deploy de Railway** (`php artisan migrate --force` ya está en el start command). Conviene separar: (a) migraciones de esquema (rápidas) y (b) el backfill de datos en una migración aparte que sea idempotente y robusta ante reintentos.

---

## Bloque 12 — Hardening de seguridad (fugas entre tenants)

1. **Route Model Binding cross‑tenant:** con el global scope activo, `Route::get('products/{product}')` ya devuelve 404 si el producto es de otro tenant ✅. **Verificar** que todos los bin_dings usan Eloquent (no `find()` manual sin scope).
2. **`find()` / `findOrFail()` manuales:** auditar que ningún controlador haga `Model::withoutGlobalScopes()` salvo super‑admin.
3. **Validaciones `unique`:** todas con `->where('tenant_id', …)` (Bloque 8).
4. **Almacenamiento de archivos (Vercel Blob):** prefijar rutas con el tenant (`tenants/{id}/products/...`) para evitar colisiones y facilitar borrado por tenant. Revisar `BlobStorageService`.
5. **Impresión / tickets (`PrintController`, `routes/printing.php`):** los endpoints que generan recibos por `sale_id` deben respetar el scope (que la venta sea del tenant del usuario).
6. **`PaymentMethod::findByCode`, `getActive`, `CashSession::getOpenForUser`:** confirmar que el scope global los cubre (son Eloquent → sí).
7. **Caché compartida:** cualquier `Cache::remember` con key fija debe incluir `tenant_id` (ya tratado en `business_settings`; auditar otros).

---

## Bloque 13 — Estrategia de pruebas

1. **Test de aislamiento (el más importante):** crear Tenant A y Tenant B con datos; autenticarse como usuario de A y verificar que **ningún** endpoint/listado/reporte/print devuelve datos de B. Cubrir: products, sales, clients, dashboard, finances, reports, credits, cash‑sessions.
2. **Test de queries crudas:** asserts directos sobre `DashboardController`, `FinanceController`, `ReportQueryService` con 2 tenants.
3. **Test de unicidad por tenant:** mismo `product.code` / `client.document` puede existir en A y B sin chocar; duplicado dentro del mismo tenant falla.
4. **Test de login:** usuario de A no “ve” tenant de B; login fija el tenant correcto; tenant suspendido bloquea login.
5. **Test de onboarding:** registro crea tenant + admin + settings + métodos de pago + "Consumidor Final".
6. **Test de migración (data):** seed estado “pre‑tenant”, correr migración, assert backfill=1 y conteos iguales.
7. Correr `php artisan test` + `composer analyse` (PHPStan) tras cada bloque.

---

## Bloque 14 — Secuencia de implementación (orden de PRs)

> Cada PR es desplegable y no rompe producción hasta el “switch” del Bloque 11.

1. **PR‑1 Infra:** `tenants` table + `Tenant` model + `TenantManager` + `TenantScope` + `BelongsToTenant` + `IdentifyTenant` middleware + provider. (Sin aplicar el trait aún a otros modelos.)
2. **PR‑2 Esquema:** migraciones que añaden `tenant_id` nullable a las 24 tablas (+índices, sin FK NOT NULL todavía).
3. **PR‑3 Backfill + switch:** migración de datos (Bloque 11) que crea tenant 1 y backfillea; luego FK + NOT NULL + constraints compuestos. **Aquí se hace el backup.**
4. **PR‑4 Modelos:** aplicar `BelongsToTenant` a los 22 modelos + `business_settings` refactor + cache por tenant.
5. **PR‑5 Queries crudas:** parchear los 23 `DB::table()` + validaciones `unique` por tenant + hardening (Bloque 12).
6. **PR‑6 SuperAdmin + Onboarding:** rol `super_admin` (tenant_id NULL) + middleware `EnsureSuperAdmin` + panel `/admin` + `TenantProvisioner` + seeders parametrizados por tenant + **deshabilitar `/register` público** + comando `db:clean-transactional --tenant=`.
7. **PR‑7 Gestión de empleados:** verificar que el Admin solo gestione empleados de su tenant; bloquear escalada a `super_admin`/cambio de `tenant_id`.
8. **PR‑8 Tests:** suite de aislamiento (idealmente intercalada en cada PR).

> El **SuperAdmin (tú) tendrá `tenant_id = NULL`**. Tras el Bloque 11, decidir: convertir tu usuario actual en `super_admin` (sale del tenant 1) **o** crear un usuario SuperAdmin nuevo y dejar los 5 usuarios actuales como empleados del tenant 1. **Recomendado:** crear un SuperAdmin nuevo y dejar intactos los 5 usuarios del negocio existente.

---

## Bloque 15 — Riesgos y “gotchas” (no saltarse)

- **Fugas por `DB::table()`** (23 sitios): el riesgo #1. No confiar en el global scope ahí.
- **Login con scope global en `User`:** asegurar que sin tenant el scope NO filtra (si no, nadie podría loguearse). Test obligatorio.
- **`business_settings` cache:** si la key no incluye tenant, un negocio vería los settings de otro. Crítico para logo/ticket.
- **`CreditSale::generateCode()` y `Sale` code:** la unicidad y el contador deben ser por tenant; con el global scope el `count()` ya se filtra, pero **verificar**.
- **Orden de middleware:** `IdentifyTenant` debe correr antes del share de Inertia (`business`).
- **Comando de limpieza actual (`db:clean-transactional`):** HOY borra global. Tras multitenancy **debe** filtrar por tenant o se cargaría TODOS los negocios. Alta prioridad.
- **`users.email` global:** decisión firme; si en el futuro se quiere el mismo email en varios tenants, habría que rediseñar el login (no recomendado ahora).
- **Migración de datos en Railway:** el start command corre `migrate --force`; separar el backfill pesado para que un reintento no duplique. Backup antes.
- **Archivos en Blob:** sin prefijo por tenant, dos negocios podrían pisarse nombres; migrar a rutas `tenants/{id}/...`.
- **Soft deletes + unique compuesto:** un `code` “borrado” podría bloquear reuso; evaluar incluir `deleted_at` en el índice único si se requiere reusar códigos.

---

## Apéndice A — Checklist de “cero huecos”

- [ ] 24 tablas con `tenant_id` (o justificación de exclusión)
- [ ] 22 modelos con `BelongsToTenant`
- [ ] 23 `DB::table()` parcheados
- [ ] Todas las `Rule::unique` con `tenant_id`
- [ ] `business_settings` por tenant + cache por tenant
- [ ] Constraints únicos → compuestos (products, sales, credit_sales, payment_methods, clients, product_supplier)
- [ ] Login funciona sin tenant en contexto + redirige SuperAdmin → `/admin`
- [ ] Middleware `IdentifyTenant` antes del share de Inertia (no fija tenant para super_admin)
- [ ] SuperAdmin (`tenant_id NULL`, `role super_admin`) + middleware `EnsureSuperAdmin` + panel `/admin`
- [ ] `TenantProvisioner` crea tenant + Admin + settings + métodos de pago + "Consumidor Final" + sucursal
- [ ] Registro público `/register` deshabilitado
- [ ] Admin no puede escalar a super_admin ni cambiar `tenant_id`
- [ ] `db:clean-transactional` tenant‑aware (`--tenant=`)
- [ ] Blob storage prefijado por tenant
- [ ] Suite de tests de aislamiento en verde
- [ ] **Tenant 1 (negocio actual) intacto y aislado** ✅
```
