# 02 — Auditoría de Performance (AGENTE PERFORMANCE)

**Proyecto:** Stokity v2 — Laravel 12 + Inertia 2 + React 19 + TS + Tailwind 4 + Vite 6, MySQL 8, Railway, Vercel Blob
**Fecha:** 2026-10-07 · **Commit auditado:** `4cf28d9` (master)
**Método:** análisis estático del código + mediciones reales locales:
- `npm run build` (Vite 6.x, 2.54 s, 176 assets). No modificó archivos versionados (`public/build` está en `.gitignore`); `git status` quedó limpio.
- Harness PHP propio (fuera del repo, en scratchpad) que arranca el kernel HTTP, autentica al usuario `administrador@example.com` (tenant 1) y despacha peticiones Inertia reales contra la **DB local** (`stokity_v2`, ~100 productos, ~100 ventas, ~580 movimientos) con `DB::enableQueryLog()`, midiendo nº de queries, tiempo SQL, tiempo total y bytes de respuesta.
- `EXPLAIN` sobre la DB local para validar el uso de índices.
- **No se tocó producción.** Los tiempos absolutos son de un Mac local con datos mínimos: lo relevante son el **nº de queries** y su crecimiento con N (las métricas que escalan con el tamaño del tenant).

---

### Métricas Actuales

#### 1. Bundle (build de producción real)

| Métrica | Valor |
|---|---|
| Total JS+CSS emitido | **1.98 MB raw / 564 KB gzip**, 176 archivos |
| `app-*.js` (entry: React, ReactDOM, Inertia, axios, nprogress) | **340.5 KB / 110.1 KB gz** |
| `app-layout-*.js` (sidebar, Radix, lucide, react-hot-toast) | **142.8 KB / 45.2 KB gz** |
| `app-*.css` (Tailwind 4) | 149.6 KB / 23.3 KB gz (contenido legítimo, verificado: ~1 722 clases, casi todas usadas) |
| Chunk más pesado de página: `pages/sales/index` | **230.8 KB / 53.8 KB gz** (+9.4 KB CSS de `react-date-range`) |
| `pages/pos/index` | 52.3 KB / 13.1 KB gz |
| `qz-tray` (lazy, correcto) | 30.1 KB / 9.0 KB gz |
| `manifest.json` | 90.5 KB (solo servidor) |

**Peso JS+CSS de primera carga por ruta (cierre transitivo de imports del manifest):**

| Ruta | Chunks | JS raw | JS gzip | CSS gzip |
|---|---|---|---|---|
| `welcome` | 7 | 341 KB | 111 KB | 23 KB |
| `auth/login` | 14 | 369 KB | 121 KB | 23 KB |
| `dashboard` | 24 | 554 KB | **179 KB** | 23 KB |
| `reports/index` | 23 | 550 KB | 179 KB | 23 KB |
| `products/index` | 30 | 561 KB | 185 KB | 23 KB |
| `finances/index` | 28 | 581 KB | 189 KB | 23 KB |
| `pos/index` | 28 | 593 KB | **191 KB** | 23 KB |
| `sales/index` | 31 | 771 KB | **232 KB** | 26 KB |

Hallazgo de bundle confirmado: el chunk de `sales/index` contiene **la librería date-fns completa** (CJS): `eachWeekendOfInterval`, `formatDistanceStrict`, `intlFormatDistance`, `roundToNearestMinutes` presentes, ninguna usada por la app. La causa es `react-date-range` (build CJS que hace `require('date-fns')` entero), importado estáticamente en `resources/js/pages/sales/index.tsx:21-24`. Coste: **~175 KB raw / ~40 KB gz** de más.

#### 2. Coste por petición del backend (harness local, usuario admin)

| Petición | Queries | SQL ms | Total ms | Bytes |
|---|---|---|---|---|
| `GET /dashboard` (frío) | 35 | 27 | 66 | 41 KB |
| `GET /dashboard` (caliente) | 29 | 8 | 18 | 61 KB |
| `GET /dashboard` parcial `only=metrics` (polling) | **23** | 8 | 10 | **385 B** |
| `GET /pos` | 10 | 4 | 12 | 50 KB |
| `GET /pos` parcial (polling 60 s) | 9 | 2 | 3 | 1.3 KB |
| **`GET /api/products/search?q=a`** (cada tecla en el POS) | **67** | 21 | 37 | 16 KB |
| `GET /api/products/search?q=` | 61 | 9 | 15 | 16 KB |
| **`GET /stock-movements`** | **125–132** (116 son `select * from cache`) | 22–28 | 46–90 | **108–128 KB** |
| `GET /products` | 21 | 5 | 16 | 62 KB |
| `GET /sales` | 9 | 3 | 14 | 64 KB |
| `GET /reports` | 13 | 3 | 11 | 52 KB |
| `GET /reports` parcial (`dashboardData`) | 11 | 2 | 3 | 586 B |
| `GET /finances` | 17 | 8 | 17 | 49 KB |
| `GET /credits` | 8–14 (**incluye un `UPDATE`**) | 2–7 | 9–33 | 27–48 KB |
| `GET /clients`, `/cash-sessions`, `/expenses` | 6–9 | 1–2 | 8–9 | 48–52 KB |

- **Base por petición autenticada (antes del controlador): 6–8 queries**: `sessions` SELECT + UPDATE (driver `database`), `users`, `tenants` (IdentifyTenant), `cache` (permisos Spatie, 12.5 KB serializados), `roles` exists + `roles` first (dataScope), `permissions` x2, `cache` (BusinessSetting) — y `app.blade.php:35` vuelve a pedir `BusinessSetting::getSettings()` en cada carga completa.
- **Payload base de cualquier página Inertia ≈ 47 KB**, de los cuales **23.1 KB es Ziggy** (`'ziggy'` en `HandleInertiaRequests.php:60`, 232 rutas con nombre). Además `@routes` (`app.blade.php:42`) inyecta **otros 23 KB** inline en el HTML de la primera carga. En cliente el prop `ziggy` solo lo lee `ssr.tsx` y **SSR no está desplegado** (`bootstrap/ssr` no existe, así que `HttpGateway` lo omite) → son 23 KB por navegación que no usa nadie.

#### 3. Base de datos

- 73 migraciones; índices compuestos de rendimiento creados en `2026_03_21_000000_add_performance_indexes.php` **antes** de multitenancy → ninguno empieza por `tenant_id`. Después se añadió un `tenant_id` simple a cada tabla (`*_tenant_id_idx`).
- `EXPLAIN` local de las 3 consultas más frecuentes: **`type=ALL` (full scan) + `Using filesort`** en:
  - agregados del dashboard `sales WHERE tenant_id AND status AND date BETWEEN` (el optimizador ni siquiera elige `sales_tenant_id_idx`),
  - listado `sales WHERE tenant_id ORDER BY created_at DESC LIMIT 20`,
  - storefront `products WHERE tenant_id AND show_in_storefront AND status ORDER BY name`.
  Con datos mínimos el full scan es esperable, pero confirma que **no existe ningún índice que cubra filtro + orden** para un usuario con alcance de todas las sucursales (admin/encargado `data_scope=all`).
- **`whereDate()` no sargable: 44 usos** (22 en `ReportQueryService`, 6 en `ReportController`, 4 en `SaleController`, 4 en `StockMovementController`, etc.). Generan `date(col) >= ?`, que anula cualquier índice sobre la columna.
- Cache, sesión y cola usan el driver **`database`** (`.env.example:30,38,40`): cada `Cache::remember` es un SELECT a MySQL.

#### 4. Core Web Vitals (estimados a partir del código; no hay RUM)

| Métrica | Estimación | Fundamento |
|---|---|---|
| **LCP** (primera carga del dashboard) | Escritorio/fibra **~0.9–1.3 s**; móvil 4G medio **~2.2–3.0 s** (límite "Needs improvement") | App 100 % CSR (sin SSR desplegado): nada se pinta hasta descargar y ejecutar 179–232 KB gz de JS. CSS de fuentes externo **bloqueante** (`fonts.bunny.net`, 2 familias/6 pesos, `app.blade.php:40`; Playfair solo lo usan welcome/auth). HTML ~70 KB (página + 23 KB de `@routes`). TTFB en Railway ≈ red + 6–8 queries base + controlador. |
| **INP** | Páginas CRUD **<100 ms**. **POS: ~80–200 ms por tecla** en hardware de caja de gama baja (riesgo de pasar 200 ms = "Poor") | `pos/index.tsx` es un único componente de **2 095 líneas con ~45 `useState`**; cada tecla en búsqueda/monto re-renderiza todo el árbol. El `<Select>` de cliente (Radix) renderiza sus **hasta 500 `SelectItem` incluso cerrado** (los monta en un `DocumentFragment`, `@radix-ui/react-select/dist/index.mjs:257-263`). `sortedClients` (sort de 500 + 4–5 `.find`) se recalcula en cada render (`pos/index.tsx:317-348,433`). Solo 12 archivos de 177 usan `useMemo`/`useCallback`/`memo`. |
| **CLS** | **~0.02–0.06** (bueno) | Las miniaturas tienen tamaño fijo por CSS (`h-10 w-10`), así que no generan saltos. Riesgos menores: FOUT por `display=swap`; el polling inyecta filas o cambia el tamaño de tablas; `ImpersonationBanner`. |
| **FCP** | ≈ LCP (CSR) | Igual que LCP: sin SSR, el primer pintado de contenido espera al JS. |

#### 5. Frontend: re-renders y memoria

- **16 páginas hacen polling** con `router.reload({only})` cada 60–120 s (`hooks/use-polling.ts`). Se pausa con la pestaña oculta (bien), pero no hay backoff por inactividad, no evita peticiones solapadas y se resetea al navegar.
- **Layouts no persistentes:** 82 páginas envuelven `<AppLayout>` inline y 0 usan `Page.layout = ...`. En cada navegación React desmonta y vuelve a montar sidebar, Radix, `Toaster` y `BrandColors` (el `useEffect` de `app-sidebar.tsx:248`, que restaura el scroll, es un parche para este síntoma). Los toasts en vuelo se pierden.
- **Listeners/intervals:** todos los `addEventListener`/`setInterval` tienen su cleanup (8 archivos revisados, conteo add=remove). No se detectaron fugas reales. Hay un bug lógico: `useAppearance` (`hooks/use-appearance.tsx`) quita en su cleanup el listener **global** que registró `initializeTheme()`, así que tras desmontar la página de apariencia el tema deja de seguir los cambios del sistema operativo.
- **Imágenes:** 22 `<img>`, **0 con `loading="lazy"`**, 0 con `width/height`/`decoding`, sin `srcset`. Las imágenes subidas **no se redimensionan**: `BlobStorageService::toWebP()` (`app/Services/BlobStorageService.php:116`) solo re-codifica a WebP q85 con la resolución original. Una foto de celular de 4000×3000 se sirve para una miniatura de 40×40 px. Además `imagecreatefromstring` de 12 MP ocupa ~48 MB de RAM PHP por subida.

---

### Bottlenecks Detectados

> Formato por hallazgo: **Estado actual · Problema · Impacto · Recomendación · Esfuerzo · Prioridad**

#### B1. N+1 sistémico: `Product::image_url` consulta la caché (en MySQL) por cada producto
- **Estado actual:** `Product::$appends = ['image_url']` (`app/Models/Product.php:98`). `getImageUrlAttribute()` llama a `BusinessSetting::getSettings()` (`Product.php:245`) para cada producto sin imagen. `getSettings()` hace `Cache::remember` sobre `CACHE_STORE=database` → 1 `SELECT * FROM cache` + `unserialize` (2.2 KB) **por producto**. También hay un `file_exists()` en disco para imágenes legacy (`Product.php:236`).
- **Problema:** la caché no memoiza dentro de la petición. Localmente el 99 % de los productos no tiene imagen.
- **Impacto (medido):** **búsqueda del POS = 67 queries por tecla** (debounce 250 ms); `/stock-movements` = **116 de 132 queries** son lecturas de caché; afecta a `/products`, al dashboard (stock bajo), a `sales/show`, a la API del storefront (`StoreProductResource.php:41`) y a cualquier serialización de `Product`. Escala O(n) con productos por respuesta: 50 resultados del POS → 50 queries extra. Sobre Railway (red entre app y MySQL, ~0.5–1 ms por round-trip) suma **25–60 ms por búsqueda** solo en latencia.
- **Recomendación:** memoizar por petición. `once()` no sirve tal cual porque su memo es por call-site y no distingue el tenant (`runAs()` cambia de tenant dentro de la misma petición), así que conviene un memo keyed por `tenantId` en `BusinessSetting::getSettings()` (array estático reseteado en `TenantManager::forget()`), o usar `Cache::memo()->remember(...)` (Laravel 12). Mover el cálculo del fallback a un único valor compartido y eliminar `file_exists` (migrar los legacy a Blob). Más adelante, pasar `CACHE_STORE` a Redis.
- **Esfuerzo:** 1–2 h (+ test). **Prioridad: Crítica.**

#### B2. Props eager + polling: los reloads parciales recalculan todo, y `/credits` escribe en cada GET
- **Estado actual:** `DashboardController::index` (`:30-121`) calcula todas las métricas antes de `Inertia::render` con arrays planos. Lo mismo `FinanceController`, `PosController` y otros. Inertia solo filtra la **salida** de `only`, no evita la ejecución.
- **Problema:** `usePolling(['metrics',…])` (`dashboard.tsx:108`, cada 120 s) ejecuta **23 queries para devolver 385 bytes**. `CreditSaleController::index` (`:37-41`) ejecuta un `UPDATE credit_sales … SET status='overdue'` **en cada GET**, también cada 60 s por el polling (`credits/index.tsx:96`): escritura en la ruta de lectura, locks de fila y binlog innecesarios.
- **Impacto:** con 1 pestaña por usuario activo, cada tenant genera ~1 req/min/pestaña × (9–23 queries + UPDATE de `sessions`). Con 50 tenants × 3 cajeros eso son ~150 req/min y ~2 000–3 500 queries/min **solo de polling**, crecientes con el tamaño del tenant (dashboard: stock bajo sin límite).
- **Recomendación:** envolver cada prop en closure (`'metrics' => fn () => …`) o `Inertia::optional()`/`Inertia::defer()` para que `only` evite el cómputo. Mover el marcado de vencidos a un comando programado (`schedule()->hourly()`) o calcularlo al leer (`due_date < now()` en el SELECT). En `usePolling`: backoff tras N minutos sin interacción, evitar solapamientos (`preserveState`, flag in-flight) y `router.reload({ only, async: true })`.
- **Esfuerzo:** 3–5 h. **Prioridad: Alta.**

#### B3. Índices no alineados con multitenancy + `whereDate()` no sargable
- **Estado actual:** índices compuestos sin `tenant_id` al frente (`sales_branch_status_date_idx`, `sales_status_created_idx`, `products_branch_status_idx`, `stock_movements_*_movement_date_index`, `expenses_branch_id_expense_date_index`) y `tenant_id` simple. `EXPLAIN` = full scan + filesort. 44 llamadas a `whereDate`.
- **Problema:** un usuario con `data_scope=all` (sin filtro por `branch_id`) no puede usar `branch_status_date`. El índice simple `tenant_id` obliga a leer **todas las filas del tenant** y filtrar status/fecha en memoria. Con `whereDate` ni siquiera un índice correcto se usaría para el rango.
- **Impacto:** hoy es invisible (cientos de filas). Con un tenant de 100 k ventas, cada agregado del dashboard o de los reportes pasa de O(log n + rango) a O(filas del tenant): **~100–400 ms por query** frente a <5 ms, multiplicado por ~8 agregados en el dashboard y por cada tick de polling. En una DB compartida, un tenant grande degrada a todos (*noisy neighbour*).
- **Recomendación (migración única):**
  - `sales (tenant_id, status, date)`, `sales (tenant_id, created_at)`, `sales (tenant_id, session_id)` opcional
  - `sale_products (tenant_id, sale_id)` si se filtra por tenant en joins (ya existe `sale_id, product_id` único; valorar)
  - `products (tenant_id, status, name)`, `products (tenant_id, show_in_storefront, status, name)`
  - `stock_movements (tenant_id, movement_date, created_at)`
  - `expenses (tenant_id, expense_date)`
  - `cash_sessions (tenant_id, opened_by_user_id, branch_id, status)` (para `CashSession::getOpenForUser`, llamado en cada carga del POS y en cada venta, `CashSession.php:99`)
  - `credit_sales (tenant_id, status, due_date)`
  - `sale_returns (tenant_id, created_at)`

  Reemplazar `whereDate(col,'>=',d)` por `where(col,'>=',d.' 00:00:00')` y `whereDate(col,'<=',d)` por `where(col,'<', d+1día)` (helper en `ReportQueryService::applyDbFilters`, `:878-882`). Eliminar los `*_tenant_id_idx` simples que queden redundantes (los cubre el prefijo del compuesto).
- **Esfuerzo:** 4–6 h (migración + refactor de helpers + `EXPLAIN` de validación). **Prioridad: Alta** (Crítica a medio plazo).

#### B4. Registro de una venta: ~6 queries por ítem + recarga completa del POS
- **Estado actual:** `SaleController::store` valida `products.*.id => exists:products,id` (`:136`, 1 query/ítem). `validateStockAndTax()` hace `Product::find()` por ítem (`:880-881`). Dentro de la transacción, por ítem: INSERT `sale_products`, `lockForUpdate()->find` (lock + SELECT), UPDATE `products` y INSERT `stock_movements`. A eso se suma `PaymentMethod` pluck, `BusinessSetting`, `CashSession` x2 y el bucle de unicidad del código. Después, el redirect a `pos.index` recarga la página entera (10 queries, ~50 KB con 500 clientes).
- **Impacto:** carrito de 5 ítems ≈ **40–45 queries** + recarga ≈ 55 queries por venta. Los locks de fila se mantienen durante todo el bucle (contención entre cajas que venden el mismo SKU). En Railway cada round-trip suma: **~60–120 ms de servidor por venta** que se pueden evitar.
- **Recomendación:** cargar los productos una vez con `Product::whereIn('id',$ids)->lockForUpdate()->get()->keyBy('id')` dentro de la transacción (ordenados por id para evitar deadlocks). Validar existencia/stock/impuesto con esa colección. `SaleProduct::insert()` y `StockMovement::insert()` masivos. Responder al POS con un redirect que solo recargue `pendingSalesCount`/`currentSession` (o `preserveState` + `only`).
- **Esfuerzo:** 4–6 h + tests de concurrencia. **Prioridad: Alta.**

#### B5. INP del POS: componente monolítico + Select de 500 clientes siempre renderizado
- **Estado actual:** `pages/pos/index.tsx` (2 095 líneas, ~45 `useState`, 4 hooks de memo). `sortedClients` se recalcula en cada render (`:317`). `<Select>` con `sortedClients.map(...)` (`:1528`). El listener de teclado se re-registra cuando cambian `cart`, `total`, `results`… (`:806`).
- **Problema:** cada tecla en la búsqueda o en el monto pagado re-renderiza carrito, resultados (50 `<img>` de resolución completa), modales y 500 `SelectItem`.
- **Impacto:** INP estimado de 80–200 ms en PCs de caja de gama baja. El polling de 60 s re-envía hasta 500 clientes (~40 KB) y re-renderiza todo. Es el flujo de negocio más crítico (velocidad en caja).
- **Recomendación:** `const sortedClients = useMemo(...)` + `Map` por id. Reemplazar el `<Select>` por un combobox con búsqueda remota y virtualizado (`cmdk` ya encaja con shadcn) que no monte ítems cerrado. Extraer `<CartPanel>`, `<SearchResults>` y `<PaymentPanel>` como `React.memo` con callbacks estables. Usar `useDeferredValue(query)` para la lista de resultados. Sacar `clients` del polling (cargar bajo demanda).
- **Esfuerzo:** 1–2 días. **Prioridad: Alta.**

#### B6. Ziggy duplicado (23 KB × 2) y shared props sin lazy
- **Estado actual:** `@routes` (`app.blade.php:42`) + prop `ziggy` (`HandleInertiaRequests.php:60`). `auth.user` serializa el modelo `User` completo (`:54`). `quote` llama a `Inspiring::quotes()->random()` en **cada** petición (`:47,52`), aunque solo lo usa alguna pantalla de auth.
- **Impacto:** **~49 % del payload base** (23 KB de 47 KB) en cada navegación Inertia, más 23 KB en el HTML inicial. En 4G son ~50–80 ms más de transferencia y parse por navegación.
- **Recomendación:** quitar el prop `ziggy` mientras no haya SSR (o compartirlo solo si `config('inertia.ssr.enabled') && bundle existe`). Filtrar Ziggy con `only`/`except` (las rutas de `admin.*` y `api.store.*` no hacen falta en el panel del tenant). `auth.user` como array explícito (`id, name, email, branch_id, photo_url, tenant_id`). `quote` como closure lazy.
- **Esfuerzo:** 1–2 h. **Prioridad: Media.**

#### B7. Listas sin límite en payloads
- **Estado actual:** `StockMovementController::index:74` → `Product::where('status', true)->get()` (todos los productos con todas las columnas + `image_url`) solo para un filtro desplegable. `DashboardController::getLowStockProductsList` (`:299-313`) devuelve todo el stock bajo con `category` y `branch` completos ("sin límite — se muestran todos"). `SaleController::create:92`/`edit:714` y `CreditSaleController:89` hacen `Client::orderBy('name')->get()` con todas las columnas. `WholesaleSaleController:60,118` también sin límite. `PosController:24` usa `limit(500)`, pero los clientes por encima de 500 **no se pueden seleccionar** (bug funcional).
- **Impacto:** `/stock-movements` ya pesa **128 KB con 100 productos**: con 5 000 productos serían ~5 MB de JSON y 5 000 lecturas de caché (B1). El dashboard escala igual.
- **Recomendación:** endpoints de autocompletado (`/api/products/search` ya existe; añadir `/api/clients/search`) y selects asíncronos. Stock bajo: `limit(20)` + conteo + enlace "ver todos". Siempre `->get([...columnas])`.
- **Esfuerzo:** 4–8 h. **Prioridad: Alta.**

#### B8. Infraestructura de caché, sesión y cola sobre MySQL
- **Estado actual:** `CACHE_STORE=database`, `SESSION_DRIVER=database`, `QUEUE_CONNECTION=database` (sin worker ni jobs: `grep ShouldQueue` = 0). Permisos Spatie cacheados en DB (12.5 KB serializados por tenant, leídos en cada petición). El healthcheck de Railway apunta a `/` (`railway.toml`), es decir, al stack web completo con sesión, en vez de `/up`.
- **Impacto:** ~3 de las 6–8 queries base son caché/sesión. Cada request hace además un **UPDATE en `sessions`** (multiplicado por el polling). La tabla `cache` crece sin GC eficiente.
- **Recomendación:** añadir Redis en Railway (servicio gestionado) para `cache`, `session` y `queue`, con `permission.cache.store=redis`. `healthcheckPath = "/up"`. Mover a cola las tareas lentas: subida y conversión a Blob, exportes PDF de dompdf (`ReportController::export*`).
- **Esfuerzo:** 2–4 h + coste del servicio. **Prioridad: Media** (Alta si crece el nº de tenants).

#### B9. Imágenes sin redimensionado, sin variantes ni lazy loading
- **Estado actual:** `BlobStorageService::toWebP()` (`:89-122`) mantiene la resolución original. 0/22 `<img>` con `loading="lazy"`.
- **Impacto:** miniaturas de 40–48 px que descargan entre 200 KB y 1.5 MB cada una (foto típica de móvil en WebP q85). En el POS se ven hasta 50 resultados, así que una búsqueda puede mover **10–40 MB** en el peor caso. El storefront de Lu Accesorios consume estas mismas URLs: impacto directo en su LCP. Picos de memoria PHP en la subida.
- **Recomendación:** al subir, `imagescale` a un máximo de 1600 px (detalle) + variante `thumb` de 320 px (columna `image_thumb` o sufijo en Blob). En el frontend: `loading="lazy" decoding="async" width/height` y `srcset`. Backfill con un comando artisan para las imágenes existentes.
- **Esfuerzo:** 1 día. **Prioridad: Alta** (por el storefront).

#### B10. Bundle: date-fns completo, Ziggy, chunking del vendor y fuentes
- **Estado actual:** `react-date-range` estático en `sales/index.tsx:21-24` (date-fns entero en CJS). `vite.config.ts` sin `manualChunks`: el chunk `app` (110 KB gz) mezcla vendor y código propio, así que **cada deploy invalida la caché** de React/Inertia. Fuentes desde `fonts.bunny.net` bloqueantes, con Playfair (3 pesos) cargada en todas las páginas aunque solo la usan `welcome` y el layout de auth.
- **Impacto:** +40 KB gz en ventas. Re-descarga de ~155 KB gz (app + app-layout) en cada deploy (push a master = deploy). +1 RTT bloqueante a un tercero en el primer pintado (~100–300 ms en 4G).
- **Recomendación:** cargar el picker con `React.lazy(() => import('react-date-range'))` solo al abrirlo, o migrar a `react-day-picker` (ESM, usa el date-fns ESM ya presente). En Vite, `build.rollupOptions.output.manualChunks` con `react`/`react-dom`/`@inertiajs` → `vendor-react`, `@radix-ui/*` → `vendor-radix` y `lucide-react` → `vendor-icons`. Auto-hospedar Instrument Sans (woff2, `preload`) y cargar Playfair solo en auth/welcome.
- **Esfuerzo:** 3–5 h. **Prioridad: Media.**

#### B11. Otros (menores)
| # | Hallazgo | Ref | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| a | N+1 en el cierre de caja: `SaleReturnProduct::where(...)` por cada devolución | `CashSessionController.php:359-361` | `->with(['products','sale.saleProducts'])` | 15 min | Media |
| b | Caché de reportes de 15 min (`ReportQueryService.php:16`) sin invalidar al vender; el polling de 120 s en `reports/index.tsx:100` devuelve siempre el dato cacheado | — | Quitar el polling de reportes o invalidar con tags/versión por tenant al crear/anular una venta | 1–2 h | Media |
| c | Layouts no persistentes (82 páginas): remount de sidebar y Toaster en cada navegación | `layouts/app-layout.tsx` | `Page.layout = (page) => <AppLayout>{page}</AppLayout>` o default layout en `resolve` de `app.tsx` | 3–4 h | Media |
| d | `throttle:60,1` en la búsqueda del POS: un lector de código de barras o un tecleo rápido (4 req/s con el debounce de 250 ms) puede devolver 429 | `routes/products.php:9` | Subir a 240/min por usuario, o tratar el "Enter" de escáner como búsqueda exacta por `code` | 15 min | Media |
| e | Búsqueda `LIKE '%q%'` sobre name/code/description: full scan del tenant | `ProductController.php:50-52,457-460` | Atajo de código exacto (índice único `tenant_id,code`) antes del LIKE; a futuro índice FULLTEXT o `name LIKE 'q%'` | 1–2 h | Baja |
| f | `useAppearance` elimina el listener global de tema del SO | `hooks/use-appearance.tsx` | No quitar en el cleanup el listener de `initializeTheme` | 10 min | Baja |
| g | Healthcheck sobre `/` (sesión + DB) | `railway.toml` | `/up` | 5 min | Baja |
| h | Agregados del dashboard (`getTopProducts`, `getSalesByBranch`, `getDailySales`) no filtran `deleted_at` (inconsistencia con `getSalesAggregates`) | `DashboardController.php:224-275,358` | Añadir `whereNull('sales.deleted_at')` (correctitud; se reporta por cercanía) | 10 min | Media |

---

### Optimizaciones Propuestas (Top 5 con ganancia estimada)

| # | Optimización | Ganancia estimada | Esfuerzo | Prioridad |
|---|---|---|---|---|
| **1** | **Memoizar `BusinessSetting` por petición + quitar `file_exists` de `Product::image_url`** (B1) | Búsqueda POS **67 → ~7 queries (−90 %)**, `/stock-movements` **132 → ~16 (−88 %)**, `/products` 21 → ~12. Latencia de servidor de la búsqueda **−50/−70 %** en Railway (~25–60 ms menos por tecla). Beneficia también al storefront API. | 1–2 h | **Crítica** |
| **2** | **Índices compuestos `tenant_id`-first + sustituir `whereDate` por rangos** (B3) | En un tenant de 100 k ventas: agregados del dashboard y de los reportes de **~100–400 ms → <5–10 ms por query (10–50×)**. Elimina el filesort de los listados paginados y aísla el rendimiento entre tenants. Hoy invisible; es el principal riesgo de escalado. | 4–6 h | **Alta** |
| **3** | **Props lazy (closures/`Inertia::optional`) + polling inteligente + sacar el UPDATE de `/credits`** (B2) | Polling del dashboard **23 → ~9 queries (−60 %)** por tick. `/credits` sin escrituras en GET. Con backoff por inactividad, **−50/−80 % de peticiones de polling** totales. Menos UPDATE de `sessions` y menos carga de MySQL compartida. | 3–5 h | **Alta** |
| **4** | **Venta en lote: un `SELECT … FOR UPDATE` + inserts masivos + respuesta parcial al POS** (B4) | Carrito de 5 ítems: **~45 → ~15 queries (−65 %)**; redirect sin recargar 500 clientes (−50 KB). **~60–120 ms menos por venta** en Railway y menor ventana de locks (menos contención entre cajas). | 4–6 h | **Alta** |
| **5** | **Higiene de payload y bundle: quitar el prop `ziggy`, lazy de `react-date-range`, `manualChunks` del vendor, imágenes redimensionadas + `lazy`** (B6, B9, B10) | **−23 KB (−49 %) de payload base por navegación**. `sales/index` **−175 KB raw / −40 KB gz**. Tras cada deploy se re-descargan ~45–60 KB gz en vez de ~155 KB gz (vendor estable). Miniaturas **−90/−98 % de bytes** (de 200 KB–1.5 MB a 8–20 KB). LCP móvil estimado de **~2.6 s → ~1.9 s**. | 1.5–2 días | **Alta/Media** |

*Fuera del Top 5 pero de alto valor para el negocio:* **B5 (INP del POS)**. Memoizar y cambiar el Select de clientes por un combobox remoto reduciría el trabajo por tecla en un orden de magnitud (de ~500+ nodos a <60), con un INP objetivo <100 ms. Esfuerzo 1–2 días, prioridad Alta.

---

### Roadmap

**Sprint 0 — Quick wins (≤ 1 día, riesgo bajo)**
1. B1: memo por petición de `BusinessSetting::getSettings()` (reset en `TenantManager::forget()`); eliminar `file_exists` legacy. Test de conteo de queries (`DB::getQueryLog`) sobre `/api/products/search`.
2. B2 (parte): convertir en closures las props de Dashboard, Finance y POS; mover el marcado `overdue` de créditos a un comando programado.
3. B6: quitar el prop `ziggy` (sin SSR) y `quote` lazy; `auth.user` como array explícito.
4. B11-a, B11-d, B11-f, B11-g, B11-h.
5. `react-date-range` con `React.lazy`.

**Sprint 1 — Base de datos y flujo de venta (1 semana)**
1. B3: migración de índices compuestos + refactor de `whereDate` (`ReportQueryService::applyDbFilters`, `SaleController`, `StockMovementController`, `ExpenseController`, `FinanceController`, `CashSessionController`, `SupplierController`). Validar con `EXPLAIN` usando un seed sintético de 100 k ventas.
2. B4: refactor de `SaleController::store/completePending` a operaciones en lote con lock ordenado; tests de concurrencia existentes y nuevos.
3. B7: endpoint `/api/clients/search` y selects asíncronos (POS, ventas, créditos, mayoristas); límite en stock bajo y en el filtro de productos de movimientos.
4. B11-b: invalidación de la caché de reportes por versión de tenant.

**Sprint 2 — Frontend y experiencia en caja (1–2 semanas)**
1. B5: refactor del POS en subcomponentes memoizados, combobox de clientes virtualizado y `useDeferredValue`.
2. B11-c: layouts persistentes.
3. B10: `manualChunks` del vendor, auto-hospedar fuentes y Playfair solo en auth.
4. `usePolling`: backoff por inactividad, guardia de peticiones solapadas y `async: true`.

**Sprint 3 — Infraestructura y observabilidad (1 semana)**
1. B8: Redis en Railway (cache/session/queue/permission), worker de cola y jobs para Blob y exportes PDF.
2. B9: pipeline de imágenes (resize 1600 + thumb 320), backfill y `srcset`/`lazy`.
3. Observabilidad: Laravel Pulse o Telescope en staging (queries lentas, N+1) + `Model::preventLazyLoading()` en local/CI. RUM de Web Vitals (`web-vitals` → endpoint propio) para reemplazar estas estimaciones por p75 reales.
4. Presupuestos en CI: tamaño de chunk (fallar si `app` > 120 KB gz o una página > 60 KB gz) y test de nº máximo de queries por endpoint crítico (POS search ≤ 10, dashboard ≤ 20, venta de 5 ítems ≤ 20).

**KPIs objetivo tras el roadmap**
| KPI | Hoy | Objetivo |
|---|---|---|
| Queries búsqueda POS | 67 | ≤ 8 |
| Queries `/stock-movements` | 132 | ≤ 15 |
| Queries venta (5 ítems) | ~45 (+10 recarga) | ≤ 18 |
| Queries por tick de polling del dashboard | 23 | ≤ 10 (o 0 con backoff) |
| Payload base Inertia | ~47 KB | ≤ 25 KB |
| JS gz primera carga `sales/index` | 232 KB | ≤ 190 KB |
| LCP p75 móvil (estimado) | ~2.6 s | ≤ 2.0 s |
| INP p75 POS (estimado) | 80–200 ms | < 100 ms |
| Peso de miniatura | 200 KB–1.5 MB | ≤ 20 KB |
