# Sistema de Métodos de Pago Dinámicos

## Descripción

Se ha implementado un sistema completo de métodos de pago dinámicos que permite a los administradores gestionar los métodos de pago disponibles en el sistema Stokity. Este sistema reemplaza los métodos de pago hardcodeados por una solución flexible y configurable.

## Características Principales

### ✅ Funcionalidades Implementadas

1. **Gestión Completa de Métodos de Pago**
   - Crear nuevos métodos de pago
   - Editar métodos existentes
   - Activar/desactivar métodos
   - Eliminar métodos (con validación de uso)
   - Ordenar métodos por prioridad

2. **Interfaz de Administración**
   - Página de listado con tabla ordenable
   - Formularios de creación y edición
   - Confirmación de eliminación
   - Indicadores de estado activo/inactivo

3. **Integración con Ventas**
   - Selectores dinámicos en formularios de venta
   - Carga automática de métodos activos
   - Compatibilidad con datos existentes

4. **Reportes Actualizados**
   - Etiquetas dinámicas en reportes
   - Compatibilidad con métodos existentes y nuevos

## Métodos de Pago Iniciales (Contexto Colombiano)

El sistema viene preconfigurado con los métodos de pago más comunes en Colombia:

| Método | Código | Descripción |
|--------|--------|-------------|
| Efectivo | `cash` | Pago en efectivo (billetes y monedas) |
| Tarjeta de Crédito | `credit_card` | Pago con tarjeta de crédito |
| Tarjeta de Débito | `debit_card` | Pago con tarjeta de débito |
| Transferencia Bancaria | `bank_transfer` | Transferencia bancaria (PSE, consignación, etc.) |
| Nequi | `nequi` | Pago a través de la billetera digital Nequi |
| DaviPlata | `daviplata` | Pago a través de la billetera digital DaviPlata |
| PSE | `pse` | Pago a través del botón PSE |
| Addi | `addi` | Pago a plazos con Addi |
| Bipi | `bipi` | Pago a través de Bipi (Bancolombia) |
| Cheque | `check` | Pago con cheque bancario |

## Estructura de la Base de Datos

### Tabla: `payment_methods`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | bigint | ID único |
| `name` | varchar(255) | Nombre mostrado al usuario |
| `code` | varchar(50) | Código interno único |
| `description` | text | Descripción opcional |
| `is_active` | boolean | Estado activo/inactivo |
| `sort_order` | integer | Orden de aparición |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |
| `deleted_at` | timestamp | Soft delete |

## Rutas Disponibles

### Administración (Solo Administradores)
- `GET /payment-methods` - Listar métodos de pago
- `GET /payment-methods/create` - Formulario de creación
- `POST /payment-methods` - Crear método de pago
- `GET /payment-methods/{id}/edit` - Formulario de edición
- `PUT /payment-methods/{id}` - Actualizar método de pago
- `DELETE /payment-methods/{id}` - Eliminar método de pago
- `PATCH /payment-methods/{id}/toggle` - Activar/desactivar

### API Pública
- `GET /api/payment-methods/active` - Obtener métodos activos (JSON)

## Componentes Frontend

### PaymentMethodSelect
Componente reutilizable para seleccionar métodos de pago:

```tsx
<PaymentMethodSelect
    value={form.data.payment_method}
    onValueChange={(value) => form.setData('payment_method', value)}
    error={form.errors.payment_method}
    required
/>
```

### Características del Componente
- Carga automática de métodos activos desde la API
- Estado de carga mientras obtiene datos
- Manejo de errores
- Compatible con formularios de Inertia.js

## Integración con Ventas

### Formularios Actualizados
- ✅ Página de crear venta (`/sales/create`)
- ✅ Página de editar venta (`/sales/edit`)

### Reportes Actualizados
- ✅ Función `getPaymentMethodLabel()` actualizada
- ✅ Compatibilidad con métodos existentes y nuevos

## Navegación

El enlace "Métodos de Pago" se ha agregado al sidebar de navegación, visible solo para administradores.

## Validaciones y Seguridad

### Validaciones del Backend
- Nombre requerido (máximo 255 caracteres)
- Código requerido y único (máximo 50 caracteres)
- Descripción opcional
- Orden de aparición (número entero ≥ 0)
- Estado activo (booleano)

### Protecciones
- Solo administradores pueden gestionar métodos de pago
- Validación antes de eliminar (verifica uso en ventas)
- Soft delete para preservar integridad de datos

## Migración de Datos Existentes

El sistema es compatible con los datos existentes:
- Los métodos hardcodeados (`cash`, `transfer`) se mantienen
- Las ventas existentes siguen funcionando
- Los reportes muestran etiquetas correctas

## Uso del Sistema

### Para Administradores

1. **Acceder a Métodos de Pago**
   - Ir a "Métodos de Pago" en el sidebar
   - Solo visible para administradores

2. **Crear Nuevo Método**
   - Hacer clic en "Nuevo Método de Pago"
   - Completar formulario con nombre, código y descripción
   - Configurar orden de aparición y estado

3. **Editar Método Existente**
   - Hacer clic en el ícono de editar
   - Modificar campos según necesidad
   - Guardar cambios

4. **Activar/Desactivar**
   - Usar el botón de ojo para cambiar estado
   - Los métodos inactivos no aparecen en formularios de venta

5. **Eliminar Método**
   - Solo si no está siendo usado en ventas
   - Confirmación requerida

### Para Vendedores

Los vendedores verán automáticamente los métodos de pago activos en los formularios de venta, sin necesidad de configuración adicional.

## Ventajas del Sistema

1. **Flexibilidad**: Agregar/quitar métodos sin modificar código
2. **Escalabilidad**: Fácil expansión para nuevos métodos de pago
3. **Mantenimiento**: Gestión centralizada de métodos
4. **Compatibilidad**: Funciona con datos existentes
5. **Seguridad**: Validaciones y permisos apropiados
6. **UX**: Interfaz intuitiva para administradores

## Consideraciones Técnicas

### Performance
- Los métodos de pago se cargan una vez por sesión
- Cache implementado en reportes
- Consultas optimizadas

### Compatibilidad
- Funciona con Laravel 10+
- Compatible con Inertia.js
- Soporte para TypeScript

### Extensibilidad
- Fácil agregar nuevos campos
- API preparada para integraciones externas
- Estructura escalable

## Próximas Mejoras Sugeridas

1. **Iconos por Método**: Agregar iconos específicos para cada método
2. **Configuración por Sucursal**: Métodos específicos por sucursal
3. **Integración con Pasarelas**: Conectar con pasarelas de pago reales
4. **Historial de Cambios**: Auditoría de modificaciones
5. **Importación/Exportación**: Masiva de métodos de pago 