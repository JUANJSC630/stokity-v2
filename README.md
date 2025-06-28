# Stokity v2

![Stokity Logo](/public/stokity-icon.png)

## Acerca de Stokity

Stokity es un sistema de gestión de inventario y ventas diseñado para simplificar la administración de pequeños y medianos negocios. Con una interfaz moderna y fácil de usar, Stokity permite a los usuarios registrar ventas, gestionar productos, administrar sucursales y generar reportes de ventas de manera eficiente.

## Características Principales

- **Dashboard intuitivo**: Vista general del estado del negocio en tiempo real
- **Gestión de usuarios**: Administración de roles y permisos para el equipo
- **Gestión de sucursales**: Control de múltiples locales/sucursales 
- **Gestión de productos**: Inventario, categorías y precios
- **Gestión de clientes**: Base de datos de clientes
- **Registro de ventas**: Interfaz simple para registrar transacciones
- **Reportes**: Análisis de ventas y rendimiento

## Tecnologías

- **Backend**: Laravel 12 (PHP 8.2+)
- **Frontend**: React 19 con InertiaJS
- **Interfaz**: TailwindCSS y Radix UI
- **Base de datos**: SQLite (desarrollo) / MySQL/PostgreSQL (producción)

## Requisitos del Sistema

- PHP 8.2 o superior
- Node.js 
- Composer

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/stokity-v2.git
cd stokity-v2

# Instalar dependencias de PHP
composer install

# Instalar dependencias de JavaScript
npm install

# Configurar el entorno
cp .env.example .env
php artisan key:generate

# Migrar la base de datos
php artisan migrate

# Compilar assets
npm run dev
```

## Uso

Stokity está diseñado para facilitar la gestión diaria de un negocio, permitiendo:

1. **Administrar inventario**: Crear categorías, registrar productos, actualizar existencias
2. **Gestionar ventas**: Registrar nuevas ventas, aplicar descuentos, generar facturas
3. **Administrar clientes**: Mantener registro de clientes frecuentes
4. **Generar reportes**: Analizar ventas por periodos, productos más vendidos, etc.
5. **Gestionar sucursales**: Coordinar el inventario y ventas entre múltiples ubicaciones


## Contribuir

Las contribuciones son bienvenidas. Por favor, siéntete libre de fork el repositorio y enviar pull requests.

## Licencia

[MIT License](LICENSE)
