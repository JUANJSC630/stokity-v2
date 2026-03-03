# Stokity v2

Sistema POS e inventario multi-sucursal para pequeños y medianos negocios.

**Stack:** Laravel 12 · React 19 · Inertia.js · TailwindCSS · Radix UI

---

## Requisitos

- PHP 8.2+
- Composer
- Node.js 20+
- [Laravel Herd](https://herd.laravel.com/) (recomendado para macOS/Windows)

---

## Inicio rápido

```bash
# 1. Instalar dependencias
composer install
npm install

# 2. Configurar entorno
cp .env.example .env
php artisan key:generate

# 3. Base de datos
php artisan migrate
php artisan db:seed        # Carga usuarios, productos y datos de prueba

# 4. Enlace de archivos públicos
php artisan storage:link

# 5. Servidor de desarrollo (dos terminales)
php artisan serve          # Terminal 1 — Laravel en http://localhost:8000
npm run dev                # Terminal 2 — Vite HMR
```

> **Con Laravel Herd:** el servidor PHP corre automáticamente en `https://stokity-v2.test`, solo ejecutar `npm run dev`.

---

## Credenciales de prueba

Los seeders crean un usuario por cada rol. Ver contraseñas en `database/seeders/UserSeeder.php`.

| Rol | Acceso |
|-----|--------|
| `administrador` | Todo el sistema, todas las sucursales |
| `encargado` | Productos, ventas y stock de su sucursal |
| `vendedor` | Crear ventas y ver productos de su sucursal |

---

## Comandos útiles

```bash
php artisan migrate:fresh --seed   # Reset completo de BD con datos de prueba
php artisan route:list             # Ver todos los endpoints
php artisan tinker                 # REPL interactivo

npm run types                      # Verificar tipos TypeScript
npm run lint                       # Corregir errores ESLint
npm run format                     # Formatear código con Prettier
npm run build                      # Build de producción
```

---

## Estructura principal

```
app/Http/Controllers/   # 23 controladores (negocio, auth, settings)
app/Http/Middleware/     # RBAC + filtro por sucursal
app/Models/             # 12 modelos Eloquent
database/migrations/    # 18 migraciones
database/seeders/       # 9 seeders
resources/js/pages/     # Páginas React (Inertia)
resources/js/components/ # Componentes UI reutilizables
routes/                 # 13 archivos de rutas
```

---

## Funcionalidades principales

- **Dashboard** — Métricas del día/mes, top productos, alertas de stock bajo, gráfico 7 días
- **Ventas** — Carrito multi-producto, métodos de pago dinámicos (Nequi, Daviplata, PSE, etc.), devoluciones, impresión térmica ESC/POS
- **Inventario** — CRUD de productos, movimientos de stock con audit trail, alertas de stock mínimo
- **Clientes** — Base de datos con historial de compras
- **Reportes** — Por ventas, productos, vendedor, sucursal y devoluciones con exportación PDF/Excel
- **Multi-sucursal** — Cada usuario ve solo datos de su sucursal asignada
- **Roles** — `administrador`, `encargado`, `vendedor` con permisos diferenciados

---

## Documentación adicional

Ver [`PLAN.md`](PLAN.md) para el review completo del sistema, bugs conocidos y plan de mejoras.

---

## Licencia

[MIT License](LICENSE)
