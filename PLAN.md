# Stokity v2 — Plan de Trabajo

> Última actualización: Marzo 2026

---

## Estado del sistema

| Módulo | Estado |
|--------|--------|
| POS core (ventas, productos, clientes) | ✅ Funcional |
| Multi-sucursal + RBAC | ✅ Funcional |
| Métodos de pago dinámicos | ✅ Funcional |
| Devoluciones | ✅ Funcional (ver bug #1) |
| Impresión térmica ESC/POS (QZ Tray) | ✅ Funcional (ver bug #2) |
| Validación de stock al vender | ✅ Funcional |
| Configuración del negocio (logo, NIT, etc.) | ✅ Funcional |
| Almacenamiento de imágenes (Vercel Blob + WebP) | ✅ Funcional |
| Búsqueda en tiempo real (POS + productos) | ✅ Funcional |
| Descuentos y notas en ventas | ✅ Funcional |
| Historial de compras del cliente | ✅ Funcional |
| Módulo de impresión QZ Tray | ✅ Funcional |
| Apertura/Cierre de Caja (turnos) | ✅ Funcional |
| Reportes + exportación PDF/Excel | ⚠️ Funcional con bugs (ver sección de bugs) |
| Tests automatizados | ❌ Vacío |

---

## Bugs pendientes (ordenados por severidad)

### Bug #1 — Devoluciones no registran movimiento de stock ✅ RESUELTO
**Severidad: Alta**

El stock del producto SÍ se incrementa al hacer una devolución (`$product->increment('stock', ...)` en `SaleReturnController::store()`), pero **no se llama a `StockMovementService`**, por lo que el movimiento no queda registrado en la tabla `stock_movements`. El producto recupera su cantidad pero el historial de movimientos queda incompleto y el inventario no refleja el ingreso correctamente.

**Archivo:** `app/Http/Controllers/SaleReturnController.php` — método `store()` (~línea 61)
**Fix:** Reemplazar `$product->increment('stock', ...)` por una llamada a `StockMovementService::record()` que incremente el stock Y registre el movimiento.

**Fix confirmado:** Se usa `StockMovementService::record()` con `type: 'in'` y referencia al código de venta. El movimiento ahora aparece en la sección "Movimientos de Stock" del producto.

---

### Bug #2 — Recibo térmico: corte deja parte superior dentro de la impresora
**Severidad: Alta**

**Contexto:** Se eliminó `$p->initialize()` (ESC @) de todos los métodos de impresión (`printReceipt`, `returnReceipt`, `cashSessionReport`) y se reemplazó por reset manual + `ESC J 24` para avance de papel. Esto resolvió el problema de retracción del papel.

**Problema actual:** Cuando el contenido del recibo es corto (ej. solo nombre del negocio), el corte deja las primeras líneas dentro de la impresora — solo se ven las últimas letras. Con contenido completo funciona bien.

**Causa probable:** El avance inicial (14 × ESC J 24 ≈ 42mm) no es suficiente para recibos cortos, o el comando de corte final no está alimentando suficiente papel antes de cortar.

**Archivo:** `app/Http/Controllers/PrintController.php` — todos los métodos de impresión
**Pendiente:** Verificar en producción (Railway) si aumentar el avance inicial o agregar más feed antes del corte resuelve el problema.

**Contexto adicional confirmado:**
- El primer recibo del día (impresora fría/sin uso) genera papel en blanco excesivo si se aumenta el feed inicial.
- Los recibos subsecuentes se imprimen correctamente sin espacio extra.
- **Hipótesis:** la impresora empieza con el papel en posición "dentro" (sin haber cortado antes), y el avance ESC J no es suficiente solo para el primer ticket. Los siguientes funcionan porque el corte del ticket anterior dejó el papel en la posición correcta.
- **Pendiente de implementar:** detectar este caso o ajustar el feed de forma más inteligente.
- ⚠️ Este módulo requiere máxima precaución — no alterar sin prueba real en producción.
---

### Bug #3 — Reportes no descargan (hacen reload de página) ✅ RESUELTO
**Severidad: Alta**

Los botones de exportar PDF/Excel en todos los reportes no descargaban el archivo — en cambio recargaban la página. Causa raíz: los catch blocks del servidor retornaban `back()` (redirect), y cualquier mecanismo de navegación del browser seguía ese redirect haciendo un "reload".

**Fix aplicado:**
- Servidor: todos los catch blocks de métodos export cambiados de `back()->with('error', ...)` → `response()->json(['error' => ...], 500)`
- Frontend: creada utilidad `resources/js/lib/download.ts` con `downloadFile(url)` que usa `fetch()` + blob — descarga el archivo sin navegar la página. Si el servidor retorna error JSON, muestra toast.
- Aplicado en los 6 reportes: index, sales-detail, products, sellers, branches, returns
---

### Bug #4 — Reporte de Sucursales genera error al exportar PDF ✅ RESUELTO
**Severidad: Alta**

Al intentar generar el PDF del reporte de sucursales se produce un error. Probable causa: el método `getBranchesByRegion()` retorna un `collect()` vacío (es un placeholder sin implementar) y el template HTML intenta iterar sobre él con propiedades que no existen.

**Archivo:** `app/Http/Controllers/ReportController.php` — métodos `branchesReport()` y `exportBranchesPdf()`
**Fix:** Implementar o remover la sección "por región" del reporte, y verificar que el template HTML no falle con datos vacíos.

---

### Bug #5 — Reportes PDF: primera tabla fuera de formato ✅ RESUELTO
**Severidad: Media**

En el reporte de Ventas y en el reporte de Detalle de Ventas, la primera tabla del PDF se ve fuera del formato (desbordada o mal alineada). Los estilos inline del HTML generado no están optimizados para DOMPDF.

**Archivo:** `app/Http/Controllers/ReportController.php` — métodos que generan HTML para PDF
**Fix:** Ajustar el CSS del HTML generado: revisar anchos de columnas, `word-break`, `font-size` y márgenes para que la tabla se ajuste correctamente a A4.

---

### Bug #6 — Sidebar colapsado no muestra la sección de Reportes ✅ RESUELTO
**Severidad: Media**

Cuando el sidebar está colapsado (modo icono), la sección de Reportes desaparece por completo porque es un acordeón que solo se expande en modo expandido. El usuario no tiene forma de acceder a los reportes sin expandir el sidebar.

**Archivo:** `resources/js/layouts/app/app-sidebar-layout.tsx` y el componente del sidebar
**Fix:** Cuando el sidebar esté colapsado, mostrar un ícono de reportes (ej. `BarChart2`) que al hacer hover muestre un submenu flotante con los links de reportes, siguiendo el patrón de Radix UI `Tooltip` o `DropdownMenu`.

---

### Bug #7 — Reportes Excel con formato incorrecto para contabilidad ✅ RESUELTO
**Severidad: Baja**

Los exports de Excel son archivos CSV generados manualmente (sin Laravel Excel). El formato replica el PDF en lugar de ser un formato limpio para contabilidad: sin encabezados bien definidos, sin separación de secciones, sin formato de moneda en columnas numéricas.

**Archivo:** `app/Http/Controllers/ReportController.php` — métodos `generateSalesDetailCsvContent()`, `generateSellersCsvContent()`, etc.
**Fix:** Reestructurar los CSV para que sean amigables en Excel: una fila de encabezados, datos en filas sin estilos, números sin formato de texto (sin `$` ni puntos de miles), columnas separadas correctamente.

---

## Funcionalidades pendientes

### P1 — Botones de efectivo rápido en POS
**Prioridad: Alta** (mejora directa de la experiencia del vendedor)

En el flujo de pago en efectivo del POS, agregar botones con los billetes y monedas más comunes de Colombia para que el vendedor pueda registrar el pago sin escribir:

**Valores sugeridos:** 1.000, 2.000, 5.000, 10.000, 20.000, 50.000, 100.000, 200.000

- Al hacer clic en un botón, el monto se agrega al campo de efectivo recibido (acumulativo o reemplaza según el UX que prefiera el usuario)
- Mostrar el vuelto en tiempo real

**Archivo:** `resources/js/pages/pos/index.tsx` — sección de pago en efectivo (~línea 875)

---

### P2 — Ventas pendientes / cotizaciones
**Prioridad: Media**

Permitir guardar una venta como borrador antes de cobrar. Útil cuando el cliente necesita tiempo o cuando hay varios clientes simultáneos.

- Nuevo estado de venta: `draft` / `pending`
- El POS puede tener múltiples carritos guardados
- Listar borradores y poder retomarlos
- Los borradores no afectan el stock hasta que se confirman

---

### P3 — Alertas de stock bajo por email
**Prioridad: Media**

Cuando un producto llega a su nivel mínimo de stock, enviar un email al administrador/encargado de la sucursal correspondiente.

- Usar el campo `stock_min` existente en productos (verificar si existe, si no crearlo)
- Disparar en `StockMovementService` cuando stock cae por debajo del mínimo
- Email con lista de productos en nivel crítico

---

### P4 — Verificar recibo de devoluciones en impresora real
**Prioridad: Baja** (tarea manual)

Imprimir un recibo de devolución con la impresora térmica real y verificar que el formato se vea correcto (logo, datos del negocio, productos devueltos, totales, QR).

---

## Calidad y mantenibilidad

- [ ] **Tests básicos** — flujos críticos: crear venta, stock, devoluciones, caja
  ```bash
  php artisan make:test SaleTest --pest
  php artisan make:test ProductStockTest --pest
  php artisan make:test SaleReturnTest --pest
  ```
- [ ] **Refactorizar `ReportController`** — actualmente es un archivo masivo (+2000 líneas). Dividir en servicios o controladores por tipo de reporte.
- [ ] **Caché** en datos poco cambiantes (métodos de pago, categorías, configuración del negocio)

---

## Roadmap futuro

- [ ] Lector de código de barras (USB/Bluetooth) — búsqueda por código en POS
- [ ] Módulo de compras/proveedores — entrada de mercancía con costo y generación de stock
- [ ] Cuentas por cobrar — ventas a crédito con seguimiento de pagos
- [ ] Balance por sucursal — efectivo esperado en caja al cierre del día
- [ ] PWA / app móvil para vendedores en campo
- [ ] Factura electrónica DIAN (Colombia)

---

## Lo que está bien implementado

- `StockMovementService` — lógica de stock centralizada y reutilizable
- `DB::transaction()` en todas las operaciones críticas (ventas, devoluciones, caja)
- Soft deletes en todas las entidades — los datos nunca se pierden
- Eager loading correcto — sin problemas N+1
- TypeScript estricto en el frontend
- Inertia.js con SSR-ready props
- Roles y permisos (RBAC) bien definidos por sucursal
- QZ Tray con firma criptográfica + ESC/POS avanzado (logo bitmap, QR bitmap, código de barras)
- CashSession completo (apertura, cierre ciego para vendedores, movimientos, reporte)
- Paginación en todos los listados
- `ArchivedUser` para auditoría de usuarios eliminados
- Imágenes en Vercel Blob con conversión WebP via GD
