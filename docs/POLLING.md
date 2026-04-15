# Polling — Seguimiento de implementación (Opción 1)

Actualización periódica de datos usando `router.reload({ only: [...] })` de Inertia.
El hook `usePolling` en `resources/js/hooks/use-polling.ts` centraliza la lógica:
- Pausa automáticamente si la pestaña está oculta (`document.visibilityState`)
- Se limpia al desmontar el componente

---

## Páginas con polling activo

| Página | Ruta | Props recargadas | Intervalo | Fecha |
|--------|------|-----------------|-----------|-------|
| Dashboard | `/dashboard` | `metrics`, `growth`, `topProducts`, `recentSales`, `lowStockProducts`, `salesByBranch` | 120s | 2026-04-15 |
| Catálogo | `/products` | `products` | 60s | 2026-04-15 |
| Movimientos de Stock | `/stock-movements` | `movements` | 60s | 2026-04-15 |
| POS | `/pos` | `clients`, `currentSession`, `pendingSalesCount` | 60s | 2026-04-15 |
| Ventas | `/sales` | `sales` | 60s | 2026-04-15 |

---

## Páginas candidatas (sin polling aún)

| Página | Ruta | Justificación |
|--------|------|---------------|
| Créditos | `/credits` | Saldos pueden cambiar si otro usuario registra pagos |
| Historial de Caja | `/cash-sessions` | Sesiones abiertas/cerradas por otros usuarios |
| Clientes | `/clients` | Nuevos clientes creados por vendedores |
| Finanzas | `/finances` | Totales cambian con cada venta |
| Proveedores | `/suppliers` | Cambios poco frecuentes — baja prioridad |

---

## Cómo agregar polling a una nueva página

```tsx
import { usePolling } from '@/hooks/use-polling';

export default function MiPagina({ datos }: Props) {
    // Recarga 'datos' cada 60 segundos
    usePolling(['datos'], 60_000);
    // ...
}
```

### Intervalos recomendados

| Tipo de dato | Intervalo sugerido |
|---|---|
| Stock / ventas activas | 30–60s |
| Listas de transacciones | 60s |
| Métricas / dashboard | 120s |
| Datos de configuración | No necesita polling |

---

## Limitaciones del polling

- **No es instantáneo** — delay máximo = intervalo configurado
- **Genera carga constante** — incluso si no hay cambios
- **No escala infinitamente** — con muchos usuarios simultáneos puede estresar el servidor

Para superar estas limitaciones, ver `docs/REVERB.md` (Opción 2 — WebSockets en tiempo real).
