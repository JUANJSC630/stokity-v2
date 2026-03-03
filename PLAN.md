# Stokity v2 — Review y Plan de Mejoras

> Fecha: Marzo 2026 | Estado: Funcional con bugs críticos identificados

---

## Estado actual

El sistema es un POS + Inventario multi-sucursal funcional con buena arquitectura. Tiene **1 bug crítico** que rompe funcionalidad en producción, **1 problema de integridad de datos** importante, y varias áreas que necesitan trabajo para ser un POS completo y confiable.

| Área | Estado |
|------|--------|
| POS core (ventas, productos, clientes) | Funcional |
| Multi-sucursal + RBAC | Funcional |
| Reportes + exportación PDF/Excel | Funcional |
| Métodos de pago dinámicos | Funcional |
| Devoluciones | Funcional |
| Impresión térmica ESC/POS | Funcional |
| Audit trail de stock en ventas | **Incompleto** |
| Descuentos en ventas | **No existe** |
| Validación de stock al vender | **Sin confirmar** |
| Tests automatizados | **Vacío** |

---

## Bugs críticos — Arreglar inmediatamente

### BUG 1: `Str` no importado en ProductController

**Archivo:** `app/Http/Controllers/ProductController.php` líneas 110 y 176

`Str::slug()` se usa sin el import correspondiente. Causa un **error fatal cada vez que se sube una imagen de producto** (al crear o editar).

```php
// Falta esta línea en los imports:
use Illuminate\Support\Str;
```

**Fix:** Agregar `use Illuminate\Support\Str;` en los imports del archivo.

---

### BUG 2: Audit trail de stock incompleto al vender

**Archivo:** `app/Http/Controllers/SaleController.php`

Cuando se crea una venta, el stock se descuenta automáticamente pero **no se crea ningún registro en `stock_movements`**. El historial de movimientos no refleja los cambios que causan las ventas.

**Fix:** En `SaleController::store()`, crear un `StockMovement` tipo `out` por cada producto vendido. En `SaleController::destroy()`, crear tipo `in` al restaurar stock.

---

## Funcionalidades faltantes para un POS completo

- **Sin descuentos en ventas** — El modelo `Sale` no tiene campo de descuento por ítem ni por venta total
- **Sin validación de stock al vender** — No está verificado si se impide vender más unidades de las disponibles
- **Sin historial de compras del cliente** — El perfil del cliente no muestra sus ventas anteriores
- **Sin notas en ventas** — No hay campo de observaciones internas por venta
- **Sin ventas pendientes / cotizaciones** — No se puede guardar una venta en borrador

---

## Plan de mejora por prioridad

### Prioridad 1 — Bugs críticos (esta semana)

- [x] Agregar `use Illuminate\Support\Str;` en `ProductController`
- [x] Crear `StockMovement` al crear/cancelar ventas en `SaleController`
  - Tipo `out` al crear venta (uno por producto) — con `DB::transaction()`
  - Tipo `in` al eliminar/cancelar una venta — con `DB::transaction()`
- [x] `ProductController::updateStock()` ahora también registra movimiento (resuelve TODO existente)
- [x] Creado `app/Services/StockMovementService.php` para centralizar la lógica

---

### Prioridad 2 — Integridad del sistema (próximas 2 semanas)

- [ ] Validar stock disponible al crear venta — verificar `quantity <= stock` antes de procesar
- [ ] Tests básicos para los flujos críticos
  ```bash
  # Pest ya está instalado, solo falta escribir los tests
  php artisan make:test SaleTest --pest
  php artisan make:test ProductStockTest --pest
  ```
- [ ] Campo de descuento en ventas — migración, modelo, controlador y vista

---

### Prioridad 3 — Experiencia del usuario POS (mes 1)

- [ ] Búsqueda de productos en tiempo real al crear venta (por nombre y código)
- [ ] Mostrar stock disponible al agregar productos a una venta
- [ ] Vista POS simplificada para vendedores: productos, buscar, carrito, cobrar
- [ ] Atajos de teclado en la pantalla de venta
- [ ] Verificar y mejorar el recibo de impresión de devoluciones

---

### Prioridad 4 — Funcionalidades faltantes (mes 2)

- [ ] Notas/observaciones en ventas
- [ ] Ventas en estado pendiente / cotizaciones
- [ ] Historial completo de compras en el perfil del cliente
- [ ] Alertas de stock bajo por email (no solo en el dashboard)
- [ ] Balance por sucursal (efectivo esperado en caja)

---

### Prioridad 5 — Calidad y mantenibilidad (mes 2-3)

- [ ] Refactorizar `ReportController` — actualmente +33K líneas, dividir en servicios por tipo de reporte
- [ ] Caché en datos poco cambiantes (métodos de pago, sucursales, categorías)
- [ ] Suite de tests con cobertura mínima del 60% en lógica de negocio crítica

---

### Prioridad 6 — Futuro (mes 3+)

- [ ] Lector de código de barras (escáner USB/Bluetooth)
- [ ] Módulo de compras/proveedores — entrada de mercancía con proveedor y costo
- [ ] Cuentas por cobrar — ventas a crédito con seguimiento de pagos pendientes
- [ ] PWA / app móvil para vendedores en campo
- [ ] Factura electrónica DIAN (Colombia)
- [ ] Análisis predictivo de reabastecimiento basado en tendencias de venta

---

## Resumen de acciones

| Acción | Urgencia | Esfuerzo |
|--------|----------|----------|
| Fix import `Str` en ProductController | CRÍTICO | 2 min |
| StockMovement automático en ventas | Alto | 2h |
| Validación stock al vender | Alto | 1h |
| Tests básicos | Alto | 1 semana |
| Campo descuento en ventas | Medio | 1 día |
| Búsqueda POS en tiempo real | Medio | 2 días |
| Refactorizar ReportController | Bajo | 3 días |
| Módulo compras/proveedores | Futuro | 2 semanas |

---

## Lo que está bien hecho

- Separación clara MVC con Inertia.js bridging backend/frontend
- Middleware de roles y filtro por sucursal — bien implementado
- Soft deletes en todas las entidades importantes — los datos nunca se pierden
- Eager loading en queries — sin problemas N+1
- TypeScript en el frontend con tipos completos
- Métodos de pago dinámicos — flexible sin hardcodear
- Archivo de usuarios eliminados (`ArchivedUser`) — excelente práctica para auditoría
- Paginación en todos los listados
