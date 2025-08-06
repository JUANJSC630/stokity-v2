# Sistema de Movimientos de Stock - Stokity v2

## Descripción General

El sistema de movimientos de stock permite registrar y controlar todos los cambios en el inventario de productos de manera detallada y auditada. En lugar de simplemente actualizar las cantidades, cada movimiento queda registrado con información completa sobre quién lo realizó, cuándo, por qué motivo y qué cambios específicos se produjeron.

## Características Principales

### Tipos de Movimientos

1. **Entrada (in)**: Registra la llegada de nuevos productos al inventario
   - Incrementa el stock del producto
   - Permite registrar costo unitario de compra
   - Ideal para compras a proveedores

2. **Salida (out)**: Registra la salida de productos del inventario
   - Reduce el stock del producto
   - No permite stock negativo
   - Ideal para ventas, mermas, donaciones

3. **Ajuste (adjustment)**: Permite establecer un stock específico
   - Establece el stock a un valor exacto
   - Útil para correcciones de inventario
   - Ideal para conteos físicos

### Información Registrada

Cada movimiento incluye:
- **Producto**: Producto afectado
- **Usuario**: Quién realizó el movimiento
- **Sucursal**: Dónde ocurrió el movimiento
- **Tipo**: Entrada, salida o ajuste
- **Cantidad**: Cuánto se movió
- **Stock anterior**: Stock antes del movimiento
- **Stock nuevo**: Stock después del movimiento
- **Costo unitario**: Precio de compra (solo entradas)
- **Referencia**: Motivo del movimiento
- **Notas**: Información adicional
- **Fecha**: Cuándo ocurrió el movimiento

## Funcionalidades Disponibles

### 1. Lista de Movimientos (`/stock-movements`)
- Vista general de todos los movimientos
- Filtros por:
  - Búsqueda (referencia, notas, producto)
  - Tipo de movimiento
  - Sucursal
  - Producto específico
  - Rango de fechas
- Paginación y ordenamiento
- Acceso desde el sidebar principal

### 2. Crear Movimiento (`/stock-movements/create`)
- Formulario completo para registrar movimientos
- Selección de producto con información actual
- Validación automática de cantidades
- Campos específicos según el tipo de movimiento
- Fecha personalizable del movimiento

### 3. Movimientos por Producto (`/products/{id}/movements`)
- Historial específico de un producto
- Información detallada del producto
- Enlace directo desde la página del producto
- Botón para crear nuevo movimiento

### 4. Estadísticas (`/stock-movements/statistics`)
- Resumen de movimientos por período
- Totales de entradas y salidas
- Costos totales
- Distribución por tipo de movimiento

## Permisos y Seguridad

### Roles con Acceso
- **Administrador**: Acceso completo a todas las funcionalidades
- **Encargado**: Acceso completo a todas las funcionalidades
- **Vendedor**: Solo puede ver movimientos (no crear)

### Restricciones por Sucursal
- Los usuarios no administradores solo ven movimientos de su sucursal
- Los administradores pueden ver movimientos de todas las sucursales

## Integración con el Sistema

### Actualización Automática de Stock
- Cada movimiento actualiza automáticamente el stock del producto
- Transacciones de base de datos garantizan consistencia
- No se permite stock negativo

### Relación con Ventas
- Las ventas pueden generar movimientos de salida automáticos
- Mantiene trazabilidad completa del inventario

### Auditoría
- Todos los movimientos quedan registrados permanentemente
- Información completa de quién, cuándo y por qué
- Historial completo para auditorías

## Uso Práctico

### Escenario 1: Compra a Proveedor
1. Ir a "Movimientos de Stock" → "Nuevo Movimiento"
2. Seleccionar el producto
3. Tipo: "Entrada"
4. Cantidad: Cantidad comprada
5. Costo unitario: Precio de compra
6. Referencia: "Compra proveedor XYZ"
7. Notas: Detalles adicionales
8. Guardar

### Escenario 2: Ajuste de Inventario
1. Realizar conteo físico del producto
2. Ir a "Movimientos de Stock" → "Nuevo Movimiento"
3. Seleccionar el producto
4. Tipo: "Ajuste"
5. Cantidad: Stock real contado
6. Referencia: "Conteo físico"
7. Notas: Explicación de diferencias
8. Guardar

### Escenario 3: Merma o Pérdida
1. Ir a "Movimientos de Stock" → "Nuevo Movimiento"
2. Seleccionar el producto
3. Tipo: "Salida"
4. Cantidad: Cantidad perdida
5. Referencia: "Merma por vencimiento"
6. Notas: Detalles de la pérdida
7. Guardar

## Beneficios del Sistema

1. **Trazabilidad Completa**: Saber exactamente qué pasó con cada producto
2. **Control de Costos**: Registro de precios de compra para análisis
3. **Auditoría**: Historial completo para auditorías internas y externas
4. **Análisis**: Datos para mejorar la gestión de inventario
5. **Prevención de Errores**: Validaciones y confirmaciones
6. **Responsabilidad**: Cada movimiento tiene un responsable identificado

## Consideraciones Técnicas

### Base de Datos
- Tabla `stock_movements` con índices optimizados
- Relaciones con productos, usuarios y sucursales
- Transacciones para garantizar consistencia

### Rendimiento
- Paginación en listas grandes
- Filtros eficientes con índices
- Consultas optimizadas para estadísticas

### Escalabilidad
- Sistema preparado para múltiples sucursales
- Separación clara de responsabilidades
- Arquitectura modular

## Próximas Mejoras

1. **Reportes Avanzados**: Análisis de tendencias y proyecciones
2. **Alertas Automáticas**: Notificaciones de stock bajo
3. **Integración con Proveedores**: Órdenes de compra automáticas
4. **Móvil**: Aplicación móvil para conteos físicos
5. **API**: Integración con sistemas externos
6. **Backup**: Exportación de datos para análisis externos 