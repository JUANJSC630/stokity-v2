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

**Contexto:** Se eliminó `$p->initialize()` (ESC @) de todos los métodos de impresión y se reemplazó por reset manual + `ESC J 24`. Esto resolvió la retracción del papel.

**Problema:** En el primer recibo del día el corte deja las primeras líneas dentro de la impresora. Los recibos siguientes funcionan bien porque el corte anterior dejó el papel en posición correcta.

**Restricción:** Aumentar el feed inicial genera papel en blanco excesivo en el primer ticket.

**Archivo:** `app/Http/Controllers/PrintController.php`
**Pendiente:** Requiere prueba en producción (Railway) para definir estrategia de fix. ⚠️ No alterar sin prueba real.

---

## Funcionalidades pendientes

### P1 — Botones de efectivo rápido en POS
**Prioridad: Alta**

Botones de billetes colombianos en el flujo de pago en efectivo: 1.000, 2.000, 5.000, 10.000, 20.000, 50.000, 100.000, 200.000.

- Click acumula el monto en el campo de efectivo recibido
- Mostrar vuelto en tiempo real

**Archivo:** `resources/js/pages/pos/index.tsx` — sección de pago en efectivo

---

### P2 — Alertas de stock bajo por email
**Prioridad: Media**

Cuando un producto llega a su nivel mínimo de stock, enviar email al administrador/encargado.

- Campo `min_stock` ya existe en productos
- Disparar en `StockMovementService` cuando stock cae por debajo del mínimo
- Email con lista de productos en nivel crítico

---

## Calidad y mantenibilidad

- [ ] **Tests básicos** — flujos críticos: crear venta, stock, devoluciones, caja
- [ ] **Refactorizar `ReportController`** — archivo masivo (+2000 líneas), dividir en servicios por tipo de reporte
- [ ] **Caché** en datos poco cambiantes (métodos de pago, categorías, configuración del negocio)

---

## Roadmap futuro

- [ ] Lector de código de barras (USB/Bluetooth) — búsqueda por código en POS
- [ ] Módulo de compras/proveedores — entrada de mercancía con costo y generación de stock
- [ ] Cuentas por cobrar — ventas a crédito con seguimiento de pagos
- [ ] Balance por sucursal — efectivo esperado en caja al cierre del día
- [ ] PWA / app móvil para vendedores en campo
- [ ] Factura electrónica DIAN (Colombia)
