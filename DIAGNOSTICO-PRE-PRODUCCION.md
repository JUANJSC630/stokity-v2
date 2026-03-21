# Diagnóstico Pre-Producción — Stokity v2

**Fecha:** 2026-03-21
**Revisado por:** Claude Opus 4.6 (auditoría automatizada)
**Stack:** Laravel 12 · React 19 · Inertia.js · TypeScript · MySQL · Railway · Vercel Blob

---

## TOP 5 BLOQUEANTES PARA PRODUCCIÓN

| # | Hallazgo | Severidad | Archivo | Líneas |
|---|----------|-----------|---------|--------|
| 1 | ~~**Escalación horizontal de privilegios**~~ ✅ CORREGIDO | 🔴→✅ | `SaleController.php`, `StockMovementController.php`, `ClientController.php`, `PrintController.php` | show/edit/update |
| 2 | ~~**Recibos sin validación de sucursal**~~ ✅ CORREGIDO (incluido en fix #1) | 🔴→✅ | `PrintController.php` | 63-265 |
| 3 | ~~**Race condition en apertura de caja**~~ ✅ CORREGIDO — DB::transaction + lockForUpdate | 🔴→✅ | `CashSessionController.php` | 83-126 |
| 4 | ~~**Doble reposición de stock en devoluciones**~~ ✅ CORREGIDO — dedup dentro de transacción + lockForUpdate en sale + validación de status | 🔴→✅ | `SaleReturnController.php` | 27-60 |
| 5 | ~~**B3: Blind close expone expectedCash**~~ ✅ CORREGIDO — `$user->isSeller() ? null : $expectedCash` + tipo TS actualizado | 🟠→✅ | `CashSessionController.php`, `close.tsx` | 185, 22 |

---

## 1. SEGURIDAD

### ~~🔴 Crítico — Escalación horizontal de privilegios (branch isolation)~~ ✅ CORREGIDO

**Problema:** Múltiples controladores NO validan que el recurso pertenezca a la sucursal del usuario autenticado. Un vendedor en Sucursal A puede ver/editar datos de Sucursal B manipulando la URL.

**Afectados:**

| Controlador | Métodos | Impacto |
|-------------|---------|---------|
| `SaleController.php:513-624` | `show()`, `edit()`, `update()` | Ver/editar ventas de otra sucursal |
| `StockMovementController.php:198-205` | `show()` | Ver movimientos de stock de otra sucursal |
| `ClientController.php:69-88` | `show()` | Ver historial de compras cross-branch |
| `PrintController.php:63-265` | `receipt()`, `returnReceipt()`, `cashSessionReport()` | Imprimir recibos de otra sucursal |

**Fix recomendado (aplicar en cada método):**
```php
$user = Auth::user();
if (!$user->isAdmin() && $sale->branch_id !== $user->branch_id) {
    abort(403, 'No tienes acceso a este recurso.');
}
```

---

### ~~🟠 Alto — B3: Blind close expone expectedCash~~ ✅ CORREGIDO

**Archivo:** `app/Http/Controllers/CashSessionController.php:143-176`

**Código actual:**
```php
public function closeForm(CashSession $session)
{
    // ... cálculos ...
    $expectedCash = (float) $session->opening_amount + $totalCash
                    + $totalCashIn - $totalCashOut - $totalRefunds;

    return Inertia::render('cash-sessions/close', [
        'expectedCash' => $expectedCash,  // ⚠️ SIEMPRE se envía
        'isBlind'      => $user->isSeller(),
    ]);
}
```

**Fix exacto:**
```php
return Inertia::render('cash-sessions/close', [
    'expectedCash' => $user->isSeller() ? null : $expectedCash,
    'isBlind'      => $user->isSeller(),
]);
```

El cálculo de discrepancia para vendedores debe hacerse solo en el backend (en `close()`).

---

### ~~🟠 Alto — ProductRequest no valida branch_id del usuario~~ ✅ CORREGIDO

**Archivo:** `app/Http/Requests/ProductRequest.php`

**Fix aplicado:** `authorize()` valida que non-admins solo gestionen productos de su propia sucursal.

---

### ~~🟡 Medio — XSS en paginación con dangerouslySetInnerHTML~~ ✅ CORREGIDO

**Archivos:** `products/trashed.tsx`, `cash-sessions/index.tsx`, `clients/show.tsx`

**Fix aplicado:** Reemplazado `dangerouslySetInnerHTML` con renderizado de texto seguro. HTML entities (`&laquo;`, `&raquo;`) decodificados con `.replace()`.

---

### 🟡 Medio — Categorías sin scope de sucursal — DECISIÓN DE DISEÑO ACEPTADA

**Archivo:** `routes/categories.php`

Las categorías son globales por diseño (compartidas entre sucursales). `AdminOrManagerMiddleware` protege correctamente. No requiere cambio.

---

### ~~🟡 Medio — Proveedor no validado contra branch del producto~~ ✅ CORREGIDO

**Archivo:** `app/Http/Controllers/StockMovementController.php`

**Fix aplicado:** Validación explícita post-carga: si el supplier tiene `branch_id` diferente al producto, retorna error.

---

### ✅ Aspectos seguros verificados

- **CSRF:** Inertia.js maneja CSRF automáticamente en todas las rutas POST/PUT/DELETE ✓
- **Mass Assignment:** Todos los modelos tienen `$fillable` definido correctamente ✓
- **SQL Injection:** No se encontró SQL crudo con variables sin bindear. `DB::raw()` en ReportController usa switch seguro ✓
- **Secretos:** `PRINTER_PRIVATE_KEY_B64` y `PRINTER_CERTIFICATE_B64` no se exponen en responses — se usan solo server-side ✓
- **Uploads:** `ProductRequest` valida `image|mimes:jpeg,png,jpg,gif|max:2048` ✓
- **SoftDeletes:** Implementados en Product, Client, Sale, User ✓

---

## 2. INTEGRIDAD DE DATOS Y LÓGICA DE NEGOCIO

### ~~🔴 Crítico — Doble reposición de stock en devoluciones~~ ✅ CORREGIDO

**Archivo:** `app/Http/Controllers/SaleReturnController.php:39-59`

**Problema:** La deduplicación usa una ventana de 30 segundos, NO un constraint de base de datos. Dos requests concurrentes pueden pasar la verificación y reponer stock dos veces.

**Escenario de race condition:**
1. Request A: Verifica duplicado → No existe → Continúa
2. Request B: Verifica duplicado → No existe (A aún no ha committeado) → Continúa
3. Ambos reponen stock → **Stock inflado**

**Fix recomendado:**
1. Agregar constraint UNIQUE parcial o usar advisory lock:
```php
DB::transaction(function () use ($sale, $request) {
    // Lock la venta para serializar devoluciones
    $sale = Sale::lockForUpdate()->findOrFail($sale->id);

    // Verificar que no se ha devuelto ya con estos productos
    // ... dedup check dentro del lock ...
});
```
2. Validar `$sale->status` antes de procesar (actualmente no se verifica que sea `completed`).

---

### ~~🔴 Crítico — Race condition en apertura de caja~~ ✅ CORREGIDO

**Archivo:** `app/Http/Controllers/CashSessionController.php:83-112`

**Problema:** El check-and-create no es atómico:
```php
$existing = CashSession::getOpenForUser($user->id, $user->branch_id); // Check
if ($existing) return back()->withErrors([...]);
// ⚠️ Otra request puede pasar aquí
CashSession::create([...]); // Create — posible duplicado
```

**Fix recomendado:**
```php
DB::transaction(function () use ($user, $validated) {
    // Lock para serializar
    $existing = CashSession::where('opened_by_user_id', $user->id)
        ->where('branch_id', $user->branch_id)
        ->where('status', 'open')
        ->lockForUpdate()
        ->first();

    if ($existing) {
        throw new \Exception('Ya tienes una sesión abierta.');
    }

    CashSession::create([...]);
});
```
Adicionalmente, agregar migration con índice UNIQUE parcial (MySQL 8+):
```sql
ALTER TABLE cash_sessions ADD UNIQUE INDEX unique_open_session
    (opened_by_user_id, branch_id, (CASE WHEN status = 'open' THEN 1 ELSE NULL END));
```
O un trigger/constraint que evite dos registros `status='open'` para el mismo usuario+branch.

---

### ~~🟠 Alto — Cierre de caja sin DB::transaction()~~ ✅ CORREGIDO

**Archivo:** `app/Http/Controllers/CashSessionController.php`

**Fix aplicado:** `close()` envuelto en `DB::transaction()` con `lockForUpdate()` en la sesión. Re-verifica status dentro del lock.

---

### ~~🟠 Alto — Filtros de fecha en reportes no respetan timezone~~ ✅ VERIFICADO — NO ES BUG

**Archivo:** `app/Http/Controllers/ReportController.php:1186-1190`

**Análisis:** El campo `sales.date` es `dateTime` (sin timezone) y se almacena en America/Bogota (verificado en `SaleController::completePending()` línea 360). `whereDate()` compara correctamente contra el valor literal almacenado. No hay conversión UTC involucrada. Falso positivo descartado.

---

### ~~🟡 Medio — Devolución de ventas no completadas~~ ✅ CORREGIDO

**Archivo:** `app/Http/Controllers/SaleReturnController.php`

**Fix aplicado:** Validación de `$sale->status` agregada en bloqueante #4 — solo permite `completed` o `cancelled`.

---

### ~~🟡 Medio — Cálculo de reembolsos en sesión de caja~~ ✅ VERIFICADO — NO ES BUG

**Archivo:** `app/Http/Controllers/CashSessionController.php:330-352`

**Análisis:** `saleProduct->price` es el precio snapshot en `sale_products` (momento de venta), NO el precio actual del catálogo. Las devoluciones se filtran por `session_id` correctamente. Falso positivo descartado.

---

### ✅ Aspectos correctos verificados

- **Pessimistic locking en ventas:** `lockForUpdate()` aplicado en `store()`, `completePending()`, `destroy()` ✓
- **Re-validación dentro del lock:** Stock se re-verifica dentro de la transacción ✓
- **StockMovementService:** Registra movimientos en venta, devolución, entrada manual, cancelación ✓
- **Ventas pending excluidas de caja:** `where('status', 'completed')` en cierre ✓
- **Entradas de stock con transacción:** `StockMovementController::store()` usa `DB::transaction()` + `lockForUpdate()` ✓

---

## 3. ROBUSTEZ Y MANEJO DE ERRORES

### ~~🟠 Alto — Blob upload no es atómico con creación de producto~~ ✅ DESCARTADO

**Decisión:** No aplica. Es preferible que el producto se cree aunque la imagen falle — la imagen se puede reintentar después.

---

### ~~🟡 Medio — Sin timeout en llamadas HTTP externas~~ ✅ CORREGIDO

**Archivo:** `app/Services/BlobStorageService.php`

**Fix aplicado:** `->timeout(15)` en upload, `->timeout(10)` en delete.

---

### ~~🟡 Medio — addMovement() sin transacción~~ ✅ CORREGIDO

**Archivo:** `app/Http/Controllers/CashSessionController.php`

**Fix aplicado:** `DB::transaction()` con `lockForUpdate()` en la sesión. Re-verifica status dentro del lock.

---

### ✅ Aspectos correctos verificados

- **Transacciones en operaciones críticas:** SaleController (store, completePending, destroy), SaleReturnController (store), StockMovementController (store) ✓
- **Errores de Blob logueados:** `BlobStorageService` registra código de status y body en caso de error ✓
- **Validación GD:** Verifica extensión GD antes de procesar imágenes ✓

---

## 4. RENDIMIENTO

### ~~🟠 Alto — Índices de base de datos faltantes~~ ✅ CORREGIDO

**Migración creada:** `2026_03_21_000000_add_performance_indexes.php`

Índices agregados: `sales(status, created_at)`, `sales(branch_id, status, date)`, `sales(session_id)`, `sales(seller_id, created_at)`, `products(branch_id, status)`, `products(category_id)`, `sale_products(product_id, sale_id)`, `sale_returns(created_at)`, `sale_return_products(product_id)`.

---

### ~~🟠 Alto — N+1 en ReportController::returnsReport()~~ ✅ CORREGIDO

**Archivo:** `app/Http/Controllers/ReportController.php`

**Fix aplicado:** Pre-carga todas las cantidades vendidas por producto en una sola query con `groupBy + pluck` antes del map.

---

### ~~🟠 Alto — BusinessSetting::getSettings() sin caché~~ ✅ CORREGIDO

**Archivo:** `app/Models/BusinessSetting.php`

**Fix aplicado:** `Cache::remember()` con TTL 1h. Invalidación automática via `booted()` → `static::saved()` que limpia el caché al guardar.

---

### ~~🟡 Medio — PosController carga TODOS los clientes~~ ✅ CORREGIDO

**Archivo:** `app/Http/Controllers/PosController.php`

**Fix aplicado:** `->limit(500)` — suficiente para selector client-side. Para >500 clientes, migrar a autocomplete async en el futuro.

---

### ~~🟡 Medio — Queries múltiples en DashboardController~~ ✅ CORREGIDO

**Archivo:** `app/Http/Controllers/DashboardController.php`

**Fix aplicado:** Nuevo método `getSalesAggregates()` retorna count + revenue + average en 1 query. Dashboard pasó de ~12 queries de métricas a 4 (1 por periodo).

---

### ~~🟡 Medio — ClientController::show() ejecuta 3 queries separadas~~ ✅ CORREGIDO

**Archivo:** `app/Http/Controllers/ClientController.php`

**Fix aplicado:** Una sola query con `selectRaw('COUNT(*), SUM(total), MAX(created_at)')`. 3 queries → 1.

---

### ~~🟡 Medio — CSV generado en memoria~~ ✅ CORREGIDO

**Archivo:** `app/Services/ReportExportService.php`

Migrado a `StreamedResponse` con escritura directa a `php://output`. Las filas se escriben al cliente sin buffering en RAM.

---

### ✅ Aspectos correctos verificados

- **ReportController USA caché** con TTL de 15 minutos en reportes ✓
- **Rate limiting en búsqueda:** `throttle:60,1` en `/api/products/search` ✓
- **Búsqueda de productos limitada:** `.limit(50)` ✓

---

## 5. CONSISTENCIA Y CALIDAD DE CÓDIGO

### ~~🟡 Medio — Lógica de descuento y stock duplicada~~ ✅ CORREGIDO

**Archivo:** `app/Http/Controllers/SaleController.php`

**Fix aplicado:** Extraídos `validateStockAndTax()` y `calculateDiscount()` como métodos privados. `store()` y `completePending()` ahora los reutilizan.

---

### ~~🟡 Medio — DatabaseSeeder sin separación prod/test~~ ✅ CORREGIDO

**Archivo:** `database/seeders/DatabaseSeeder.php`

**Fix aplicado:** PaymentMethodSeeder siempre corre (data de producción). Todos los demás seeders solo en `local` o `testing`.

---

### 🟢 Bajo — Uso mínimo de `any` en TypeScript

Solo 1 instancia encontrada: `resources/js/services/qzTray.ts:12` — justificada por librería JS sin tipos.

---

### ✅ Aspectos correctos verificados

- **Relaciones en modelos:** Completas y correctas en Sale, Product, CashSession, StockMovement ✓
- **Foreign keys con onDelete:** cascade donde corresponde, restrict en historial ✓
- **SoftDeletes:** Product, Client, Sale, User ✓
- **React hooks:** Siguen reglas de hooks, sin memory leaks detectados ✓
- **Timezone:** `config/app.php` → `'timezone' => 'America/Bogota'` ✓

---

## 6. BUG DEL RECIBO CORTADO — Estado actual

**Archivo:** `app/Http/Controllers/PrintController.php`

### Estado del fix: ✅ IMPLEMENTADO EN CÓDIGO — ❓ PENDIENTE DE PRUEBA EN PRODUCCIÓN

| Componente | Estado | Detalle |
|-----------|--------|---------|
| ESC @ (initialize) | ✅ Eliminado | `createPrinter()` línea 621-626: `$connector->clear()` limpia ESC @ del buffer |
| Reset manual | ✅ Implementado | `printBusinessHeader()` línea 635-642: ESC 2 + emphasis off + text size 1x1 + center |
| Margen superior | ✅ Implementado | Línea 644-655: 4 × ESC J 24 = 96 dots ≈ 12mm |
| Feed antes del corte | ✅ Implementado | `feedPastDeadZone()` línea 792-798: 8 × ESC J 24 = 192 dots ≈ 24mm |
| Comando de corte | ⚠️ Revisar | Usa `$p->cut()` (GS V 65 con n default de la librería) |

### Evaluación de H5

H5 propone: **ESC @ + ESC J generoso + GS V 65 n con n grande**.

El código actual es una **variante de H5** con ESC @ eliminado (en vez de enviado). Los feeds generosos están implementados. Lo que falta verificar:

1. **¿El `$p->cut()` de la librería envía `GS V 65 n` con n suficiente?** Si la librería envía `GS V 1` (simple cut), no habría feed post-corte y el siguiente recibo empezaría muy arriba.
2. **¿El margen superior (4 × ESC J 24 = 12mm) es suficiente?** Si la impresora retrae >12mm, seguirá cortando el header.

### Recomendación para prueba en producción

Si el recibo sigue cortado arriba, aumentar los feeds:
```php
// En printBusinessHeader() — aumentar de 4 a 8 repeticiones
for ($i = 0; $i < 8; $i++) {  // Era 4, ahora 8 = 192 dots ≈ 24mm
    $conn->write("\x1b\x4a\x18");
}
```

O reemplazar `$p->cut()` con corte manual que incluya feed explícito:
```php
// GS V 65 n — n = 200 (alimentar 200 dots después del corte)
$conn->write("\x1d\x56\x41\xc8"); // 0xC8 = 200 dots
```

---

## 7. LISTA DE VERIFICACIÓN PRE-PRODUCCIÓN

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 1 | Variables de entorno documentadas (.env.example) | ✅ | Blob token, QZ Tray keys documentados con instrucciones |
| 2 | APP_DEBUG=false en producción | ⚠️ | Verificar en Railway — no se puede confirmar desde código |
| 3 | APP_ENV=production | ⚠️ | Verificar en Railway |
| 4 | Claves/secretos fuera del código fuente | ✅ | Todo en .env, no hardcodeado |
| 5 | Migraciones ejecutables sin errores en orden | ✅ | Estructura de migraciones correcta |
| 6 | Seeders de producción separados de testing | ✅ | Solo PaymentMethodSeeder en prod; resto solo en local/testing |
| 7 | CORS configurado correctamente | ✅ | No necesario — app Inertia same-origin (frontend y backend comparten dominio) |
| 8 | Rate limiting en endpoints sensibles | ✅ | Login (6/min), product search (60/min), email verify (6/min). Operaciones POS protegidas por Inertia form state |
| 9 | Logs sin datos sensibles | ✅ | No se loguean contraseñas ni tokens |
| 10 | Validación de inputs en backend | ✅ | FormRequests y validación inline en todos los controladores |
| 11 | Foreign keys con `onDelete` definido | ✅ | cascade donde corresponde, restrict implícito en historial |
| 12 | Índices DB en columnas de búsqueda y joins | ✅ | Migración `2026_03_21_000000_add_performance_indexes.php` creada |
| 13 | Imágenes subidas validadas (tipo, tamaño) | ✅ | `image|mimes:jpeg,png,jpg,gif|max:2048` |
| 14 | Zona horaria configurada (America/Bogota) | ✅ | `config/app.php` timezone correcto |
| 15 | Transacciones DB en operaciones multi-tabla | ✅ | Ventas, stock, caja (open/close/addMovement) y devoluciones con DB::transaction() |

---

## 8. PLAN DE ACCIÓN — PRIORIZADO

### 🚨 ANTES DE LANZAR (Bloqueantes)

| # | Tarea | Estado | Archivos |
|---|-------|--------|----------|
| 1 | Agregar validación de branch_id en show/edit/update | ✅ HECHO | SaleController, StockMovementController, ClientController, PrintController |
| 2 | Fix B3: Condicionar `expectedCash` a `!isSeller()` | ✅ HECHO | CashSessionController.php, close.tsx |
| 3 | Envolver apertura de caja en transacción con lock | ✅ HECHO | CashSessionController.php |
| 4 | Envolver cierre de caja en transacción | ✅ HECHO | CashSessionController.php |
| 5 | Mejorar deduplicación de devoluciones (lock + validar status) | ✅ HECHO | SaleReturnController.php |
| 6 | Validar branch_id en ProductRequest | ✅ HECHO | ProductRequest.php |
| 7 | Crear migración con índices faltantes | ✅ HECHO | 2026_03_21_000000_add_performance_indexes.php |

### ✅ PRIMERA SEMANA — COMPLETADO

| # | Tarea | Estado |
|---|-------|--------|
| 8 | Caché para BusinessSetting | ✅ HECHO — Cache::remember + invalidación automática via booted() |
| 9 | Timezone en filtros de reportes | ✅ VERIFICADO — No es bug (campo date almacena en Bogotá) |
| 10 | Separar seeders prod/test | ✅ HECHO |
| 11 | CORS | ✅ No necesario (same-origin Inertia app) |
| 12 | Timeout en BlobStorageService | ✅ HECHO — 15s upload, 10s delete |
| 13 | N+1 en ReportController::returnsReport() | ✅ HECHO — Pre-carga con groupBy |
| 14 | Limitar clientes en PosController | ✅ HECHO — limit(500) |

### 📋 DEUDA TÉCNICA (Sprint posterior)

| # | Tarea | Esfuerzo |
|---|-------|----------|
| 15 | ~~Refactorizar ReportController (+2000 líneas) en servicios~~ ✅ HECHO — Extraído a ReportQueryService (816 líneas) + ReportExportService (534 líneas). Controller reducido de 2753 → 552 líneas. Eliminado código muerto duplicado y \Log::info de debug. Larastan 0 errores. | — |
| 16 | ~~Extraer lógica duplicada de descuento/stock~~ ✅ HECHO | — |
| 17 | ~~Rate limiting global~~ ✅ Cubierto | — |
| 18 | ~~Eliminar dangerouslySetInnerHTML~~ ✅ HECHO | — |
| 19 | ~~Implementar streaming para exportación CSV~~ ✅ HECHO — Todas las exportaciones CSV usan StreamedResponse (php://output). Rows se escriben directamente al cliente sin buffering en RAM. | — |
| 20 | Tests automatizados (Pest) para flujos críticos | 8-16h |
| 21 | Bug del recibo cortado — probar en producción | Desplegar + testear |

---

## 9. VEREDICTO FINAL

### ✅ BLOQUEANTES RESUELTOS — Lanzamiento controlado aceptable

**Todos los 7 bloqueantes críticos han sido corregidos:**

1. ✅ Validación de branch_id en SaleController, StockMovementController, ClientController, PrintController
2. ✅ B3 — expectedCash ocultado para vendedores (blind close funcional)
3. ✅ Apertura de caja con transacción + lockForUpdate (sin race condition)
4. ✅ Cierre de caja con transacción + lockForUpdate (totales consistentes)
5. ✅ Deduplicación de devoluciones dentro de transacción con lock en la venta + validación de status
6. ✅ ProductRequest valida branch_id contra usuario autenticado
7. ✅ Migración con índices de rendimiento creada (ejecutar `php artisan migrate` en producción)

**El sistema es aceptable para un lanzamiento controlado** (pocas sucursales, volumen bajo) mientras se resuelven los ítems de la primera semana post-lanzamiento.
