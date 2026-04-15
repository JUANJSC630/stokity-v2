# Auditoría de Roles y Permisos — Stokity v2

> **Fecha:** Abril 2026  
> **Sistema:** POS Multi-Sucursal — Laravel 12 + React 19 + Inertia.js  
> **Roles:** `administrador`, `encargado`, `vendedor`

---

## 1. Definición de Roles

| Rol | Descripción | Alcance de datos |
|-----|-------------|-----------------|
| **administrador** | Control total del sistema. Gestiona usuarios, sucursales, configuración global y ve datos de todas las sucursales. | Global — todas las sucursales |
| **encargado** | Gestiona inventario, finanzas y ventas de su sucursal. No puede tocar usuarios ni configuración global. | Solo su sucursal asignada |
| **vendedor** | Opera el POS, crea ventas, gestiona clientes y créditos. Sin acceso a reportes ni finanzas. | Solo su sucursal asignada |

---

## 2. Cómo funciona la autorización

La app usa **tres capas** de control de acceso:

1. **Middleware de ruta** — Bloquea el acceso antes de llegar al controlador.
   - `AdminMiddleware` → Solo `administrador`.
   - `AdminOrManagerMiddleware` → `administrador` o `encargado`.
   - `BranchFilterMiddleware` → No bloquea; inyecta `branch_id` del usuario para que el controlador filtre.

2. **Checks inline en controladores** — `abort(403)` cuando el usuario accede a un recurso de otra sucursal o sin el rol requerido.

3. **Filtrado de navegación en frontend** — `NavMain.tsx` filtra los ítems del sidebar por `item.roles`. **No es seguridad por sí solo** — el backend siempre valida.

---

## 3. Métodos de rol (User model)

```php
$user->isAdmin()    // role === 'administrador'
$user->isManager()  // role === 'encargado'
$user->isSeller()   // role === 'vendedor'
```

---

## 4. Matriz completa de acceso por módulo

### 4.1 Dashboard `/dashboard`

| Qué ve / puede hacer | Admin | Encargado | Vendedor |
|----------------------|-------|-----------|---------|
| Acceder al dashboard | ✅ | ✅ | ✅ |
| Métricas de ventas del día/mes | ✅ Todas las sucursales | ✅ Solo su sucursal | ✅ Solo su sucursal |
| Filtro por sucursal | ✅ | ❌ | ❌ |
| Productos con stock bajo | ✅ Todas | ✅ Su sucursal | ✅ Su sucursal |
| Ventas recientes | ✅ Todas | ✅ Su sucursal | ✅ Su sucursal |
| Top productos vendidos | ✅ Todas | ✅ Su sucursal | ✅ Su sucursal |
| Conteo de usuarios del sistema | ✅ | ✅ | ✅ |

---

### 4.2 Usuarios `/users`

> Middleware: `auth` + checks inline `abort(403)` si no es admin.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver listado de usuarios | ✅ | ❌ 403 | ❌ 403 |
| Crear usuario (todos los roles) | ✅ | ❌ | ❌ |
| Editar usuario | ✅ | ❌ | ❌ |
| Cambiar rol de usuario | ✅ | ❌ | ❌ |
| Asignar usuario a sucursal | ✅ | ❌ | ❌ |
| Archivar / eliminar usuario | ✅ | ❌ | ❌ |
| Eliminarse a sí mismo | ❌ Bloqueado | ❌ | ❌ |
| Ver perfil propio | ✅ (`/settings/profile`) | ❌ ruta bloqueada | ❌ ruta bloqueada |

**Nota:** Al asignar rol `encargado`, el sistema vincula ese usuario como manager de la sucursal elegida (`manager_id`). Al removerle el rol, se limpia el `manager_id` de la sucursal.

---

### 4.3 Sucursales `/branches`

> Middleware: `auth` + `AdminMiddleware`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver listado de sucursales | ✅ | ❌ 403 | ❌ 403 |
| Crear sucursal | ✅ | ❌ | ❌ |
| Editar sucursal | ✅ | ❌ | ❌ |
| Asignar encargado a sucursal | ✅ | ❌ | ❌ |
| Desactivar / eliminar sucursal (soft) | ✅ | ❌ | ❌ |
| Restaurar sucursal eliminada | ✅ | ❌ | ❌ |
| Eliminación permanente (force delete) | ✅ | ❌ | ❌ |
| Ver papelera de sucursales | ✅ | ❌ | ❌ |

---

### 4.4 Categorías de Productos `/categories`

> Middleware: `auth` + `AdminOrManagerMiddleware`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver listado | ✅ | ✅ | ❌ 403 |
| Crear categoría | ✅ | ✅ | ❌ |
| Editar categoría | ✅ | ✅ | ❌ |
| Eliminar categoría (soft) | ✅ | ✅ | ❌ |
| Restaurar categoría | ✅ | ✅ | ❌ |
| Papelera de categorías | ✅ | ✅ | ❌ |

---

### 4.5 Productos / Catálogo `/products`

> Middleware: `auth` + `BranchFilterMiddleware`. Rutas de gestión añaden `AdminOrManagerMiddleware`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver listado de productos | ✅ Todas las sucursales | ✅ Solo su sucursal | ❌ No aparece en sidebar |
| Filtrar por sucursal | ✅ | ❌ | ❌ |
| Buscar productos (API `/api/products/search`) | ✅ | ✅ | ✅ (usado en POS) |
| Crear producto | ✅ | ✅ | ❌ 403 |
| Editar producto | ✅ | ✅ | ❌ 403 |
| Subir imagen de producto | ✅ | ✅ | ❌ |
| Eliminar producto (soft) | ✅ | ✅ | ❌ 403 |
| Restaurar producto | ✅ | ✅ | ❌ 403 |
| Force delete producto | ✅ | ✅ | ❌ 403 |
| Ajustar stock manualmente | ✅ | ✅ | ❌ 403 |
| Sincronizar proveedores del producto | ✅ | ✅ | ❌ 403 |
| Generar código de producto automático | ✅ | ✅ | ❌ 403 |
| Ver papelera de productos | ✅ | ✅ | ❌ 403 |

---

### 4.6 Clientes `/clients`

> Middleware: `auth` únicamente. Sin `AdminOrManagerMiddleware`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver listado de clientes | ✅ | ✅ | ✅ |
| Crear cliente | ✅ | ✅ | ✅ |
| Editar cliente | ✅ | ✅ | ✅ |
| Eliminar cliente | ✅ | ✅ | ✅ |
| Ver detalle del cliente (historial de compras) | ✅ Ventas de todas las sucursales | ✅ Solo ventas de su sucursal | ✅ Solo ventas de su sucursal |

**Nota importante:** Los clientes **no son por sucursal** — son globales. Cualquier rol puede crear, editar y eliminar cualquier cliente. Las ventas en el detalle del cliente sí se filtran por sucursal del usuario.

---

### 4.7 POS — Punto de Venta `/pos`

> Middleware: `auth` + `verified` + `BranchFilterMiddleware`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Acceder al POS | ✅ | ✅ | ✅ |
| Crear venta | ✅ | ✅ | ✅ |
| Aplicar descuento a venta | ✅ | ✅ | ✅ |
| Agregar nota a venta | ✅ | ✅ | ✅ |
| Guardar cotización (venta pendiente) | ✅ | ✅ | ✅ |
| Venta a crédito | ✅ | ✅ | ✅ |
| Seleccionar método de pago | ✅ | ✅ | ✅ |
| Ver e imprimir recibo tras venta | ✅ | ✅ | ✅ |
| Auto-impresión tras venta (QZ Tray) | ✅ | ✅ | ✅ |
| Ver cotizaciones pendientes de su sucursal | ✅ | ✅ | ✅ |
| Selector de sucursal en POS | ✅ (puede elegir) | ❌ Solo la suya | ❌ Solo la suya |
| Abrir/cerrar sesión de caja desde POS | ✅ | ✅ | ✅ |
| Movimientos de caja desde POS (ingreso/egreso) | ✅ | ✅ | ✅ |

---

### 4.8 Ventas `/sales`

> Middleware: `auth` + `verified` + `BranchFilterMiddleware`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver historial de ventas | ✅ Todas las sucursales | ✅ Solo su sucursal | ✅ Solo su sucursal |
| Filtrar por sucursal | ✅ | ❌ | ❌ |
| Ver detalle de una venta | ✅ Cualquier sucursal | ✅ Solo su sucursal | ✅ Solo su sucursal |
| Crear venta (desde listado) | ✅ | ✅ | ✅ |
| **Editar venta completada** | ✅ | ❌ 403 | ❌ 403 |
| **Eliminar venta completada** | ✅ | ❌ 403 | ❌ 403 |
| Completar cotización pendiente | ✅ | ✅ | ✅ |
| Actualizar cotización pendiente | ✅ | ✅ | ✅ |
| Eliminar cotización pendiente | ✅ | ✅ | ✅ |
| Registrar devolución de venta | ✅ | ✅ (su sucursal) | ✅ (su sucursal) |
| Imprimir recibo de venta | ✅ | ✅ (su sucursal) | ✅ (su sucursal) |
| Imprimir recibo de devolución | ✅ | ✅ (su sucursal) | ✅ (su sucursal) |

**Importante:** Editar y eliminar ventas **completadas** es exclusivo del administrador. Encargados y vendedores solo pueden gestionar cotizaciones pendientes.

---

### 4.9 Sesiones de Caja `/cash-sessions`

> Middleware: `auth` + `verified` + `BranchFilterMiddleware`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver historial de sesiones | ✅ Todas las sucursales | ✅ Solo su sucursal | ✅ Solo las suyas |
| Abrir sesión de caja | ✅ | ✅ | ✅ |
| Ver detalle de una sesión | ✅ Cualquier sesión | ✅ Sesiones de su sucursal | ✅ Solo sus propias sesiones |
| Ver monto esperado al cierre | ✅ | ✅ | ❌ **Cierre ciego** |
| Cerrar sesión de caja | ✅ | ✅ (su sesión o su sucursal) | ✅ Solo su propia sesión |
| Registrar movimiento (ingreso/egreso) | ✅ | ✅ (su sesión) | ✅ Solo su sesión |
| Imprimir reporte de sesión | ✅ | ✅ (su sucursal) | ✅ (su sesión) |

**Detalle importante — Cierre Ciego:** Los vendedores NO ven el monto esperado en caja al cerrar. Solo ingresan el monto contado. El encargado/admin sí ve la diferencia.

**Acceso a sesiones ajenas:**
- Admin → Cualquier sesión.
- Encargado → Sesiones de su sucursal, incluso las abiertas por vendedores.
- Vendedor → Solo sus propias sesiones (abort 403 si intenta ver la de otro).

---

### 4.10 Créditos `/credits`

> Middleware: `auth` + `verified` + `BranchFilterMiddleware`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver listado de créditos | ✅ Todas las sucursales | ✅ Solo su sucursal | ✅ Solo su sucursal |
| Ver cuentas por cobrar | ✅ | ✅ (su sucursal) | ✅ (su sucursal) |
| Crear crédito | ✅ | ✅ | ✅ |
| Ver detalle de crédito | ✅ | ✅ (su sucursal) | ✅ (su sucursal) |
| Registrar pago de crédito | ✅ | ✅ (su sucursal) | ✅ (su sucursal) |
| **Cancelar crédito** | ✅ | ✅ | ❌ 403 |
| Ver conteo de créditos vencidos | ✅ | ✅ | ✅ |
| Imprimir recibo de crédito | ✅ | ✅ (su sucursal) | ✅ (su sucursal) |
| Imprimir recibo de pago de crédito | ✅ | ✅ (su sucursal) | ✅ (su sucursal) |

**Cancelar crédito:** Exclusivo para Admin y Encargado. Los vendedores reciben 403 si lo intentan.

---

### 4.11 Proveedores `/suppliers`

> Middleware: `auth` únicamente (sin `AdminOrManagerMiddleware`). La sidebar los oculta a vendedores, pero la ruta no tiene middleware de rol.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver listado de proveedores | ✅ Todos | ✅ Su sucursal | ⚠️ Ruta accesible por URL (sidebar oculto) |
| Filtrar por sucursal | ✅ | ❌ | ❌ |
| Crear proveedor | ✅ | ✅ (su sucursal) | ⚠️ No bloqueado por middleware |
| Editar proveedor | ✅ | ✅ (su sucursal) | ⚠️ abort(403) si branch mismatch |
| Eliminar proveedor | ✅ | ✅ (su sucursal) | ⚠️ abort(403) si branch mismatch |

> **⚠️ Gap:** La ruta no tiene `AdminOrManagerMiddleware`. Un vendedor con `branch_id` asignado podría crear proveedores para su propia sucursal accediendo directamente por URL. La sidebar no lo muestra pero no hay bloqueo de middleware.

---

### 4.12 Movimientos de Stock `/stock-movements`

> Middleware: `auth` + `BranchFilterMiddleware`. Rutas de creación añaden `AdminOrManagerMiddleware`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver listado de movimientos | ✅ Todas las sucursales | ✅ Solo su sucursal | ✅ Solo su sucursal |
| Ver estadísticas de movimientos | ✅ | ✅ | ✅ |
| Ver movimientos de un producto | ✅ | ✅ | ✅ |
| **Crear movimiento de stock** | ✅ | ✅ | ❌ 403 |
| Ver detalle de movimiento | ✅ | ✅ | ❌ 403 |

---

### 4.13 Métodos de Pago `/payment-methods`

> Middleware: `auth` + `AdminMiddleware`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver listado | ✅ | ❌ 403 | ❌ 403 |
| Crear método de pago | ✅ | ❌ | ❌ |
| Editar método | ✅ | ❌ | ❌ |
| Activar / desactivar método | ✅ | ❌ | ❌ |
| Eliminar método | ✅ | ❌ | ❌ |
| Reordenar métodos | ✅ | ❌ | ❌ |
| Consultar métodos activos (API `/api/payment-methods/active`) | ✅ | ✅ | ✅ (usado en POS) |

---

### 4.14 Finanzas `/finances`

> Middleware: `auth` + `verified` + `AdminOrManagerMiddleware`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver dashboard P&L (ingresos, costos, utilidad) | ✅ Todas las sucursales | ✅ Solo su sucursal | ❌ 403 |
| Filtrar por sucursal | ✅ | ❌ | ❌ |
| Filtrar por período (semana/mes/año/personalizado) | ✅ | ✅ | ❌ |
| Ver desglose de gastos por categoría | ✅ | ✅ | ❌ |
| Ver cuentas por cobrar en resumen financiero | ✅ | ✅ | ❌ |
| Registrar gastos fijos desde el dashboard | ✅ | ✅ | ❌ |

---

### 4.15 Gastos `/expenses`, `/expense-templates`, `/expense-categories`

> Middleware: `auth` + `verified` + `AdminOrManagerMiddleware`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Ver historial de gastos | ✅ Todas las sucursales | ✅ Solo su sucursal | ❌ 403 |
| Filtrar gastos por sucursal/categoría/fecha | ✅ | ✅ (sin filtro de sucursal) | ❌ |
| Crear gasto | ✅ | ✅ | ❌ |
| Editar gasto | ✅ | ✅ (su sucursal) | ❌ |
| Eliminar gasto (soft delete + motivo) | ✅ | ✅ (su sucursal) | ❌ |
| Ver gastos fijos / plantillas | ✅ | ✅ | ❌ |
| Crear plantilla de gasto fijo | ✅ | ✅ | ❌ |
| Editar plantilla | ✅ | ✅ (su sucursal) | ❌ |
| Eliminar plantilla (soft delete + motivo) | ✅ | ✅ (su sucursal) | ❌ |
| Des-registrar pago mensual de plantilla | ✅ | ✅ (su sucursal) | ❌ |
| Registrar gastos fijos del mes en bloque | ✅ | ✅ | ❌ |
| Ver categorías de gastos | ✅ | ✅ | ❌ |
| Crear categoría de gastos | ✅ | ✅ | ❌ |
| Editar categoría de gastos (no de sistema) | ✅ | ✅ | ❌ |
| Eliminar categoría (soft delete + motivo) | ✅ | ✅ | ❌ |
| Editar/eliminar categorías de sistema | ❌ Bloqueado | ❌ | ❌ |

---

### 4.16 Reportes `/reports`

> Middleware: `auth` + `verified` + `BranchFilterMiddleware`. Los reportes no tienen `AdminOrManagerMiddleware` en el middleware de ruta, pero el controller hace `abort(403)` si el usuario no es admin en el reporte de sucursales.

| Reporte | Admin | Encargado | Vendedor |
|---------|-------|-----------|---------|
| Dashboard principal de reportes | ✅ | ✅ | ❌ Sidebar oculto |
| Detalle de ventas | ✅ Todas | ✅ Su sucursal | ❌ |
| Reporte de productos | ✅ Todas | ✅ Su sucursal | ❌ |
| Reporte de vendedores | ✅ Todas | ✅ Su sucursal | ❌ |
| **Reporte de sucursales** | ✅ | ❌ (sidebar oculto + 403 en controller) | ❌ |
| Balance de caja | ✅ Todas | ✅ Su sucursal | ❌ |
| Reporte de devoluciones | ✅ Todas | ✅ Su sucursal | ❌ |
| Exportar a PDF / Excel | ✅ | ✅ | ❌ |
| Filtrar por sucursal en reportes | ✅ | ❌ | ❌ |
| Filtrar por período (fecha desde/hasta) | ✅ | ✅ | ❌ |

> **Nota:** Los reportes no tienen `AdminOrManagerMiddleware` en el router, pero el controller del reporte de sucursales sí hace `abort(403)`. El vendedor podría técnicamente acceder a otras rutas de reportes por URL directo — el backend filtraría sus datos pero no lo bloquearía completamente.

---

### 4.17 Configuración `/settings`

> Middleware: `auth` + `AdminMiddleware` en todas las rutas de settings.

| Sección | Admin | Encargado | Vendedor |
|---------|-------|-----------|---------|
| Perfil del negocio (nombre, NIT, dirección, logo) | ✅ | ❌ 403 | ❌ 403 |
| Apariencia (colores, imagen default productos) | ✅ | ❌ | ❌ |
| Contraseña (cambiar contraseña) | ✅ | ❌ | ❌ |
| Configuración de impresora | ✅ | ❌ | ❌ |
| Plantilla de ticket (logo, campos, pie de página) | ✅ | ❌ | ❌ |
| Requerir sesión de caja (toggle) | ✅ | ❌ | ❌ |

> **Gap:** Los encargados y vendedores **no pueden cambiar su propia contraseña ni su perfil**. No existe una ruta `/profile` sin `AdminMiddleware`. Si necesitan cambiar contraseña, deben pedírselo al admin.

---

### 4.18 Impresión / Recibos `/print`, `/qz`

> Certificado QZ es público. Rutas de impresión requieren `auth` + `verified`.

| Acción | Admin | Encargado | Vendedor |
|--------|-------|-----------|---------|
| Descargar certificado QZ Tray | ✅ Público | ✅ Público | ✅ Público |
| Firmar solicitud QZ (para conectar impresora) | ✅ | ✅ | ✅ |
| Imprimir recibo de venta | ✅ Cualquier sucursal | ✅ Solo su sucursal | ✅ Solo su sucursal |
| Imprimir recibo de devolución | ✅ Cualquier sucursal | ✅ Solo su sucursal | ✅ Solo su sucursal |
| Imprimir reporte de sesión de caja | ✅ Cualquier sesión | ✅ Solo su sucursal | ✅ Solo sus sesiones |
| Imprimir recibo de crédito | ✅ | ✅ Su sucursal | ✅ Su sucursal |
| Imprimir recibo de pago de crédito | ✅ | ✅ Su sucursal | ✅ Su sucursal |
| Imprimir ticket de prueba | ✅ | ✅ | ✅ |

---

## 5. Navegación lateral (sidebar) por rol

Lo que **ve** cada rol en el menú:

| Ítem de menú | Admin | Encargado | Vendedor |
|--------------|-------|-----------|---------|
| Inicio | ✅ | ✅ | ✅ |
| Usuarios | ✅ | ❌ | ❌ |
| Sucursales | ✅ | ❌ | ❌ |
| Categorías (productos) | ✅ | ✅ | ❌ |
| Catálogo (productos) | ✅ | ✅ | ❌ |
| Clientes | ✅ | ✅ | ✅ |
| POS | ✅ | ✅ | ✅ |
| Historial de Caja | ✅ | ✅ | ✅ |
| Ventas | ✅ | ✅ | ✅ |
| Créditos | ✅ | ✅ | ✅ |
| Proveedores | ✅ | ✅ | ❌ |
| Movimientos de Stock | ✅ | ✅ | ❌ |
| Métodos de Pago | ✅ | ❌ | ❌ |
| Finanzas | ✅ | ✅ | ❌ |
| Gastos (menú) | ✅ | ✅ | ❌ |
| — Historial de gastos | ✅ | ✅ | ❌ |
| — Gastos fijos | ✅ | ✅ | ❌ |
| — Categorías de gastos | ✅ | ✅ | ❌ |
| Reportes (menú) | ✅ | ✅ | ❌ |
| — Principal | ✅ | ✅ | ❌ |
| — Detalle de Ventas | ✅ | ✅ | ❌ |
| — Productos | ✅ | ✅ | ❌ |
| — Vendedores | ✅ | ✅ | ❌ |
| — Sucursales | ✅ | ❌ | ❌ |
| — Balance de Caja | ✅ | ✅ | ❌ |
| — Devoluciones | ✅ | ✅ | ❌ |
| Configuración | ✅ | ❌ | ❌ |

---

## 6. Resumen ejecutivo por rol

### Administrador
Acceso irrestricto a todo el sistema. Es el único que puede:
- Crear y gestionar usuarios y sucursales
- Configurar el negocio (ticket, logo, colores, impresora)
- Gestionar métodos de pago
- Editar o eliminar ventas ya completadas
- Ver datos globales de todas las sucursales
- Ver el reporte comparativo de sucursales
- Acceder a cualquier recurso de cualquier sucursal

### Encargado
Gestiona su sucursal asignada. Tiene acceso operativo y gerencial:
- Puede crear/editar productos, categorías y proveedores de su sucursal
- Accede a finanzas, gastos y reportes de su sucursal
- Puede cancelar créditos (los vendedores no)
- Ve el monto esperado al cierre de caja (los vendedores no)
- Puede ver y gestionar sesiones de caja de cualquier vendedor de su sucursal
- **No puede** ver ni gestionar datos de otras sucursales
- **No puede** modificar configuración del sistema ni gestionar usuarios

### Vendedor
Rol operativo puro. Solo opera el día a día:
- Accede al POS, crea ventas y devoluciones
- Gestiona clientes y créditos
- Registra pagos de créditos (no puede cancelarlos)
- Abre y cierra su propia sesión de caja
- Cierre **ciego** — no ve el monto esperado en caja
- Solo puede ver sus propias sesiones de caja
- **No puede** crear ni editar productos
- **No puede** acceder a reportes ni finanzas
- **No puede** cancelar créditos ni editar ventas completadas

---

## 7. Gaps y observaciones de seguridad

### 🟡 Proveedores — sin middleware de rol en ruta
La ruta `/suppliers` solo tiene `auth`. Un vendedor que conozca la URL podría crear proveedores para su sucursal. El sidebar lo oculta pero no hay bloqueo server-side en la ruta. **Recomendación:** Agregar `AdminOrManagerMiddleware`.

### 🟡 Reportes — vendedores sin bloqueo completo en middleware
Las rutas de reportes usan `BranchFilterMiddleware` pero no `AdminOrManagerMiddleware`. Un vendedor podría acceder a `/reports/sales-detail` por URL y vería sus propios datos filtrados. **Recomendación:** Agregar `AdminOrManagerMiddleware` al grupo de reportes.

### 🟡 Clientes — globales sin restricción de sucursal
Cualquier rol puede crear, editar y eliminar cualquier cliente del sistema. No hay aislamiento por sucursal en clientes. Esto puede ser intencional (clientes compartidos entre sucursales), pero conviene documentarlo como decisión de diseño.

### 🟡 Perfil propio para encargados/vendedores — inexistente
No hay una ruta de perfil propio para roles distintos al admin. Si un encargado o vendedor necesita cambiar su contraseña, debe pedírselo al admin. **Recomendación:** Crear rutas `/account/password` y `/account/profile` para todos los roles autenticados.

### ✅ Ventas completadas protegidas
Editar y eliminar ventas ya completadas requiere ser admin. Encargados y vendedores reciben 403. Buena protección de integridad financiera.

### ✅ Cierre ciego para vendedores
Los vendedores no ven el monto esperado en caja, lo que previene manipulación del conteo. Bien implementado.

### ✅ Eliminación de datos financieros — ahora con trazabilidad
Gastos, plantillas y categorías usan soft delete con `deleted_by`, `deleted_at` y `deletion_reason`. Los datos no se pierden permanentemente.

### ✅ Auto-eliminación de admin bloqueada
`UserController::destroy()` previene que un admin se elimine a sí mismo.

---

## 8. Patrones de autorización usados en el código

| Patrón | Ejemplo | Dónde se usa |
|--------|---------|-------------|
| Middleware de ruta | `AdminMiddleware` | Usuarios, Sucursales, Configuración, Métodos de Pago |
| Middleware combinado | `AdminOrManagerMiddleware` | Productos, Finanzas, Gastos, Reportes |
| Filtro de datos por sucursal | `where('branch_id', $user->branch_id)` | Productos, Ventas, Créditos, Gastos |
| Bloqueo de recurso individual | `abort_if(!$user->isAdmin() && $sale->branch_id !== $user->branch_id, 403)` | Ventas, Créditos, Sesiones de Caja |
| Datos condicionales por rol | `$user->isSeller() ? null : $expectedCash` | Cierre de caja |
| Filtro de navegación en UI | `item.roles.includes(userRole)` | Sidebar (NavMain.tsx) |
