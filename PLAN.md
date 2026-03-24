# Stokity v2 — Plan de Trabajo

> Última actualización: 2026-03-24

---

## Estado del sistema

| Módulo | Estado |
|--------|--------|
| POS core (ventas, productos, clientes) | ✅ Funcional |
| Multi-sucursal + RBAC | ✅ Funcional |
| Métodos de pago dinámicos | ✅ Funcional |
| Devoluciones | ✅ Funcional |
| Impresión térmica ESC/POS (QZ Tray) | ⚠️ Funcional — bug activo en corte superior |
| Validación de stock (pessimistic lock) | ✅ Funcional |
| Configuración del negocio (logo, NIT, etc.) | ✅ Funcional |
| Almacenamiento de imágenes (Vercel Blob + WebP) | ✅ Funcional |
| Búsqueda en tiempo real (POS + productos) | ✅ Funcional |
| Descuentos y notas en ventas | ✅ Funcional |
| Historial de compras del cliente | ✅ Funcional |
| Apertura/Cierre de Caja (turnos) | ✅ Funcional |
| Cotizaciones / ventas pendientes | ✅ Funcional |
| Reportes + exportación PDF/Excel | ✅ Funcional |
| Módulo de Proveedores | ✅ Funcional |
| Contabilidad básica (P&L + Gastos) | ✅ Funcional |
| Créditos y pagos diferidos | 🔲 Pendiente |
| Auto-formato inputs COP (CurrencyInput) | ✅ Funcional |
| UX improvements (28 hallazgos) | ✅ Completo |
| Auditoría pre-producción (28 hallazgos) | ✅ 24 corregidos, 4 descartados |
| Tests backend (Pest PHP) | ✅ 117 tests, 325 assertions |
| Tests frontend (Vitest + Testing Library) | ✅ 69 tests, 8 archivos |
| ESLint + TypeScript | ✅ 0 errores |

---

## Bugs activos

### BUG-1 — Recibo térmico cortado en la parte superior

**Severidad:** Alta
**Impresora:** POS-5890U-L (58mm, 203 DPI, USB)
**Archivo:** `app/Http/Controllers/PrintController.php`
**Estado:** Fix en código — pendiente de probar con impresora física

**Síntoma:** El primer recibo tras encender la impresora sale perfecto. A partir del segundo, el encabezado queda dentro de la impresora después del corte.

**Causa raíz:** La impresora mantiene estado interno entre trabajos USB. Los comandos ESC * (logo, QR, barcode) dejan el line spacing corrupto. ESC @ retrae el papel ~20-30mm.

**Fix actual en código:**
- ESC @ (initialize) eliminado de `createPrinter()` — usa `$connector->clear()`
- Reset manual: ESC 2 + emphasis off + text size 1x1 + center
- Margen superior: 4 × ESC J 24 = 96 dots (12mm)
- Feed antes del corte: 8 × ESC J 24 = 192 dots (24mm)

**Hipótesis si el fix no funciona:**
- H1: Cambiar `GS V 66 3` por `GS V 1` (corte simple sin auto-feed)
- H4: Usar `GS V 65 n` con n=192 dots para posicionar papel post-corte
- H5: Combinar ESC @ + ESC J generoso + `GS V 65 n` con n grande

**Acción:** Desplegar a Railway y probar con impresora física.

---

## Funcionalidades pendientes

### F1 — Descuentos por cliente (mayorista / VIP)
**Prioridad: Alta**

No hay forma de marcar clientes mayoristas con descuento automático.

**Implementación:**
- Columna `discount_pct DECIMAL(5,2) DEFAULT NULL` en `clients`
- Campo "Descuento especial (%)" en crear/editar cliente (solo admin y encargado)
- En POS: al seleccionar cliente con `discount_pct`, aplicar automáticamente
- Badge en el POS: *"Cliente VIP — 15% dto."* junto al nombre
- Vendedor no puede aumentar el descuento por encima del configurado

---

### ✅ F9 — Unificación de tipos de movimiento de stock: `in` + `purchase` → `ingreso`
**Completado: 2026-03-23**

Actualmente existen dos tipos que representan lo mismo (stock que entra al sistema): `in` ("Entrada de Stock") y `purchase` ("Compra a Proveedor"). Esto genera confusión porque:
- El usuario no distingue cuándo usar uno u otro.
- "Compra" en español puede interpretarse como venta al cliente (compra = lo que compra el cliente), no como una entrada de inventario.
- En código, ambos se tratan igual: se suman al stock, habilitan proveedor y costo unitario, se agrupan con `whereIn('type', ['in', 'purchase'])`.

**Solución:** Unificar ambos en un solo tipo `ingreso` ("Ingreso") que es semánticamente claro: cualquier unidad que entra al inventario es un ingreso. El proveedor y el costo unitario siguen siendo opcionales en un ingreso.

**Tipos finales del enum:**

| Valor DB | Etiqueta UI | Efecto en stock | Color |
|----------|-------------|-----------------|-------|
| `ingreso` | Ingreso | `+ cantidad` | verde |
| `out` | Salida | `- cantidad` | rojo |
| `adjustment` | Ajuste | `= cantidad` | amarillo |
| `write_off` | Baja | `- cantidad` | naranja |
| `supplier_return` | Devolución a proveedor | `- cantidad` | morado |

**Implementación — Backend:**

1. **Migración DB** (`database/migrations/`)
   - Nuevo archivo: `2026_XX_XX_migrate_in_purchase_to_ingreso.php`
   - En MySQL: `UPDATE stock_movements SET type = 'ingreso' WHERE type IN ('in', 'purchase')`
   - Luego: `ALTER TABLE stock_movements MODIFY COLUMN type ENUM('ingreso','out','adjustment','write_off','supplier_return') NOT NULL`
   - `down()`: revertir a `in`/`purchase` (asignar `ingreso` → `in`)

2. **`app/Models/StockMovement.php`**
   - `typeLabel()`: eliminar `'in'` y `'purchase'`, agregar `'ingreso' => 'Ingreso'`
   - `typeColor()`: eliminar `'in'` y `'purchase'`, agregar `'ingreso' => 'green'`

3. **`app/Http/Controllers/StockMovementController.php`**
   - Validación `store()`: `'required|in:ingreso,out,adjustment,write_off,supplier_return'`
   - `match($request->type)`: `'ingreso' => $prev + $qty` (eliminar `'in', 'purchase'`)
   - `whereIn('type', ['in', 'purchase'])` → `where('type', 'ingreso')` (×2: `total_in` y `movements_by_type`)
   - Auto-link proveedor: `in_array($request->type, ['purchase', 'in'])` → `$request->type === 'ingreso'`
   - `selectedType` default: `'in'` → `'ingreso'`

4. **`app/Http/Controllers/SupplierController.php`**
   - `whereIn('type', ['in', 'purchase'])` → `where('type', 'ingreso')`

5. **`app/Http/Controllers/SaleController.php`**
   - `type: 'in'` (reposición de stock al cancelar venta) → `type: 'ingreso'`

6. **`app/Http/Controllers/SaleReturnController.php`**
   - `type: 'in'` (reposición de stock en devolución) → `type: 'ingreso'`

7. **`app/Http/Controllers/ProductController.php`**
   - `'add' => 'in'` → `'add' => 'ingreso'`

**Implementación — Frontend:**

8. **`resources/js/pages/stock-movements/create.tsx`**
   - `MovementType`: reemplazar `'in' | 'purchase'` → `'ingreso'`
   - Default state: `'in'` → `'ingreso'`
   - Eliminar `<SelectItem value="in">` y `<SelectItem value="purchase">`, agregar `<SelectItem value="ingreso">Ingreso de Stock</SelectItem>`
   - `showSupplier`: `['in', 'purchase', 'supplier_return']` → `['ingreso', 'supplier_return']`
   - `showUnitCost`: `['in', 'purchase']` → `['ingreso']`
   - `quantityLabel`: `['in', 'purchase']` → `['ingreso']`
   - Etiqueta del proveedor: eliminar la distinción `purchase ? ' *' : ''` (en `ingreso` el proveedor es siempre opcional)

9. **`resources/js/pages/stock-movements/index.tsx`**
   - Actualizar filtro de tipo: eliminar opciones `in` / `purchase`, agregar `ingreso`

10. **`resources/js/pages/stock-movements/product-movements.tsx`**
    - Actualizar los `switch/case` de `getTypeColor()` y `getTypeLabel()`: eliminar `case 'purchase'` y `case 'in'`, agregar `case 'ingreso'`
    - Actualizar el `+/-/=` badge: `movement.type === 'in'` → `movement.type === 'ingreso'`

11. **`resources/js/pages/suppliers/show.tsx`**
    - Eliminar `in: 'Entrada'` y `purchase: 'Compra'` del mapa de etiquetas/colores
    - Agregar `ingreso: 'Ingreso'` con color verde

**Implementación — Tests:**

12. **`database/factories/StockMovementFactory.php`**
    - `'type' => 'in'` → `'type' => 'ingreso'`

13. **Tests existentes** — revisar cualquier aserción que use `'in'` o `'purchase'` como tipo de movimiento de stock y actualizarlos a `'ingreso'`

**Orden de ejecución recomendado:**
1. Migración DB (primero — define la verdad del schema)
2. Modelo + Controladores backend
3. Factories + Tests
4. Frontend (puede ir en paralelo con paso 2-3)
5. Verificar que `php artisan test` siga en verde

---

### ~~F10 — Módulo de contabilidad básica: Estado de Resultados (P&L)~~
~~**Prioridad: Alta**~~ ✅ **COMPLETADO** (commits `e970c18`, `1906b82`)

El negocio necesita saber cuánto dinero **le queda** al mes: no solo cuánto vendió, sino descontando el costo de lo que vendió y los gastos fijos del local (arriendo, empleados, servicios, etc.). Actualmente el sistema solo muestra ingresos brutos; no hay manera de registrar gastos ni calcular ganancia neta.

---

#### Concepto de negocio (qué ve la usuaria)

```
Ingresos por ventas         $  8.500.000
(-) Costo de lo vendido     $  4.200.000   ← precio compra × unidades vendidas
                            ────────────
= Ganancia bruta            $  4.300.000   (margen bruto ~51%)

(-) Gastos del período      $  2.100.000
    • Arriendo              $  1.200.000
    • Servicios públicos    $    250.000
    • Empleado              $    500.000
    • Otros                 $    150.000
                            ────────────
= Ganancia neta             $  2.200.000   ← lo que le queda para reinvertir
```

---

#### Problema técnico crítico a resolver primero

`sale_products` guarda `price` (precio de venta) pero **no el precio de costo al momento de la venta**. Si `products.purchase_price` cambia más adelante, el COGS histórico quedaría incorrecto. Se debe congelar el costo en el momento de la venta.

**Fix:** Agregar `purchase_price_snapshot DECIMAL(10,2) DEFAULT NULL` a `sale_products` y poblarlo en `SaleController::store()` al momento de crear cada ítem.

> Las ventas anteriores a la migración tendrán `purchase_price_snapshot = NULL`; el reporte usará `products.purchase_price` como fallback para esas filas (mejor esfuerzo).

---

#### Modelo de datos — nuevas tablas

**`expense_categories`**
```
id                  bigint PK
name                varchar(100)          — "Arriendo", "Nómina", "Servicios"
icon                varchar(50) NULL      — nombre de icono lucide-react
color               varchar(20) NULL      — tailwind color name
is_system           boolean DEFAULT false — categorías base no editables
timestamps
```
Categorías seedeadas: Arriendo, Nómina, Servicios públicos, Internet/Teléfono, Marketing, Transporte, Mantenimiento, Impuestos, Otros.

---

**`expense_templates`** — Plantillas de gastos recurrentes

El problema: gastos como la luz o el agua ocurren todos los meses pero su monto **varía**. No se pueden auto-generar con un monto fijo. La solución es una plantilla que el sistema *sugiere* cada mes para que la usuaria confirme con el monto real.

```
id                    bigint PK
branch_id             FK branches
expense_category_id   FK expense_categories NULL
name                  varchar(255)       — "Arriendo local Calle 10", "Factura EPM", "Internet Claro"
reference_amount      decimal(12,2)      — monto habitual de referencia (orientativo, no fijo)
is_active             boolean DEFAULT true
timestamps
```

Ejemplos de plantillas que configura la usuaria:

| Nombre | Categoría | Monto referencia |
|--------|-----------|-----------------|
| Arriendo local | Arriendo | $1.200.000 |
| Factura EPM (luz) | Servicios públicos | $250.000 |
| Factura EPM (agua) | Servicios públicos | $80.000 |
| Internet Claro | Internet/Teléfono | $89.900 |
| Nómina empleada | Nómina | $1.300.000 |

---

**`expenses`** — Gastos registrados (reales, confirmados)
```
id                    bigint PK
branch_id             FK branches
user_id               FK users
expense_category_id   FK expense_categories NULL
expense_template_id   FK expense_templates NULL  — NULL si es gasto único
amount                decimal(12,2)              — monto real pagado ese mes
description           varchar(255) NULL
expense_date          date                       — fecha real de pago
notes                 text NULL
timestamps
```

El campo `expense_template_id` permite saber que un gasto fue generado desde una plantilla (útil para no duplicar en el mismo mes).

---

**Flujo de gastos recurrentes (UX)**

```
① Admin configura plantillas una sola vez
   Ej: "Factura EPM luz – ref. $250.000"

② Cada mes, en /expenses aparece un banner:
   ⚠️ "Tienes 3 gastos fijos sin registrar para marzo — Registrar ahora"

③ Modal "Gastos del mes":
   ┌─────────────────────────────────────────┐
   │ Arriendo local          $ 1.200.000 ✏️  │  ← editable
   │ Factura EPM (luz)       $   312.000 ✏️  │  ← usuario cambia al monto real
   │ Internet Claro          $    89.900 ✏️  │  ← igual al de referencia
   │ [Confirmar y registrar]                 │
   └─────────────────────────────────────────┘

④ Al confirmar → crea N registros en `expenses` con los montos reales
   → cada registro queda vinculado a su plantilla (expense_template_id)

⑤ Si ya existen gastos de esa plantilla en el mes actual → no mostrar
   en el banner (evita duplicados)
```

El sistema **nunca crea gastos automáticamente** — solo sugiere. La usuaria siempre confirma y puede ajustar el monto. Si no lo hace, ese mes simplemente no aparecen en el P&L (lo cual es correcto — aún no los pagó o no los registró).

---

#### Backend

**Migraciones** (en orden)
1. `add_purchase_price_snapshot_to_sale_products` — columna nullable
2. `create_expense_categories_table`
3. `create_expense_templates_table`
4. `create_expenses_table`
5. Seeder `ExpenseCategorySeeder` con las 9 categorías base

**Modelos**
- `ExpenseCategory` — fillable: name, icon, color, is_system
- `ExpenseTemplate` — fillable: branch_id, expense_category_id, name, reference_amount, is_active; belongs to Branch, ExpenseCategory; hasMany Expenses
- `Expense` — fillable: branch_id, user_id, expense_category_id, expense_template_id, amount, description, expense_date, notes; belongs to Branch, User, ExpenseCategory, ExpenseTemplate

**SaleController — fix COGS snapshot**
En `store()`, al crear cada `SaleProduct`:
```php
'purchase_price_snapshot' => $product->purchase_price,
```

**`ExpenseController`** (resource)
- `index` — paginado, filtros: branch, category, date range. Detecta plantillas sin registrar en el mes actual → pasa `pendingTemplates` al frontend
- `store` — acepta array de gastos (para confirmar múltiples plantillas a la vez) o gasto único
- `update` / `destroy` — solo admin + encargado; no se puede eliminar si el mes ya está "cerrado" (futuro)

**`ExpenseTemplateController`**
- `index` — lista de plantillas activas de la sucursal
- `store` / `update` / `destroy` — CRUD de plantillas

**`FinanceController`**
- `summary(Request $request): Response`
  - Parámetros: `period` (este_mes | mes_anterior | este_año | custom), `branch_id`, `date_from`, `date_to`
  - Retorna:
    - `revenue` — `SUM(sales.total)` ventas completadas del período
    - `returns_total` — `SUM(sale_returns.total)` del período (a restar)
    - `net_revenue` = revenue - returns_total
    - `cogs` — `SUM(sp.quantity * COALESCE(sp.purchase_price_snapshot, p.purchase_price))`
    - `gross_profit` = net_revenue - cogs
    - `gross_margin_pct` = gross_profit / net_revenue * 100
    - `total_expenses` — `SUM(expenses.amount)` del período
    - `net_profit` = gross_profit - total_expenses
    - `expenses_by_category` — [{category, icon, color, amount, pct}]
    - `monthly_trend` — últimos 6 meses [{month, revenue, cogs, expenses, net_profit}]
    - `top_products_by_margin` — top 10 [{product, units_sold, revenue, cogs, gross_profit, margin_pct}]
    - `has_cogs_warning` — bool: true si hay ventas sin snapshot (datos históricos pre-migración)

**Rutas** (`routes/finances.php`)
```
GET    /finances                        → FinanceController@summary
GET    /expenses                        → ExpenseController@index
POST   /expenses                        → ExpenseController@store
PUT    /expenses/{expense}              → ExpenseController@update
DELETE /expenses/{expense}              → ExpenseController@destroy
GET    /expense-templates               → ExpenseTemplateController@index
POST   /expense-templates               → ExpenseTemplateController@store
PUT    /expense-templates/{template}    → ExpenseTemplateController@update
DELETE /expense-templates/{template}    → ExpenseTemplateController@destroy
```

**RBAC:** admin + encargado únicamente. `vendedor` no tiene acceso.

---

#### Frontend

**`resources/js/pages/finances/index.tsx`** — Dashboard P&L
- Selector de período: Este mes / Mes anterior / Este año / Personalizado
- Banner amarillo si `has_cogs_warning`: *"El costo de ventas anteriores al [fecha migración] es estimado"*
- Fila de KPIs (4 tarjetas grandes):
  - Ingresos netos (azul)
  - Ganancia bruta + % margen (verde)
  - Total gastos (naranja)
  - **Ganancia neta** (verde si positiva / rojo si negativa) ← la más importante
- Estado de resultados resumido (formato vertical como el ejemplo del negocio)
- Gráfico de barras: tendencia 6 meses (ingresos / costo / gastos / neto)
- Tabla: Desglose de gastos por categoría (icono, nombre, monto, % del total)
- Tabla colapsable: Top 10 productos por margen bruto

**`resources/js/pages/expenses/index.tsx`** — Lista de gastos
- Banner de plantillas pendientes: *"Tienes 3 gastos fijos sin registrar para marzo — Registrar ahora"* → abre modal
- Tabla paginada con filtros: categoría, sucursal, rango de fechas
- Botón "Registrar gasto" → modal de gasto único
- Columnas: Fecha, Categoría (badge), Descripción, Monto, Origen (Fijo/Único), Acciones

**Modal `RegisterMonthlyExpensesModal`** — para plantillas pendientes
- Lista de plantillas con monto pre-llenado del `reference_amount`
- Cada fila es editable (CurrencyInput) antes de confirmar
- Checkbox para omitir una plantilla si ese mes no aplica
- Botón "Confirmar gastos del mes"

**Modal `CreateExpenseModal`** — para gasto único
- Categoría (select), Descripción, Monto (CurrencyInput), Fecha, Notas

**`resources/js/pages/expenses/templates.tsx`** — Gestión de plantillas
- Tabla de plantillas activas: Nombre, Categoría, Monto referencia, Acciones
- Modal para crear/editar plantilla
- Toggle activar/desactivar

**Sidebar** — agregar bajo "Reportes":
- `TrendingUp` icon → "Finanzas" → `/finances`
- `Receipt` icon → "Gastos" → `/expenses`

---

#### Consideraciones importantes

| Punto | Decisión |
|-------|----------|
| COGS datos históricos | Fallback a `products.purchase_price` actual para ventas sin snapshot. Mostrar nota en UI: *"El costo de ventas anteriores al [fecha] es estimado"* |
| Devoluciones | Restar del revenue las devoluciones del período (`sale_returns.total`) |
| Descuentos | `sales.total` ya incluye descuentos aplicados → el revenue es el neto cobrado |
| Multi-sucursal | El admin ve todas las sucursales; encargado ve solo la suya |
| Gastos compartidos | No se prorratean entre sucursales — se registran en la sucursal que corresponde |
| Exportación | PDF y Excel del estado de resultados (igual que los otros reportes) |

---

### F2 — Transferencia de stock entre sucursales
**Prioridad: Alta**

No existe mecanismo para mover inventario entre sucursales de forma auditable.

**Implementación:**
- Tabla `stock_transfers`: `id, origin_branch_id, destination_branch_id, requested_by, status (draft/confirmed/cancelled), notes, timestamps`
- Tabla `stock_transfer_items`: `transfer_id, product_id, quantity`
- Sección "Transferencias" en inventario (admin + encargado)
- Al confirmar: `DB::transaction()` descuenta de origen e incrementa en destino
- Registrar en `stock_movements` como `transfer_out` / `transfer_in`
- Cancelación post-confirmación genera movimiento inverso

---

### F5 — Auditoría de cambios en ventas
**Prioridad: Alta**

Un admin puede modificar o cancelar ventas sin dejar rastro.

**Implementación:**
- Evaluar `spatie/laravel-activity-log` o tabla propia `sale_audit_log`
- Campos: `sale_id, user_id, action, field_changed, old_value, new_value, ip_address, created_at`
- Registrar cambios de: estado, total, método de pago, ítems
- Sección "Auditoría" en `sales/show.tsx` (solo admin)

---

### F4 — Historial de precios de productos
**Prioridad: Media**

Cambios de precio no dejan rastro.

**Implementación:**
- Tabla `product_price_history`: `id, product_id, field (sale_price|purchase_price), old_value, new_value, changed_by, changed_at`
- Observer `ProductObserver` en evento `updating`
- Sección colapsable "Historial de precios" en `products/show.tsx` (admin + encargado)

---

### F6 — Impresión de etiquetas de precio / código
**Prioridad: Media**

**Implementación:**
- Botón "Imprimir etiqueta" en ficha de producto (admin + encargado)
- Etiqueta: nombre, precio COP, código, QR/barcode
- Compatible con impresora 58mm vía QZ Tray
- Opcional: selección múltiple → "Imprimir etiquetas seleccionadas"

---

### F7 — Alerta de sesión de caja abierta demasiado tiempo
**Prioridad: Alta**

**Implementación:**
- Si `session.opened_at` > 10 horas: banner amarillo no bloqueante en el POS
- Texto: *"La caja lleva más de 10 horas abierta. ¿Olvidaste cerrar el turno?"*
- Dismiss en `sessionStorage`

---

### F8 — Confirmación de discrepancia alta al cerrar caja
**Prioridad: Media**

**Implementación:**
- Si discrepancia > $50.000 COP o > 5% del total en efectivo: modal de confirmación
- Campo `discrepancy_confirmed: boolean` en `cash_sessions`
- Umbral configurable en `business_settings` → `cash_discrepancy_threshold`

---

---

### F12 — Módulo de Créditos y Pagos Diferidos
**Prioridad: Alta**

Permite al negocio gestionar ventas que no se pagan en su totalidad en el momento — separados, cuotas, pagos en fecha acordada y reservas sin abono.

---

#### Modalidades soportadas

| Modalidad | ¿Se entrega el producto? | ¿Genera venta? | Reconocimiento de ingreso |
|-----------|--------------------------|----------------|--------------------------|
| `layaway` — Separado | Solo al pagar el 100% | Al completar el pago | Al completar el pago |
| `installments` — Cuotas | Inmediatamente | Al crear el crédito | Al entregar (día 1, total) |
| `due_date` — Fecha acordada | Inmediatamente | Al crear el crédito | Al entregar (día 1, total) |
| `hold` — Reservado | Solo al pagar | Al completar el pago | Al completar el pago |

---

#### Modelo contable por modalidad

**Separado y Reservado — ingreso diferido**
- Los abonos parciales son *anticipos*, no ingresos. No aparecen en el P&L hasta cerrar la venta.
- El stock queda *reservado* (no descontado) hasta el pago total.
- Cada abono sí entra a la sesión de caja como `cash_in` (es dinero real que llega).
- Al completar el pago: se crea la `Sale`, se descuenta el stock, el ingreso aparece en el P&L.

**Cuotas y Fecha acordada — ingreso inmediato + cartera por cobrar**
- La `Sale` se crea el día 1 con el total completo → el ingreso aparece en el P&L desde ese momento.
- El stock se descuenta inmediatamente.
- El balance pendiente queda registrado como *cartera por cobrar* en el módulo de finanzas.
- Cada abono posterior: entra a caja como `cash_in` y reduce la cartera, pero no vuelve a sumar al P&L (ya se registró).
- Esto refleja la realidad: el negocio vendió, entregó el producto, y tiene un derecho de cobro pendiente.

**Impacto en el módulo de Finanzas (P&L)**
- Nueva sección "Cartera por cobrar" — suma de balances pendientes de créditos `installments`/`due_date` activos.
- El P&L existente no cambia — los ingresos de ventas de crédito se mezclan con ventas normales.
- Diferenciador visual: las ventas con origen en crédito llevan un badge "Crédito" en el historial.

**Impacto en Sesión de Caja**
- Todo abono (`credit_payment`) genera un `cash_movement` de tipo `cash_in` vinculado a la sesión activa del usuario.
- El campo `reference_type = 'credit_payment'` y `reference_id = credit_payment.id` permite trazabilidad completa.
- En el cierre de caja, los abonos aparecen desglosados como "Abonos de crédito" separados de ventas normales.

---

#### Modelo de datos

**`credit_sales`** — registro principal del crédito
```
id, sale_id (nullable — se crea al completar para layaway/hold),
client_id, branch_id, seller_id,
type (enum: layaway/installments/due_date/hold),
total_amount, amount_paid, balance,
installments_count (nullable), installment_amount (nullable),
due_date (nullable), notes,
status (enum: active/completed/cancelled),
created_at, updated_at
```

**`credit_payments`** — cada abono registrado
```
id, credit_sale_id, amount, payment_method_id, notes,
registered_by (user_id), payment_date,
cash_movement_id (FK → cash_movements — trazabilidad caja),
created_at
```

**`credit_sale_items`** — snapshot de productos al crear el crédito
```
id, credit_sale_id, product_id, product_name, quantity, unit_price, subtotal
```

**Columna adicional en `products`**
```
reserved_stock INT DEFAULT 0  -- unidades apartadas en separados/reservas activos
```

**Columna adicional en `sales`**
```
credit_sale_id (nullable FK) -- vincula la venta al crédito que la originó
```

**Columna adicional en `cash_movements`**
```
reference_type VARCHAR(50) nullable  -- 'credit_payment'
reference_id   BIGINT nullable       -- FK al abono correspondiente
```

---

#### Flujo por modalidad

**Separado (layaway)**
1. Vendedor registra productos, total y abono inicial (mínimo $0).
2. `reserved_stock` aumenta en `products`. Stock real no cambia.
3. POS y stock normal solo pueden vender `stock - reserved_stock`.
4. Cada abono → `credit_payment` + `cash_movement (cash_in)` en sesión activa.
5. `balance = 0` → se crea `Sale` completa, `stock` se descuenta, `reserved_stock` se libera, ingreso aparece en P&L.

**Cuotas (installments)**
1. Se crea la `Sale` inmediatamente → ingreso completo en P&L, stock descontado.
2. El sistema calcula N fechas de cuota a partir de hoy (mensual por defecto).
3. `credit_sale.balance = total` inicialmente.
4. Cada abono → `credit_payment` + `cash_movement (cash_in)`, balance se reduce.
5. `balance = 0` → crédito `completed`. La venta ya existía desde el paso 1.

**Fecha acordada (due_date)**
1. Se crea la `Sale` inmediatamente → ingreso en P&L, stock descontado.
2. Una sola fecha límite de pago.
3. Sin cuotas intermedias — el vendedor registra el pago cuando el cliente cancela.
4. Si pasa la fecha y `balance > 0` → crédito marcado como "Vencido".

**Reservado (hold)**
1. Solo se guardan productos. Sin abono. Sin fecha.
2. `reserved_stock` aumenta. Sin `Sale`.
3. El vendedor registra el pago completo cuando el cliente regresa.
4. Al pagar → igual que separado: `Sale` creada, stock descontado, reserva liberada.

---

#### Backend

**Migraciones**
- `create_credit_sales_table`
- `create_credit_payments_table`
- `create_credit_sale_items_table`
- `add_reserved_stock_to_products_table`
- `add_credit_sale_id_to_sales_table`
- `add_reference_to_cash_movements_table`

**Modelos:** `CreditSale`, `CreditPayment`, `CreditSaleItem`
- `CreditSale::availableBalance()` → `total_amount - amount_paid`
- `CreditSale::isOverdue()` → `due_date < today && status = active`
- `CreditSale::complete()` → DB transaction: crea `Sale`, descuenta stock, libera `reserved_stock`, marca `completed`
- `CreditSale::cancel()` → libera `reserved_stock`, marca `cancelled`

**Servicio:** `CreditPaymentService::register(CreditSale, amount, method, user)`
1. Valida que `amount <= balance`.
2. Crea `CreditPayment`.
3. Actualiza `credit_sales.amount_paid` y `balance`.
4. Crea `CashMovement (cash_in)` vinculado al abono y a la sesión activa.
5. Si `balance = 0` y tipo `layaway/hold` → llama `CreditSale::complete()`.
6. Si `balance = 0` y tipo `installments/due_date` → solo marca `completed`.
7. Todo en una sola transacción DB.

**Controlador:** `CreditSaleController`
- `index()` — listado con filtros (sucursal, estado, tipo, cliente)
- `store()` — crea crédito + reserva stock si aplica + crea Sale si es installments/due_date
- `show()` — detalle con historial de pagos y cuotas pendientes
- `addPayment()` → delega a `CreditPaymentService`
- `cancel()` — solo admin/encargado; libera stock
- `receivables()` — endpoint para el widget de cartera en Finanzas

**Reglas de negocio**
- `stock - reserved_stock` es el stock disponible real para el POS.
- Solo admin/encargado puede cancelar un crédito activo.
- Un abono no puede superar el balance restante.
- Si no hay sesión de caja abierta y `require_cash_session = true` → bloquear abono (igual que una venta normal).
- Crédito de servicio (`type = servicio`): permitido, sin reserva de stock.

---

#### Frontend

**Sidebar:** `CreditCard` icon — "Créditos" (vendedor, encargado, admin)
- Badge con conteo de créditos vencidos

**Páginas:**
- `/credits` — listado con tabs: **Activos** / **Vencidos** / **Completados** / **Todos**
  - Cada fila: cliente, modalidad, total, abonado, saldo pendiente, fecha límite/cuota, estado
- `/credits/create` — wizard en 3 pasos:
  1. Seleccionar cliente + modalidad
  2. Agregar productos (mismo buscador del POS)
  3. Configurar condiciones (abono inicial, N cuotas o fecha límite) → confirmar
- `/credits/{id}` — detalle completo:
  - Info del crédito + productos
  - Barra de progreso: abonado / total
  - Historial de abonos con fecha, monto, método y quién registró
  - Botón "Registrar abono"
  - Botón "Cancelar crédito" (solo admin/encargado)
- Modal "Registrar abono" — monto, método de pago, notas, confirmar

**Módulo de Finanzas — nuevos elementos:**
- Widget "Cartera por cobrar": suma de balances de créditos `installments`/`due_date` activos, desglosado por sucursal
- En el cierre de caja: sección "Abonos recibidos" desglosada de las ventas normales
- Historial de ventas: badge "Crédito" en ventas originadas por el módulo

**POS integration:**
- Al completar una venta → opción adicional al botón "Cobrar": **"Registrar como crédito"**
- Abre un mini-modal para seleccionar modalidad y condiciones sin salir del POS

**Alertas visuales:**
- Badge rojo "Vencido" — `due_date` pasada y `balance > 0`
- Badge amarillo "Vence en X días" — próximos 3 días
- Contador en sidebar: número de créditos vencidos

---

#### Casos borde
- **Devolución** en crédito activo: no permitida — se debe cancelar el crédito completo.
- **Descuento**: se aplica sobre `total_amount` al crear. No se distribuye por cuota.
- **Impresión**: recibo al crear el crédito + comprobante por cada abono (vía QZ Tray).
- **Crédito de servicio**: sin `reserved_stock`, flujo idéntico al de productos.
- **Stock insuficiente** al crear cuotas/fecha acordada: validar antes de crear la `Sale`.
- **Cancelación con abonos ya registrados**: los `cash_movements` permanecen (el dinero entró a caja). Se registra una nota de devolución manual.

---

**Estado:** 🔲 Pendiente de implementación

---

## Roadmap futuro

| Feature | Descripción |
|---------|-------------|
| Descuentos escalonados / por volumen | Precio diferente según cantidad comprada |
| ~~Cuentas por cobrar~~ | Cubierto por F12 — Créditos y Pagos Diferidos |
| Órdenes de compra (PO) | Documento formal de compra vinculado a proveedor y entrada de stock |
| Factura electrónica DIAN | Requisito legal Colombia — integración con proveedor autorizado |
| Split payment | Pago dividido en múltiples métodos en una misma venta |
| PWA / app móvil | Para vendedores en campo, con soporte offline básico |
| Búsqueda full-text (Meilisearch) | Para catálogos grandes (+10.000 productos) |
| Lector de barras USB/Bluetooth | Sin necesidad de teclado en el POS |
| Customer-facing display | Pantalla del cliente mostrando el carrito en tiempo real |
| Receipt email/SMS | Envío del recibo digital al cliente tras la venta |
| Impresión de etiquetas masiva (Zebra) | Integración con impresoras de etiquetas dedicadas |
| Balance diario por sucursal | Efectivo esperado en caja al cierre del día |

---

## Resumen de auditorías completadas

### Pre-producción (28 hallazgos — 2026-03-21)
- **Seguridad (7):** 6 corregidos + 1 descartado (categorías globales por diseño)
- **Integridad de datos (6):** 4 corregidos + 2 falsos positivos verificados
- **Robustez (4):** 3 corregidos + 1 descartado (blob upload no atómico por diseño)
- **Rendimiento (7):** 7 corregidos (índices DB, N+1, caché, streaming CSV)
- **Calidad de código (4):** 4 corregidos (ReportController refactorizado de 2753 → 540 líneas)

### UX/UI (28 hallazgos — 2026-03-18)
- 3 críticos + 13 importantes + 12 menores — todos completados

### Tests automatizados (2026-03-23)
- **Backend (Pest PHP):** 117 tests, 325 assertions — 15 archivos de test + 6 factories
- **Frontend (Vitest):** 69 tests — 8 archivos cubriendo lib, hooks y componentes
- **Larastan:** 0 errores · **TypeScript:** 0 errores · **ESLint:** 0 errores
 