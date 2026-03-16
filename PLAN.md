# Stokity v2 — Plan de Trabajo

> Última actualización: Marzo 2026

---

## Estado del sistema

| Módulo | Estado |
|--------|--------|
| POS core (ventas, productos, clientes) | ✅ Funcional |
| Multi-sucursal + RBAC | ✅ Funcional |
| Métodos de pago dinámicos | ✅ Funcional |
| Devoluciones | ✅ Funcional |
| Impresión térmica ESC/POS (QZ Tray) | ✅ Funcional (ver bug pendiente) |
| Validación de stock al vender | ✅ Funcional |
| Configuración del negocio (logo, NIT, etc.) | ✅ Funcional |
| Almacenamiento de imágenes (Vercel Blob + WebP) | ✅ Funcional |
| Búsqueda en tiempo real (POS + productos) | ✅ Funcional |
| Descuentos y notas en ventas | ✅ Funcional |
| Historial de compras del cliente | ✅ Funcional |
| Apertura/Cierre de Caja (turnos) | ✅ Funcional |
| Cotizaciones / ventas pendientes | ✅ Funcional |
| Botones de efectivo rápido en POS | ✅ Funcional |
| Reportes + exportación PDF/Excel | ✅ Funcional |
| Análisis estático (Larastan nivel 5) | ✅ 0 errores |
| Tests automatizados | ❌ Vacío |

---

## Bug pendiente

### Recibo térmico: corte deja parte superior dentro de la impresora
**Severidad: Alta — sin solución funcional hasta la fecha (2026-03-16)**

**Síntoma confirmado:** El primer recibo tras encender la impresora se imprime perfecto. A partir del segundo recibo, el encabezado ("Lú Accesorios" + separador) queda dentro de la impresora y no es visible. El problema se agrava cuando el recibo incluye QR o barcode.

**Impresora de referencia:** POS-5890U-L (58mm, 203 DPI, ESC/POS, USB)

**Archivos relevantes:** `app/Http/Controllers/PrintController.php`, `resources/js/services/qzTray.ts`

---

#### Diagnóstico técnico

- **Zona muerta (dead zone):** La impresora tiene ~20-25mm de distancia entre el cabezal de impresión y la cuchilla. Después de un corte, el borde del papel queda en la cuchilla. Al iniciar el siguiente recibo, ese espacio de 20-25mm queda oculto dentro de la impresora.

- **Causa raíz identificada:** La impresora **mantiene estado interno entre trabajos USB** (line spacing, modo gráfico ESC \*). Los comandos ESC \* (usados para imprimir logos, QR y barcodes) dejan el `line spacing` corrupto para el siguiente trabajo. Esto hace que los feeds del siguiente recibo no avancen el papel la cantidad esperada.

- **Comportamiento del corte:** El comando `GS V 0` (corte sin auto-feed) y `GS V 66 3` (corte con auto-feed pequeño) no producen diferencia observable. El corte en sí funciona correctamente.

- **ESC @ (initialize):** Resetea el estado completamente, pero también **retrae el papel ~20-30mm** hacia adentro de la impresora, empeorando el problema si no se compensa con suficiente feed posterior.

---

#### Intentos fallidos (en orden cronológico)

1. **Feed grande ANTES del corte con `$p->text("\n"×N)`:** Dependía del `line spacing`. Si el spacing estaba corrupto por ESC \* del mismo recibo (QR/barcode), las líneas avanzaban menos de lo esperado. Sin QR funcionaba, con QR no.

2. **`feedPastDeadZone()` con raw ESC 2 + `str_repeat(" \n", 12)`:** Se forzó ESC 2 directamente en el conector. No solucionó el problema con QR/barcode. El printer parece ignorar o malinterpretar ESC 2 después de ESC \*.

3. **Feed post-corte (después del `GS V 0`):** La impresora descarta los bytes que recibe durante la acción mecánica del corte. El feed nunca se ejecuta.

4. **ESC J (feed absoluto en dots) en el margen superior:** ESC J no depende del line spacing, pero la impresora también lo ignora cuando el estado del trabajo anterior fue ESC \*. Probado con 10×ESC J 24 = 30mm y sigue fallando.

5. **ESC 3 n (line spacing explícito) en vez de ESC 2:** Mismo resultado. El printer parece estar en un modo donde ignora ciertos comandos entre trabajos.

6. **Estructura "corte + feed post-corte":** Los bytes post-corte se descartan durante el mecanismo físico del corte. No funciona.

7. **ESC @ + ESC J×20 = 60mm (estado actual del código):** ESC @ resetea el estado (resuelve la corrupción del trabajo anterior), y 20×ESC J 24 = 480 dots = 60mm compensa la retracción de ESC @ más la zona muerta. **El primer recibo sale perfecto, pero el segundo sigue cortado.** Causa probable: el `GS V 0` o `$p->cut()` que se usa al final puede retraer el papel después del corte en esta impresora específica.

---

#### Estado actual del código (`PrintController.php`)

```php
// createPrinter(): NO limpia el buffer — el ESC @ del constructor se envía al printer
private function createPrinter(DummyPrintConnector $connector): Printer
{
    return new Printer($connector); // ESC @ incluido
}

// printBusinessHeader(): compensa retracción + dead zone con ESC J
for ($i = 0; $i < 20; $i++) {
    $conn->write("\x1b\x4a\x18"); // 20 × ESC J 24 = 480 dots ≈ 60mm
}

// cutReceipt(): feed pre-corte + corte estándar
for ($i = 0; $i < 8; $i++) {
    $conn->write("\x1b\x4a\x18"); // 8 × ESC J 24 = 192 dots ≈ 24mm
}
$p->cut(Printer::CUT_PARTIAL); // GS V 66 3
```

---

#### Hipótesis pendientes de probar

- **H1:** El `$p->cut()` (GS V 66 3) en esta impresora puede estar retrayendo el papel después del corte. Probar con `GS V 1` (corte parcial simple, sin auto-feed): `$conn->write("\x1d\x56\x01")`.

- **H2:** El driver macOS/Windows puede estar añadiendo ESC @ antes del job a pesar de `altPrinting: true, forceRaw: true` en QZ Tray. Probar capturando los bytes reales que recibe la impresora con un sniffer USB.

- **H3:** La impresora tiene un comportamiento propietario no documentado en el manual ESC/POS estándar. Revisar el manual específico del POS-5890U-L si está disponible.

- **H4:** Usar `GS V 65 n` (full cut con auto-feed a cuchilla + n dots extra). El valor de n se ajusta para cubrir la zona muerta del siguiente recibo: `$conn->write("\x1d\x56\x41\xc0")` (n=192 dots = 24mm extra).

- **H5 (más prometedora):** Combinar ESC @ + ESC J generoso **Y** usar `GS V 65 n` con n grande para que el corte en sí posicione el papel correctamente para el siguiente recibo, eliminando la dependencia del ESC J al inicio.

---

## Problemas críticos (afectan operación real)

### ~~C1 — Race condition en stock con ventas simultáneas~~ ✅ Resuelto
**Severidad: Alta**

Dos vendedores en sucursales distintas (o en la misma) pueden vender el último producto al mismo tiempo. El flujo actual hace una lectura de stock ANTES de la transacción (`foreach` con `Product::find()`) y luego descuenta dentro del `DB::transaction()`. Entre esas dos lecturas, otro proceso puede vender el mismo producto. El resultado es stock negativo en la base de datos y un movimiento incorrecto en `stock_movements`.

**Archivos afectados:**
- `app/Http/Controllers/SaleController.php` — método `store()` y método `completePending()`

**Fix a implementar:**
- Dentro del `DB::transaction()`, al momento de descontar el stock, usar `Product::lockForUpdate()->find($id)` para adquirir un bloqueo de fila a nivel de base de datos. MySQL garantiza que ninguna otra transacción puede leer o modificar esa fila hasta que la transacción actual termine (commit o rollback).
- Verificar nuevamente el stock disponible DENTRO de la transacción (no solo en el pre-check exterior). Si el stock ya no alcanza, lanzar una excepción para que la transacción haga rollback y retornar el error al usuario con el nombre del producto y el stock disponible real.
- El pre-check exterior (líneas 146-159) puede mantenerse como validación rápida de UX, pero NO como garantía de integridad — esa garantía la da el `lockForUpdate` interno.
- Aplicar el mismo patrón en `completePending()` ya que tiene la misma vulnerabilidad al convertir una cotización en venta.

---

### ✅ C2 — Devoluciones duplicadas sin protección
**Resuelto (2026-03-16)**

**Frontend:** `SaleReturnForm.tsx` ya tenía `loading` state que deshabilita el botón submit durante el request — protege contra doble clic.

**Backend (`SaleReturnController::store()`):**
- **Deduplicación:** antes de crear la devolución, busca un `SaleReturn` para esa venta en los últimos 30 segundos con los mismos `product_id` y `quantity`. Si existe, retorna `back()->with('success', ...)` silenciosamente (idempotente).
- **`lockForUpdate()`** en `Product::find()` dentro de la transacción — mismo patrón que C1.
- Migrado de `DB::beginTransaction/commit/rollBack` manual a `DB::transaction()` callback.
- Excepciones: `\RuntimeException` en lugar de `\Exception` genérica.

---

### C3 — Motivo de devolución no es requerido - No Necesario para procesar la devolución, pero crítico para análisis de datos
**Severidad: Alta**

El campo `reason` en la tabla `sale_returns` es `nullable`. Sin motivo registrado, el administrador no puede analizar qué está fallando: ¿son productos defectuosos?, ¿errores del vendedor al cobrar?, ¿cambios de opinión del cliente? Es imposible tomar decisiones de compra o de proceso basadas en los datos.

**Fix a implementar:**

*Backend (`app/Http/Controllers/SaleReturnController.php`):*
- Cambiar la validación de `reason` a `'reason' => 'required|string|max:500'`.

*Frontend — modal de devolución:*
- Reemplazar el campo de texto libre actual por un selector con opciones predefinidas:
  - *Defecto de fábrica*
  - *Producto incorrecto entregado*
  - *Producto vencido o en mal estado*
  - *Cliente cambió de opinión*
  - *Error en el precio cobrado*
  - *Otro*
- Si el usuario selecciona **"Otro"**, mostrar un campo de texto libre adicional que también sea requerido (no puede quedar vacío si eligió "Otro").
- El valor final que se envía al backend es la opción seleccionada, o el texto libre si eligió "Otro".

---

### ✅ C4 — Error genérico al completar cotización con stock insuficiente
**Resuelto (2026-03-16)**

**Backend (`completePending()`):** El pre-check de stock ahora itera todos los productos, recolecta todos los fallos y retorna un error por producto con clave `stock_{product_id}` y mensaje `"Nombre: necesitas N, solo hay M disponible"`. Esto también corrige un bug latente donde `$product->name` podía lanzar fatal error si el producto era null.

**Frontend:** El `onError` del POS ya muestra `Object.values(errors).forEach(toast.error)` — cada producto fallido aparece como un toast individual. El vendedor puede ajustar cantidades directamente en el carrito (ya cargado) o cancelar la cotización con el botón "Cancelar" del banner.

---

## Mejoras de UX (día a día del vendedor)

### ✅ U1 — Búsqueda de productos limitada a 30 resultados
**Resuelto (2026-03-16)**

- Límite: 30 → **50**.
- Ordenamiento: código exacto primero (escaneo de barcode), luego nombre empieza con el término, luego alfabético. Implementado con `orderByRaw('CASE WHEN ... END')`.
- Validación: `min:1` en vez de `min:2` (permite búsqueda por 1 carácter para códigos cortos).
- Filtro opcional `category_id` añadido al endpoint `api.products.search`.
- **PosController:** pasa `categories` al frontend.
- **POS frontend:** chips de categoría debajo del campo de búsqueda (estilo pill, naranja cuando seleccionado). La categoría se limpia automáticamente cuando el usuario borra el query.

---

### ✅ U2 — Sin filtro de estado en reportes (mezcla completadas/canceladas)
**Resuelto (2026-03-16)**

- **Frontend (`reports/index.tsx`):** Selector "Estado" con opciones Completadas / Pendientes / Canceladas / Todas. Default: Completadas. El valor se pasa como `?status=...` en la URL al aplicar filtros.
- **Backend (`ReportController`):** Nuevo manejo de `status=all` — omite el `WHERE sales.status` para mostrar todos los estados. Sin valor → sigue defaulteando a `completed`.

---

### U3 — Formato de fechas inconsistente en la app
**Prioridad: Baja**

Hay al menos tres formatos distintos de fecha en la app:
- `toLocaleString('es-CO', { dateStyle: 'medium' })` → "13 de mar. de 2026"
- `toLocaleDateString()` sin locale → varía según el navegador del usuario
- Strings directos del servidor formateados en PHP

Un usuario que abre ventas ve fechas en un formato, abre movimientos de stock y ve otro, abre reportes y ve un tercero. Es confuso y poco profesional.

**Fix a implementar:**
- Crear archivo `resources/js/lib/format.ts` con funciones utilitarias:
  - `formatDate(date)` → formato corto: "13 mar 2026"
  - `formatDateTime(date)` → con hora: "13 mar 2026, 3:45 PM"
  - `formatCurrency(amount)` → ya existe parcialmente, centralizar aquí también
- Todas las funciones deben usar `'es-CO'` como locale y manejar `null`/`undefined` retornando `'—'` en lugar de un error.
- Reemplazar todos los usos dispersos de `toLocaleDateString`, `toLocaleString`, etc. en las vistas por estas funciones.

---

### U4 — El código en ficha de producto no tiene descarga ni instrucciones claras
**Prioridad: Baja**

La ficha de producto (`products/show.tsx`) muestra actualmente un QR con el código del producto, pero sin ninguna explicación de para qué sirve ese código. El usuario no puede descargarlo como imagen para imprimir en etiquetas físicas.

**Nota importante:** En el futuro se puede implementar código de barras tradicional (CODE128) en lugar de QR, ya que es más estándar para etiquetas de precio en comercios. El diseño de esta sección debe contemplar que el tipo de código (QR o barras) podría cambiar o ser configurable. El backend ya tiene implementado el render de ambos via ESC/POS (`PrintController`).

**Fix a implementar:**
- Agregar botón **"Descargar"** debajo del QR/código que exporte la imagen como PNG usando la API del canvas HTML.
- Agregar un tooltip o texto de ayuda que explique: *"Escanea este código con la cámara del POS para agregar el producto rápidamente."*
- Preparar el componente para soportar intercambiar entre QR y código de barras según configuración futura — parametrizar el tipo de código en el componente, no hardcodearlo.

---

### U5 — Sin skeleton loaders en búsquedas y cargas
**Prioridad: Baja**

Al buscar productos en el POS, al cargar el listado de ventas, o al abrir reportes, la UI solo muestra un spinner pequeño o nada. El usuario no sabe si la pantalla está cargando o si hubo un error. En conexiones lentas (Railway tiene cold starts), esto puede tardar varios segundos y parece que la app se colgó.

**Fix a implementar:**
- En tablas (ventas, productos, movimientos de stock): mostrar filas "fantasma" con bloques grises animados (shimmer) mientras se cargan los datos. El número de filas fantasma debe coincidir aproximadamente con las filas reales esperadas (ej: 10 filas si la paginación es de 10).
- En el POS, la lista de productos del carrito y los resultados de búsqueda deben tener skeletons en vez de spinner.
- En cards de métricas en reportes (total de ventas, etc.): mostrar rectángulos grises del tamaño del número mientras carga.
- Usar CSS `animate-pulse` de Tailwind para la animación — ya está disponible en el proyecto.

---

## Funcionalidades faltantes para el negocio

### F1 — Descuentos por cliente (precio especial / mayorista)
**Prioridad: Alta**

El sistema solo permite descuentos manuales por venta. No hay forma de marcar a un cliente como mayorista y que cada vez que se le venda, el descuento se aplique automáticamente. El vendedor tiene que recordar qué clientes tienen descuento y aplicarlo a mano — lo que lleva a errores (olvidar el descuento o aplicarlo donde no corresponde).

**Propuesta de implementación:**
- Agregar columna `discount_pct DECIMAL(5,2) DEFAULT NULL` en la tabla `clients`. Null significa sin descuento especial; un valor entre 0 y 100 indica el porcentaje que siempre se le aplica.
- En el formulario de crear/editar cliente, agregar campo **"Descuento especial (%)"** visible solo para administrador y encargado (vendedor no puede establecer descuentos de cliente).
- En el POS, al seleccionar un cliente que tenga `discount_pct`, aplicar ese descuento automáticamente en el campo de descuento de la venta. El tipo debe quedar en `percentage` y el valor en el porcentaje configurado.
- El vendedor puede ver el descuento aplicado y eliminarlo si es necesario (con confirmación), pero no puede aumentarlo por encima del porcentaje configurado para ese cliente.
- Mostrar un badge o indicador junto al nombre del cliente en el POS cuando tiene descuento especial: *"Cliente VIP — 15% dto."*

---

### F2 — Transferencia de stock entre sucursales
**Prioridad: Alta**

No existe mecanismo para mover inventario de Sucursal A a Sucursal B. Actualmente hay que hacer un ajuste manual de salida en A y otro de entrada en B por separado, sin ningún vínculo entre ellos. No hay forma de saber que el stock que entró en B provino de A.

**Propuesta de implementación:**
- Nueva tabla `stock_transfers`: `id, origin_branch_id, destination_branch_id, requested_by, status (draft/confirmed/cancelled), notes, created_at`.
- Nueva tabla `stock_transfer_items`: `transfer_id, product_id, quantity`.
- Nueva sección **"Transferencias"** dentro del módulo de inventario, accesible para encargado y administrador.
- Flujo: el encargado crea una transferencia seleccionando origen, destino, productos y cantidades → el sistema valida que haya stock suficiente en origen → al confirmar, se descuenta de origen y se incrementa en destino en una sola `DB::transaction()`.
- Ambos movimientos deben registrarse en `stock_movements` con `type = 'transfer_out'` y `type = 'transfer_in'` respectivamente, usando el ID de la transferencia como `reference` para el vínculo cruzado.
- Si una transferencia se cancela después de confirmada, debe generarse el movimiento inverso (devolver stock a origen).

---

### F3 — Devolución al proveedor / baja de inventario
**Prioridad: Alta**

No hay forma de registrar formalmente productos dañados, vencidos, robados o devueltos al proveedor. Hoy el encargado hace un ajuste de stock manual sin motivo, lo que hace el inventario imposible de auditar: ¿por qué bajó el stock de 50 a 43? No hay forma de saberlo.

**Propuesta de implementación:**
- Agregar nuevo tipo de movimiento en `StockMovement`: `write_off` (baja de inventario).
- Nueva pantalla o modal **"Registrar baja"** en la ficha de producto, accesible solo para encargado y administrador.
- El formulario solicita: producto, cantidad, motivo (selector):
  - *Vencimiento / fecha caducada*
  - *Daño físico o deterioro*
  - *Devolución a proveedor*
  - *Robo o pérdida*
  - *Otro* (con campo de texto obligatorio)
- Opcionalmente: número de remisión o referencia del proveedor (para devoluciones al proveedor).
- En el historial de movimientos de stock, los `write_off` deben mostrarse con ícono distinto (ej: papelera o X roja) y el motivo visible sin tener que abrir detalle.
- El modelo `StockMovement` ya tiene `notes` para guardar el motivo; el `type_label` debe incluir el caso `'write_off' => 'Baja'`.

---

### F4 — Historial de precios de productos
**Prioridad: Media**

Si el precio de venta de un producto sube de $10.000 a $15.000, no queda ningún registro de cuándo ocurrió, quién lo cambió, ni cuál era el precio anterior. Esto genera problemas cuando un cliente reclama haber pagado más o cuando el administrador quiere entender por qué los márgenes cambiaron.

**Propuesta de implementación:**
- Nueva tabla `product_price_history`: `id, product_id, field (sale_price|purchase_price), old_value, new_value, changed_by (user_id), changed_at`.
- Registrar automáticamente mediante un observer de Eloquent (`ProductObserver`) que se dispara en el evento `updating` cuando `sale_price` o `purchase_price` cambian.
- En la ficha del producto (`products/show.tsx`), agregar una sección colapsable **"Historial de precios"** que muestre una tabla con: fecha, campo modificado, precio anterior, precio nuevo, usuario que lo cambió.
- Solo visible para administrador y encargado.

---

### F5 — Auditoría de cambios en ventas
**Prioridad: Media**

Un administrador puede cambiar el estado de una venta (de `completed` a `cancelled`), modificar el total o editar datos sin dejar rastro. No hay forma de saber si alguien alteró una venta después de haberse registrado, lo que abre la puerta a fraude interno o errores sin responsabilidad.

**Propuesta de implementación:**
- Evaluar `spatie/laravel-activity-log` como primera opción (ya bien integrado con Laravel, genera logs automáticos en modelos con un trait). Si agrega demasiado peso o complejidad, usar tabla propia `sale_audit_log`.
- Campos a registrar: `sale_id, user_id, action (update|cancel|refund), field_changed, old_value, new_value, ip_address, created_at`.
- Registrar cambios en: estado, total, método de pago, y cualquier edición de ítems.
- En la ficha de venta (`sales/show.tsx`), agregar sección **"Auditoría"** visible solo para administrador, con tabla cronológica de todos los cambios.

---

### F6 — Impresión de etiquetas de precio / código
**Prioridad: Media**

Cuando el precio de un producto cambia, el encargado debe imprimir etiquetas nuevas manualmente en otro sistema (Word, etiquetador, etc.). No hay integración con la impresora térmica del negocio para esto.

**Nota:** El tipo de código a imprimir en la etiqueta (QR o código de barras CODE128) debe ser consistente con lo que se decida implementar en la ficha del producto (ver U4). El backend ya soporta ambos formatos via `PrintController`.

**Propuesta de implementación:**
- Botón **"Imprimir etiqueta"** en la ficha del producto, accesible para encargado y administrador.
- La etiqueta incluye: nombre del producto (máx. 2 líneas), precio de venta formateado en COP, código del producto, y el QR o código de barras del código.
- Formato de papel: compatible con impresora térmica de 58mm ya configurada via QZ Tray.
- Opcionalmente: al seleccionar múltiples productos en el listado, botón **"Imprimir etiquetas seleccionadas"** que envía todas en una sola impresión.
- El endpoint de impresión seguiría el mismo patrón que `GET /print/receipt/{id}` → devuelve base64 → el frontend lo envía a QZ Tray.

---

### F7 — Alerta si una sesión de caja lleva demasiado tiempo abierta
**Prioridad: Baja**

Un vendedor puede abrir caja a las 8 AM y olvidarse de cerrarla. Al día siguiente abre otra sesión sin haber cerrado la anterior (o no puede, dependiendo de la configuración). No hay ninguna señal visual que indique que algo está mal.

**Propuesta de implementación:**
- En el POS, al cargar la página, verificar si la sesión activa tiene `opened_at` con más de **10 horas** de antigüedad.
- Si es así, mostrar un banner amarillo no bloqueante en la parte superior: *"La caja lleva más de 10 horas abierta. ¿Olvidaste cerrar el turno anterior?"* con botón para ir al cierre de caja.
- El banner debe desaparecer si el usuario lo cierra manualmente (persiste con `sessionStorage` para no repetirse en la misma pestaña).
- El umbral de 10 horas puede hacerse configurable desde la configuración del negocio en el futuro.

---

### F8 — Confirmación de discrepancia alta al cerrar caja
**Prioridad: Media**

Si un vendedor ingresa un conteo de efectivo incorrecto al cerrar caja (ej: $500.000 de diferencia por un error de digitación), el sistema lo registra sin ninguna advertencia. La discrepancia queda guardada como si fuera intencional, y solo el administrador lo nota al revisar el historial.

**Propuesta de implementación:**
- Al calcular la discrepancia en el frontend del cierre de caja, si el valor absoluto supera un umbral (sugerido: **$50.000 COP** o **5% del total de ventas en efectivo**, lo que sea mayor), mostrar un modal de confirmación antes de enviar.
- El modal muestra: *"La diferencia de cierre es de $X. Esto es inusualmente alto. ¿Confirmas que el conteo es correcto?"* con botones **Revisar conteo** y **Confirmar de todas formas**.
- El umbral debe ser configurable desde la configuración del negocio (`business_settings`), campo `cash_discrepancy_threshold`, con valor por defecto de $50.000.
- Si el admin revisa el historial y ve una discrepancia muy alta registrada sin confirmación explícita, no hay forma de distinguirlo. Por eso la confirmación debe quedar registrada en `cash_sessions` con un campo `discrepancy_confirmed: boolean`.

---

## Bugs menores / inconsistencias técnicas

### B1 — `showReturnReceipt` no resetea `returnId` al cerrar
**Archivo:** `resources/js/pages/sales/show.tsx`

El estado que controla el modal del recibo de devolución guarda el `returnId` del recibo que se abrió. Al cerrar el modal solo se cambia `open: false`, pero `returnId` queda con el valor anterior. Si el usuario abre otro recibo de devolución rápidamente (ej: haciendo clic antes de que el componente se limpie), existe el riesgo de que por un instante se intente cargar el recibo anterior mientras el nuevo aún no cargó.

**Fix:** En el handler `onClose` del modal, resetear el estado completo: `{ open: false, returnId: undefined }` en lugar de solo `{ open: false }`.

---

### B2 — Sin rate limiting en búsqueda de productos
**Archivo:** `routes/web.php` o el archivo de rutas donde esté registrado `GET /products/search`

El endpoint de búsqueda no tiene ningún throttle. Un actor malicioso o un bug de frontend (loop infinito de requests) podría saturar el servidor con cientos de queries por segundo, afectando a todos los usuarios de todas las sucursales.

**Fix:** Agregar `throttle:60,1` al middleware de la ruta de búsqueda (60 requests por minuto por IP). En Laravel esto se configura en la definición de la ruta o en un grupo de rutas. Dado que el POS hace búsquedas en tiempo real con debounce, 60 requests/min es más que suficiente para uso normal.

---

### B3 — Cierre ciego de caja expone `expectedCash` al frontend
**Archivo:** `app/Http/Controllers/CashSessionController.php` — método `closeForm()`

El modo "blind close" para vendedores está diseñado para que no vean el efectivo esperado antes de ingresar su conteo (para evitar que ajusten el número). Sin embargo, `expectedCash` se envía igual en los props de Inertia y puede verse abriendo las DevTools del navegador → pestaña Network → respuesta de la página.

**Fix:** En el controlador, cuando `$isBlind === true`, no incluir `expectedCash` en los props enviados a la vista. El valor real se puede calcular en el backend al momento de recibir el cierre, comparándolo con el conteo enviado por el vendedor. De esta forma el número nunca toca el cliente.

---

## Calidad y mantenibilidad

- [ ] **Tests básicos** — flujos críticos: crear venta, validar stock, procesar devolución, abrir/cerrar caja. Usar Pest PHP ya incluido en Laravel.
- [ ] **Refactorizar `ReportController`** — archivo masivo (+2000 líneas), dividir en clases de servicio por tipo de reporte (`SalesReportService`, `StockReportService`, etc.). Actualmente está excluido del análisis de Larastan.
- [ ] **Caché** — datos poco cambiantes como métodos de pago, categorías y configuración del negocio se consultan en cada request. Agregar `Cache::remember()` con TTL de 5 minutos.
- [ ] **Índices DB** — agregar índices compuestos en `(status, created_at)` en la tabla `sales` para acelerar queries de reportes que filtran por estado y rango de fecha.

---

## Roadmap futuro

- [ ] Lector de código de barras (USB/Bluetooth) — búsqueda por código en POS sin teclado
- [ ] Módulo de compras/proveedores — entrada de mercancía con costo y generación de stock
- [ ] Cuentas por cobrar — ventas a crédito con seguimiento de pagos parciales
- [ ] Balance por sucursal — efectivo esperado en caja al cierre del día
- [ ] PWA / app móvil para vendedores en campo
- [ ] Factura electrónica DIAN (Colombia)
- [ ] Búsqueda full-text (Meilisearch) para catálogos grandes
