# Auditoría 05 — Testing y Confiabilidad (QA Engineer)

> Fecha: 2026-10-07 · Commit auditado: `4cf28d9` (master) · Alcance: backend Laravel 12 + frontend React 19/TS, CI/CD, Railway.
> Reglas respetadas: no se modificó código, no se instalaron paquetes, no se tocó producción. Los tests se ejecutaron **solo** contra SQLite `:memory:` (verificado en `phpunit.xml`, no existe `.env.testing` que lo sobreescriba).

---

## Resumen ejecutivo

| Indicador | Valor | Objetivo | Estado |
|---|---|---|---|
| Tests backend (Pest) | **475 pasan / 0 fallan** (1.654 aserciones, 21,7 s) | 100 % verde | OK |
| Tests frontend (Vitest) | **96 pasan / 0 fallan** (14 archivos, 2,5 s) | 100 % verde | OK |
| Cobertura de líneas backend | **No medible localmente** (sin Xdebug/PCOV). Estimación: **~45–55 %** | >80 % | Bajo objetivo |
| Rutas HTTP alcanzadas por al menos un test | **139 / 234 (~59 %)** | >90 % | Bajo objetivo |
| Cobertura frontend (archivos con test) | **~14 / 194 archivos TS/TSX (~7 %)**; sin `@vitest/coverage-*` instalado | >60 % en lógica | Crítico |
| Tests E2E (navegador) | **0** (no hay Playwright/Cypress/Dusk) | Flujo POS mínimo | Ausente |
| CI ejecutándose en la rama que despliega | **No** — los workflows escuchan `main`/`develop`, el repo usa `master` | Sí | Crítico |
| Monitoreo de errores (Sentry/Flare/Nightwatch) | **Ninguno** | Sí | Crítico |
| Backups automáticos verificados | **No documentados** (solo backup manual antes de migraciones grandes) | Diario + restore probado | Alto |
| Análisis estático (Larastan nivel 5) | **0 errores** (excluye `ReportController.php`) | — | OK, pero no corre en CI |

**Lectura rápida:** la suite existente es de buena calidad y está verde, con foco notable en RBAC, aislamiento de tenant en la API storefront y reglas de créditos. Pero (1) **nunca se ejecuta automáticamente** antes de desplegar, (2) hay **condiciones de carrera reales en rutas de dinero/stock** que los tests no pueden detectar porque corren en SQLite sin concurrencia (y un test de "pessimistic lock" que da falsa confianza), y (3) producción no tiene **ningún** sistema de observabilidad de errores.

---

### Cobertura de Tests

#### 1. Ejecución de la suite

```
vendor/bin/pest --compact   (DB_CONNECTION=sqlite, DB_DATABASE=:memory:)
Tests:    475 passed (1654 assertions)
Duration: 21.70s

npx vitest run
Test Files  14 passed (14)
Tests       96 passed (96)
```

- Única advertencia: Radix `DialogContent` sin `Description`/`aria-describedby` en `SaleReturnForm.test.tsx` (accesibilidad, no falla).
- `vendor/bin/phpstan analyse` (nivel 5): sin errores.

#### 2. Por qué no hay número exacto de cobertura

- `php -m` no muestra `xdebug` ni `pcov` (Herd sin extensión de cobertura). No se instaló nada por las reglas de la auditoría.
- El workflow `.github/workflows/tests.yml` sí declara `coverage: xdebug`, pero **no ejecuta `--coverage`** y además **nunca ha corrido** (ver Gap G1).
- Se estimó la cobertura mapeando las rutas (`php artisan route:list --json`) contra los `route('...')` y URLs literales usados en `tests/`.

#### 3. Inventario de tests

| Tipo | Archivos | Casos aprox. | Comentario |
|---|---|---|---|
| Unit (`tests/Unit`) | 7 | ~45 | `StockMovementService`, catálogo de permisos, `DataScope`, `TenantManager`, `PermissionTeamResolver`, provisionador de roles |
| Feature/HTTP (`tests/Feature`) | 57 | ~430 | Auth, RBAC (9 archivos), Tenancy/SuperAdmin (9), API storefront (≈55 casos), Ventas, Créditos, Caja, Mayoristas, Finanzas, Stock |
| Frontend (Vitest + Testing Library) | 14 | 96 | Hooks (`use-permissions`, `use-printer`, …), `can`, `currency-input`, `SaleReturnForm`, `wholesale-discount` |
| E2E | 0 | 0 | — |
| Contrato API (OpenAPI) | 0 | 0 | La API pública `/api/v1/store/*` no tiene spec ni tests de contrato |

#### 4. Cobertura estimada por módulo (backend)

| Módulo | Archivos clave | Cobertura estimada | Evidencia |
|---|---|---|---|
| RBAC / permisos | `app/Authorization/*`, `RoleController`, `RoleGuardService` | **Alta (80–90 %)** | 9 archivos en `tests/Feature/RBAC`, tests por rol real sobre rutas HTTP |
| API storefront | `Api/Store/*`, `ResolveTenantFromApiKey`, `StorefrontOrderCounter` | **Alta en productos/imágenes/order-ref (~75 %)**; `info`, `branches`, `payment-methods` sin tests | `tests/Feature/Api/StoreApiTest.php` |
| Créditos | `CreditSaleController`, `Services/Credit/*` | **Media-alta (~65 %)** | `CreditAccountingTest`, `CreditInstallmentsEditTest`; faltan `receivables`, `overdue-count`, concurrencia |
| Ventas POS | `SaleController` (914 líneas) | **Media (~55 %)** | `store/update/destroy/show/returns` cubiertos; **`completePending`, `updatePending`, `pendingForBranch`, `deletedIndex` sin tests** |
| Caja | `CashSessionController` | **Media-alta (~70 %)** | Apertura, cierre, movimientos, cierre ciego |
| Mayoristas | `WholesaleSaleController`, `WholesaleSaleService` | **Alta (~75 %)** | 18 casos, incluye regresiones |
| Stock | `StockMovementController`, `ProductController::updateStock` | **Media (~50 %)** | `statistics`, `show` sin tests; carrera en `updateStock` no detectable |
| Reportes | `ReportController` (541), `ReportQueryService` (918), `ReportExportService` (548) | **Baja (~25 %)** | Solo `ReportFiltersTest`; 15 rutas de export Excel/PDF sin test; `DATE_FORMAT` MySQL no ejecutable en SQLite |
| Impresión | `PrintController` (1.640 líneas) | **Muy baja (~10 %)** | Solo `/print/labels`; recibos venta/crédito/abono/devolución/caja, `qz/sign`, `qz/certificate` sin test |
| SuperAdmin | `Admin/TenantController`, `TenantRoleController` | **Media (~50 %)** | Detalle, búsqueda, impersonación probados; `suspend`, `activate`, `create` sin test por nombre de ruta |
| Catálogos CRUD | `Branch`, `Category`, `Client`, `Supplier`, `PaymentMethod`, `ExpenseCategory` | **Baja-media (~35 %)** | `PaymentMethodController` 0 rutas probadas (9 rutas) |
| Auth / perfil | Breeze | **Alta** | Tests del starter kit |

**Estimación global de líneas backend: ~45–55 %** (pesando por LOC: los 3 archivos más grandes — `PrintController`, `ReportQueryService`, `SaleController` — suman ~3.500 líneas y dos de ellos tienen cobertura baja).

#### 5. Rutas sin ningún test (95 de 234) — las relevantes

- **Dinero/stock:** `POST sales/{sale}/complete`, `PATCH sales/{sale}/pending`, `GET sales/pending`, `DELETE products/{product}/force-delete`, `GET credits/receivables`, `GET credits/overdue-count`, `PUT expenses/{expense}`, `DELETE expense-templates/{t}/unregister-month`, `GET reports/cash-balance`.
- **Impresión:** `print/receipt/{sale}`, `print/credit/{credit}`, `print/credit-payment/{payment}`, `print/return-receipt/{saleReturn}`, `print/cash-session/{session}`, `qz/sign`, `qz/certificate(/download)`.
- **Tenant/SuperAdmin:** `admin/tenants/{tenant}/suspend`, `admin/tenants/{tenant}/activate`, `admin/tenants/create`.
- **API pública:** `api/v1/store/info`, `api/v1/store/branches`, `api/v1/store/payment-methods`.
- **Catálogos:** las 9 rutas de `payment-methods`, `branches` (restore/force-delete/trashed), `categories` (show/restore/force-delete), `clients` (show/destroy), `suppliers` (update/destroy).
- **Reportes:** 15 rutas `reports/*/export/{excel,pdf}`, `reports/products`, `reports/sellers`, `reports/sales-detail`.

#### 6. Calidad de los tests existentes

**Fortalezas**
- Tests de RBAC con roles Spatie reales sobre rutas reales (`tests/Feature/RBAC/PermissionEnforcementTest.php`), incluyendo roles custom con permisos mínimos — muy buena práctica.
- `TenantIsolationTest` usa `TenantManager::runAs` y verifica 404 por route-model binding entre tenants; incluye "fail closed" cuando el tenant no existe.
- API storefront: tests de SSRF, scopes de API key, throttling por tenant, colisión de slug simulada, contadores por tenant.
- Tests de regresión nombrados como tales (`regression: clicking cancel a second time…`), señal de disciplina post-bug.
- Uso correcto de `Http::fake`, `Storage::fake`, mocks de `BlobStorageService`.
- 17 factories para 32 modelos; helpers `adminUser()/managerUser()/vendedorUser()` en `tests/Pest.php`.

**Debilidades**
- **Falsa confianza en concurrencia:** `tests/Feature/Stock/PessimisticLockTest.php` ejecuta dos transacciones **secuenciales** sobre SQLite (donde `lockForUpdate()` es no-op) y no invoca ningún código de la app. Pasaría igual sin el lock. No prueba nada del `SaleController`.
- **Motor distinto a producción:** tests en SQLite, producción en MySQL 9.6. `ReportQueryService.php:324` usa `DATE_FORMAT` (solo MySQL), 4 migraciones bifurcan por `getDriverName()`; los enums/FKs/collation de MySQL no se validan.
- **Aislamiento multi-tenant probado solo para `Product`** a nivel HTTP. No hay test cruzado entre tenants para `Sale`, `CreditSale`, `CashSession`, `Client`, `Expense`, `StockMovement`, reportes ni finanzas. Tampoco un test "arquitectónico" que obligue a que todo modelo con `tenant_id` use `BelongsToTenant` (`WholesaleSaleItem` no lo usa — depende del padre).
- **Manipulación de precios en POS sin test:** existe para mayoristas (`WholesaleSaleTest:62`) pero no para `sales.store`/`sales.complete`, donde `price`, `subtotal` y `net` vienen del cliente (ver G4).
- 17 factories faltantes (`CreditSale`, `CreditPayment`, `SaleReturn`, `WholesaleSale`, `Tenant`, `TenantApiKey`, …) → los tests construyen datos a mano con `::create([...])`, más frágil.
- `tests/Unit/ExampleTest.php` y `tests/Feature/ExampleTest.php` son placeholders.
- Frontend: sin tests de las páginas críticas (`pos/*`, `cash-sessions/close.tsx`, `credits/*`), sin cobertura configurada.

---

### Gaps Identificados

> Formato: **Estado Actual · Problema · Impacto · Recomendación · Esfuerzo · Prioridad · Archivos**

#### G1. El CI nunca se ejecuta en la rama que despliega a producción
- **Estado Actual:** `.github/workflows/tests.yml` y `lint.yml` se disparan en `push`/`pull_request` a `main` y `develop`. El repo usa `master`; `gh run list` solo muestra ejecuciones de Copilot, **ninguna de `tests` o `linter`**. `master` no tiene branch protection (`gh api …/protection` → 404). Railway despliega en cada push a `master`.
- **Problema:** cualquier commit con tests rotos o migración inválida llega directo a producción. Los 475 tests no protegen nada en la práctica.
- **Impacto:** regresiones en ventas/caja/créditos detectadas por el cliente final, no por el pipeline.
- **Recomendación:**
  1. Cambiar `branches: [develop, main]` → `[master]` en ambos workflows.
  2. Activar branch protection en `master` con check requerido `tests` (o, si se mantiene push directo, en Railway activar **"Wait for CI"** en Settings → Deploy para que no despliegue hasta que GitHub Actions esté verde).
  3. Añadir `npm run types` y `npx vitest run` al job.
  4. En `lint.yml` usar `pint --test`, `npm run format:check` y `eslint .` (sin `--fix`): hoy, aunque corriera, reescribe archivos y nunca falla.
- **Esfuerzo:** 1–2 h · **Prioridad: Crítica**
- **Archivos:** `.github/workflows/tests.yml`, `.github/workflows/lint.yml`

#### G2. Abonos a crédito sin bloqueo de fila: doble abono y doble cierre del crédito
- **Estado Actual:** `CreditPaymentService::register()` valida `status` y `amount <= balance` **fuera** de la transacción con el modelo ya cargado; dentro calcula `amount_paid = credit->amount_paid + amount` sobre ese modelo en memoria, sin `lockForUpdate()`.
- **Problema:** dos requests simultáneos (doble clic, reintento de red) pasan ambos la validación; se crean 2 `CreditPayment` y 2 `CashMovement`, pero `amount_paid` queda con el valor de uno solo (lost update). Si el saldo llega a 0, `handleCompletion` puede ejecutarse dos veces → en `DeferredSaleStrategy` se crea la `Sale` y se descuenta stock **dos veces**.
- **Impacto:** descuadre de caja, saldo de cliente incorrecto, stock negativo/duplicado. Ruta de dinero directa.
- **Recomendación:** dentro de `DB::transaction`, recargar `$credit = CreditSale::lockForUpdate()->findOrFail($credit->id)` y mover allí las validaciones de `status` y saldo. Hacer `handleCompletion` idempotente (comprobar `status !== completed` bajo lock). Test: llamar `register()` dos veces con el mismo modelo "stale" y verificar que la segunda falla y que hay una sola `Sale`.
- **Esfuerzo:** 3–4 h (incluye tests) · **Prioridad: Crítica**
- **Archivos:** `app/Services/Credit/CreditPaymentService.php:28-95`, `app/Services/Credit/Strategies/DeferredSaleStrategy.php`, `app/Services/Credit/Strategies/ImmediateSaleStrategy.php`

#### G3. Completar cotización (`sales.complete`) sin lock sobre la venta: doble descuento de stock
- **Estado Actual:** `SaleController::completePending()` verifica `status !== 'pending'` **antes** de la transacción y sin bloquear la venta. Dentro de la transacción borra y recrea `saleProducts` y descuenta stock.
- **Problema:** dos clics en "Cobrar" → ambos ven `pending`, ambos descuentan stock y registran movimientos `out`; la venta termina `completed` una vez pero el stock se descuenta 2×. Ruta **sin ningún test**.
- **Impacto:** inventario incorrecto, movimientos de stock duplicados, posible venta asociada dos veces a la caja.
- **Recomendación:** al inicio de la transacción `Sale::lockForUpdate()->findOrFail($sale->id)` y re-chequear `status === 'pending'` (lanzar `RuntimeException` si no). Añadir tests: completa OK, segunda llamada → error y stock intacto, vendedor de otra sucursal → 403, sin caja con `require_cash_session` → error.
- **Esfuerzo:** 3 h · **Prioridad: Crítica**
- **Archivos:** `app/Http/Controllers/SaleController.php:301-419`

#### G4. Precio, subtotal y neto de ventas POS se toman del cliente, sin test que lo impida
- **Estado Actual:** en `store()` y `completePending()` el servidor recalcula impuesto y descuento, pero `products.*.price`, `products.*.subtotal` y `net` se aceptan del request (`SaleController.php:152`, `:363`, `:380`). `validateStockAndTax()` calcula el impuesto sobre el `subtotal` enviado.
- **Problema:** un usuario con permiso de venta puede enviar `price: 1` por un producto de $100.000 y el total se guarda así. Mayoristas sí recalcula server-side y tiene test; POS no.
- **Impacto:** fraude interno/ingresos subreportados; reportes y COGS incorrectos. (Se coordina con el agente de Seguridad; aquí se reporta como gap de test y de integridad.)
- **Recomendación:** recalcular `subtotal = product->price * quantity` (o validar precio contra `product->price` permitiendo solo descuentos explícitos) y `net = Σ subtotal` en servidor. Test: enviar precio manipulado y comprobar que `sale.total` usa el precio de BD o que responde 422.
- **Esfuerzo:** 4–6 h · **Prioridad: Crítica**
- **Archivos:** `app/Http/Controllers/SaleController.php:105-257, 301-419, 875-901`

#### G5. Ajuste manual de stock sin lock (lost update contra ventas)
- **Estado Actual:** `ProductController::updateStock()` lee `$product->stock` fuera de transacción y guarda `newStock` calculado sobre ese valor, sin `lockForUpdate()`. (En cambio, `StockMovementController::store` sí bloquea.)
- **Problema:** si una venta descuenta stock entre la lectura y el guardado del ajuste "add/subtract", el ajuste sobrescribe la venta.
- **Impacto:** stock real ≠ stock del sistema; `previous_stock` del movimiento queda falso (rompe trazabilidad).
- **Recomendación:** mover lectura y cálculo dentro de `DB::transaction` con `Product::lockForUpdate()->findOrFail($product->id)`, igual que `StockMovementController:155-160`.
- **Esfuerzo:** 1–2 h · **Prioridad: Alta**
- **Archivos:** `app/Http/Controllers/ProductController.php:390-441`

#### G6. Los tests no pueden detectar carreras ni diferencias MySQL (SQLite :memory:)
- **Estado Actual:** toda la suite corre en SQLite; producción es MySQL 9.6. `PessimisticLockTest` es secuencial y no usa código de la app. `DATE_FORMAT` en `ReportQueryService.php:324`.
- **Problema:** G2, G3 y G5 son invisibles para la suite; reportes agrupados por periodo no son ejecutables en test; migraciones con ramas por driver no se validan contra MySQL.
- **Impacto:** falsa sensación de seguridad en las rutas más sensibles.
- **Recomendación:**
  1. Añadir en CI un job con servicio `mysql:8.4`/`9` (`DB_CONNECTION=mysql`) que corra la suite completa (o al menos `--group=mysql`).
  2. Reescribir `PessimisticLockTest` para que ejerza la app: patrón "stale model" (cargar el modelo, ejecutar la operación una vez, volver a ejecutar con el modelo viejo) o, en el job MySQL, dos conexiones (`DB::connection('mysql_2')`) para verificar bloqueo real.
  3. Marcar con `->group('mysql')` los tests de reportes que usan funciones MySQL.
- **Esfuerzo:** 1 día · **Prioridad: Alta**
- **Archivos:** `phpunit.xml`, `tests/Feature/Stock/PessimisticLockTest.php`, `.github/workflows/tests.yml`, `app/Services/ReportQueryService.php`

#### G7. Aislamiento multi-tenant probado solo para Productos
- **Estado Actual:** `tests/Feature/Tenancy/TenantIsolationTest.php` (6 casos) cubre listado/acceso de `Product` y estados del tenant. La API storefront tiene buenos tests de tenant. El resto del dominio no.
- **Problema:** una regresión en `BelongsToTenant`, en un `DB::table()`/`DB::raw` (reportes, finanzas, dashboard usan 25 queries `DB::table()` que **no** aplican el global scope y dependen de un `where('tenant_id', $tid)` manual en cada join — p. ej. `ReportQueryService.php:136-138`) o en una regla `exists:` filtraría datos entre negocios sin que ningún test falle.
- **Impacto:** fuga de datos entre clientes del SaaS (ventas, clientes, finanzas). Riesgo legal y reputacional.
- **Recomendación:**
  1. Test parametrizado (dataset Pest) con dos tenants que recorra `sales.show`, `credits.show`, `cash-sessions.show`, `clients.show`, `expenses`, `stock-movements.show`, `wholesale.show`, `print.receipt` → esperar 404 cruzado.
  2. Tests de `dashboard`, `finances.summary`, `reports.*` y `credits.receivables` con datos en ambos tenants verificando que los totales solo suman el propio tenant.
  3. Test arquitectónico (Pest `arch()` o reflexión) que falle si un modelo con columna `tenant_id` no usa `BelongsToTenant`.
- **Esfuerzo:** 1–1,5 días · **Prioridad: Alta**
- **Archivos:** `tests/Feature/Tenancy/TenantIsolationTest.php`, `app/Models/Concerns/BelongsToTenant.php`, `app/Services/ReportQueryService.php`, `app/Http/Controllers/DashboardController.php`, `app/Http/Controllers/FinanceController.php`

#### G8. Sin monitoreo de errores en producción
- **Estado Actual:** no hay Sentry/Flare/Nightwatch/Bugsnag en `composer.json`/`package.json`; `bootstrap/app.php` → `withExceptions(function () { // })` vacío; `.env.example` con `LOG_STACK=single` (archivo local en el contenedor efímero de Railway). Solo 11 llamadas a `Log::` en todo `app/`.
- **Problema:** un 500 en el POS solo se conoce si el cliente avisa; los logs en archivo se pierden en cada redeploy. Errores JS del frontend (React) no se capturan en absoluto.
- **Impacto:** tiempo de detección y diagnóstico de incidentes muy alto; imposible reconstruir qué pasó en una venta fallida.
- **Recomendación:**
  1. Instalar `sentry/sentry-laravel` + `@sentry/react` (plan gratuito suficiente), con `tenant_id`, `user_id` y `branch_id` como tags vía `Sentry\configureScope` en `IdentifyTenant`.
  2. En Railway: `LOG_CHANNEL=stderr` (Railway recolecta stdout/stderr) y `LOG_LEVEL=warning`.
  3. Logs estructurados (`Log::info('sale.completed', [...])`) en ventas, abonos, cierres de caja y cancelaciones.
  4. Verificar en Railway que `APP_DEBUG=false`.
- **Esfuerzo:** 0,5–1 día · **Prioridad: Crítica**
- **Archivos:** `bootstrap/app.php`, `config/logging.php`, `app/Http/Middleware/IdentifyTenant.php`, `resources/js/app.tsx`

#### G9. Health check apunta a `/` y no valida dependencias
- **Estado Actual:** `railway.toml` → `healthcheckPath = "/"` (closure de bienvenida). Laravel expone `/up` (registrado en `bootstrap/app.php`) pero no se usa, y por defecto no comprueba DB.
- **Problema:** Railway marca sano un contenedor sin conexión a MySQL; `/` renderiza Inertia y puede depender de assets.
- **Impacto:** despliegues "verdes" con la app rota; sin alerta.
- **Recomendación:** `healthcheckPath = "/up"` y escuchar `Illuminate\Foundation\Events\DiagnosingHealth` para ejecutar `DB::select('select 1')`. Añadir monitor externo de uptime (Better Stack/UptimeRobot) sobre `/up` y sobre `/api/v1/store/info` (con una key de monitoreo).
- **Esfuerzo:** 1–2 h · **Prioridad: Alta**
- **Archivos:** `railway.toml`, `bootstrap/app.php`, `app/Providers/AppServiceProvider.php`

#### G10. Migraciones en el arranque y servidor de desarrollo en producción
- **Estado Actual:** el start command configurado en el dashboard de Railway (documentado en `docs/rollback-rbac-pr0.md:17`) es `php artisan migrate --force && php artisan serve`. No está versionado en `railway.toml`. No hay staging.
- **Problema:** (a) una migración fallida deja el servicio sin arrancar y Railway reintenta hasta 10 veces; (b) si alguna vez hay más de una réplica, las migraciones corren en paralelo; (c) `artisan serve` es un servidor de un solo proceso pensado para desarrollo: una exportación PDF pesada bloquea todo el POS de todos los tenants.
- **Impacto:** caídas en deploy y degradación bajo carga concurrente.
- **Recomendación:** versionar en `railway.toml` un `preDeployCommand = "php artisan migrate --force"` (separado del arranque) y un `startCommand` con servidor de producción (FrankenPHP/Octane, o nginx+php-fpm vía Nixpacks `NIXPACKS_PHP_*`). Crear un entorno **staging** en Railway apuntando a una rama `develop`.
- **Esfuerzo:** 0,5–1 día · **Prioridad: Alta**
- **Archivos:** `railway.toml`, `docs/rollback-rbac-pr0.md`

#### G11. Backups de base de datos manuales y restore nunca probado
- **Estado Actual:** `DEPLOY_MULTITENANCY.md` describe un backup manual (snapshot Railway o `mysqldump`) antes de migraciones grandes. No hay evidencia de backups programados, retención ni prueba de restauración.
- **Problema:** pérdida de datos ante error humano (p. ej. `CleanTransactionalData`), migración destructiva o incidente del proveedor.
- **Impacto:** pérdida irreversible de ventas/créditos de todos los tenants.
- **Recomendación:** activar backups programados del servicio MySQL en Railway (diario, retención ≥14 días) **y** un `mysqldump` diario a almacenamiento externo (S3/R2) vía GitHub Action programada o servicio cron en Railway. Ensayo de restore trimestral en un entorno aparte, documentado.
- **Esfuerzo:** 0,5 día · **Prioridad: Alta**
- **Archivos:** `DEPLOY_MULTITENANCY.md`, `app/Console/Commands/CleanTransactionalData.php`

#### G12. Sin idempotencia en creación de ventas/abonos/movimientos
- **Estado Actual:** `sales.store`, `credits.payments.store`, `cash-sessions.movements.store`, `credits.store` y `wholesale.store` no aceptan clave de idempotencia; la protección contra doble envío depende solo de que el botón se deshabilite en React (`processing`).
- **Problema:** reintentos de red o doble envío (lectores de código de barras que envían Enter, conexión lenta) crean registros duplicados.
- **Impacto:** ventas duplicadas, caja inflada.
- **Recomendación:** campo `idempotency_key` (UUID generado al abrir el carrito/formulario) con índice único `(tenant_id, idempotency_key)` en `sales`, `credit_payments`, `cash_movements`; si llega repetido, devolver la entidad existente. Test por endpoint.
- **Esfuerzo:** 1 día · **Prioridad: Media**
- **Archivos:** `app/Http/Controllers/SaleController.php`, `app/Services/Credit/CreditPaymentService.php`, `app/Http/Controllers/CashSessionController.php`

#### G13. Impresión y reportes prácticamente sin tests
- **Estado Actual:** `PrintController` (1.640 líneas, 7 `catch`) solo tiene `PrintLabelsTest`. 15 rutas de exportación Excel/PDF y `ReportExportService` (548 líneas) sin tests.
- **Problema:** recibos (dato fiscal para el cliente) y exportaciones pueden romperse sin aviso; además son rutas que hoy no validan tenant en test.
- **Impacto:** clientes sin recibo / reportes con datos de otro tenant o 500.
- **Recomendación:** smoke tests: `GET print/receipt/{sale}?width=58|80` → 200 y `data` base64 decodificable que empiece por `ESC @`/contenga el código de venta; recibo de otro tenant → 404; cada export → 200 y `Content-Type` correcto. `qz/sign` con clave de prueba generada en el test.
- **Esfuerzo:** 1 día · **Prioridad: Media**
- **Archivos:** `app/Http/Controllers/PrintController.php`, `app/Http/Controllers/ReportController.php`, `app/Services/ReportExportService.php`

#### G14. Frontend casi sin tests y sin E2E
- **Estado Actual:** 14 archivos de test para ~194 archivos TS/TSX; sin `@vitest/coverage-v8`; sin Playwright/Cypress. Las páginas POS, cierre de caja y créditos no tienen tests.
- **Problema:** la lógica de carrito (subtotales, descuentos, cambio), atajos de teclado del POS y auto-impresión solo se validan manualmente.
- **Impacto:** regresiones de UX en la pantalla más usada; montos mostrados ≠ montos enviados.
- **Recomendación:** (1) instalar `@vitest/coverage-v8` y fijar umbral inicial 30 % en `vite.config.ts`; (2) extraer cálculos del carrito a `resources/js/lib/cart.ts` y testearlos unitariamente; (3) un E2E Playwright "login → abrir caja → vender → cerrar caja" contra un `php artisan serve` con SQLite en CI.
- **Esfuerzo:** 2–3 días · **Prioridad: Media**
- **Archivos:** `vite.config.ts`, `package.json`, `resources/js/pages/pos/*`

#### G15. Manejo de errores: patrón correcto pero sin registro
- **Estado Actual:** las operaciones de dinero usan `DB::transaction` y capturan `RuntimeException` devolviendo errores de validación amigables en español (`SaleController:236`, `CreditSaleController:171/234/280/303`, `CashSessionController:129/332`). Excepciones no esperadas caen al handler por defecto. `SaleReturnController:146` devuelve **JSON 422** dentro de un flujo Inertia (inconsistente: el front espera redirect con errores).
- **Problema:** los errores de negocio no se registran (no se sabe cuántas ventas se rechazan por stock); los inesperados no se reportan (G8). Respuesta JSON en una ruta Inertia produce un modal de error genérico.
- **Impacto:** diagnósticos ciegos; UX confusa en devoluciones fallidas.
- **Recomendación:** crear `App\Exceptions\BusinessRuleException` (con `render()` que haga `back()->withErrors()` y `report()` a nivel `info`), reemplazar los `RuntimeException` genéricos; en `SaleReturnController` usar `back()->withErrors(...)`. Registrar en `withExceptions` el contexto `tenant_id`.
- **Esfuerzo:** 0,5 día · **Prioridad: Media**
- **Archivos:** `bootstrap/app.php`, `app/Http/Controllers/SaleReturnController.php:145-147`

#### G16. Colas y tareas programadas: configuradas pero sin uso ni supervisión
- **Estado Actual:** `QUEUE_CONNECTION=database` en `.env.example`, pero no existen `app/Jobs`, `Listeners` ni `Notifications`; `routes/console.php` solo tiene `inspire`. No hay scheduler (p. ej. marcar créditos vencidos se calcula al vuelo con `overdue-count`).
- **Problema:** no hay riesgo hoy, pero la subida de imágenes a Vercel Blob y la generación de PDF corren síncronas dentro del request (sin reintentos) y cualquier job futuro no tendría worker ni alerta de `failed_jobs`.
- **Impacto:** timeouts en subidas/exportaciones grandes; sin reintento ante fallo transitorio de Blob.
- **Recomendación:** cuando se introduzcan jobs, añadir servicio worker en Railway (`php artisan queue:work --tries=3 --backoff=10`) y alerta sobre `failed_jobs`. Para `BlobStorageService`, envolver la llamada HTTP con `Http::retry(3, 200)`.
- **Esfuerzo:** 2–4 h · **Prioridad: Baja**
- **Archivos:** `app/Services/BlobStorageService.php`, `config/queue.php`

#### G17. Análisis estático fuera del pipeline y con exclusiones
- **Estado Actual:** Larastan nivel 5 pasa limpio, pero excluye `ReportController.php` y no corre en CI.
- **Recomendación:** añadir `composer analyse` al workflow; quitar la exclusión de `ReportController` generando un baseline (`--generate-baseline`) y subir gradualmente a nivel 6.
- **Esfuerzo:** 2 h · **Prioridad: Baja**
- **Archivos:** `phpstan.neon`, `.github/workflows/tests.yml`

---

### Plan de Mejora

#### Casos de uso no probados — priorizados (dinero / stock / tenant primero)

| # | Caso de uso | Tipo de test | Prioridad |
|---|---|---|---|
| 1 | Doble abono concurrente al mismo crédito no excede saldo ni cierra el crédito dos veces | Feature (stale model) + MySQL | Crítica |
| 2 | Completar cotización dos veces no descuenta stock dos veces | Feature | Crítica |
| 3 | `sales.store` / `sales.complete` con `price`/`subtotal`/`net` manipulados | Feature | Crítica |
| 4 | Completar cotización: permiso, sucursal ajena, caja obligatoria, stock insuficiente | Feature | Alta |
| 5 | Acceso cruzado entre tenants a ventas, créditos, cajas, clientes, gastos, movimientos, mayoristas, recibos → 404 | Feature (dataset) | Alta |
| 6 | Totales de dashboard / finanzas / reportes / `credits.receivables` aislados por tenant | Feature | Alta |
| 7 | `updateStock` concurrente con una venta conserva el stock correcto | Feature MySQL | Alta |
| 8 | Suspender / activar tenant bloquea login y API key al instante | Feature | Alta |
| 9 | Cierre de caja: abonos de crédito y devoluciones en efectivo entran al `expected_cash` | Feature | Alta |
| 10 | Devolución de venta a crédito / venta ya devuelta totalmente / devolución de servicio | Feature | Media |
| 11 | Eliminación definitiva de producto con ventas históricas (FK / integridad) | Feature | Media |
| 12 | Recibos ESC/POS 58/80 mm generan bytes válidos con logo/QR desactivados | Feature | Media |
| 13 | Exportaciones Excel/PDF responden 200 con el content-type correcto | Feature | Media |
| 14 | API storefront: `info`, `branches`, `payment-methods` solo exponen datos del tenant de la key | Feature | Media |
| 15 | Métodos de pago: desactivar uno usado por ventas pasadas no rompe reportes | Feature | Baja |
| 16 | Carrito POS: subtotales, descuento %/fijo, cambio, redondeo COP | Vitest | Media |
| 17 | Flujo completo login → abrir caja → vender → imprimir (mock QZ) → cerrar caja | E2E Playwright | Media |

#### Esqueletos de tests recomendados

```php
// tests/Feature/Credits/CreditPaymentConcurrencyTest.php
it('rejects a second payment made with a stale credit model', function () {
    $credit = /* crédito de 100.000 con saldo 100.000 */;
    $stale  = CreditSale::find($credit->id);           // copia "vieja"
    app(CreditPaymentService::class)->register($credit, 100_000, 'cash', $admin);

    expect(fn () => app(CreditPaymentService::class)->register($stale, 100_000, 'cash', $admin))
        ->toThrow(RuntimeException::class);
    expect(CreditPayment::count())->toBe(1)
        ->and(Sale::whereKey($credit->fresh()->sale_id)->count())->toBeLessThanOrEqual(1);
});

// tests/Feature/Tenancy/CrossTenantAccessTest.php
dataset('tenant_scoped_routes', [
    'sale'          => fn ($w) => route('sales.show', $w['sale']),
    'credit'        => fn ($w) => route('credits.show', $w['credit']),
    'cash session'  => fn ($w) => route('cash-sessions.show', $w['session']),
    'client'        => fn ($w) => route('clients.show', $w['client']),
    'receipt'       => fn ($w) => route('print.receipt', $w['sale']),
]);
it('404s on another tenant record', function (Closure $url) {
    [$a, $b] = [makeFullTenantWorld('a'), makeFullTenantWorld('b')];
    $this->actingAs($a['admin'])->get($url($b))->assertNotFound();
})->with('tenant_scoped_routes');
```

```yaml
# .github/workflows/tests.yml (extracto)
on:
  push:          { branches: [master] }
  pull_request:  { branches: [master] }
jobs:
  sqlite:  # actual + --coverage --min=60
    ...
      - run: ./vendor/bin/pest --coverage --min=60
      - run: npm run types && npx vitest run
      - run: composer analyse
  mysql:
    services:
      mysql:
        image: mysql:8.4
        env: { MYSQL_DATABASE: testing, MYSQL_ROOT_PASSWORD: root }
        ports: ['3306:3306']
    env: { DB_CONNECTION: mysql, DB_HOST: 127.0.0.1, DB_DATABASE: testing, DB_USERNAME: root, DB_PASSWORD: root }
    steps: [ ..., { run: ./vendor/bin/pest } ]
```

#### Metas de cobertura

| Métrica | Hoy (est.) | 30 días | 90 días |
|---|---|---|---|
| Líneas backend global | ~50 % | 65 % | **≥80 %** |
| `SaleController`, `Services/Credit/*`, `CashSessionController`, `StockMovementService` | ~55–70 % | 85 % | **≥95 %** |
| Rutas con al menos un test | 59 % | 80 % | 95 % |
| Frontend (líneas en `lib/` y `hooks/`) | n/d | 40 % | 60 % |
| E2E de flujos críticos | 0 | 1 (venta POS) | 4 (venta, crédito, caja, mayorista) |

---

### Roadmap

**Semana 1 — Detener el sangrado (Crítico)**
1. G1: CI en `master` + "Wait for CI" en Railway + lint en modo check. *(2 h)*
2. G2: lock + revalidación en `CreditPaymentService` + completion idempotente + test. *(4 h)*
3. G3: lock + re-chequeo de estado en `completePending` + tests de la ruta. *(3 h)*
4. G4: recalcular precios/subtotales en servidor para POS + test de manipulación. *(6 h)*
5. G8: Sentry backend+frontend, `LOG_CHANNEL=stderr`, verificar `APP_DEBUG=false`. *(1 día)*

**Semanas 2–3 — Confiabilidad de plataforma (Alto)**
6. G9: health check `/up` con verificación de DB + monitor de uptime externo. *(2 h)*
7. G11: backups programados + dump externo + primer ensayo de restore documentado. *(0,5 día)*
8. G10: `preDeployCommand` para migraciones, servidor de producción, entorno staging. *(1 día)*
9. G5: lock en `updateStock`. *(2 h)*
10. G6: job MySQL en CI, reescritura de `PessimisticLockTest`. *(1 día)*
11. G7: suite de aislamiento cruzado entre tenants + test arquitectónico `BelongsToTenant`. *(1,5 días)*

**Mes 2 — Ampliar cobertura (Medio)**
12. G13: smoke tests de impresión y exportaciones. *(1 día)*
13. G12: claves de idempotencia en ventas/abonos/movimientos. *(1 día)*
14. G15: `BusinessRuleException` + corrección de respuesta JSON en devoluciones. *(0,5 día)*
15. Factories faltantes (`CreditSale`, `CreditPayment`, `SaleReturn`, `WholesaleSale`, `Tenant`, `TenantApiKey`). *(0,5 día)*
16. Subir umbral `--min` de cobertura a 70 %.

**Mes 3 — Madurez (Medio/Bajo)**
17. G14: coverage frontend, tests del carrito, E2E Playwright del flujo POS en CI. *(3 días)*
18. G16 / G17: reintentos en Blob, worker de colas cuando haga falta, Larastan en CI sin exclusiones. *(1 día)*
19. Spec OpenAPI para `/api/v1/store/*` + tests de contrato (el storefront de Lu Accesorios depende de ella). *(1 día)*
20. Umbral de cobertura `--min=80` como check obligatorio.

---

*Comandos usados (reproducibles):* `vendor/bin/pest --compact` · `npx vitest run` · `vendor/bin/phpstan analyse` · `php artisan route:list --json` · `gh run list` · `gh api repos/JUANJSC630/stokity-v2/branches/master/protection`.
