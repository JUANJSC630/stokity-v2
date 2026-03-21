# Stokity v2 — Plan de Tests

> Última actualización: 2026-03-21
> Framework: **Pest PHP v3** + `pest-plugin-laravel` (ya instalados)

---

## Stack de Testing

| Capa | Herramienta | Estado |
|------|-------------|--------|
| Backend (PHP) | Pest PHP v3 + pest-plugin-laravel v3 | ✅ Instalado |
| Mocking | Mockery v1.6 | ✅ Instalado |
| Fake data | FakerPHP + Factories | ✅ Instalado |
| Frontend (React/TS) | Vitest + Testing Library | ❌ Pendiente instalar |
| E2E | Playwright | ❌ Roadmap futuro |

### Por qué Pest PHP

| Opción | Veredicto |
|--------|-----------|
| **Pest PHP** | ✅ Ya instalado, sintaxis moderna, `assertInertia` nativo |
| PHPUnit puro | ❌ Más verboso — Pest lo envuelve internamente |
| Behat | ❌ Overkill, requiere Gherkin |
| Cypress / Playwright | ⚠️ Útil para E2E pero requiere servidor corriendo — roadmap futuro |
| Vitest + Testing Library | ✅ Para frontend React — instalar por separado |

---

## Estructura de Archivos

```
tests/
├── Pest.php                                ← actualizar (ver sección 1)
├── TestCase.php                            ← mantener
├── Feature/
│   ├── Auth/                               ← ya existen, mantener
│   ├── Sales/
│   │   ├── CreateSaleTest.php
│   │   ├── SaleWithDiscountTest.php
│   │   ├── SaleReturnTest.php
│   │   └── SalePosFlowTest.php
│   ├── Stock/
│   │   ├── StockValidationTest.php
│   │   ├── StockMovementTest.php
│   │   └── PessimisticLockTest.php
│   ├── CashSession/
│   │   ├── OpenCashSessionTest.php
│   │   ├── CloseCashSessionTest.php
│   │   ├── CashMovementTest.php
│   │   └── BlindCloseSecurityTest.php
│   ├── Products/
│   │   ├── ProductCrudTest.php
│   │   └── ProductSearchTest.php
│   ├── RBAC/
│   │   ├── VendedorPermissionsTest.php
│   │   ├── EncargadoPermissionsTest.php
│   │   └── AdminPermissionsTest.php
│   ├── BranchIsolation/
│   │   └── BranchScopeTest.php
│   └── Reports/
│       └── ReportFiltersTest.php
└── Unit/
    ├── StockMovementServiceTest.php
    └── CashSessionTotalsTest.php
```

---

## Orden de Implementación

Implementar de mayor a menor impacto en producción:

| # | Archivo | Razón |
|---|---------|-------|
| 1 | `BlindCloseSecurityTest.php` | Bug B3 activo — seguridad |
| 2 | `CreateSaleTest.php` | Flujo crítico del negocio |
| 3 | `StockValidationTest.php` | Integridad de datos |
| 4 | `BranchScopeTest.php` | Aislamiento multi-tenant |
| 5 | `CloseCashSessionTest.php` | Integridad financiera |
| 6 | `VendedorPermissionsTest.php` / `AdminPermissionsTest.php` | RBAC |
| 7 | Resto de tests | Cobertura complementaria |

---

## 1. Configuración Base

### `tests/Pest.php` — reescribir completo

```php
<?php

use App\Models\User;
use App\Models\Branch;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class)->in('Feature');
uses(Tests\TestCase::class)->in('Unit');
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

### `phpunit.xml` — variables de entorno para testing

```xml
<php>
    <env name="APP_ENV"                   value="testing"/>
    <env name="APP_KEY"                   value="base64:GENERATE_ONE"/>
    <env name="DB_CONNECTION"             value="sqlite"/>
    <env name="DB_DATABASE"               value=":memory:"/>
    <env name="CACHE_DRIVER"              value="array"/>
    <env name="QUEUE_CONNECTION"          value="sync"/>
    <env name="SESSION_DRIVER"            value="array"/>
    <env name="APP_TIMEZONE"              value="America/Bogota"/>
    <!-- Deshabilitar servicios externos en tests -->
    <env name="BLOB_STORE_URL"            value=""/>
    <env name="PRINTER_PRIVATE_KEY_B64"   value=""/>
    <env name="PRINTER_CERTIFICATE_B64"   value=""/>
</php>
```

---

## 2. Factories a Crear / Completar

Verificar cuáles existen en `database/factories/` y crear las que falten:

### `CashSessionFactory.php`

```php
CashSession::factory()
    ->state(['status' => 'open'])
    ->for($branch)
    ->for($user, 'openedBy')
    ->create();
```

### `SaleReturnFactory.php`

```php
SaleReturn::factory()
    ->for($sale)
    ->has(SaleReturnProduct::factory(), 'products')
    ->create();
```

### `StockMovementFactory.php`

```php
StockMovement::factory()->create([
    'product_id' => $product->id,
    'type'       => 'out',
    'quantity'   => 2,
]);
```

### `CashMovementFactory.php`

```php
CashMovement::factory()->create([
    'session_id' => $session->id,
    'type'       => 'cash_in',
    'amount'     => 50000,
]);
```

---

## 3. Mocks Globales

### BlobStorageService (tests con imágenes)

```php
$this->mock(BlobStorageService::class, function ($mock) {
    $mock->shouldReceive('upload')
         ->andReturn('https://fake.vercel.app/image.webp');
    $mock->shouldReceive('delete')
         ->andReturn(true);
});
```

### Convención Pest (estructura estándar de cada test)

```php
describe('NombreModulo', function () {
    beforeEach(function () {
        $this->branch   = Branch::factory()->create();
        $this->vendedor = vendedorUser($this->branch);
        $this->product  = Product::factory()->create([
            'branch_id' => $this->branch->id,
            'stock'     => 10,
        ]);
    });

    it('hace algo esperado', function () {
        actingAs($this->vendedor)
            ->post('/sales', [...])
            ->assertRedirect();

        expect($this->product->fresh()->stock)->toBe(9);
    });
});
```

### Verificar props de Inertia

```php
->assertInertia(fn ($page) => $page
    ->component('Sales/Index')
    ->has('sales.data', 3)
    ->where('sales.data.0.status', 'completed')
    ->missing('expectedCash')
);
```

---

## 4. Tests por Módulo

---

### Módulo: Ventas (`Feature/Sales/`)

#### `CreateSaleTest.php`

**Casos felices**
- [ ] Vendedor puede crear una venta con stock suficiente
- [ ] La venta reduce el stock del producto (`stock - cantidad = stock nuevo`)
- [ ] Se crea un `StockMovement` de tipo `out`
- [ ] La venta queda en `status = completed`
- [ ] Con sesión de caja activa, la venta se asocia al `session_id` correcto
- [ ] Venta con `payment_method = CASH` calcula `change_amount` correctamente
- [ ] Se puede crear venta con cliente (`client_id` no nulo)
- [ ] Se puede crear venta sin cliente (venta anónima)
- [ ] El `code` se genera automáticamente y es único

**Validaciones y errores**
- [ ] Falla si `stock = 0`
- [ ] Falla si el producto no existe
- [ ] Falla si `quantity = 0` o negativa
- [ ] Falla si el `branch_id` del producto no corresponde al usuario
- [ ] Vendedor no puede crear ventas en otra sucursal (inyección de `branch_id` → 403)

**Descuentos**
- [ ] `discount_type = percent`, `discount_value = 10` → `discount_amount = total * 0.10`
- [ ] `discount_type = fixed`, `discount_value = 5000` → `discount_amount = 5000`
- [ ] El `net` (total − descuento) es correcto en ambos casos

#### `SaleReturnTest.php`

- [ ] Se puede devolver una cantidad parcial de un producto vendido
- [ ] Al devolver, el stock aumenta exactamente en la cantidad devuelta
- [ ] Se crea un `StockMovement` con tipo de devolución
- [ ] No se puede devolver más unidades de las que se vendieron
- [ ] Una devolución ya procesada no puede procesarse dos veces (idempotencia)
- [ ] Solo admin y encargado pueden procesar devoluciones (vendedor → 403)
- [ ] La devolución queda vinculada a la venta original (`sale_id` correcto)

#### `SalePosFlowTest.php`

- [ ] `GET /pos` retorna props: `products`, `clients`, `paymentMethods`, `cashSession`
- [ ] `GET /api/products/search?q=...` retorna resultados filtrados por sucursal
- [ ] La búsqueda respeta rate limiting — header `X-RateLimit-Limit` presente
- [ ] Con `require_cash_session = true` y sin caja abierta, POS retorna info de bloqueo

---

### Módulo: Stock (`Feature/Stock/`)

#### `StockValidationTest.php`

- [ ] Venta con `stock = 5` y `quantity = 5` pasa (stock exacto)
- [ ] Venta con `stock = 4` y `quantity = 5` falla con error apropiado
- [ ] Múltiples ítems en la misma venta: cada uno valida su propio stock
- [ ] Si el ítem 1 pasa pero el ítem 2 falla → venta completa rechazada (atomicidad)
- [ ] Después de fallo, el stock del ítem 1 NO se modifica (rollback correcto)

#### `PessimisticLockTest.php`

- [ ] Dos requests que intentan comprar el último ítem (`stock = 1`): solo uno tiene éxito
- [ ] El stock queda en `0`, no en `-1`
- [ ] Usa `lockForUpdate()` + `DB::transaction()` para simular la concurrencia

#### `StockMovementTest.php`

- [ ] `StockMovementService::record()` crea movimiento con todos los campos correctos
- [ ] `previous_stock` y `new_stock` reflejan el estado antes y después
- [ ] Ajuste positivo incrementa el stock del producto
- [ ] Ajuste negativo reduce el stock del producto
- [ ] Movimiento de tipo `purchase` vincula correctamente el `supplier_id`

---

### Módulo: Apertura/Cierre de Caja (`Feature/CashSession/`)

#### `OpenCashSessionTest.php`

- [ ] Un usuario puede abrir una sesión (`POST /cash-sessions`)
- [ ] No puede abrirse segunda sesión mientras hay una activa para el mismo usuario
- [ ] El `opening_amount` se guarda correctamente
- [ ] El `status` queda en `open`
- [ ] La sesión se asocia al `branch_id` correcto del usuario

#### `CloseCashSessionTest.php`

- [ ] Se puede cerrar una sesión activa (`POST /cash-sessions/{id}/close`)
- [ ] Al cerrar, `status` pasa a `closed` y `closed_at` se registra
- [ ] `expected_cash = opening_amount + cash_in − cash_out + ventas_cash − devoluciones_cash`
- [ ] `discrepancy = closing_amount_declared − expected_cash`
- [ ] Solo se puede cerrar la sesión propia (no la de otro usuario)
- [ ] No se puede cerrar una sesión ya cerrada

#### `BlindCloseSecurityTest.php` ⚠️ Bug B3

Verifica el bug B3 del PLAN.md — `expectedCash` expuesto a vendedores.

```php
describe('BlindClose Security (B3)', function () {

    it('does not expose expectedCash to vendedor', function () {
        $branch   = Branch::factory()->create();
        $vendedor = vendedorUser($branch);
        $session  = CashSession::factory()->create([
            'branch_id'          => $branch->id,
            'opened_by_user_id'  => $vendedor->id,
            'status'             => 'open',
        ]);

        actingAs($vendedor)
            ->get("/cash-sessions/{$session->id}/close-form")
            ->assertInertia(fn ($page) => $page
                ->missing('expectedCash')
            );
    });

    it('exposes expectedCash to administrador', function () {
        $branch = Branch::factory()->create();
        $admin  = adminUser($branch);
        $session = CashSession::factory()->create([
            'branch_id'         => $branch->id,
            'opened_by_user_id' => $admin->id,
            'status'            => 'open',
        ]);

        actingAs($admin)
            ->get("/cash-sessions/{$session->id}/close-form")
            ->assertInertia(fn ($page) => $page
                ->has('expectedCash')
            );
    });

    it('exposes expectedCash to encargado', function () {
        $branch   = Branch::factory()->create();
        $manager  = managerUser($branch);
        $session  = CashSession::factory()->create([
            'branch_id'         => $branch->id,
            'opened_by_user_id' => $manager->id,
            'status'            => 'open',
        ]);

        actingAs($manager)
            ->get("/cash-sessions/{$session->id}/close-form")
            ->assertInertia(fn ($page) => $page
                ->has('expectedCash')
            );
    });
});
```

#### `CashMovementTest.php`

- [ ] Se puede registrar `cash_in` en sesión activa
- [ ] Se puede registrar `cash_out` en sesión activa
- [ ] No se puede registrar movimiento en sesión cerrada
- [ ] `amount` debe ser positivo (validación)
- [ ] `concept` es requerido

---

### Módulo: RBAC (`Feature/RBAC/`)

#### `VendedorPermissionsTest.php`

**Puede:**
- [ ] `GET /pos`
- [ ] Crear ventas
- [ ] Ver su historial de caja
- [ ] Abrir/cerrar su propia caja

**No puede (esperado 403):**
- [ ] `GET /users` — gestión de empleados
- [ ] `GET /branches` — gestión de sucursales
- [ ] `POST /products` — crear productos
- [ ] `PUT /products/{id}` — editar productos
- [ ] `DELETE /products/{id}` — eliminar productos
- [ ] `GET /reports` — reportes
- [ ] Procesar devoluciones (`POST /sales/{id}/returns`)
- [ ] `GET /settings/business`

#### `EncargadoPermissionsTest.php`

**Puede (además de vendedor):**
- [ ] Crear/editar productos
- [ ] Procesar devoluciones
- [ ] Ver reportes de su sucursal

**No puede (esperado 403):**
- [ ] `GET /users` — gestión de usuarios
- [ ] `GET /branches` — gestión de sucursales
- [ ] Settings de negocio de otra sucursal

#### `AdminPermissionsTest.php`

**Puede:**
- [ ] Todas las rutas anteriores
- [ ] `GET /users` y `POST /users`
- [ ] `GET /branches` y `POST /branches`
- [ ] Reportes de cualquier sucursal

---

### Módulo: Aislamiento por Sucursal (`Feature/BranchIsolation/`)

#### `BranchScopeTest.php`

- [ ] Usuario de Sucursal A **no ve** productos de Sucursal B en `GET /products`
- [ ] Usuario de Sucursal A **no ve** ventas de Sucursal B en `GET /sales`
- [ ] Usuario de Sucursal A **no puede** ver recibo de venta de Sucursal B (`GET /print/receipt/{id}` → 403 o 404)
- [ ] Usuario de Sucursal A **no ve** proveedores de Sucursal B
- [ ] `GET /api/products/search` solo retorna productos de la sucursal del usuario autenticado
- [ ] Un usuario no puede inyectar `branch_id` de otra sucursal en un POST y que la operación se ejecute allí

---

### Módulo: Productos (`Feature/Products/`)

#### `ProductCrudTest.php`

- [ ] Admin y encargado pueden crear productos (`POST /products`)
- [ ] Vendedor no puede crear productos (403)
- [ ] Imagen de producto validada: solo JPEG, PNG, WebP; máx. 5MB (verificar límite real)
- [ ] El `code` es único dentro de la sucursal
- [ ] Al eliminar un producto con ventas asociadas → comportamiento esperado documentado
- [ ] `min_stock` dispara alerta cuando `stock <= min_stock` (si existe esa lógica)

#### `ProductSearchTest.php`

- [ ] `GET /api/products/search?q=cafe` retorna productos que coinciden en nombre o código
- [ ] La búsqueda solo retorna productos de la sucursal del usuario
- [ ] La búsqueda solo retorna productos `status = active`
- [ ] Sin query (`q=`), retorna lista vacía o limitada — no todos los productos
- [ ] Rate limiting activo: header `X-RateLimit-Limit: 60` presente

---

### Módulo: Reportes (`Feature/Reports/`)

#### `ReportFiltersTest.php`

- [ ] `GET /reports/sales` solo incluye ventas `status = completed` (excluye canceladas y pendientes)
- [ ] Filtro por rango de fechas (`from`/`to`) funciona correctamente
- [ ] Filtros de fecha respetan zona horaria `America/Bogota` (no UTC)
- [ ] Encargado solo ve reportes de su sucursal
- [ ] Vendedor no puede acceder a reportes (403)
- [ ] Total reportado coincide con la suma real de ventas del período

---

### Módulo: Unit Tests (`Unit/`)

#### `StockMovementServiceTest.php`

- [ ] `record()` con `type = out` decrementa el stock
- [ ] `record()` con `type = in` incrementa el stock
- [ ] `record()` guarda `previous_stock` correcto antes del cambio
- [ ] `record()` guarda `new_stock` correcto después del cambio
- [ ] `record()` lanza excepción si el producto no existe

#### `CashSessionTotalsTest.php`

- [ ] `expected_cash = opening_amount + cash_in − cash_out + ventas_cash − devoluciones_cash`
- [ ] Discrepancia correcta cuando usuario declara menos de lo esperado
- [ ] Discrepancia correcta cuando usuario declara más de lo esperado
- [ ] Ventas con `status != completed` no se incluyen en totales de la sesión

---

## 5. Ejecutar los Tests

```bash
# Todos los tests
php artisan test

# En paralelo (más rápido)
php artisan test --parallel

# Solo un módulo
php artisan test --filter=CreateSale

# Con cobertura (requiere Xdebug o PCOV)
php artisan test --coverage

# Solo tests de seguridad
php artisan test --filter=BlindClose
```

---

## 6. Plan Frontend Testing (pendiente instalar)

### Instalación

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react \
    @testing-library/user-event @testing-library/jest-dom jsdom
```

Agregar en `vite.config.ts`:

```ts
test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
}
```

### Componentes a testear (por prioridad)

| # | Componente / Hook | Qué probar |
|---|-------------------|------------|
| 1 | `useCurrencyInput` | Formateo COP: `123000` → `123.000`; solo acepta dígitos; `numericValue` limpio |
| 2 | `POS` — carrito | Agregar producto, calcular total con descuento %, descuento fijo |
| 3 | `CashSession` — modal apertura | Validación de monto inicial vacío o cero |
| 4 | `SaleReturnForm` | Selección de productos, límite de cantidad devuelta |
| 5 | `usePrinter` | Conexión a QZ Tray mockeada, `localStorage` de impresora |

> Los tests frontend se implementarán en una segunda fase una vez instalado Vitest.

---

## 7. Cobertura Objetivo

| Módulo | Cobertura mínima |
|--------|-----------------|
| `SaleController` | 90% |
| `StockMovementService` | 95% |
| `CashSessionController` | 90% |
| RBAC / Middleware | 100% |
| `BranchScope` (aislamiento) | 100% |
| `ReportController` | 60% (mínimo por complejidad) |
| `PrintController` | 30% (depende de hardware) |
