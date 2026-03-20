# Stokity v2 — Plan de Trabajo

> Última actualización: 2026-03-18
> Historial de revisiones: `REVIEW.md` (lógica de negocio) · `UX-REVIEW.md` (UX/UI)

---

## Estado del sistema

| Módulo | Estado |
|--------|--------|
| POS core (ventas, productos, clientes) | ✅ Funcional |
| Multi-sucursal + RBAC | ✅ Funcional |
| Métodos de pago dinámicos | ✅ Funcional |
| Devoluciones | ✅ Funcional |
| Impresión térmica ESC/POS (QZ Tray) | ⚠️ Funcional — bug activo en corte (ver abajo) |
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
| UX improvements (28 hallazgos) | ✅ Completo |
| Tests automatizados | ❌ Vacío |

---

## 🐛 Bug activo — Recibo térmico cortado en la parte superior

**Severidad: Alta · Impresora: POS-5890U-L (58mm, 203 DPI, USB)**
**Archivos:** `app/Http/Controllers/PrintController.php`, `resources/js/services/qzTray.ts`

**Síntoma:** El primer recibo tras encender la impresora sale perfecto. A partir del segundo, el encabezado queda dentro de la impresora después del corte.

**Causa raíz:** La impresora mantiene estado interno entre trabajos USB. Los comandos ESC \* (logo, QR, barcode) dejan el `line spacing` corrupto. ESC @ resetea el estado pero retrae el papel ~20-30mm hacia adentro.

**Estado actual del código:**
```php
// createPrinter(): ESC @ incluido via constructor de Printer
// printBusinessHeader(): 20 × ESC J 24 = 480 dots ≈ 60mm de compensación
// cutReceipt(): 8 × ESC J 24 + GS V 66 3 (CUT_PARTIAL)
```

**Hipótesis pendientes de probar en producción (Railway):**

- **H1:** `GS V 66 3` puede retraer el papel post-corte. Probar con `GS V 1` (corte simple sin auto-feed): `$conn->write("\x1d\x56\x01")`
- **H4:** Usar `GS V 65 n` (full cut + n dots extra) para que el corte posicione el papel correctamente: `$conn->write("\x1d\x56\x41\xc0")` (n=192 dots = 24mm)
- **H5 (más prometedora):** ESC @ + ESC J generoso **Y** `GS V 65 n` con n grande — elimina dependencia del feed al inicio del siguiente recibo

---

## 🔒 Bugs de seguridad / datos

### B3 — Cierre ciego expone `expectedCash` al frontend
**Archivo:** `app/Http/Controllers/CashSessionController.php` → `closeForm()`

El modo blind close para vendedores no debe ver el efectivo esperado, pero `expectedCash` se envía en los props de Inertia y es visible en DevTools.

**Fix:** Cuando `$isBlind === true`, no incluir `expectedCash` en los props. Calcular la discrepancia únicamente en el backend al recibir el cierre.

NOTA: esto solo para vendedores
---

### ✅ B2 — Sin rate limiting en búsqueda de productos *(resuelto)*
`throttle:60,1` agregado a `GET /api/products/search` en `routes/products.php`.

---

### ✅ B1 — Modal de recibo de devolución no resetea `returnId` al cerrar *(resuelto)*
`onOpenChange` en `sales/show.tsx` ahora resetea a `{ open: false, returnId: undefined }` al cerrar.

---

## 📋 Funcionalidades pendientes

### ✅ F0 — Auto-formato de inputs monetarios (COP)
**Prioridad: Alta | Estado: Completo**

Todos los inputs que reciben valores en pesos colombianos muestran el número crudo (ej. `123000`). Deben formatearse automáticamente con separador de miles mientras el usuario escribe (ej. `123.000`), siguiendo el locale `es-CO`.

**Inputs afectados (inventario inicial):**
- POS → fondo inicial al abrir caja (`openingAmount`)
- POS → ingresos/egresos de caja (`movementAmount`)
- Cierre de caja → monto declarado y denominaciones (`closing_amount_declared`, `denomCounts`, `coins`)
- Productos → precio de venta y precio de compra (`sale_price`, `purchase_price`)
- Clientes → descuento especial cuando se implemente F1
- Cualquier campo `type="number"` que represente COP en formularios del sistema

**Implementación sugerida:**
- Crear hook `useCurrencyInput(initialValue?)` que retorne `{ displayValue, numericValue, onChange }`:
  - `displayValue`: string formateado con puntos (`123.000`)
  - `numericValue`: número puro para enviar al backend (`123000`)
  - `onChange`: handler que acepta el evento, limpia caracteres no numéricos y re-formatea
- El input debe ser `type="text"` con `inputMode="numeric"` (evita las flechas de number y el comportamiento nativo que interfiere con el formato)
- Al hacer focus: opcionalmente mostrar solo el número sin formato para facilitar edición
- Al perder focus (blur): siempre mostrar con formato

---

### C3 — Motivo de devolución no requerido
**Prioridad: Alta**

El campo `reason` es nullable, imposibilitando análisis de causas de devolución.

**Fix backend:** `'reason' => 'required|string|max:500'` en `SaleReturnController`.

**Fix frontend (`SaleReturnForm.tsx`):** Reemplazar textarea libre por selector con opciones:
- Defecto de fábrica
- Producto incorrecto entregado
- Producto vencido o en mal estado
- Cliente cambió de opinión
- Error en el precio cobrado
- Otro → campo de texto obligatorio adicional

NOTA: No necesario
---

### F1 — Descuentos por cliente (precio especial / mayorista)
**Prioridad: Alta**

No hay forma de marcar clientes mayoristas con descuento automático. El vendedor tiene que aplicarlo a mano en cada venta.

**Implementación:**
- Columna `discount_pct DECIMAL(5,2) DEFAULT NULL` en `clients`
- Campo "Descuento especial (%)" en crear/editar cliente (solo admin y encargado)
- En POS: al seleccionar cliente con `discount_pct`, aplicar automáticamente en el campo de descuento
- Badge en el POS: *"Cliente VIP — 15% dto."* junto al nombre del cliente
- El vendedor puede ver pero no aumentar el descuento por encima del configurado

---

### F2 — Transferencia de stock entre sucursales
**Prioridad: Alta**

No existe mecanismo para mover inventario entre sucursales de forma vinculada y auditable.

**Implementación:**
- Nueva tabla `stock_transfers`: `id, origin_branch_id, destination_branch_id, requested_by, status (draft/confirmed/cancelled), notes, timestamps`
- Nueva tabla `stock_transfer_items`: `transfer_id, product_id, quantity`
- Sección "Transferencias" en el módulo de inventario (admin + encargado)
- Al confirmar: `DB::transaction()` descuenta de origen e incrementa en destino
- Registrar en `stock_movements` como `transfer_out` / `transfer_in` con `reference` = ID de la transferencia
- Cancelación post-confirmación genera movimiento inverso

---

### F4 — Historial de precios de productos
**Prioridad: Media**

Cambios de precio no dejan rastro: quién lo cambió, cuándo, y cuánto era antes.

**Implementación:**
- Nueva tabla `product_price_history`: `id, product_id, field (sale_price|purchase_price), old_value, new_value, changed_by, changed_at`
- Observer `ProductObserver` en evento `updating` cuando cambia `sale_price` o `purchase_price`
- Sección colapsable "Historial de precios" en `products/show.tsx` (solo admin + encargado)

---

### F5 — Auditoría de cambios en ventas
**Prioridad: Alta**

Un admin puede modificar o cancelar ventas sin dejar rastro. Abre la puerta a fraude interno.

**Implementación:**
- Evaluar `spatie/laravel-activity-log`; si es excesivo, tabla propia `sale_audit_log`
- Campos: `sale_id, user_id, action, field_changed, old_value, new_value, ip_address, created_at`
- Registrar cambios de: estado, total, método de pago, ítems
- Sección "Auditoría" en `sales/show.tsx` (solo admin)

---

### F6 — Impresión de etiquetas de precio / código
**Prioridad: Media**

Al cambiar precios, el encargado debe imprimir etiquetas en otro sistema externo.

**Implementación:**
- Botón "Imprimir etiqueta" en ficha de producto (admin + encargado)
- Etiqueta: nombre del producto, precio en COP, código, QR/barcode
- Compatible con impresora térmica 58mm vía QZ Tray (misma infraestructura que `GET /print/receipt/{id}`)
- Opcional: selección múltiple en listado → "Imprimir etiquetas seleccionadas"

---

### F7 — Alerta de sesión de caja abierta demasiado tiempo
**Prioridad: Media**

Un vendedor puede olvidar cerrar la caja. No hay señal visual de que algo está mal.

**Implementación:**
- Al cargar el POS: si `session.opened_at` tiene más de 10 horas, mostrar banner amarillo no bloqueante
- Texto: *"La caja lleva más de 10 horas abierta. ¿Olvidaste cerrar el turno anterior?"* + link al cierre
- Persistir dismiss en `sessionStorage` para no repetirse en la misma sesión de navegador

---

### F8 — Confirmación de discrepancia alta al cerrar caja
**Prioridad: Media**

Errores de digitación en el conteo de cierre se guardan sin advertencia.

**Implementación:**
- Si discrepancia > $50.000 COP o > 5% del total en efectivo (lo que sea mayor): modal de confirmación antes de enviar
- Texto: *"La diferencia de cierre es de $X. ¿Confirmas que el conteo es correcto?"* + botones "Revisar" / "Confirmar"
- Campo `discrepancy_confirmed: boolean` en `cash_sessions` para auditabilidad
- Umbral configurable desde `business_settings` → campo `cash_discrepancy_threshold`

---

## 🔧 Calidad y mantenibilidad

| Tarea | Prioridad | Descripción |
|-------|-----------|-------------|
| **Tests automatizados** | Alta | Flujos críticos con Pest PHP: crear venta, validar stock, devolución, abrir/cerrar caja |
| **Refactorizar ReportController** | Media | +2000 líneas, excluido de Larastan. Dividir en `SalesReportService`, `StockReportService`, etc. |
| **Caché de datos estáticos** | Media | Métodos de pago, categorías y configuración del negocio: `Cache::remember()` con TTL 5 min |
| **Índices DB** | Media | Índice compuesto `(status, created_at)` en `sales` para acelerar queries de reportes |

---

## 🗺️ Roadmap futuro

| Feature | Descripción |
|---------|-------------|
| Descuentos escalonados / por volumen | Precio diferente según cantidad comprada |
| Cuentas por cobrar | Ventas a crédito con seguimiento de pagos parciales |
| Órdenes de compra (PO) | Documento formal de compra vinculado a proveedor y entrada de stock |
| Impresión de etiquetas masiva | Integración con impresoras de etiquetas (Zebra, etc.) |
| Factura electrónica DIAN | Requisito legal Colombia — integración con proveedor autorizado |
| Balance por sucursal | Efectivo esperado en caja al cierre del día por sucursal |
| Split payment | Pago dividido en múltiples métodos en una misma venta |
| PWA / app móvil | Para vendedores en campo, con soporte offline básico |
| Búsqueda full-text | Meilisearch para catálogos grandes (+10.000 productos) |
| Lector de barras USB/Bluetooth | Sin necesidad de teclado en el POS |
| Customer-facing display | Pantalla del cliente mostrando el carrito en tiempo real |
| Receipt email/SMS | Envío del recibo digital al cliente tras la venta |
