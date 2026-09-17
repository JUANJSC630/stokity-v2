# Plan: API pública para conectar un ecommerce externo (Lu Accesorios)

> Estado: **documento de investigación + diseño**. No se ha escrito código de esta feature todavía. Objetivo: dejar registrado el estado real del proyecto y el diseño propuesto para que, cuando se decida construirlo, se parta de aquí en vez de reinvestigar todo.

## 1. Objetivo

Lu Accesorios (un tenant de Stokity) quiere un sitio web tipo ecommerce **aparte** del panel de Stokity, que muestre su catálogo, precios y disponibilidad, y potencialmente reciba pedidos — todo esto **scoped a su propio tenant**, sin exponer ni mezclar datos de otros negocios que usan Stokity.

La pregunta a resolver: ¿el backend actual está listo para que un cliente externo (ese sitio ecommerce) le pida datos "según el tenant"? Respuesta corta: **no todavía**, pero la base multi-tenant ya existente hace que sea una extensión limpia, no una reescritura.

## 2. Auditoría del estado actual

### 2.1 Arquitectura general

Monolito Laravel 12 + Inertia.js + React 19 + TypeScript. Un solo router (`web`), sin separación API/web a nivel de framework. Multi-tenant de **una sola base de datos** con `tenant_id` en cada tabla de negocio (no bases separadas por tenant).

### 2.2 Inventario completo de rutas (223 rutas, verificado con `php artisan route:list`)

**Todas las 223 rutas cuelgan del middleware `web`** (sesión + cookie CSRF). No existe `routes/api.php`, y `bootstrap/app.php` solo registra un router (`web:`):

```php
// bootstrap/app.php
->withRouting(
    web: __DIR__.'/../routes/web.php',
    commands: __DIR__.'/../routes/console.php',
    health: '/up',
)
```

No hay parámetro `api:`, así que Laravel nunca activa el middleware group `api` ni nada relacionado (throttle, stateless auth, etc.).

Las únicas dos rutas con prefijo `/api/` que existen hoy son **rutas internas de la propia SPA**, no una API pública:

| Ruta | Middleware real | Uso |
|---|---|---|
| `GET /api/products/search` | `auth`, `throttle:60,1` (grupo `web`) | Autocompletar de productos dentro del POS, requiere sesión de usuario logueado |
| `GET /api/payment-methods/active` | `web` | Igual, consumo interno de la SPA |

Inventario por módulo (agrupado desde el listado completo — 21 archivos de rutas):

| Módulo (`routes/*.php`) | # rutas | Relevancia para un ecommerce externo |
|---|---|---|
| `products.php` | 13 | **Alta** — catálogo, sería la base de `GET /api/store/products` |
| `categories.php` | 10 | **Alta** — para filtros del catálogo |
| `branches.php` | 9 | Media — si el ecommerce necesita mostrar sucursales/retiro en tienda |
| `sales.php` (+ `pos.index`) | 15 | Alta si se construye "crear pedido" — pero **ninguna de estas rutas debe exponerse tal cual**, se necesitaría un endpoint nuevo y más estrecho |
| `clients.php` | 7 | Media — si el ecommerce quiere crear/vincular un cliente al hacer un pedido |
| `payment-methods.php` | 9 | Media — para saber qué métodos de pago ofrece ese negocio |
| `credits.php` | 9 | Ninguna — es operación interna de caja/vendedor |
| `wholesale.php` | 9 | Ninguna — pedidos custom internos, no es catálogo público |
| `cash-sessions.php` | 7 | Ninguna |
| `stock-movements.php` | 5 | Ninguna directamente, pero el **stock disponible** (`Product.stock`/`reserved_stock`) sí es relevante para mostrar "agotado" |
| `suppliers.php` | 7 | Ninguna |
| `finances.php` (+ `expenses.php`, `expense-*`) | 13 | Ninguna |
| `reports.php` | 17 | Ninguna |
| `users.php` | 7 | Ninguna |
| `printing.php` | 10 | Ninguna |
| `settings.php` (business/modules/roles/ticket/appearance/password/profile) | 17 | Indirecta — `settings.business` tiene nombre, logo, colores, moneda: útil para que el ecommerce "se vea" del negocio |
| `admin.php` (SuperAdmin) | 15 | Ninguna — panel de la plataforma, cruza tenants a propósito |
| `auth.php` | 12 | Ninguna — login del panel, no aplica a compradores del ecommerce |

**Conclusión**: de las 223 rutas existentes, ninguna sirve tal cual para un consumidor externo — todas asumen una sesión de navegador con un usuario del panel ya autenticado y con permisos RBAC. Este es el hueco central.

### 2.3 Autenticación actual

Laravel session/cookie estándar (`Auth::user()`), sin Sanctum, sin Passport, sin JWT instalados (`composer.json` no los tiene). El único "token" que existe en el sistema es el de sesión del navegador.

### 2.4 Cómo funciona el multi-tenancy hoy (y por qué importa para el diseño de la API)

- **`App\Models\Concerns\BelongsToTenant`** (trait): agrega un `TenantScope` global a cualquier modelo que lo use, y auto-estampa `tenant_id` al crear. Es el mecanismo que hace que `Product::all()` dentro de una request ya solo traiga productos del tenant correcto — **sin que el código de cada controlador tenga que acordarse de filtrar**.
- **`App\Tenancy\TenantManager`** (singleton por request): guarda "cuál es el tenant actual". Expone:
  - `set(Tenant $tenant)` / `get()` / `id()` / `forget()`
  - **`runAs(Tenant $tenant, callable $callback)`** — corre un callback bajo un tenant específico y restaura el anterior al terminar. **Esta pieza ya existe y es exactamente la que necesitaría un middleware de API** para decir "esta request es del tenant X" sin pasar por un login de usuario.
- **`App\Http\Middleware\IdentifyTenant`**: middleware que hoy resuelve el tenant leyendo `$request->user()->tenant_id` (un usuario logueado del panel). Sin usuario logueado, no hay tenant → cualquier modelo con `BelongsToTenant` correría sin scope (peligroso para una API pública si no se reemplaza este paso).
- **`Tenant.slug`**: ya existe en la tabla `tenants` desde la migración original, con el comentario literal `// Para URLs / futuros subdominios` — **fue pensado para esto desde el diseño original**, aunque nunca se usó para nada hasta ahora.

**Implicación de diseño**: el mecanismo de resolución de tenant para la API **no puede reutilizar `IdentifyTenant` tal cual** (depende de sesión de usuario), pero sí puede reutilizar `TenantManager::runAs()`/`set()` con un middleware nuevo que resuelva el tenant desde otra cosa (API key o slug), sin tocar el sistema existente.

### 2.5 RBAC (Spatie Permission + `PermissionCatalog`)

20 módulos de permisos (`dashboard`, `pos`, `products`, `categories`, `clients`, `sales`, `credits`, `wholesale`, `suppliers`, `stockMovements`, `paymentMethods`, `cashSessions`, `finances`, `expenses`, `reports`, `users`, `branches`, `settings`, `profile`). Todo pensado para roles de **empleados del negocio** (Administrador/Encargado/Vendedor + roles personalizados). No hay ningún concepto de "cliente final del ecommerce" ni "aplicación externa" en este sistema — sería un tercer tipo de actor, completamente nuevo, que no debe mezclarse con este RBAC.

### 2.6 Modelos relevantes para un catálogo público

**`Product`** (`app/Models/Product.php`) — campos: `name`, `code`, `description`, `purchase_price` (⚠️ nunca exponer — es costo interno), `sale_price`, `tax`, `stock`, `reserved_stock`, `min_stock`, `image`/`image_url` (accessor, ya devuelve URL absoluta), `category_id`, `branch_id`, `status`, `type` (`producto`/`servicio`), `variable_price`. Métodos útiles: `availableStock()` (`stock - reserved_stock`), `isLowStock()`, `isService()`.

**`Category`** — `name`, `description`, `status`. Relación `hasMany(Product)`.

**`Branch`** — `name`, `business_name`, `address`, `phone`, `email`, `status`. Útil si el ecommerce ofrece "retiro en tienda" por sucursal.

**`BusinessSetting`** — datos de "vitrina" del negocio: `name`, `logo`/`logo_url`, `nit`, `phone`, `email`, `address`, `social_media`, `currency_symbol`, `brand_color`/`brand_color_secondary`. Ya cacheado por tenant (`Cache::remember`, 1h TTL) — reutilizable tal cual para un endpoint tipo "info de la tienda".

**`PaymentMethod`** — `name`, `code`, `is_active`, `sort_order`. `PaymentMethod::getActive()` ya filtra y ordena.

**`Client`** — para si el ecommerce necesita crear o vincular un comprador con el CRM interno del negocio (campos: `name`, `document`, `phone`, `address`, `email`, `birthdate`, `is_wholesale`).

**`Sale` / `SaleProduct`** — el flujo de venta real (impuestos, descuentos, stock, sesión de caja). Si el ecommerce va a **crear pedidos**, este es el flujo con el que hay que integrar — pero nunca exponiendo `SaleController::store()` tal cual (asume vendedor logueado, sesión de caja, etc.).

### 2.7 Imágenes (Vercel Blob)

`BlobStorageService` sube todo como WebP a `https://blob.vercel-storage.com/stokity/{folder}/{archivo}.webp` con acceso público (`x-access: public`). El accessor `Product::getImageUrlAttribute()` ya devuelve la URL absoluta de Blob cuando el campo `image` empieza con `http`. **Las imágenes ya están listas para consumirse desde cualquier sitio externo sin cambios** — no hay autenticación ni CORS que las bloquee (son assets estáticos servidos por Vercel, no por este backend).

### 2.8 Lo que NO existe (huecos reales)

1. **Ningún router `api`** registrado en `bootstrap/app.php`.
2. **Ninguna librería de tokens** (Sanctum/Passport/JWT) instalada.
3. **Ninguna forma de resolver tenant sin un usuario de panel logueado** — hay que construirla (aunque la pieza base, `TenantManager::runAs()`, ya existe).
4. **Ningún archivo de configuración CORS** — si el ecommerce llamara desde el navegador del comprador final a un dominio distinto, el navegador bloquearía la petición tal como está configurado hoy.
5. **Ningún sistema de eventos/webhooks** (no existe `app/Events` ni `app/Listeners`) — si el ecommerce necesita enterarse en tiempo real de que se agotó un producto, hoy solo podría hacerlo con polling.
6. **Ningún endpoint de "crear pedido" seguro para un tercero** — `SaleController::store()` asume un empleado autenticado con permisos y, opcionalmente, caja abierta.

## 3. Diseño propuesto (para decidir, no implementado aún)

### 3.1 Autenticación: API key por tenant

Opción recomendada — sencilla, sin dependencias nuevas: una tabla `tenant_api_keys` (o un campo `api_key` en `tenants`, hasheado) generada desde el panel de Stokity (ej. en `/settings/store-api` o similar), que el ecommerce manda en un header (`Authorization: Bearer <key>` o `X-Stokity-Api-Key`). Ventajas: revocable por tenant, no depende de sesiones, no requiere instalar Sanctum. Alternativa más "estándar": Laravel Sanctum con *personal access tokens* asociados a un modelo `Tenant` (Sanctum soporta cualquier modelo, no solo `User`) — más código de librería pero más convenciones ya resueltas (expiración, abilities/scopes).

### 3.2 Middleware de resolución de tenant para la API

Un middleware nuevo (`ResolveTenantFromApiKey`) que:
1. Lee la key del header.
2. Busca el tenant dueño de esa key (`Tenant::where(...)`).
3. Llama a `app(TenantManager::class)->set($tenant)` — reutilizando la pieza que ya existe, sin tocar `IdentifyTenant` ni el resto del sistema de sesión/panel.
4. 401 si la key no existe o el tenant está suspendido/inactivo (reutilizar `Tenant::isActive()`/`isSuspended()`, ya existen).

### 3.3 Superficie propuesta — Fase 1 (solo lectura, la más segura para empezar)

Prefijo versionado, ej. `routes/api.php` montado como `api/v1/store/*`:

| Método | Ruta propuesta | Fuente | Devuelve |
|---|---|---|---|
| GET | `/api/v1/store/info` | `BusinessSetting::getSettings()` | nombre, logo, colores, moneda, contacto |
| GET | `/api/v1/store/categories` | `Category::where('status', true)` | catálogo de categorías activas |
| GET | `/api/v1/store/products` | `Product::where('status', true)` | catálogo paginado (nombre, precio, imagen, stock disponible, categoría) — **excluir `purchase_price` explícitamente en el Resource** |
| GET | `/api/v1/store/products/{code}` | idem | detalle de un producto |
| GET | `/api/v1/store/branches` | `Branch::where('status', true)` | sucursales (si aplica retiro en tienda) |
| GET | `/api/v1/store/payment-methods` | `PaymentMethod::getActive()` | métodos de pago que ofrece ese negocio |

Todo de solo lectura, todo ya filtrado automáticamente por tenant gracias a `BelongsToTenant` (una vez el middleware de la sección 3.2 haya llamado a `TenantManager::set()`).

### 3.4 Fase 2 (escritura — crear pedidos desde el ecommerce)

Esto es un paso mucho más delicado que requeriría su propio diseño de seguridad detallado antes de construirse: no se debe reutilizar `SaleController::store()` (asume vendedor + caja), sino un endpoint nuevo y estrecho (ej. `POST /api/v1/store/orders`) con su propia validación de stock (reutilizando `StockMovementService`), su propio estado (`pending`/`web`) para diferenciarlos de ventas de mostrador en reportes, y probablemente notificación al negocio (email/WhatsApp) de que llegó un pedido nuevo, ya que hoy no hay sistema de eventos para eso.

### 3.5 CORS

Publicar `config/cors.php` (Laravel lo trae listo, solo hay que agregarlo) permitiendo el dominio del ecommerce en `allowed_origins`, y limitar `paths` a `api/v1/store/*` — nunca abrir CORS para las rutas del panel (`web`).

### 3.6 Qué nunca debe exponerse

`purchase_price` (costo interno), cualquier ruta de `reports.php`/`finances.php`/`users.php`, datos de otros tenants (garantizado por `BelongsToTenant` mientras el middleware de la 3.2 esté bien hecho), y cualquier permiso de escritura sobre inventario que no pase por `StockMovementService`.

### 3.7 Rate limiting y versionado

Reutilizar el patrón ya usado en `api/products/search` (`throttle:60,1`) para toda la superficie pública. Prefijo `v1` desde el día uno, aunque solo haya una versión — evita romper al ecommerce el día que cambie el contrato.

## 4. Roadmap sugerido

1. `routes/api.php` + registrar en `bootstrap/app.php` (`api:` en `withRouting`).
2. Tabla `tenant_api_keys` (o campo en `tenants`) + comando/UI para generar una key por tenant.
3. Middleware `ResolveTenantFromApiKey`.
4. Endpoints de solo lectura de la sección 3.3, con API Resources que exploten explícitamente qué campos exponen (nunca `Product::all()->toJson()` directo).
5. `config/cors.php` acotado a `api/v1/store/*`.
6. Tests de aislamiento entre tenants (que la key del tenant A jamás vea datos del tenant B) — el tipo de test que ya existe en `tests/Feature/Tenancy/TenantIsolationTest.php` para el panel, replicado para la API.
7. Fase 2 (pedidos) solo después de validar la Fase 1 en producción con Lu Accesorios.

## 5. Preguntas para decidir con el negocio antes de construir

1. ¿El ecommerce solo necesita **mostrar catálogo** (fase 1), o también **recibir pedidos** (fase 2, mucho más trabajo)?
2. Si recibe pedidos: ¿esos pedidos deben **descontar stock real** de inmediato, o quedar como "pendiente de confirmar" hasta que alguien del negocio los revise?
3. ¿El ecommerce lo vas a construir tú (este mismo equipo) o un tercero? Si es un tercero, la API key necesita un flujo de entrega segura y documentación aparte (fuera de este repo).
4. ¿Un solo dominio de ecommerce por tenant, o Lu Accesorios eventualmente querría subdominios tipo `luaccesorios.stokity.com` (ahí el `slug` de `Tenant` cobra más sentido todavía)?
