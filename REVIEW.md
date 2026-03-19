# Revisión Profunda del Sistema POS — Stokity v2

> Fecha: 2026-03-18
> Stack: Laravel 12 + React 19 + Inertia.js + TypeScript + MySQL
> Deployment: Railway (cloud) + Vercel Blob (imágenes)

---

## Tabla de Contenido

1. [Arquitectura General](#1-arquitectura-general)
2. [Diagrama de Modelos y Relaciones](#2-diagrama-de-modelos-y-relaciones)
3. [Flujos Principales del POS](#3-flujos-principales-del-pos)
4. [Análisis Detallado por Módulo](#4-análisis-detallado-por-módulo)
5. [Lógica de Negocio — Evaluación](#5-lógica-de-negocio--evaluación)
6. [Hallazgos y Bugs Potenciales](#6-hallazgos-y-bugs-potenciales)
7. [Recomendaciones de Mejora](#7-recomendaciones-de-mejora)
8. [Matriz de Autorización](#8-matriz-de-autorización)
9. [Resumen Ejecutivo](#9-resumen-ejecutivo)

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Browser)                       │
│  React 19 + TypeScript + Inertia.js + Tailwind + Shadcn UI     │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌─────────────────┐  │
│  │   POS    │ │  Sales   │ │   Cash     │ │   Productos/    │  │
│  │  Page    │ │  CRUD    │ │  Sessions  │ │   Reportes      │  │
│  └────┬─────┘ └────┬─────┘ └─────┬──────┘ └───────┬─────────┘  │
│       │             │             │                 │            │
│  ┌────┴─────────────┴─────────────┴─────────────────┴────────┐  │
│  │              Inertia.js (router + forms)                  │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          │                                      │
│  ┌───────────────────────┴───────────────────────────────────┐  │
│  │         QZ Tray Service (WebSocket localhost:8181)         │  │
│  │         → ESC/POS printing via USB/Red local              │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP (Inertia requests)
┌──────────────────────────────┴──────────────────────────────────┐
│                     BACKEND (Laravel 12)                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Middleware Stack                       │    │
│  │  Auth → Verified → BranchFilter → Admin/AdminOrManager   │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│  ┌────────────┐ ┌─────────┴───────┐ ┌────────────────────┐     │
│  │ Controllers│ │    Services     │ │   Form Requests    │     │
│  │ (15+)      │ │                 │ │                    │     │
│  │            │ │ StockMovement   │ │ ProductRequest     │     │
│  │ Sale       │ │ Service         │ │ BranchRequest      │     │
│  │ POS        │ │                 │ │ CategoryRequest    │     │
│  │ Product    │ │ BlobStorage     │ │ LoginRequest       │     │
│  │ CashSess.  │ │ Service         │ │ ProfileUpdate      │     │
│  │ Return     │ │                 │ │ Request            │     │
│  │ Print      │ └─────────────────┘ └────────────────────┘     │
│  │ Report     │                                                 │
│  │ Stock      │                                                 │
│  │ Client     │       ┌──────────────────────┐                  │
│  │ Supplier   │       │   16 Models (Eloquent)│                  │
│  │ User       │       │   + SoftDeletes       │                  │
│  │ Branch     │       │   + Pessimistic Lock  │                  │
│  │ Category   │       └──────────┬───────────┘                  │
│  │ PayMethod  │                  │                               │
│  │ Dashboard  │                  │                               │
│  │ Settings   │                  │                               │
│  └────────────┘                  │                               │
└──────────────────────────────────┼──────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │       MySQL (Railway)        │
                    │  + Row-Level Locking         │
                    │  + Transactions              │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │     Vercel Blob Storage      │
                    │  (Imágenes WebP)             │
                    └─────────────────────────────┘
```

### Flujo de comunicación

1. **Browser → Backend**: Inertia.js envía requests HTTP (POST/GET/PATCH/DELETE) que Laravel procesa y responde con props para React.
2. **Backend → Browser**: Inertia comparte props globales (`auth`, `business`, `flash`) + props de página específicas.
3. **Browser → QZ Tray**: WebSocket a `localhost:8181` para impresión térmica local.
4. **Backend → Vercel Blob**: HTTP API para upload/delete de imágenes (WebP).
5. **Backend → MySQL**: Eloquent ORM con transacciones y bloqueo pesimista.

---

## 2. Diagrama de Modelos y Relaciones

```
                    ┌──────────────┐
                    │    Branch    │
                    │──────────────│
                    │ name         │
                    │ business_name│
                    │ address      │
                    │ manager_id ──┼───────────┐
                    │ status       │           │
                    └──────┬───────┘           │
                      │1       │1              │
              ┌───────┘        └──────┐        │
              ▼ *                     ▼ *      ▼ 1
        ┌───────────┐          ┌──────────┐   ┌──────────┐
        │  Product  │          │   User   │───│ (manager)│
        │───────────│          │──────────│   └──────────┘
        │ name      │          │ name     │
        │ code      │          │ email    │
        │ price     │          │ role     │  roles: administrador
        │ stock     │          │ branch_id│         encargado
        │ min_stock │          │ status   │         vendedor
        │ tax       │          │ photo    │
        │ category_id          └────┬─────┘
        └──┬──┬──┬──┘               │
           │  │  │              ┌───┴────────┐
           │  │  │              ▼ *           ▼ *
           │  │  │     ┌─────────────┐  ┌──────────────┐
           │  │  │     │ CashSession │  │ ArchivedUser │
           │  │  │     │─────────────│  └──────────────┘
           │  │  │     │ branch_id   │
           │  │  │     │ opened_by   │
           │  │  │     │ closed_by   │
           │  │  │     │ status      │  open | closed
           │  │  │     │ opening_amt │
           │  │  │     │ expected    │
           │  │  │     │ discrepancy │
           │  │  │     └──────┬──────┘
           │  │  │            │ 1
           │  │  │       ┌────┴─────┐
           │  │  │       ▼ *        ▼ *
           │  │  │  ┌──────────┐  ┌──────────────┐
           │  │  │  │CashMovem.│  │     Sale     │
           │  │  │  │──────────│  │──────────────│
           │  │  │  │ type     │  │ code         │
           │  │  │  │ amount   │  │ client_id ───┼──→ Client
           │  │  │  │ concept  │  │ seller_id ───┼──→ User
           │  │  │  └──────────┘  │ branch_id    │
           │  │  │                │ session_id   │
           │  │  │                │ payment_method
           │  │  │                │ discount_type│
           │  │  │                │ net, tax     │
           │  │  │                │ total        │
           │  │  │                │ status       │  completed|pending|cancelled
           │  │  │                └───┬──────┬───┘
           │  │  │                    │ 1    │ 1
           │  │  │               ┌────┘      └────┐
           │  │  │               ▼ *              ▼ *
           │  │  │       ┌──────────────┐  ┌────────────┐
           │  │  │       │ SaleProduct  │  │ SaleReturn │
           │  │  │       │──────────────│  │────────────│
           │  │  │       │ product_id ──┼──┤ sale_id    │
           │  │  │       │ quantity     │  │ user_id    │
           │  │  │       │ price        │  │ reason     │
           │  │  │       │ subtotal     │  └─────┬──────┘
           │  │  │       └──────────────┘        │ 1
           │  │  │                               ▼ *
           │  │  │                      ┌──────────────────┐
           │  │  │                      │SaleReturnProduct │
           │  │  │                      │──────────────────│
           │  │  │                      │ product_id       │
           │  │  │                      │ quantity         │
           │  │  │                      └──────────────────┘
           │  │  │
           │  │  └──────────────────────┐
           │  │                         ▼ *
           │  │                ┌─────────────────┐
           │  │                │  StockMovement  │
           │  │                │─────────────────│
           │  │                │ product_id      │
           │  │                │ user_id         │
           │  │                │ branch_id       │
           │  │                │ supplier_id     │
           │  │                │ type            │  in|out|adjustment|
           │  │                │ quantity        │  purchase|write_off|
           │  │                │ previous_stock  │  supplier_return
           │  │                │ new_stock       │
           │  │                │ unit_cost       │
           │  │                │ reference       │
           │  │                └─────────────────┘
           │  │
           │  └──── BelongsToMany ────┐
           │                          ▼
           │                   ┌────────────┐
           │                   │  Supplier  │
           │                   │────────────│
           │                   │ branch_id  │
           │                   │ name, nit  │
           │                   │ contact    │
           │                   │ status     │
           │                   └────────────┘
           │
           ▼ *..1
     ┌───────────┐             ┌──────────────────┐
     │ Category  │             │ BusinessSetting  │ (singleton)
     │───────────│             │──────────────────│
     │ name      │             │ name, logo, nit  │
     │ status    │             │ ticket_config    │
     └───────────┘             │ require_cash_sess│
                               └──────────────────┘

     ┌───────────────┐
     │ PaymentMethod │
     │───────────────│
     │ name, code    │  (usado como string FK en Sale.payment_method)
     │ is_active     │
     │ sort_order    │
     └───────────────┘
```

### Resumen de Relaciones Clave

| Modelo | Relaciones principales |
|--------|----------------------|
| **Branch** | hasMany: Product, User (employees); belongsTo: User (manager) |
| **User** | belongsTo: Branch; hasMany: ManagedBranches, CashSession (implícita) |
| **Product** | belongsTo: Category, Branch; hasMany: SaleProduct, StockMovement; belongsToMany: Supplier |
| **Sale** | belongsTo: Branch, Client, User (seller), CashSession; hasMany: SaleProduct, SaleReturn |
| **SaleProduct** | belongsTo: Sale, Product |
| **SaleReturn** | belongsTo: Sale, User; belongsToMany: Product (pivot: quantity) |
| **CashSession** | belongsTo: Branch, User (opened/closed); hasMany: Sale, CashMovement |
| **StockMovement** | belongsTo: Product, User, Branch, Supplier |
| **Supplier** | belongsTo: Branch; belongsToMany: Product |
| **PaymentMethod** | hasMany: Sale (via code string, no FK constraint) |

---

## 3. Flujos Principales del POS

### 3.1 Venta Normal (POS → Completada)

```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌────────────┐
│ Buscar   │───→│ Agregar  │───→│ Seleccionar  │───→│  Cobrar    │
│ Producto │    │ al Carrito│    │ Pago/Cliente │    │  (Submit)  │
└──────────┘    └──────────┘    └──────────────┘    └─────┬──────┘
                                                          │
                                                          ▼
                                                   POST /sales
                                                          │
                              ┌────────────────────────────┤
                              │                            │
                              ▼                            ▼
                     ┌──────────────┐           ┌──────────────────┐
                     │  Validar     │           │  Verificar stock │
                     │  inputs      │           │  (pre-check)     │
                     └──────┬───────┘           └────────┬─────────┘
                            │                            │
                            └──────────┬─────────────────┘
                                       ▼
                              DB::transaction {
                                ┌──────────────────┐
                                │  Crear Sale      │
                                │  (status=completed│
                                └────────┬─────────┘
                                         │
                                    ┌────┴────┐ foreach producto
                                    ▼         │
                          ┌─────────────────┐ │
                          │ lockForUpdate() │ │
                          │ Re-check stock  │ │
                          │ Deducir stock   │ │
                          │ Record movement │ │
                          └─────────────────┘ │
                                    └─────────┘
                              }
                                       │
                                       ▼
                              ┌────────────────────┐
                              │ Flash last_sale_id │
                              │ Redirect POS       │
                              └────────┬───────────┘
                                       │
                                       ▼
                              ┌────────────────────┐
                              │ useEffect detecta  │
                              │ flash → Auto-print │
                              │ via QZ Tray        │
                              └────────────────────┘
```

### 3.2 Cotización (Pending Sale)

```
Guardar cotización:  POST /sales (status='pending') → NO descuenta stock
                                                    → NO requiere sesión de caja
                                                    → NO requiere método de pago

Cargar cotización:   GET /sales/pending → Listado JSON
                     → Populate cart con productos guardados

Completar cotización: POST /sales/{id}/complete → Verifica stock
                                                → Descuenta stock con lock
                                                → Cambia status a 'completed'
                                                → Asocia a cash session

Actualizar:          PATCH /sales/{id}/pending → Reemplaza productos
Eliminar:            DELETE /sales/{id}/pending → forceDelete()
```

### 3.3 Devolución de Venta

```
Desde /sales/{id} (show):
   ┌──────────────────┐
   │ Seleccionar      │
   │ productos a      │  max_qty = original - previously_returned
   │ devolver         │
   └────────┬─────────┘
            │
            ▼
     POST /sales/{id}/returns
            │
            ├─── Dedup guard (30s ventana)
            │
            ▼
     DB::transaction {
       ┌──────────────────┐
       │ Crear SaleReturn │
       └────────┬─────────┘
                │
           foreach producto:
                │
                ▼
       ┌──────────────────────┐
       │ Validar max return   │
       │ Create pivot record  │
       │ lockForUpdate()      │
       │ Restaurar stock (+)  │
       │ Record movement (in) │
       └──────────────────────┘
                │
                ▼
       ┌──────────────────────┐
       │ Si 100% devuelto:   │
       │ sale.status=cancelled│
       └──────────────────────┘
     }
```

### 3.4 Sesión de Caja (Apertura → Cierre)

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ Apertura │────→│ Operaciones  │────→│ Formulario   │────→│  Cierre  │
│ (modal)  │     │ durante turno│     │   de cierre  │     │  final   │
└──────────┘     └──────────────┘     └──────────────┘     └──────────┘
     │                  │                     │                   │
POST /cash-       POST /movements        GET /close-form    POST /close
sessions          (cash_in/cash_out)      (summary)         (cuadre)
     │                                        │                   │
     │                                        ▼                   ▼
     │                               Cálculo esperado:    Cálculo final:
     │                               apertura             apertura
     │                               + ventas_efectivo    + ventas_efectivo
     │                               + ingresos           + ingresos
     │                               - egresos            - egresos
     │                                                    - devoluciones_cash
     │                                                    = esperado
     │                                                    declarado - esperado
     │                                                    = discrepancia
```

---

## 4. Análisis Detallado por Módulo

### 4.1 Módulo de Ventas (SaleController)

**Archivos clave:**
- `app/Http/Controllers/SaleController.php`
- `resources/js/pages/pos/index.tsx`
- `resources/js/pages/sales/create.tsx`
- `app/Models/Sale.php`, `SaleProduct.php`

**Evaluación: CORRECTO con observaciones**

| Aspecto | Estado | Nota |
|---------|--------|------|
| Validación de inputs | OK | Valida payment_method contra DB dinámica |
| Stock pre-check | OK | Verificación antes y dentro de transacción |
| Bloqueo pesimista | OK | `lockForUpdate()` previene race conditions |
| Cálculo de impuesto | OK | Per-product, server-side |
| Cálculo de descuento | OK | Server-side, limitado al gross |
| Generación de código | REVISAR | `timestamp + rand(100,999)` — ver hallazgos |
| Sesión de caja | OK | Condicional según BusinessSetting |
| Cotizaciones | OK | Sin impacto en stock hasta completar |
| Auto-print | OK | Flash data + useEffect + QZ Tray |

### 4.2 Módulo de Devoluciones (SaleReturnController)

**Archivos clave:**
- `app/Http/Controllers/SaleReturnController.php`
- `app/Models/SaleReturn.php`, `SaleReturnProduct.php`

**Evaluación: CORRECTO con observaciones**

| Aspecto | Estado | Nota |
|---------|--------|------|
| Dedup guard (30s) | OK | Previene doble-click |
| Max returnable calc | OK | Acumulativo con returns previos |
| Stock reversal | OK | Con lockForUpdate() |
| Auto-cancel sale | OK | Si 100% devuelto |
| Branch authorization | FALTA | No valida que el usuario pertenezca a la sucursal de la venta |
| Impacto en cash session | PARCIAL | No registra movimiento de caja por la devolución |

### 4.3 Módulo de Caja (CashSessionController)

**Archivos clave:**
- `app/Http/Controllers/CashSessionController.php`
- `app/Models/CashSession.php`, `CashMovement.php`
- `resources/js/pages/cash-sessions/close.tsx`

**Evaluación: CORRECTO con observaciones**

| Aspecto | Estado | Nota |
|---------|--------|------|
| Una sesión por usuario/branch | OK | Guard en store() |
| Agrupación de pagos | OK | CASH/CARD/TRANSFER/OTHER constants |
| Cálculo de expected cash | OK | Incluye devoluciones |
| Cierre ciego (vendedores) | OK | isSeller() check |
| Discrepancia | OK | declared - expected |
| Refunds calculation | REVISAR | Suma sale.total completo, no el monto parcial devuelto |

### 4.4 Módulo de Productos/Stock

**Archivos clave:**
- `app/Http/Controllers/ProductController.php`
- `app/Http/Controllers/StockMovementController.php`
- `app/Services/StockMovementService.php`

**Evaluación: CORRECTO**

| Aspecto | Estado | Nota |
|---------|--------|------|
| Stock protegido en edit | OK | Unset explícito del campo stock |
| Operaciones de stock separadas | OK | Endpoint dedicado updateStock() |
| Audit trail completo | OK | StockMovementService centralizado |
| Auto-link proveedor | OK | En movimientos de compra |
| Floor at 0 (no negativos) | OK | max(0, stock - qty) |

### 4.5 Módulo de Impresión (PrintController)

**Archivos clave:**
- `app/Http/Controllers/PrintController.php`
- `resources/js/services/qzTray.ts`
- `resources/js/hooks/use-printer.ts`

**Evaluación: CORRECTO — muy bien implementado**

La arquitectura cloud → browser → QZ Tray → impresora USB es la solución correcta para un SaaS con impresión local. El manejo de ESC/POS es detallado y resuelve problemas reales de hardware (dead zone, ESC *, QR fallback).

### 4.6 Módulo de Reportes

**Archivo clave:** `app/Http/Controllers/ReportController.php`

**Evaluación: CORRECTO** — Filtrado por branch para no-admins, exports PDF/Excel disponibles.

---

## 5. Lógica de Negocio — Evaluación

### 5.1 Integridad del Stock

**Veredicto: SÓLIDA**

El sistema usa un patrón robusto de doble verificación:
1. Pre-check fuera de la transacción (UX rápida, feedback temprano)
2. Re-check dentro de `lockForUpdate()` (integridad real)

Todos los flujos que modifican stock (venta, devolución, eliminación de venta, movimientos manuales) pasan por el mismo `StockMovementService` para auditoría.

**Punto fuerte:** El código en `SaleController::store()` (líneas 207-236) implementa correctamente el patrón de bloqueo pesimista.

### 5.2 Cálculos Financieros

**Veredicto: CORRECTA con detalle menor**

- Impuesto: Calculado per-product server-side ✓
- Descuento: Calculado server-side, limitado al gross ✓
- Total: `max(0, gross - discountAmount)` ✓
- Cambio: Calculado en frontend para display, enviado al backend ✓

### 5.3 Flujo de Cotizaciones

**Veredicto: BIEN DISEÑADO**

La separación entre pending y completed es limpia:
- Pending: NO descuenta stock, NO requiere pago, NO requiere caja
- Al completar: re-verifica todo, descuenta stock, vincula a sesión
- Los productos se reemplazan (no se editan en place) — correcto

### 5.4 Sesión de Caja

**Veredicto: CORRECTA — bien implementada**

El flujo apertura → operaciones → cierre es completo. La opción de "cierre ciego" para vendedores es una buena práctica POS. El cálculo de expected cash incluye todos los factores relevantes.

---

## 6. Hallazgos y Bugs — TODOS RESUELTOS

### BUG-01: Cálculo de reembolsos en cierre de caja — RESUELTO

**Archivo:** `CashSessionController.php`

**Problema:** Al cerrar caja, si una venta de $100.000 tenía una devolución parcial de 1 producto de $20.000, el sistema restaba $100.000 (el total de la venta completa) en lugar de $20.000 (lo realmente devuelto). Esto inflaba la discrepancia.

**Ejemplo concreto:**
```
Venta #001: Producto A ($50.000) + Producto B ($30.000) + Producto C ($20.000) = $100.000
Devolución: Solo Producto C (1 unidad × $20.000)

ANTES (bug):  expected_cash -= $100.000  ← restaba el total de la venta
DESPUÉS (fix): expected_cash -= $20.000   ← resta solo qty_devuelta × precio_unitario
```

**Fix aplicado:** Nuevo método privado `calculateCashRefunds()` que calcula el monto real devuelto:
```php
// Para cada SaleReturn, itera sus SaleReturnProducts y multiplica
// quantity_devuelta × precio_unitario_del_SaleProduct original
foreach ($returnProducts as $rp) {
    $saleProduct = $return->sale->saleProducts->firstWhere('product_id', $rp->product_id);
    $total += $rp->quantity * $saleProduct->price;
}
```

---

### BUG-02: Código de venta con baja entropía — RESUELTO

**Archivo:** `SaleController.php`

**Problema:** `YmdHis + rand(100,999)` solo tiene 900 posibles valores por segundo. En concurrencia alta, podría generar un código duplicado y fallar con DB exception.

**Nota:** La migración YA tenía `->unique()` en `sales.code`, así que la DB protegía contra duplicados, pero el error no se manejaba gracefully.

**Fix aplicado:**
```php
// Antes: $validated['code'] = now()->format('YmdHis') . rand(100, 999);
// Después:
do {
    $code = now()->format('YmdHis') . rand(1000, 9999);  // 9000 posibilidades (10x más)
} while (Sale::withTrashed()->where('code', $code)->exists());  // retry on collision
```

---

### BUG-03: Falta autorización por branch en devoluciones — RESUELTO

**Archivo:** `SaleReturnController.php`

**Problema:** Un vendedor de Sucursal A podía crear una devolución para una venta de Sucursal B si conocía el sale ID.

**Ejemplo:**
```
Vendedor (branch_id=1) → POST /sales/42/returns → sale #42 es de branch_id=2
ANTES:  Se procesaba sin problema ← agujero de seguridad
DESPUÉS: abort(403, 'No tienes acceso a ventas de otra sucursal.')
```

**Fix aplicado:**
```php
if (!$user->isAdmin() && $user->branch_id && $sale->branch_id !== $user->branch_id) {
    abort(403, 'No tienes acceso a ventas de otra sucursal.');
}
```

---

### BUG-04: closeForm() no incluía devoluciones en expected cash — RESUELTO

**Archivo:** `CashSessionController.php`

**Problema:** El formulario de cierre mostraba un `expectedCash` sin restar devoluciones, pero al hacer submit, `close()` sí las restaba. El cajero veía un número y el sistema guardaba otro.

**Ejemplo:**
```
Apertura: $100.000 | Ventas cash: $200.000 | Devolución cash: $30.000

ANTES (closeForm):  Expected = $100.000 + $200.000 = $300.000  ← sin devoluciones
ANTES (close):      Expected = $100.000 + $200.000 - $30.000 = $270.000  ← con devoluciones
→ El cajero contaba $270.000, veía que el form decía $300.000, pensaba que le faltaban $30.000

DESPUÉS (ambos):    Expected = $100.000 + $200.000 - $30.000 = $270.000  ← consistente
```

**Fix aplicado:** `closeForm()` ahora usa el mismo `calculateCashRefunds()` que `close()`:
```php
$totalRefunds = $this->calculateCashRefunds($session->id);
$expectedCash = (float) $session->opening_amount + $totalCash + $totalCashIn - $totalCashOut - $totalRefunds;
```

---

### BUG-05: `destroy()` de Sale sin `lockForUpdate()` — RESUELTO

**Archivo:** `SaleController.php`

**Problema:** Al eliminar una venta (admin-only), la reversión de stock usaba `Product::find()` sin lock, mientras que todos los demás flujos usaban `lockForUpdate()`.

**Fix aplicado:**
```php
// Antes: $product = Product::find($saleProduct->product_id);
// Después:
$product = Product::lockForUpdate()->find($saleProduct->product_id);
```

---

### BUG-06: Método muerto `printReturnReceipt()` — RESUELTO

**Archivo:** `SaleReturnController.php` + `routes/web.php`

**Problema:** Este método generaba un recibo en texto plano que nunca se usaba (la impresión real iba por `PrintController::returnReceipt()` via QZ Tray). La ruta `sale-returns/{id}/print` tampoco se llamaba desde ningún frontend.

**Fix aplicado:** Eliminado el método y la ruta muerta.

---

### BUG-07: Fotos de usuario en filesystem local — RESUELTO

**Archivo:** `UserController.php`

**Problema:** Las fotos de usuario se guardaban en `public/uploads/users/` (filesystem local). En Railway (cloud deployment), los archivos locales se pierden en cada deploy. Productos y business settings ya usaban Vercel Blob correctamente.

**Ejemplo:**
```
ANTES:  $file->move(public_path('uploads/users'), $filename);  ← se pierde en deploy
DESPUÉS: $this->blobStorage->upload($request->file('photo'), 'users');  ← persiste en Blob
```

**Fix aplicado:**
- `store()` y `update()` ahora usan `BlobStorageService` para upload/delete
- En `update()`, la foto anterior se elimina de Blob antes de subir la nueva
- El modelo `User::getPhotoUrlAttribute()` ya manejaba tanto URLs de Blob como paths legacy

---

### BUG-08: `completePending()` no recalculaba tax/total server-side — RESUELTO

**Archivo:** `SaleController.php`

**Problema:** `store()` recalculaba `totalTax`, `discountAmount` y `total` server-side, pero `completePending()` aceptaba `net` y `total` directamente del frontend sin validar. Un usuario malicioso podía manipular el total de la venta.

**Ejemplo:**
```
Producto: precio=$50.000, tax=19%
Frontend envía: total=$10.000 (manipulado)

ANTES:  Se guardaba total=$10.000 ← aceptaba cualquier valor del frontend
DESPUÉS: Server recalcula total = net + (subtotal × tax%) - discount = $59.500 ← correcto
```

**Fix aplicado:**
```php
// Recalcular tax per-product
$totalTax += $prod['subtotal'] * ($productTax / 100);

// Recalcular descuento y total (misma lógica que store())
$gross = $validated['net'] + $totalTax;
$discountAmount = match ($discountType) { ... };
$serverTotal = max(0, $gross - $discountAmount);

// Guardar valores recalculados (ignora net/total del frontend)
$sale->update([
    'tax'             => $totalTax,
    'discount_amount' => $discountAmount,
    'total'           => $serverTotal,
    ...
]);
```

---

## 7. Recomendaciones Futuras (opcionales)

#### R-09: Considerar Policy classes en lugar de checks inline
- **Impacto:** Mejor organización de autorización
- **Esfuerzo:** 2-4 horas (refactor)
- Laravel provee `Gate` y `Policy` classes que centralizan la lógica de autorización en lugar de tener `isAdmin()` checks dispersos en cada controller.

#### R-10: Extraer lógica de cálculo de venta a un SaleCalculationService
- **Impacto:** DRY — la lógica de tax/discount ahora está en `store()` y `completePending()` (duplicada pero correcta)
- **Esfuerzo:** 1-2 horas

---

## 8. Matriz de Autorización

| Operación | Administrador | Encargado | Vendedor | Middleware |
|-----------|:---:|:---:|:---:|------------|
| **Ventas** |
| Ver todas las ventas | Todas | Su branch | Su branch | BranchFilter |
| Crear venta (POS) | Si | Si | Si | auth + verified |
| Editar venta | Si | No | No | inline isAdmin() |
| Eliminar venta | Si | No | No | inline isAdmin() |
| **Productos** |
| Ver productos | Todos | Su branch | Su branch | BranchFilter |
| CRUD productos | Si | Si | No | AdminOrManager |
| Actualizar stock | Si | Si | No | AdminOrManager |
| **Caja** |
| Abrir sesión | Si | Si | Si | auth + verified |
| Movimientos manuales | Si | Dueño sesión | Dueño sesión | inline check |
| Ver cierre esperado | Si | Si | No (ciego) | isSeller() |
| Cerrar sesión ajena | Si | Si | No | isAdmin/isManager |
| **Devoluciones** |
| Crear devolución | Si | Si | Si | auth (FALTA branch check) |
| **Sucursales** |
| CRUD | Si | No | No | AdminMiddleware |
| **Usuarios** |
| CRUD | Si | No | No | inline isAdmin() |
| **Categorías** |
| CRUD | Si | Si | No | AdminOrManager |
| **Proveedores** |
| CRUD | Si | Si | Si | auth only |
| **Métodos de pago** |
| CRUD | Si | No | No | AdminMiddleware |
| **Configuración** |
| Business settings | Si | No | No | AdminMiddleware |
| **Reportes** |
| Ver reportes | Todos | Su branch | Su branch | BranchFilter |

---

## 9. Resumen Ejecutivo

### Lo que está BIEN hecho

1. **Integridad de stock robusta** — Doble verificación + bloqueo pesimista + auditoría completa. Este es el aspecto más crítico de un POS y está bien resuelto.

2. **Arquitectura de impresión** — La solución cloud → browser → QZ Tray → USB es la correcta para un SaaS. El manejo de ESC/POS con workarounds para hardware específico demuestra experiencia real.

3. **Sesiones de caja completas** — Apertura, movimientos, cierre con cuadre, cierre ciego para vendedores. Flujo profesional.

4. **Cotizaciones sin impacto en stock** — Separación correcta entre pending y completed.

5. **RBAC multi-branch** — Tres niveles de rol con filtrado por sucursal bien implementado.

6. **Transacciones DB** — Todas las operaciones críticas envueltas en `DB::transaction()`.

7. **Frontend organizado** — TypeScript, hooks reutilizables, componentes Shadcn, auto-print.

### Bugs encontrados y RESUELTOS (8/8)

| # | Severidad | Descripción | Estado |
|---|-----------|-------------|--------|
| BUG-01 | MEDIO | Cierre de caja sumaba sale.total completo en devoluciones parciales | RESUELTO |
| BUG-02 | BAJO | Código de venta con baja entropía (900 posibilidades/segundo) | RESUELTO |
| BUG-03 | BAJO | Devoluciones sin verificación de branch del usuario | RESUELTO |
| BUG-04 | BAJO | closeForm() no incluía devoluciones en expected cash | RESUELTO |
| BUG-05 | BAJO | destroy() de Sale sin lockForUpdate() | RESUELTO |
| BUG-06 | INFO | Método muerto printReturnReceipt() + ruta huérfana | RESUELTO |
| BUG-07 | INFO | Fotos de usuario en filesystem local (se pierden en deploy) | RESUELTO |
| BUG-08 | MEDIO | completePending() no recalculaba tax/total server-side | RESUELTO |

### Conclusión General

**La lógica de negocio del POS está fundamentalmente correcta.** Los patrones de bloqueo de stock, transacciones, auditoría y separación de flujos (venta/cotización/devolución/caja) son sólidos y profesionales. Los 8 bugs encontrados han sido corregidos. El sistema está bien estructurado para un POS multi-sucursal con impresión térmica en la nube.
