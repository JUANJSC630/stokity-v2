# Frontend Testing — Stokity v2

> Última actualización: 2026-03-21
> Stack: React 19 · TypeScript · Inertia.js · Tailwind v4 · Vite 6

---

## Estado actual

| Capa | Herramienta | Estado |
|------|-------------|--------|
| TypeScript (análisis estático) | `tsc --noEmit` | ✅ Disponible — solo ejecutar |
| ESLint (calidad de código) | `eslint resources/js` | ✅ Disponible — solo ejecutar |
| Unit tests (hooks, utilidades) | Vitest + Testing Library | ❌ No instalado |
| E2E / integración | Playwright | ❌ Roadmap futuro |

---

## Enfoque de verificación

Dado que no hay tests instalados, la verificación se hace en **3 capas**:

```
Capa 1 — Análisis estático (TypeScript + ESLint)   ← ejecutar ahora, sin instalar nada
Capa 2 — Unit tests (Vitest + Testing Library)     ← instalar e implementar
Capa 3 — Checklist de QA manual                   ← verificar en browser antes del lanzamiento
```

---

## Capa 1 — Análisis estático

### Comandos (sin instalar nada adicional)

```bash
# TypeScript — errores de tipo en todo el proyecto
npx tsc --noEmit

# ESLint — calidad y reglas de hooks
npx eslint resources/js --ext .ts,.tsx

# Prettier — formato del código
npx prettier --check "resources/js/**/*.{ts,tsx}"
```

### Qué buscar en la salida de TypeScript

- Props de Inertia tipadas como `any` → riesgo de acceso a propiedades inexistentes
- Funciones que retornan `undefined` donde se espera un valor
- `as unknown as Tipo` — casteos inseguros
- Componentes sin tipado de props
- Uso de `?.` donde debería fallar explícitamente

---

## Capa 2 — Instalación de Vitest

### Instalar dependencias

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react \
    @testing-library/user-event @testing-library/jest-dom \
    @testing-library/dom jsdom
```

### `vite.config.ts` — agregar bloque test

```ts
import { defineConfig } from 'vite'

export default defineConfig({
    // ... config existente ...
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './resources/js/tests/setup.ts',
        include: ['resources/js/**/*.{test,spec}.{ts,tsx}'],
    },
})
```

### `resources/js/tests/setup.ts` — crear

```ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock de qz-tray (no disponible en jsdom)
vi.mock('qz-tray', () => ({
    default: {
        websocket: { connect: vi.fn(), isActive: vi.fn(() => false), disconnect: vi.fn() },
        security:  { setCertificatePromise: vi.fn(), setSignatureAlgorithm: vi.fn(), setSignaturePromise: vi.fn() },
        printers:  { find: vi.fn(() => Promise.resolve(['Test Printer'])) },
        configs:   { create: vi.fn() },
        print:     vi.fn(() => Promise.resolve()),
    },
}))

// Mock de Web Audio API (no disponible en jsdom)
vi.stubGlobal('AudioContext', vi.fn(() => ({
    createOscillator: vi.fn(() => ({
        connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
        type: 'sine', frequency: { value: 0 },
    })),
    createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    })),
    destination: {},
    currentTime: 0,
})))

// Mock de localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
        getItem:    (k: string) => store[k] ?? null,
        setItem:    (k: string, v: string) => { store[k] = v },
        removeItem: (k: string) => { delete store[k] },
        clear:      () => { store = {} },
    }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock de Inertia router (evita errores de rutas en tests unitarios)
vi.mock('@inertiajs/react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@inertiajs/react')>()
    return {
        ...actual,
        router: {
            post: vi.fn(),
            get:  vi.fn(),
            visit: vi.fn(),
        },
        usePage: vi.fn(() => ({
            props: {
                auth: { user: { id: 1, name: 'Test User', role: 'vendedor', branch_id: 1 } },
                flash: {},
            },
        })),
    }
})
```

### `package.json` — agregar scripts

```json
{
    "scripts": {
        "test":         "vitest",
        "test:run":     "vitest run",
        "test:ui":      "vitest --ui",
        "test:coverage":"vitest run --coverage",
        "type-check":   "tsc --noEmit",
        "lint":         "eslint resources/js --ext .ts,.tsx"
    }
}
```

### Ejecutar tests

```bash
npm run test           # modo watch
npm run test:run       # una sola pasada
npm run test:coverage  # con cobertura
npm run type-check     # solo TypeScript
npm run lint           # solo ESLint
```

---

## Capa 2 — Tests a implementar

### Estructura de archivos

```
resources/js/tests/
├── setup.ts                          ← config global (mocks)
├── hooks/
│   ├── use-currency-input.test.ts    ← si existe el hook
│   ├── use-sound.test.ts
│   ├── use-printer.test.ts
│   └── use-scroll-to-error.test.ts
├── lib/
│   └── format.test.ts                ← formatCurrency, formatDate
├── components/
│   ├── ui/
│   │   └── currency-input.test.tsx   ← componente CurrencyInput
│   └── sales/
│       └── SaleReturnForm.test.tsx
└── pages/
    └── pos/
        └── pos-cart.test.tsx         ← lógica del carrito (si está separada)
```

---

### `lib/format.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'

describe('formatCurrency', () => {
    it('formatea número entero en COP', () => {
        expect(formatCurrency(12500)).toBe('$ 12.500')
    })
    it('formatea cero correctamente', () => {
        expect(formatCurrency(0)).toBe('$ 0')
    })
    it('retorna — para null', () => {
        expect(formatCurrency(null as any)).toBe('—')
    })
    it('retorna — para undefined', () => {
        expect(formatCurrency(undefined as any)).toBe('—')
    })
    it('retorna — para NaN', () => {
        expect(formatCurrency(NaN)).toBe('—')
    })
    it('formatea millones', () => {
        expect(formatCurrency(1500000)).toBe('$ 1.500.000')
    })
})

describe('formatDate', () => {
    it('formatea fecha en español colombiano', () => {
        const date = new Date('2026-03-21T12:00:00-05:00')
        expect(formatDate(date)).toMatch(/mar/)
    })
    it('retorna — para null', () => {
        expect(formatDate(null as any)).toBe('—')
    })
})
```

---

### `hooks/use-sound.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSound } from '@/hooks/use-sound'

describe('useSound', () => {
    it('exporta las funciones playSuccess, playError, playWarning', () => {
        const { result } = renderHook(() => useSound())
        expect(typeof result.current.playSuccess).toBe('function')
        expect(typeof result.current.playError).toBe('function')
        expect(typeof result.current.playWarning).toBe('function')
    })

    it('playSuccess no lanza excepción', () => {
        const { result } = renderHook(() => useSound())
        expect(() => act(() => result.current.playSuccess())).not.toThrow()
    })

    it('playError no lanza excepción', () => {
        const { result } = renderHook(() => useSound())
        expect(() => act(() => result.current.playError())).not.toThrow()
    })

    it('playWarning no lanza excepción', () => {
        const { result } = renderHook(() => useSound())
        expect(() => act(() => result.current.playWarning())).not.toThrow()
    })
})
```

---

### `hooks/use-printer.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePrinter } from '@/hooks/use-printer'

describe('usePrinter', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
    })

    it('inicia con status idle', () => {
        const { result } = renderHook(() => usePrinter())
        expect(result.current.status).toBe('idle')
    })

    it('lee printerName desde localStorage', () => {
        localStorage.setItem('stokity_printer_name', 'Test Printer')
        const { result } = renderHook(() => usePrinter())
        expect(result.current.printerName).toBe('Test Printer')
    })

    it('lee paperWidth desde localStorage', () => {
        localStorage.setItem('stokity_printer_width', '58')
        const { result } = renderHook(() => usePrinter())
        expect(result.current.paperWidth).toBe(58)
    })

    it('paperWidth por defecto es 80', () => {
        const { result } = renderHook(() => usePrinter())
        expect(result.current.paperWidth).toBe(80)
    })

    it('connect() cambia status a connecting', async () => {
        const { result } = renderHook(() => usePrinter())
        act(() => { result.current.connect() })
        await waitFor(() => {
            expect(['connecting', 'connected', 'unavailable'])
                .toContain(result.current.status)
        })
    })
})
```

---

### `components/ui/currency-input.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CurrencyInput } from '@/components/ui/currency-input'

describe('CurrencyInput', () => {
    it('muestra el valor formateado con puntos de miles', () => {
        render(<CurrencyInput value={123000} onChange={vi.fn()} />)
        expect(screen.getByRole('textbox')).toHaveValue('123.000')
    })

    it('muestra cero como string vacío o 0', () => {
        render(<CurrencyInput value={0} onChange={vi.fn()} />)
        const input = screen.getByRole('textbox')
        expect(['0', '', '0.00']).toContain((input as HTMLInputElement).value)
    })

    it('llama onChange con el valor numérico limpio al escribir', async () => {
        const onChange = vi.fn()
        render(<CurrencyInput value={0} onChange={onChange} />)
        const input = screen.getByRole('textbox')
        await userEvent.clear(input)
        await userEvent.type(input, '50000')
        expect(onChange).toHaveBeenCalledWith(expect.any(Number))
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
        expect(lastCall[0]).toBe(50000)
    })

    it('ignora caracteres no numéricos', async () => {
        const onChange = vi.fn()
        render(<CurrencyInput value={0} onChange={onChange} />)
        const input = screen.getByRole('textbox')
        await userEvent.type(input, 'abc$%')
        expect(onChange).not.toHaveBeenCalledWith(expect.stringContaining('a'))
    })

    it('el input tiene inputMode numeric', () => {
        render(<CurrencyInput value={1000} onChange={vi.fn()} />)
        expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'numeric')
    })
})
```

---

### `components/sales/SaleReturnForm.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SaleReturnForm } from '@/components/sales/SaleReturnForm'

const mockSale = {
    id: 1,
    code: 'V001',
    saleProducts: [
        { id: 1, product_id: 10, quantity: 3, price: 20000, subtotal: 60000,
          product: { id: 10, name: 'Producto A', code: 'P001' } },
        { id: 2, product_id: 11, quantity: 1, price: 15000, subtotal: 15000,
          product: { id: 11, name: 'Producto B', code: 'P002' } },
    ],
}

describe('SaleReturnForm', () => {
    it('muestra los productos de la venta', () => {
        render(<SaleReturnForm sale={mockSale as any} onClose={vi.fn()} />)
        expect(screen.getByText('Producto A')).toBeInTheDocument()
        expect(screen.getByText('Producto B')).toBeInTheDocument()
    })

    it('el campo de cantidad no acepta más de lo comprado', async () => {
        render(<SaleReturnForm sale={mockSale as any} onClose={vi.fn()} />)
        const inputs = screen.getAllByRole('spinbutton')
        await userEvent.clear(inputs[0])
        await userEvent.type(inputs[0], '10')
        expect((inputs[0] as HTMLInputElement).value).toBe('3')
    })

    it('el campo de cantidad no acepta valores negativos', async () => {
        render(<SaleReturnForm sale={mockSale as any} onClose={vi.fn()} />)
        const inputs = screen.getAllByRole('spinbutton')
        await userEvent.clear(inputs[0])
        await userEvent.type(inputs[0], '-1')
        const value = parseInt((inputs[0] as HTMLInputElement).value)
        expect(value).toBeGreaterThanOrEqual(0)
    })

    it('botón submit está deshabilitado si no hay cantidades seleccionadas', () => {
        render(<SaleReturnForm sale={mockSale as any} onClose={vi.fn()} />)
        const submit = screen.getByRole('button', { name: /devolver|procesar/i })
        expect(submit).toBeDisabled()
    })
})
```

---

## Capa 3 — Checklist de QA Manual

Verificar en browser antes del lanzamiento a producción.

### POS — Flujo de venta

- [ ] Buscar producto por nombre → aparece en resultados
- [ ] Buscar producto por código → aparece en resultados
- [ ] Agregar producto al carrito → stock se muestra
- [ ] Cambiar cantidad en carrito → subtotal se recalcula
- [ ] Eliminar ítem del carrito
- [ ] Aplicar descuento porcentual → total cambia correctamente
- [ ] Aplicar descuento fijo → total cambia correctamente
- [ ] Seleccionar cliente → aparece en la venta
- [ ] Seleccionar "Consumidor final" (sin cliente)
- [ ] Ingresar monto pagado en efectivo → cambio se calcula
- [ ] Completar venta → redirige con mensaje de éxito
- [ ] Auto-print se activa si impresora conectada
- [ ] Producto sin stock suficiente → error visible al intentar agregar
- [ ] Carrito vacío → botón de venta deshabilitado

### POS — Sesión de caja

- [ ] Sin sesión abierta + `require_cash_session = true` → banner o modal bloqueante
- [ ] Abrir caja con monto inicial → sesión activa visible
- [ ] Registrar ingreso (cash_in) → monto registrado
- [ ] Registrar egreso (cash_out) → monto registrado
- [ ] Cerrar caja → formulario de cierre aparece
- [ ] Cierre ciego (vendedor) → campo "efectivo esperado" no visible
- [ ] Cierre con discrepancia → se guarda correctamente

### Productos

- [ ] Crear producto con imagen → imagen se muestra en WebP
- [ ] Editar precio → precio actualizado en listado
- [ ] Producto con stock bajo → alerta visible en dashboard
- [ ] Buscar producto en `/api/products/search` → solo de la sucursal
- [ ] Vendedor intenta crear producto → pantalla bloqueada (403)

### Ventas e historial

- [ ] Listado de ventas filtra por fecha correctamente (zona horaria Bogotá)
- [ ] Filtro por estado: completada, pendiente, cancelada
- [ ] Búsqueda por código de venta
- [ ] Ver detalle de venta → todos los ítems visibles
- [ ] Procesar devolución parcial → stock se repone

### Impresión (QZ Tray)

- [ ] QZ Tray no conectado → indicador rojo visible
- [ ] Conectar QZ Tray → indicador cambia a verde
- [ ] Imprimir recibo → papel sale sin corte en la parte superior (bug activo)
- [ ] Imprimir en 58mm → ancho correcto
- [ ] Imprimir en 80mm → ancho correcto
- [ ] Logo aparece en el recibo
- [ ] QR/barcode legible en el recibo

### Multi-sucursal y RBAC

- [ ] Administrador ve todas las sucursales en reportes
- [ ] Encargado solo ve su sucursal
- [ ] Vendedor no ve menú de usuarios ni sucursales en el sidebar
- [ ] Vendedor no ve botón de devolución en detalle de venta
- [ ] Cambiar de rol de un usuario → permisos cambian inmediatamente

### Formato y UI

- [ ] Todos los precios muestran formato COP (`$ 12.500`)
- [ ] Fechas en español colombiano (`13 mar 2026`)
- [ ] Modo oscuro funciona (toggle en ajustes de apariencia)
- [ ] Vista móvil del POS usable (cards, no tabla)
- [ ] Formularios muestran errores de validación del backend
- [ ] Scroll a primer error en formularios largos

### Reportes

- [ ] Reporte de ventas filtra por fechas correctamente
- [ ] Exportación a PDF funciona
- [ ] Exportación a Excel funciona
- [ ] Totales del reporte coinciden con ventas reales

---

## Cobertura objetivo (Vitest)

| Archivo | Cobertura mínima | Prioridad |
|---------|-----------------|-----------|
| `lib/format.ts` | 100% | Alta |
| `hooks/use-sound.ts` | 80% | Alta |
| `hooks/use-printer.ts` | 70% | Alta |
| `components/ui/currency-input.tsx` | 90% | Alta |
| `components/sales/SaleReturnForm.tsx` | 70% | Media |
| `lib/utils.ts` | 100% | Baja (trivial) |
| `pages/pos/index.tsx` | 40% | Baja (muy acoplado a Inertia) |

---

## Lo que NO testear con Vitest

| Módulo | Razón |
|--------|-------|
| `services/qzTray.ts` | Requiere WebSocket real a localhost:8181 |
| Páginas Inertia completas | Demasiado acopladas al servidor Laravel |
| Integración POS → backend | Cubierto por Pest PHP |
| `use-appearance.tsx` | Depende de cookies SSR y matchMedia — mejor E2E |
