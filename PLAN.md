# Stokity v2 — Plan de Trabajo

> Última actualización: 2026-03-23

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

## Roadmap futuro

| Feature | Descripción |
|---------|-------------|
| Descuentos escalonados / por volumen | Precio diferente según cantidad comprada |
| Cuentas por cobrar | Ventas a crédito con seguimiento de pagos parciales |
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




precio de compra vs precio de venta deberia mostrar ganancia neta

ejemplo : el cliente quiere un reporte de estadistica de la ganancia neta para que pueda saber gastos y ganancias para que pueda distribuir gastos de distintas cosas, empleados etc , por ejemplo saber cuanto le queda al mes para reinvertir, pago de empleados etc 