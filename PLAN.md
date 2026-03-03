# Stokity v2 — Review y Plan de Mejoras

> Última actualización: Marzo 2026

---

## Estado actual

| Área | Estado |
|------|--------|
| POS core (ventas, productos, clientes) | ✅ Funcional |
| Multi-sucursal + RBAC | ✅ Funcional |
| Reportes + exportación PDF/Excel | ✅ Funcional |
| Métodos de pago dinámicos | ✅ Funcional |
| Devoluciones | ✅ Funcional |
| Impresión térmica ESC/POS | ✅ Funcional |
| Validación de stock al vender | ✅ Funcional |
| Audit trail de stock en ventas | ✅ Resuelto |
| Configuración del negocio (logo, NIT, etc.) | ✅ Resuelto |
| Almacenamiento de imágenes (Vercel Blob + WebP) | ✅ Resuelto |
| Búsqueda en tiempo real (POS + productos) | ✅ Resuelto |
| Descuentos en ventas | ✅ Resuelto |
| Notas en ventas | ✅ Resuelto |
| Historial de compras del cliente | ✅ Resuelto |
| Tests automatizados | ❌ Vacío |

---

## Prioridad 1 — Bugs críticos ✅ Completo

- [x] Fix import `Str` en `ProductController` — error fatal al subir imagen de producto
- [x] `StockMovement` automático en ventas (`SaleController::store/destroy`) con `DB::transaction()`
- [x] `ProductController::updateStock()` registra movimiento (resuelve TODO existente)
- [x] Creado `app/Services/StockMovementService.php` — lógica centralizada y reutilizable
- [x] Validación de stock al vender — ya existía en `SaleController::store()`

---

## Prioridad 2 — Funcionalidades core faltantes

- [x] **Descuentos en ventas** — % o monto fijo, calculado server-side, visible en detalle
- [x] **Notas/observaciones en ventas** — campo de texto interno por venta

---

## Prioridad 3 — Experiencia del usuario POS

- [ ] **Vista POS simplificada** — pantalla dedicada para vendedores: buscar producto, carrito, cobrar
- [x] **Búsqueda de productos en tiempo real** — fetch + AbortController, sin cambiar URL
- [x] **Mostrar stock disponible** — badge "máx." al agregar productos al carrito
- [ ] **Atajos de teclado** en la pantalla de venta
- [ ] **Verificar recibo de devoluciones** — probar formato con impresora térmica real

---

## Prioridad 4 — Funcionalidades complementarias

- [x] **Historial de compras del cliente** — stats + tabla paginada en el perfil del cliente
- [ ] **Ventas pendientes / cotizaciones** — guardar venta en borrador antes de cobrar
- [ ] **Alertas de stock bajo por email** — no solo en el dashboard
- [ ] **Balance por sucursal** — efectivo esperado en caja al cierre del día

---

## Prioridad 5 — Calidad y mantenibilidad

- [ ] **Tests básicos** — flujos críticos: crear venta, stock, devoluciones
  ```bash
  php artisan make:test SaleTest --pest
  php artisan make:test ProductStockTest --pest
  ```
- [ ] **Refactorizar `ReportController`** — actualmente +33K líneas, dividir en servicios
- [ ] **Caché** en datos poco cambiantes (métodos de pago, sucursales, categorías)

---

## Prioridad 6 — Futuro

- [ ] Lector de código de barras (USB/Bluetooth)
- [ ] Módulo de compras/proveedores — entrada de mercancía con costo
- [ ] Cuentas por cobrar — ventas a crédito con seguimiento de pagos
- [ ] PWA / app móvil para vendedores en campo
- [ ] Factura electrónica DIAN (Colombia)

---

## Lo que está bien hecho

- Service Layer con `StockMovementService` — lógica de negocio fuera de los controllers
- `DB::transaction()` en operaciones críticas de stock
- Separación clara MVC con Inertia.js
- Middleware de roles y filtro por sucursal
- Soft deletes en todas las entidades — los datos nunca se pierden
- Eager loading — sin problemas N+1
- TypeScript en el frontend
- Métodos de pago dinámicos configurables
- `ArchivedUser` para auditoría de usuarios eliminados
- Paginación en todos los listados
