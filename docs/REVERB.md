# Laravel Reverb — Guía de implementación (Opción 2)

WebSockets en tiempo real usando Laravel Reverb (WebSocket server oficial de Laravel 11).
Reemplaza o complementa el polling de `docs/POLLING.md`.

---

## Arquitectura

```
Usuario A hace una venta
    → Laravel dispara evento: StockActualizado
    → Reverb recibe el evento
    → Reverb lo emite al canal correspondiente
    → Todos los navegadores suscritos reciben la actualización en < 1s
    → Inertia recarga solo los props afectados
```

---

## Instalación

### 1. Instalar Reverb
```bash
php artisan install:broadcasting
```
Esto instala Reverb, Laravel Echo y el cliente JS, y genera `config/reverb.php`.

### 2. Variables de entorno `.env`
```env
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=stokity
REVERB_APP_KEY=stokity-key
REVERB_APP_SECRET=stokity-secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http

# En producción (Railway):
REVERB_HOST=tu-app.railway.app
REVERB_PORT=443
REVERB_SCHEME=https
```

### 3. Instalar dependencias JS
```bash
npm install --save-dev laravel-echo pusher-js
```

### 4. Configurar Echo en el frontend (`resources/js/echo.ts`)
```ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    wssPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
});
```

Agregar variables al `.env` con prefijo `VITE_`:
```env
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

---

## Eventos a implementar

### Inventario / Stock

**`app/Events/StockActualizado.php`**
```php
class StockActualizado implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Product $product,
        public int $previousStock,
        public int $newStock,
        public string $type, // 'venta' | 'movimiento' | 'ajuste'
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('stock'),
            new Channel("branch.{$this->product->branch_id}"),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'product_id' => $this->product->id,
            'name'       => $this->product->name,
            'stock'      => $this->newStock,
            'type'       => $this->type,
        ];
    }
}
```

**Dónde dispararlo:** `StockMovementService` después de cada movimiento.
```php
broadcast(new StockActualizado($product, $prev, $product->stock, $type))->toOthers();
```

---

### Ventas

**`app/Events/VentaCreada.php`**
```php
class VentaCreada implements ShouldBroadcast
{
    public function __construct(public Sale $sale) {}

    public function broadcastOn(): array
    {
        return [new Channel("branch.{$this->sale->branch_id}")];
    }
}
```

**Dónde dispararlo:** `SaleController::store()` después de crear la venta.

---

### Sesiones de caja

**`app/Events/SesionCajaActualizada.php`**
```php
class SesionCajaActualizada implements ShouldBroadcast
{
    public function __construct(
        public CashSession $session,
        public string $action, // 'opened' | 'closed'
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel("branch.{$this->session->branch_id}")];
    }
}
```

---

## Suscripción en el frontend

### Hook reutilizable `useRealtimeReload.ts`
```ts
import { router } from '@inertiajs/react';
import { useEffect } from 'react';

export function useRealtimeReload(
    channel: string,
    event: string,
    only: string[],
) {
    useEffect(() => {
        const ch = window.Echo.channel(channel);
        ch.listen(event, () => {
            router.reload({ only });
        });
        return () => ch.stopListening(event);
    }, [channel, event]);
}
```

### Uso en una página
```tsx
// En products/index.tsx — recarga stock cuando hay un movimiento
useRealtimeReload('stock', 'StockActualizado', ['products']);

// En sales/index.tsx — recarga ventas cuando se crea una
useRealtimeReload(`branch.${branchId}`, 'VentaCreada', ['sales']);

// En pos/index.tsx — recarga sesión cuando se abre/cierra caja
useRealtimeReload(`branch.${branchId}`, 'SesionCajaActualizada', ['currentSession']);
```

---

## Despliegue en Railway

Reverb necesita correr como proceso separado. En Railway se configura con un `Procfile`:

**`Procfile`** (en la raíz del proyecto):
```
web: php artisan serve --host=0.0.0.0 --port=$PORT
reverb: php artisan reverb:start --host=0.0.0.0 --port=8080
queue: php artisan queue:work --sleep=3 --tries=3
```

O usando el panel de Railway: crear un segundo servicio apuntando al mismo repo con el comando de inicio `php artisan reverb:start`.

**Importante:** Reverb necesita un puerto expuesto en Railway. Configurar en las variables de entorno del servicio.

---

## Canales disponibles (diseño propuesto)

| Canal | Tipo | Eventos |
|-------|------|---------|
| `stock` | Público | `StockActualizado` |
| `branch.{id}` | Público | `VentaCreada`, `SesionCajaActualizada`, `StockActualizado` |
| `user.{id}` | Privado | Notificaciones personales |

---

## Migración desde polling

Al implementar Reverb, eliminar los `usePolling()` de las páginas que pasen a usar eventos:

| Página | Reemplaza polling de | Con evento |
|--------|---------------------|-----------|
| Catálogo `/products` | `usePolling(['products'], 60_000)` | `StockActualizado` |
| Ventas `/sales` | `usePolling(['sales'], 60_000)` | `VentaCreada` |
| POS `/pos` | `usePolling(['currentSession'], 60_000)` | `SesionCajaActualizada` |
| Movimientos `/stock-movements` | `usePolling(['movements'], 60_000)` | `StockActualizado` |
| Dashboard `/dashboard` | `usePolling([...], 120_000)` | Múltiples eventos |

---

## Estado de implementación

- [ ] Instalar Reverb (`php artisan install:broadcasting`)
- [ ] Configurar `.env` local y Railway
- [ ] Crear evento `StockActualizado`
- [ ] Crear evento `VentaCreada`
- [ ] Crear evento `SesionCajaActualizada`
- [ ] Crear hook `useRealtimeReload`
- [ ] Aplicar en `products/index.tsx`
- [ ] Aplicar en `sales/index.tsx`
- [ ] Aplicar en `pos/index.tsx`
- [ ] Aplicar en `stock-movements/index.tsx`
- [ ] Aplicar en `dashboard.tsx`
- [ ] Configurar Procfile para Railway
- [ ] Pruebas con múltiples usuarios simultáneos
- [ ] Eliminar polling de páginas migradas
