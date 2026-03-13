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
| Impresión térmica ESC/POS (QZ Tray) | ✅ Funcional (ver bug #2) |
| Validación de stock al vender | ✅ Funcional |
| Configuración del negocio (logo, NIT, etc.) | ✅ Funcional |
| Almacenamiento de imágenes (Vercel Blob + WebP) | ✅ Funcional |
| Búsqueda en tiempo real (POS + productos) | ✅ Funcional |
| Descuentos y notas en ventas | ✅ Funcional |
| Historial de compras del cliente | ✅ Funcional |
| Módulo de impresión QZ Tray | ✅ Funcional |
| Apertura/Cierre de Caja (turnos) | ✅ Funcional |
| Cotizaciones / ventas pendientes | ✅ Funcional |
| Reportes + exportación PDF/Excel | ✅ Funcional |
| Análisis estático (Larastan nivel 5) | ✅ 0 errores |
| Tests automatizados | ❌ Vacío |

---

## Bugs pendientes

### Bug #2 — Recibo térmico: corte deja parte superior dentro de la impresora
**Severidad: Alta**

**Contexto:** Se eliminó `$p->initialize()` (ESC @) de todos los métodos de impresión (`printReceipt`, `returnReceipt`, `cashSessionReport`) y se reemplazó por reset manual + `ESC J 24` para avance de papel. Esto resolvió el problema de retracción del papel.

**Problema actual:** Cuando el contenido del recibo es corto (ej. solo nombre del negocio), el corte deja las primeras líneas dentro de la impresora. Con contenido completo funciona bien.

**Hipótesis:** La impresora empieza con el papel en posición "dentro" (sin haber cortado antes). El avance ESC J no es suficiente solo para el primer ticket. Los siguientes funcionan porque el corte anterior dejó el papel en la posición correcta.

**Contexto adicional:**
- Aumentar el feed inicial causa papel en blanco excesivo en el primer recibo del día.
- ⚠️ Requiere máxima precaución — no alterar sin prueba real en producción.

**Archivo:** `app/Http/Controllers/PrintController.php` — todos los métodos de impresión
**Pendiente:** Desplegar a Railway y verificar comportamiento real para definir la estrategia de fix.

---

## Funcionalidades pendientes

### P1 — Botones de efectivo rápido en POS
**Prioridad: Alta** (mejora directa de la experiencia del vendedor)

En el flujo de pago en efectivo del POS, agregar botones con los billetes y monedas más comunes de Colombia:

**Valores:** 1.000, 2.000, 5.000, 10.000, 20.000, 50.000, 100.000, 200.000

- Al hacer clic, el monto se agrega al campo de efectivo recibido
- Mostrar el vuelto en tiempo real

**Archivo:** `resources/js/pages/pos/index.tsx` — sección de pago en efectivo

---

---

### P3 — Alertas de stock bajo por email
**Prioridad: Media**

Cuando un producto llega a su nivel mínimo de stock, enviar email al administrador/encargado.

- Campo `min_stock` ya existe en productos
- Disparar en `StockMovementService` cuando stock cae por debajo del mínimo
- Email con lista de productos en nivel crítico

---

## Calidad y mantenibilidad

- [ ] **Tests básicos** — flujos críticos: crear venta, stock, devoluciones, caja
  ```bash
  php artisan make:test SaleTest --pest
  php artisan make:test ProductStockTest --pest
  php artisan make:test SaleReturnTest --pest
  ```
- [ ] **Refactorizar `ReportController`** — archivo masivo (+2000 líneas). Dividir en servicios por tipo de reporte.
- [ ] **Caché** en datos poco cambiantes (métodos de pago, categorías, configuración del negocio)

---

## Roadmap futuro

- [ ] Lector de código de barras (USB/Bluetooth) — búsqueda por código en POS
- [ ] Módulo de compras/proveedores — entrada de mercancía con costo y generación de stock
- [ ] Cuentas por cobrar — ventas a crédito con seguimiento de pagos
- [ ] Balance por sucursal — efectivo esperado en caja al cierre del día
- [ ] PWA / app móvil para vendedores en campo
- [ ] Factura electrónica DIAN (Colombia)
