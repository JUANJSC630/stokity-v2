# Prompt — Implementación de Tests Stokity v2

> Usa este prompt con Claude Opus para implementar la suite completa de tests.
> El modelo debe leer el código antes de escribir cada test.

---

## ROL Y OBJETIVO

Eres un ingeniero senior especializado en testing de aplicaciones Laravel 12 + Inertia.js.
Tu misión es implementar la suite completa de tests descrita en `TESTING.md` para el
sistema POS **Stokity v2**. Debes producir código listo para ejecutar, sin placeholders,
sin `// TODO`. Cada test debe pasar con `php artisan test`.

---

## CONTEXTO DEL PROYECTO

**Stack:** Laravel 12 · React 19 · TypeScript · Inertia.js · MySQL (prod) · SQLite in-memory (tests)
**Roles RBAC:** `administrador` · `encargado` · `vendedor`
**Framework de tests:** Pest PHP v3 + `pest-plugin-laravel` v3 (ya instalados)

### Rutas reales (verificadas)

```
# Ventas
GET    /pos                          → pos.index
GET    /sales                        → sales.index
POST   /sales                        → sales.store
GET    /sales/{sale}                 → sales.show
POST   /sales/{sale}/returns         → sales.returns.store
DELETE /sales/{sale}                 → sales.destroy

# Caja
GET    /cash-sessions/current        → cash-sessions.current   (JSON)
GET    /cash-sessions                → cash-sessions.index
POST   /cash-sessions                → cash-sessions.store
GET    /cash-sessions/{session}/close → cash-sessions.close.form
POST   /cash-sessions/{session}/close → cash-sessions.close
POST   /cash-sessions/{session}/movements → cash-sessions.movements.store

# Productos
GET    /api/products/search          → api.products.search     (throttle:60,1)
GET    /products                     → products.index
POST   /products                     → products.store          (admin/encargado only)
PUT    /products/{product}           → products.update         (admin/encargado only)
DELETE /products/{product}           → products.destroy        (admin/encargado only)
```

### Middleware relevante

- `BranchFilterMiddleware` — inyecta `branch_id` activo del usuario en todas las rutas
- `AdminOrManagerMiddleware` — bloquea `vendedor` con 403
- `AdminMiddleware` — solo `administrador`

### Estado actual de `tests/Pest.php`

El archivo actual tiene `RefreshDatabase` comentado y solo un helper placeholder `something()`.
**Debes reescribirlo completamente.**

### Estado actual de `phpunit.xml`

Le faltan estas variables de entorno. **Agrégalas:**
```xml
<env name="APP_TIMEZONE"          value="America/Bogota"/>
<env name="BLOB_STORE_URL"        value=""/>
<env name="PRINTER_PRIVATE_KEY_B64" value=""/>
<env name="PRINTER_CERTIFICATE_B64" value=""/>
```

---

## PASO 1 — ANTES DE ESCRIBIR CUALQUIER TEST

Lee estos archivos en este orden exacto. No escribas ningún test hasta terminar de leerlos todos:

1. `app/Http/Controllers/SaleController.php` — método `store()` completo (validaciones, stock check, session check)
2. `app/Http/Controllers/CashSessionController.php` — métodos `store()`, `closeForm()`, `close()`, `addMovement()`
3. `app/Http/Controllers/SaleReturnController.php` — método `store()` completo
4. `app/Http/Controllers/ProductController.php` — métodos `store()`, `search()`
5. `app/Http/Controllers/PosController.php` — método `index()` (props que envía al frontend)
6. `app/Services/StockMovementService.php` — firma completa del método `record()`
7. `app/Models/Sale.php` — fillable, casts, relaciones
8. `app/Models/CashSession.php` — fillable, `getOpenForUser()`
9. `app/Models/Product.php` — fillable, relaciones, `isLowStock()`
10. `app/Models/User.php` — método `isAdmin()`, `isManager()` si existen
11. `database/factories/SaleFactory.php` — campos disponibles
12. `database/factories/ProductFactory.php` — estados disponibles (`lowStock()`, `inactive()`)
13. `database/factories/BranchFactory.php` — estados disponibles
14. `database/migrations/2026_03_04_072654_a_create_cash_sessions_table.php` — columnas exactas
15. `database/migrations/2025_07_10_000000_create_sales_table.php` — columnas exactas

**¿Por qué?** Los tests deben usar los nombres de campos exactos de las migraciones,
los nombres de rutas exactos, y las reglas de validación reales del backend.

---

## PASO 2 — ARCHIVOS A PRODUCIR

Produce cada archivo en este orden. Marca cada uno como completado antes de pasar al siguiente.

### A) Archivos de configuración

#### `tests/Pest.php` — reescribir completo

```php
<?php

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class)->in('Feature', 'Unit');
uses(RefreshDatabase::class)->in('Feature');

/*
|--------------------------------------------------------------------------
| Helpers globales de roles
|--------------------------------------------------------------------------
*/
function adminUser(?Branch $branch = null): User
{
    $branch ??= Branch::factory()->create();
    return User::factory()->create([
        'role'      => 'administrador',
        'branch_id' => $branch->id,
        'status'    => 'active',
    ]);
}

function managerUser(?Branch $branch = null): User
{
    $branch ??= Branch::factory()->create();
    return User::factory()->create([
        'role'      => 'encargado',
        'branch_id' => $branch->id,
        'status'    => 'active',
    ]);
}

function vendedorUser(?Branch $branch = null): User
{
    $branch ??= Branch::factory()->create();
    return User::factory()->create([
        'role'      => 'vendedor',
        'branch_id' => $branch->id,
        'status'    => 'active',
    ]);
}
```

> **Nota:** Verifica en `app/Models/User.php` si el campo es `status` (string `'active'`)
> o `is_active` (boolean). Ajusta los helpers según lo que encuentres.

---

#### `phpunit.xml` — agregar variables faltantes

Al bloque `<php>` existente, agrega:

```xml
<env name="APP_TIMEZONE"             value="America/Bogota"/>
<env name="BLOB_STORE_URL"           value=""/>
<env name="PRINTER_PRIVATE_KEY_B64"  value=""/>
<env name="PRINTER_CERTIFICATE_B64"  value=""/>
```

---

### B) Factories faltantes

Antes de escribir los tests, verifica cuáles de estas factories existen.
Crea las que falten en `database/factories/`:

#### `CashSessionFactory.php`

Crea una factory que genere sesiones con `status = 'open'` por defecto.
Incluye estados: `->open()`, `->closed()`.
Usa los campos exactos de la migración `create_cash_sessions_table`.

#### `CashMovementFactory.php`

Campos mínimos: `session_id`, `user_id`, `type` (`cash_in`|`cash_out`), `amount`, `concept`.

#### `SaleReturnFactory.php`

Vinculada a `Sale`. Con relación `SaleReturnProduct`.

#### `StockMovementFactory.php`

Campos: `product_id`, `user_id`, `branch_id`, `type`, `quantity`, `previous_stock`, `new_stock`.

---

### C) Tests de seguridad (implementar primero)

---

#### `tests/Feature/CashSession/BlindCloseSecurityTest.php`

**Contexto:** Bug B3 del PLAN.md. `CashSessionController::closeForm()` envía `expectedCash`
en los props de Inertia aunque el usuario sea `vendedor`. Esto lo expone en DevTools.

**Antes de escribir:** Lee `closeForm()` completo en `CashSessionController.php`.
Identifica la variable exacta enviada a Inertia (`expectedCash`, `expected_cash`, u otro nombre).

```php
<?php

use App\Models\Branch;
use App\Models\CashSession;

describe('BlindClose Security — Bug B3', function () {

    it('no expone expectedCash al vendedor en el formulario de cierre', function () {
        $branch   = Branch::factory()->create();
        $vendedor = vendedorUser($branch);

        // Crear sesión abierta por el vendedor
        $session = CashSession::factory()->open()->create([
            'branch_id'         => $branch->id,
            'opened_by_user_id' => $vendedor->id,
        ]);

        actingAs($vendedor)
            ->get(route('cash-sessions.close.form', $session))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->missing('expectedCash')  // ajustar al nombre real del prop
            );
    });

    it('expone expectedCash al administrador en el formulario de cierre', function () {
        $branch = Branch::factory()->create();
        $admin  = adminUser($branch);

        $session = CashSession::factory()->open()->create([
            'branch_id'         => $branch->id,
            'opened_by_user_id' => $admin->id,
        ]);

        actingAs($admin)
            ->get(route('cash-sessions.close.form', $session))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('expectedCash')  // ajustar al nombre real del prop
            );
    });

    it('expone expectedCash al encargado en el formulario de cierre', function () {
        $branch   = Branch::factory()->create();
        $manager  = managerUser($branch);

        $session = CashSession::factory()->open()->create([
            'branch_id'         => $branch->id,
            'opened_by_user_id' => $manager->id,
        ]);

        actingAs($manager)
            ->get(route('cash-sessions.close.form', $session))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('expectedCash')
            );
    });
});
```

> **Instrucción crítica:** Si el test falla porque el bug B3 aún no está corregido
> en el código, **documenta el fallo con un comentario** pero NO corrijas el bug aquí.
> El test debe fallar hasta que el bug se corrija en el controlador.

---

### D) Tests de ventas

---

#### `tests/Feature/Sales/CreateSaleTest.php`

**Antes de escribir:** Lee `SaleController::store()` completo. Identifica:
- Las reglas de validación exactas (`required|array`, etc.)
- El formato del payload (`items[0][product_id]`, `items[0][quantity]`, etc.)
- Cómo se verifica la sesión de caja (`require_cash_session`)
- Cómo se aplica el `lockForUpdate()`
- El nombre del campo de método de pago (`payment_method` o `payment_method_id`)

Implementa los siguientes casos con el payload **exacto** que espera el controlador:

**Casos felices:**
```
✓ vendedor puede crear venta con stock suficiente
✓ la venta reduce el stock del producto (stock - cantidad = nuevo stock)
✓ se crea un StockMovement de tipo 'out' al crear la venta
✓ la venta queda en status = 'completed'
✓ con sesión de caja activa, la venta se asocia al session_id correcto
✓ venta con efectivo calcula change_amount = amount_paid - total
✓ se puede crear venta con cliente (client_id no nulo)
✓ se puede crear venta sin cliente (venta anónima, client_id = null)
✓ el code de la venta se genera automáticamente y no está vacío
```

**Validaciones y errores:**
```
✓ falla con 422 si stock del producto = 0
✓ falla con 422 si product_id no existe
✓ falla con 422 si quantity <= 0
✓ falla si el producto pertenece a otra sucursal (branch scope)
✓ vendedor no puede crear ventas inyectando branch_id de otra sucursal
```

**Descuentos:**
```
✓ discount_type = 'percent', discount_value = 10 → discount_amount = total * 0.10
✓ discount_type = 'fixed', discount_value = 5000 → discount_amount = 5000
✓ el net (total - discount_amount) es correcto
```

**Estructura de cada test:**
```php
describe('CreateSale', function () {
    beforeEach(function () {
        $this->branch   = Branch::factory()->create();
        $this->seller   = vendedorUser($this->branch);
        $this->product  = Product::factory()->create([
            'branch_id' => $this->branch->id,
            'stock'     => 10,
            'sale_price' => 20000,
        ]);
        // Busca el PaymentMethod 'cash' en la DB o créalo aquí
        $this->cashMethod = \App\Models\PaymentMethod::where('code', 'cash')
            ->orWhere('code', 'efectivo')
            ->first()
            ?? \App\Models\PaymentMethod::factory()->create(['code' => 'cash', 'is_active' => true]);
    });

    it('reduces stock after sale', function () {
        actingAs($this->seller)
            ->post(route('sales.store'), [
                /* payload exacto del controlador */
            ])
            ->assertRedirect();

        expect($this->product->fresh()->stock)->toBe(9);
    });
});
```

---

#### `tests/Feature/Sales/SaleReturnTest.php`

**Antes de escribir:** Lee `SaleReturnController::store()` completo. Identifica:
- El payload esperado (qué campos, formato de items)
- Cómo se valida que no se devuelva más de lo comprado
- Cómo se registra el movimiento de stock

Implementa:
```
✓ se puede devolver una cantidad parcial de un producto
✓ el stock del producto aumenta en la cantidad devuelta
✓ se crea un StockMovement con tipo de devolución
✓ no se puede devolver más unidades de las compradas (422)
✓ una devolución ya procesada no puede procesarse dos veces
✓ vendedor recibe 403 al intentar devolver (solo admin/encargado)
✓ la devolución queda vinculada al sale_id correcto
```

---

#### `tests/Feature/Sales/SalePosFlowTest.php`

**Antes de escribir:** Lee `PosController::index()` completo. Identifica qué props
envía a Inertia: `products`, `clients`, `paymentMethods`, `cashSession`, etc.

Implementa:
```
✓ GET /pos retorna status 200 con los props esperados
✓ GET /api/products/search?q=... retorna productos filtrados por sucursal
✓ GET /api/products/search no retorna productos de otra sucursal
✓ header X-RateLimit-Limit está presente en la búsqueda
✓ con require_cash_session = true y sin caja abierta, el POS incluye info de bloqueo
```

---

### E) Tests de stock

---

#### `tests/Feature/Stock/StockValidationTest.php`

```
✓ venta con stock = 5 y quantity = 5 pasa (stock exacto)
✓ venta con stock = 4 y quantity = 5 falla
✓ múltiples ítems: si uno falla, toda la venta se rechaza
✓ después del fallo, el stock del ítem que pasó NO se modificó (rollback)
```

---

#### `tests/Feature/Stock/PessimisticLockTest.php`

Simula condición de carrera básica. Usa `DB::transaction()` y `lockForUpdate()`.

```
✓ con stock = 1, solo una de dos ventas simultáneas tiene éxito
✓ el stock final es 0, no -1
```

**Técnica recomendada para simular concurrencia en tests:**
```php
it('prevents overselling with pessimistic lock', function () {
    $product = Product::factory()->create(['stock' => 1, 'branch_id' => $this->branch->id]);

    // Simula dos requests que leen el mismo stock antes de que el primero actualice
    $results = collect(range(1, 2))->map(function () use ($product) {
        try {
            return DB::transaction(function () use ($product) {
                $p = Product::lockForUpdate()->find($product->id);
                if ($p->stock < 1) throw new \Exception('Sin stock');
                $p->decrement('stock', 1);
                return 'ok';
            });
        } catch (\Exception $e) {
            return 'fail';
        }
    });

    expect($results->filter(fn($r) => $r === 'ok')->count())->toBe(1);
    expect($product->fresh()->stock)->toBe(0);
});
```

---

#### `tests/Unit/StockMovementServiceTest.php`

Usa SQLite en memoria (RefreshDatabase ya activo en Unit si lo configuras en Pest.php).

**Antes de escribir:** Lee `StockMovementService::record()`. Identifica la firma exacta:
parámetros posicionales, cuáles son opcionales, tipos esperados.

```
✓ record() crea un StockMovement con todos los campos correctos
✓ previous_stock y new_stock reflejan el estado antes y después
✓ type = 'out' con quantity = 3: new_stock = previous_stock - 3
✓ type = 'in' con quantity = 5: new_stock = previous_stock + 5
✓ movimiento de tipo 'purchase' vincula supplier_id correctamente
```

---

### F) Tests de caja

---

#### `tests/Feature/CashSession/OpenCashSessionTest.php`

**Antes de escribir:** Lee `CashSessionController::store()` completo (líneas 80-120 ya leídas,
lee el resto). Identifica el payload, la validación `opening_amount`, y cómo se previene
la doble apertura.

```
✓ usuario puede abrir sesión (POST /cash-sessions con opening_amount)
✓ la sesión queda con status = 'open'
✓ no puede abrirse segunda sesión mientras hay una activa → error de validación
✓ opening_amount = 0 es válido (fondo cero)
✓ opening_amount negativo falla (min:0)
✓ usuario sin branch_id asignado no puede abrir sesión
✓ la sesión se asocia al branch_id del usuario (no se puede inyectar otro)
```

---

#### `tests/Feature/CashSession/CloseCashSessionTest.php`

**Antes de escribir:** Lee `CashSessionController::close()` completo. Identifica:
- El payload del cierre (`closing_amount_declared`)
- Cómo se calculan `expected_cash` y `discrepancy`
- Qué pasa al intentar cerrar una sesión ya cerrada

```
✓ se puede cerrar una sesión activa propia
✓ status pasa a 'closed' y closed_at se registra
✓ expected_cash = opening_amount + total_cash_in - total_cash_out + total_sales_cash - total_refunds_cash
✓ discrepancy = closing_amount_declared - expected_cash (positiva si hay sobrante)
✓ discrepancy negativa si usuario declara menos de lo esperado
✓ usuario no puede cerrar la sesión de otro usuario → 403 o 404
✓ no se puede cerrar una sesión ya cerrada → error
```

---

#### `tests/Feature/CashSession/CashMovementTest.php`

**Antes de escribir:** Lee `CashSessionController::addMovement()` completo.
Identifica validaciones de `type`, `amount`, `concept`.

```
✓ se puede registrar cash_in en sesión activa
✓ se puede registrar cash_out en sesión activa
✓ el movimiento se vincula correctamente a la sesión
✓ amount negativo falla (validación min:1 o similar)
✓ concept vacío falla (required)
✓ no se puede agregar movimiento a sesión cerrada
```

---

#### `tests/Unit/CashSessionTotalsTest.php`

Crea la sesión con los campos de totales ya seteados y verifica la fórmula.

```php
it('calculates expected_cash correctly', function () {
    $session = CashSession::factory()->create([
        'opening_amount'     => 100000,
        'total_cash_in'      => 50000,
        'total_cash_out'     => 20000,
        'total_sales_cash'   => 300000,
        'total_refunds_cash' => 30000,
        // expected = 100000 + 50000 - 20000 + 300000 - 30000 = 400000
    ]);

    expect((float) $session->expected_cash)->toBe(400000.0);
});
```

> Si `expected_cash` se calcula en el controlador al cerrar (no en el modelo), escribe
> este test como un test de Feature que envía el cierre y verifica el resultado en DB.

---

### G) Tests de RBAC

---

#### `tests/Feature/RBAC/VendedorPermissionsTest.php`

Usa `->assertStatus(403)` para las rutas bloqueadas.
Usa `->assertOk()` para las rutas permitidas.

**Puede (assertOk o assertRedirect):**
```
GET /pos
GET /sales
POST /sales (con payload válido)
GET /cash-sessions/current
POST /cash-sessions
```

**No puede (assertStatus(403)):**
```
GET /users              → gestión de empleados
GET /branches           → gestión de sucursales
POST /products          → crear productos
PUT /products/{id}      → editar productos
DELETE /products/{id}   → eliminar productos
GET /reports/sales      → reportes (verifica ruta real en routes/reports.php)
POST /sales/{id}/returns → devoluciones
GET /settings/business  → configuración del negocio
```

---

#### `tests/Feature/RBAC/AdminPermissionsTest.php`

```
GET /users              → assertOk o assertInertia
POST /products          → assertRedirect (creación exitosa)
GET /cash-sessions      → assertOk (ve todas las sesiones)
```

---

### H) Tests de aislamiento por sucursal

---

#### `tests/Feature/BranchIsolation/BranchScopeTest.php`

Este módulo es crítico para un sistema multi-tenant. Cada test crea **dos sucursales**
con datos independientes y verifica que el usuario de la Sucursal A no ve datos de B.

```php
describe('Branch Isolation', function () {
    beforeEach(function () {
        $this->branchA = Branch::factory()->create();
        $this->branchB = Branch::factory()->create();
        $this->userA   = vendedorUser($this->branchA);

        $this->productA = Product::factory()->create(['branch_id' => $this->branchA->id]);
        $this->productB = Product::factory()->create(['branch_id' => $this->branchB->id]);
    });

    it('user from branch A does not see products from branch B', function () {
        actingAs($this->userA)
            ->get(route('products.index'))
            ->assertInertia(fn ($page) => $page
                ->has('products') // ajustar al nombre real del prop
                ->where('products.data', fn ($products) =>
                    collect($products)->every(fn ($p) => $p['branch_id'] === $this->branchA->id)
                )
            );
    });

    // Repite el patrón para ventas, sesiones de caja, proveedores
});
```

Casos a cubrir:
```
✓ usuario de Sucursal A no ve productos de Sucursal B en GET /products
✓ usuario de Sucursal A no ve ventas de Sucursal B en GET /sales
✓ usuario de Sucursal A recibe 403/404 al ver GET /sales/{venta_de_B}
✓ GET /api/products/search solo retorna productos de la sucursal del usuario
✓ POST /sales con product_id de otra sucursal falla
✓ usuario de Sucursal A no ve sesiones de caja de Sucursal B
```

---

### I) Tests de productos

---

#### `tests/Feature/Products/ProductSearchTest.php`

```
✓ GET /api/products/search?q=cafe retorna coincidencias por nombre
✓ la búsqueda solo retorna productos de la sucursal del usuario autenticado
✓ la búsqueda solo retorna productos activos (status = true/active)
✓ sin query q= retorna lista vacía o limitada (no todos)
✓ header X-RateLimit-Limit: 60 está presente
```

---

#### `tests/Feature/Products/ProductCrudTest.php`

**Antes de escribir:** Lee `ProductController::store()` y sus validaciones. Identifica
si usa `ProductRequest` o validación inline.

```
✓ admin puede crear producto (POST /products)
✓ encargado puede crear producto
✓ vendedor recibe 403 al intentar crear producto
✓ nombre de producto es required
✓ sale_price debe ser numérico y > 0
✓ código de producto es único dentro de la sucursal
```

---

### J) Tests de reportes

---

#### `tests/Feature/Reports/ReportFiltersTest.php`

**Antes de escribir:** Lee `routes/reports.php` para conocer las rutas exactas.
Lee `ReportController` para identificar el método que devuelve el reporte de ventas.

```
✓ vendedor recibe 403 al acceder a reportes
✓ reportes solo incluyen ventas status = 'completed' (no canceladas ni pending)
✓ filtro date_from y date_to funciona correctamente
✓ encargado solo ve ventas de su sucursal en el reporte
```

---

## PASO 3 — INSTRUCCIONES TÉCNICAS

### Manejo de BusinessSetting

Muchos controladores llaman `BusinessSetting::getSettings()`. En los tests que lo necesiten,
crea el registro en la DB antes de correr el test:

```php
beforeEach(function () {
    \App\Models\BusinessSetting::factory()->create([
        'require_cash_session' => false,
    ]);
    // o directamente:
    \App\Models\BusinessSetting::create([/* campos mínimos */]);
});
```

> Verifica en la migración qué campos son `NOT NULL` sin default.

### Manejo de PaymentMethod

`SaleController::store()` valida que el `payment_method` enviado sea un código de
`PaymentMethod` activo. En los tests de ventas, necesitas que exista al menos un
método de pago activo en la DB:

```php
$cashMethod = \App\Models\PaymentMethod::factory()->create([
    'code'      => 'cash',
    'is_active' => true,
]);
```

> O agrega `PaymentMethodSeeder` al `TestCase.php` si aplica para todos los tests.

### Mock de BlobStorageService

En tests que crean productos con imagen, mockea el servicio para evitar llamadas reales a Vercel:

```php
use App\Services\BlobStorageService;

beforeEach(function () {
    $this->mock(BlobStorageService::class, function ($mock) {
        $mock->shouldReceive('upload')->andReturn('https://fake.vercel.app/test.webp');
        $mock->shouldReceive('delete')->andReturn(true);
    });
});
```

### Verificar props de Inertia

```php
->assertInertia(fn ($page) => $page
    ->component('cash-sessions/close')         // nombre exacto del componente Inertia
    ->missing('expectedCash')                   // NO debe existir
    ->has('session')                            // SÍ debe existir
    ->where('session.status', 'open')
);
```

Para obtener el nombre exacto del componente, lee el método del controlador y busca
la llamada a `Inertia::render('nombre/del/componente', [...])`.

### assertStatus vs assertRedirect

- `->assertOk()` = 200 — para rutas que retornan páginas Inertia o JSON
- `->assertRedirect()` = 302 — para rutas que redirigen tras éxito (store, update, etc.)
- `->assertStatus(403)` — para rutas bloqueadas por middleware
- `->assertStatus(422)` — para errores de validación

---

## PASO 4 — VERIFICACIÓN FINAL

Después de escribir todos los tests, ejecuta en orden:

```bash
# 1. Verificar que las factories no tienen errores
php artisan tinker --execute="App\Models\CashSession::factory()->make()->toArray()"

# 2. Correr todos los tests
php artisan test

# 3. Ver cobertura (requiere Xdebug o PCOV)
php artisan test --coverage --min=60

# 4. Correr solo un módulo
php artisan test --filter=BlindClose
php artisan test --filter=CreateSale
php artisan test --filter=BranchScope
```

Si algún test falla:
1. Lee el mensaje de error completo
2. Lee el método del controlador involucrado
3. Ajusta el payload del test o el setup del `beforeEach`
4. **No uses `->withoutExceptionHandling()`** a menos que necesites ver el stack trace real
   (quítalo antes del commit)

---

## PASO 5 — COBERTURA OBJETIVO

| Módulo | Mínimo | Prioridad |
|--------|--------|-----------|
| `SaleController` | 80% | Alta |
| `StockMovementService` | 95% | Alta |
| `CashSessionController` | 80% | Alta |
| RBAC Middleware | 100% | Alta |
| `BranchScope` (aislamiento) | 100% | Alta |
| `SaleReturnController` | 70% | Media |
| `ProductController` | 60% | Media |
| `ReportController` | 40% | Baja (>2000 líneas, complejo) |
| `PrintController` | 0% | No testear (depende de hardware físico) |

---

## NOTAS FINALES

- **No escribas tests para el frontend React** — solo backend Pest PHP por ahora
- **No testees `PrintController`** — depende de QZ Tray y hardware físico
- **No uses `->withoutMiddleware()`** en los tests de RBAC — el objetivo es probar que el middleware funciona
- Si encuentras un bug real mientras escribes los tests (comportamiento inesperado del controlador), **documéntalo en `PLAN.md`** con severidad y no lo corrijas en el test
- El test de `BlindCloseSecurityTest` puede fallar si B3 aún no está corregido — eso está bien, ese es el punto del test
- Usa `route('nombre.ruta')` en lugar de URIs hardcodeadas — más resiliente a cambios
