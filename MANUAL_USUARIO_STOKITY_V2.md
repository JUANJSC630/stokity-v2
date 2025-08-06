# Manual de Usuario - Stokity v2

<img src="/public/stokity-icon.png" alt="Stokity Logo" width="200" height="200">

## Índice

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Roles y Permisos](#roles-y-permisos)
4. [Panel de Control (Dashboard)](#panel-de-control-dashboard)
5. [Gestión de Usuarios](#gestión-de-usuarios)
6. [Gestión de Sucursales](#gestión-de-sucursales)
7. [Gestión de Categorías](#gestión-de-categorías)
8. [Gestión de Productos](#gestión-de-productos)
9. [Gestión de Clientes](#gestión-de-clientes)
10. [Registro de Ventas](#registro-de-ventas)
11. [Devoluciones](#devoluciones)
12. [Reportes de Ventas](#reportes-de-ventas)
13. [Configuración Personal](#configuración-personal)
14. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

**Stokity v2** es un sistema integral de gestión de inventario y ventas diseñado específicamente para simplificar la administración de pequeños y medianos negocios. Con una interfaz moderna, intuitiva y fácil de usar, Stokity permite a los usuarios gestionar eficientemente todos los aspectos de su negocio desde una sola plataforma.

### Características Principales

- **Dashboard intuitivo**: Vista general del estado del negocio en tiempo real
- **Gestión de usuarios**: Administración completa de roles y permisos para el equipo
- **Gestión de sucursales**: Control total de múltiples locales/sucursales 
- **Gestión de productos**: Inventario completo, categorías y control de precios
- **Gestión de clientes**: Base de datos completa de clientes
- **Registro de ventas**: Interfaz simple y rápida para registrar transacciones
- **Sistema de devoluciones**: Control completo de devoluciones y reembolsos
- **Reportes avanzados**: Análisis detallado de ventas y rendimiento
- **Configuración personalizable**: Ajustes de perfil y apariencia

### Tecnologías Utilizadas

- **Backend**: Laravel 12 (PHP 8.2+)
- **Frontend**: React 19 con InertiaJS
- **Interfaz**: TailwindCSS y Radix UI
- **Base de datos**: SQLite (desarrollo) / MySQL/PostgreSQL (producción)

---

## Acceso al Sistema

### Página de Bienvenida

Al acceder a Stokity, verás la página de bienvenida con el logo distintivo y un botón para iniciar sesión.

### Inicio de Sesión

1. Haz clic en **"Iniciar sesión"** desde la página de bienvenida
2. Ingresa tu **correo electrónico** y **contraseña**
3. Opcionalmente, marca **"Recordarme"** para mantener la sesión activa
4. Haz clic en **"Iniciar Sesión"**

### Recuperación de Contraseña

Si olvidaste tu contraseña:
1. En la página de login, haz clic en **"¿Olvidaste tu contraseña?"**
2. Ingresa tu correo electrónico
3. Recibirás un enlace para restablecer tu contraseña
4. Sigue las instrucciones en el correo para crear una nueva contraseña

---

## Roles y Permisos

Stokity maneja tres niveles de acceso diferentes:

### 1. Administrador
- **Acceso completo** a todas las funcionalidades
- Puede gestionar usuarios, sucursales, categorías, productos, clientes y ventas
- Acceso a todos los reportes
- Puede configurar el sistema

**Módulos disponibles:**
- Inicio (Dashboard)
- Usuarios
- Sucursales  
- Categorías
- Productos
- Clientes
- Ventas
- Reportes de Ventas

### 2. Encargado (Manager)
- Acceso a la mayoría de funcionalidades operativas
- No puede gestionar usuarios ni sucursales
- Puede gestionar categorías, productos, clientes y ventas
- Acceso a reportes

**Módulos disponibles:**
- Inicio (Dashboard)
- Categorías
- Productos
- Clientes
- Ventas
- Reportes de Ventas

### 3. Vendedor
- Acceso limitado a funcionalidades de venta
- Puede gestionar clientes y registrar ventas
- No tiene acceso a reportes ni configuración de productos

**Módulos disponibles:**
- Inicio (Dashboard)
- Clientes
- Ventas

---

## Panel de Control (Dashboard)

El Dashboard es la página principal que verás al iniciar sesión. Proporciona una vista general del estado de tu negocio con:

- **Métricas principales** del negocio
- **Gráficos de rendimiento** 
- **Accesos rápidos** a las funciones más utilizadas
- **Resumen de actividad reciente**

### Navegación

La navegación se realiza através del **menú lateral izquierdo**, que incluye:
- Logo de Stokity en la parte superior
- Menú principal con todos los módulos disponibles según tu rol
- Información del usuario en la parte inferior

---

## Gestión de Usuarios

*Solo disponible para Administradores*

### Listar Usuarios

En **Usuarios** podrás ver todos los usuarios del sistema con la siguiente información:
- Nombre y foto de perfil
- Correo electrónico
- Rol asignado
- Sucursal asignada
- Estado (Activo/Inactivo)
- Último acceso

### Crear Nuevo Usuario

1. Haz clic en **"Nuevo Usuario"**
2. Completa el formulario:
   - **Nombre completo**
   - **Correo electrónico** (único en el sistema)
   - **Contraseña**
   - **Rol** (Administrador, Encargado, Vendedor)
   - **Sucursal** (si aplica)
   - **Estado** (Activo/Inactivo)
   - **Foto de perfil** (opcional)
3. Haz clic en **"Guardar"**

### Editar Usuario

1. En la lista de usuarios, haz clic en **"Ver"** o **"Editar"**
2. Modifica los campos necesarios
3. Haz clic en **"Actualizar"**

### Filtros y Búsqueda

- **Búsqueda por texto**: Busca por nombre o correo
- **Filtro por estado**: Todos, Activos, Inactivos
- **Filtro por rol**: Todos los roles o rol específico

---

## Gestión de Sucursales

*Solo disponible para Administradores*

### Crear Nueva Sucursal

1. Ve a **Sucursales** → **"Nueva Sucursal"**
2. Completa la información:
   - **Nombre de la sucursal**
   - **Nombre comercial**
   - **Dirección completa**
   - **Teléfono**
   - **Correo electrónico**
   - **Encargado** (opcional)
   - **Estado** (Activa/Inactiva)
3. Haz clic en **"Guardar"**

### Gestionar Sucursales

- **Ver detalles**: Información completa de la sucursal y empleados asignados
- **Editar**: Modificar información de la sucursal
- **Cambiar estado**: Activar o desactivar sucursales
- **Eliminar**: Eliminar sucursales (soft delete - se pueden restaurar)

### Sucursales Eliminadas

En **Sucursales** → **"Eliminadas"** puedes:
- Ver sucursales eliminadas
- **Restaurar** sucursales eliminadas
- **Eliminar permanentemente** (no se puede deshacer)

---

## Gestión de Categorías

*Disponible para Administradores y Encargados*

### Crear Categoría

1. Ve a **Categorías** → **"Nueva Categoría"**
2. Ingresa:
   - **Nombre de la categoría**
   - **Descripción** (opcional)
   - **Estado** (Activa/Inactiva)
3. Haz clic en **"Guardar"**

### Gestionar Categorías

- **Listar todas** las categorías con filtros
- **Buscar** por nombre
- **Filtrar** por estado (Todas, Activas, Inactivas)
- **Editar** información de categorías
- **Cambiar estado** de categorías
- **Eliminar** categorías (soft delete)

### Categorías Eliminadas

Accede a categorías eliminadas para restaurarlas o eliminarlas permanentemente.

---

## Gestión de Productos

*Disponible para Administradores y Encargados*

### Crear Producto

1. Ve a **Productos** → **"Nuevo Producto"**
2. Completa el formulario:
   - **Código**: Se genera automáticamente o puedes ingresarlo manualmente
   - **Nombre del producto**
   - **Descripción**
   - **Categoría**
   - **Sucursal**
   - **Precio de compra**
   - **Precio de venta**
   - **Stock inicial**
   - **Stock mínimo** (para alertas)
   - **Imagen del producto** (opcional)
   - **Estado** (Activo/Inactivo)
3. Haz clic en **"Guardar"**

### Gestión de Inventario

#### Búsqueda y Filtros
- **Búsqueda por texto**: Código, nombre o descripción
- **Filtro por estado**: Todos, Activos, Inactivos
- **Filtro por categoría**: Todas las categorías o categoría específica
- **Filtro por sucursal**: Todas las sucursales o sucursal específica

#### Actualización de Stock
1. En la vista del producto, haz clic en **"Actualizar Stock"**
2. Selecciona el tipo de operación:
   - **Establecer**: Fijar cantidad exacta
   - **Agregar**: Sumar al stock actual
   - **Restar**: Reducir del stock actual
3. Ingresa la **cantidad**
4. Agrega **notas** explicativas (opcional)
5. Haz clic en **"Actualizar"**

### Productos Eliminados

En **Productos** → **"Eliminados"** puedes gestionar productos eliminados.

---

## Gestión de Clientes

*Disponible para todos los roles*

### Crear Cliente

1. Ve a **Clientes** → **"Nuevo Cliente"**
2. Ingresa la información:
   - **Nombre completo**
   - **Documento de identificación** (único)
   - **Teléfono**
   - **Correo electrónico** (opcional, único)
   - **Dirección**
   - **Fecha de nacimiento** (opcional)
3. Haz clic en **"Guardar"**

### Gestionar Clientes

- **Búsqueda**: Por nombre, documento, correo o teléfono
- **Ver detalles**: Información completa del cliente
- **Editar**: Modificar información del cliente
- **Eliminar**: Eliminar cliente del sistema

### Creación Rápida desde Ventas

Durante el proceso de venta, puedes crear clientes rápidamente sin salir de la pantalla de ventas.

---

## Registro de Ventas

*Disponible para todos los roles*

### Crear Nueva Venta

1. Ve a **Ventas** → **"Nueva Venta"**
2. Completa la información básica:
   - **Sucursal**
   - **Cliente** (seleccionar existente o crear nuevo)
   - **Vendedor**
   - **Fecha de venta**

### Agregar Productos

1. **Buscar productos**: Escribe el nombre o código del producto
2. **Seleccionar producto** de los resultados
3. **Especificar cantidad**
4. **Agregar a la venta**
5. Repetir para todos los productos

### Información de Pago

- **Método de pago**: Efectivo, Tarjeta de crédito, Tarjeta de débito, Transferencia, Otro
- **Subtotal**: Se calcula automáticamente
- **Impuestos**: Configurables
- **Total**: Cálculo automático
- **Monto pagado**: Solo requerido para pagos en efectivo
- **Vuelto**: Se calcula automáticamente para efectivo

### Finalizar Venta

1. Revisa todos los productos y cantidades
2. Verifica el método de pago y montos
3. Haz clic en **"Registrar Venta"**
4. La venta se guardará y se actualizará automáticamente el inventario

### Gestionar Ventas

#### Lista de Ventas
- **Ver todas las ventas** con información resumida
- **Filtros avanzados**:
  - Búsqueda por código de venta
  - Filtro por estado (Completada, Pendiente, Cancelada)
  - Filtro por rango de fechas
  - Filtro por vendedor
  - Filtro por cliente

#### Detalles de Venta
- **Información completa** de la venta
- **Productos vendidos** con cantidades y precios
- **Información de pago**
- **Historial de devoluciones** (si las hay)

#### Estados de Venta
- **Completada**: Venta finalizada exitosamente
- **Pendiente**: Venta registrada pero pendiente de pago
- **Cancelada**: Venta cancelada (por devolución total)

---

## Devoluciones

### Procesar Devolución

1. Ve a la **venta específica** desde **Ventas**
2. En los detalles de la venta, haz clic en **"Procesar Devolución"**
3. Selecciona los **productos a devolver**:
   - Marca cada producto que se va a devolver
   - Especifica la **cantidad** (no puede exceder lo vendido)
4. Ingresa el **motivo de la devolución** (opcional)
5. Haz clic en **"Procesar Devolución"**

### Efectos de la Devolución

- **Stock**: Se restaura automáticamente al inventario
- **Estado de venta**: 
  - Si es devolución parcial: La venta mantiene estado "Completada"
  - Si es devolución total: La venta cambia a "Cancelada"

### Imprimir Recibo de Devolución

Después de procesar una devolución, puedes imprimir un recibo en impresora térmica (ESC/POS).

---

## Reportes de Ventas

*Disponible para Administradores y Encargados*

### Tipos de Reportes

1. **Reporte por fechas**: Ventas en un período específico
2. **Reporte por productos**: Productos más vendidos
3. **Reporte por vendedores**: Rendimiento de vendedores
4. **Reporte por sucursales**: Comparativo entre sucursales

### Filtros Disponibles

- **Rango de fechas**: Personalizado o predefinido (hoy, esta semana, este mes, etc.)
- **Sucursal específica**
- **Vendedor específico**
- **Categoría de productos**
- **Estado de ventas**

### Exportar Reportes

Los reportes se pueden exportar en diferentes formatos:
- **Excel** (.xlsx)
- **PDF**
- **CSV**

---

## Configuración Personal

### Perfil de Usuario

En **Configuración** → **"Perfil"** puedes:

1. **Información personal**:
   - Cambiar nombre
   - Actualizar correo electrónico
   - Subir foto de perfil

2. **Cambiar contraseña**:
   - Ingresar contraseña actual
   - Nueva contraseña
   - Confirmar nueva contraseña

### Configuración de Apariencia

En **Configuración** → **"Apariencia"** puedes:
- **Tema**: Claro, Oscuro o Automático (según sistema)
- **Imagen por defecto**: Para productos sin imagen

---

## Preguntas Frecuentes

### ¿Cómo restablezco mi contraseña?

1. En la página de login, haz clic en "¿Olvidaste tu contraseña?"
2. Ingresa tu correo electrónico
3. Revisa tu correo para el enlace de restablecimiento
4. Sigue las instrucciones para crear una nueva contraseña

### ¿Puedo eliminar una venta?

Sí, pero solo los administradores pueden eliminar ventas. Al eliminar una venta, el stock de los productos se restaura automáticamente.

### ¿Cómo funciona el sistema de roles?

- **Administrador**: Acceso completo a todo el sistema
- **Encargado**: Acceso a operaciones diarias, sin gestión de usuarios/sucursales
- **Vendedor**: Solo acceso a clientes y ventas

### ¿Qué pasa si se agota el stock de un producto?

El sistema no permitirá vender más cantidad de la disponible en stock. Aparecerá un mensaje de error indicando el stock disponible.

### ¿Puedo tener múltiples sucursales?

Sí, los administradores pueden crear y gestionar múltiples sucursales. Cada producto y usuario puede estar asignado a una sucursal específica.

### ¿Cómo se calculan los reportes?

Los reportes se calculan en tiempo real basándose en:
- Ventas completadas
- Rango de fechas seleccionado
- Filtros aplicados (sucursal, vendedor, etc.)

### ¿Puedo deshacer una devolución?

No, las devoluciones no se pueden deshacer una vez procesadas. Sin embargo, puedes realizar una nueva venta con los mismos productos si es necesario.

### ¿El sistema funciona sin internet?

No, Stokity v2 es una aplicación web que requiere conexión a internet para funcionar correctamente.

---

## Soporte Técnico

Para soporte técnico adicional o reportar problemas:

1. **Contacta al administrador** de tu sistema
2. **Revisa los logs** del sistema si tienes acceso
3. **Documenta el problema** con capturas de pantalla si es posible

---

*© 2024 Stokity v2. Todos los derechos reservados.* 