# Revisión UX/UI — Stokity v2

> Fecha: 2026-03-18
> Alcance: Frontend completo (React 19 + Inertia.js + TypeScript + Tailwind + Shadcn UI)

---

## Tabla de Contenido

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Aspecto General y Diseño Visual](#2-aspecto-general-y-diseño-visual)
3. [Navegación y Arquitectura de Información](#3-navegación-y-arquitectura-de-información)
4. [Flujo POS — Análisis Detallado](#4-flujo-pos--análisis-detallado)
5. [Flujo de Ventas (CRUD)](#5-flujo-de-ventas-crud)
6. [Flujo de Devoluciones](#6-flujo-de-devoluciones)
7. [Flujo de Sesiones de Caja](#7-flujo-de-sesiones-de-caja)
8. [Flujo de Inventario y Stock](#8-flujo-de-inventario-y-stock)
9. [Dashboard](#9-dashboard)
10. [Reportes](#10-reportes)
11. [Configuración y Settings](#11-configuración-y-settings)
12. [Validación y Manejo de Errores](#12-validación-y-manejo-de-errores)
13. [Estados de Carga y Retroalimentación](#13-estados-de-carga-y-retroalimentación)
14. [Accesibilidad](#14-accesibilidad)
15. [Responsividad Móvil](#15-responsividad-móvil)
16. [Hallazgos Priorizados](#16-hallazgos-priorizados)

---

## 1. Resumen Ejecutivo

### Lo que está BIEN

El frontend de Stokity v2 es un sistema POS profesional con una base sólida:

- **Stack moderno**: Shadcn UI + Radix primitives + Tailwind dan componentes accesibles out-of-the-box
- **Dark mode completo**: Soporte `dark:` en todos los componentes
- **POS con atajos de teclado**: `/`, `Enter`, `Esc`, `F9` aceleran el flujo diario
- **Auto-print tras venta**: Integración QZ Tray con flash data es transparente para el usuario
- **Cotizaciones**: Flujo pending/complete bien separado del flujo normal
- **Responsive dual-view**: Tablas en desktop, tarjetas en móvil en la mayoría de páginas
- **Skeleton loaders**: Presentes en búsquedas móviles
- **Breadcrumbs semánticos**: Con `aria-label="breadcrumb"` y `aria-current="page"`

### Lo que necesita ATENCIÓN

Se identificaron **28 hallazgos** agrupados en 5 categorías:

| Categoría | Críticos | Importantes | Menores |
|-----------|:--------:|:-----------:|:-------:|
| Flujo POS | 3 | 5 | 2 |
| Formularios y Validación | 1 | 3 | 2 |
| Navegación y Orientación | 0 | 3 | 2 |
| Accesibilidad | 1 | 3 | 1 |
| Retroalimentación y Estados | 0 | 2 | 1 |

---

## 2. Aspecto General y Diseño Visual

### 2.1 Sistema de Colores

**Paleta actual:**
- Acento primario: `#C850C0` (púrpura) → `#FFCC70` (dorado) en gradientes
- Acento secundario: naranja (`orange-500`) para POS, búsquedas, filtros activos
- Estados: verde (éxito/completado), rojo (error/cancelado), amarillo (pendiente/advertencia), azul (info)

**Observaciones:**

| Aspecto | Estado | Nota |
|---------|--------|------|
| Consistencia cromática | BUENA | Los estados (completed/pending/cancelled) usan colores consistentes en toda la app |
| Gradiente de marca | BUENA | El gradiente púrpura-dorado da identidad visual al botón "Cobrar" y sidebar activo |
| Contraste dark mode | REVISAR | Algunos textos `text-muted-foreground` en dark mode pueden quedar con bajo contraste sobre `bg-card` |
| Uso del naranja | INCONSISTENTE | Naranja se usa para POS y también para filtros activos — puede confundir la jerarquía |

**UX-01 (Menor):** El naranja sirve tanto como color de "búsqueda activa" (`text-orange-500 "Buscando..."`) como de "categoría seleccionada" (`bg-orange-100`) y de "cotización activa" (`bg-amber-50`). Considerar usar el púrpura de marca (`#C850C0`) para estados activos y reservar el naranja/ámbar exclusivamente para advertencias.

### 2.2 Tipografía

- **Títulos**: `text-2xl font-bold tracking-tight` — legibles y con buena jerarquía
- **Labels**: `text-xs font-medium uppercase` — claros en formularios
- **Cuerpo**: `text-sm` — adecuado para densidad de información POS
- **Monospace**: Courier New 12px para receipts — correcto para impresión térmica

**Sin observaciones negativas.** La tipografía es funcional y profesional.

### 2.3 Iconografía

- **Lucide React** usado consistentemente (30+ iconos)
- Iconos acompañan texto en la mayoría de botones de acción
- Sidebar usa iconos con colores de marca (`#C850C0`)

**UX-02 (Menor):** Algunos botones de acción (ojo para "ver", lápiz para "editar") usan solo iconos sin tooltip. En tablas con muchas acciones, agregar `<Tooltip>` mejora la descubribilidad para usuarios nuevos.

---

## 3. Navegación y Arquitectura de Información

### 3.1 Estructura del Sidebar

```
Sidebar (Todos los usuarios)
├── Inicio (Dashboard)
├── POS
├── Clientes
├── Ventas
├── Historial de Caja
├── ── separador ──
├── Categorías *          (admin + encargado)
├── Productos *           (admin + encargado)
├── Movimientos de Stock * (admin + encargado)
├── Proveedores *         (admin + encargado)
├── ▼ Reportes *          (admin + encargado, collapsible)
│   ├── Dashboard
│   ├── Ventas Detallado
│   ├── Productos
│   ├── Vendedores
│   ├── Sucursales **     (admin only)
│   ├── Balance de Caja
│   └── Devoluciones
├── Usuarios **           (admin only)
├── Sucursales **         (admin only)
└── Métodos de Pago **    (admin only)

* = admin + encargado    ** = admin only
```

**Observaciones:**

**UX-03 (Importante):** El vendedor solo ve 5 items en el sidebar (Inicio, POS, Clientes, Ventas, Historial de Caja). Esto es correcto por RBAC, pero no hay indicación visual de qué módulos existen y a cuáles no tiene acceso. Si un vendedor necesita reportes, no sabe que existen. Considerar agregar un enlace "Solicitar acceso" o al menos mostrar items deshabilitados con tooltip "Requiere permisos de encargado" para mejor orientación.

**UX-04 (Importante):** El sub-menú de "Reportes" es collapsible y se auto-expande si la URL empieza con `/reports`. Pero al navegar fuera de reportes, el menú se cierra y el usuario pierde la referencia visual. Considerar mantener expandido el último sub-menú visitado durante la sesión.

**UX-05 (Menor):** El enlace "POS" no tiene distinción visual especial a pesar de ser la página más usada del sistema. En sistemas POS comerciales, el acceso principal tiene un tratamiento visual destacado (botón más grande, color diferente, posición fija). Considerar darle mayor prominencia.

### 3.2 Breadcrumbs

Los breadcrumbs están bien implementados con semántica ARIA correcta:
- `<nav aria-label="breadcrumb">`
- `aria-current="page"` en la última página
- Separadores con `role="presentation"` y `aria-hidden="true"`

**Sin observaciones negativas.**

### 3.3 Flujo entre Páginas

```
POS ──(venta exitosa)──→ POS (redirect con flash) ✓ correcto
POS ──(ver detalles)──→ ? NO hay link directo a /sales/{id} desde POS

Sales Index ──→ Sales Show ──→ (return) ──→ Sales Show ✓
Sales Show ──→ Client Show ──(back)──→ Sales Show ✓ (usa fromSale param)

Products Index ──→ Product Show ──→ Stock Movements ✓
Stock Movements ──→ Create Movement ──(success)──→ ? redirige a index, no al producto
```

**UX-06 (Importante):** Tras completar una venta en el POS, no hay manera de ver el detalle de esa venta sin ir al módulo de Ventas y buscarla. El toast muestra "Venta registrada!" pero no incluye un link a `/sales/{id}`. Para correcciones rápidas (error en cliente, nota), el cajero tiene que navegar fuera del POS.

**Sugerencia:** Agregar un link en el toast de éxito: `"Venta #CODE registrada. [Ver detalle]"` o un mini-drawer con el resumen.

---

## 4. Flujo POS — Análisis Detallado

### 4.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [CashSession pill]  [PrinterStatus]  [Printer widget]       │
├──────────────────────────┬──────────────────────────────────┤
│                          │ [Client ▼] [Pending 📋] [Clear] │
│  [🔍 Buscar... ( / )]   │ ┌──── Cotización activa ────┐   │
│                          │ │ (banner ámbar si aplica)   │   │
│  [Cat1] [Cat2] [Todas]  │ └────────────────────────────┘   │
│                          │                                  │
│  ┌ Hints ─────────────┐ │ ┌── Cart ────────────────────┐   │
│  │ / = buscar          │ │ │ Producto    -[2]+  $50.000 │   │
│  │ Enter = agregar     │ │ │ Producto B  -[1]+  $30.000 │   │
│  │ Esc = limpiar       │ │ └────────────────────────────┘   │
│  │ F9 = cobrar         │ │                                  │
│  └─────────────────────┘ │ Descuento: [Ninguno ▼] [___]    │
│                          │                                  │
│  ┌─ Results ───────────┐ │ Subtotal:     $80.000            │
│  │ 🟠 Prod A  $50k [+] │ │ Impuesto:      $6.400           │
│  │    Prod B  $30k [+] │ │ TOTAL:        $86.400            │
│  │    Prod C  $20k [+] │ │                                  │
│  └─────────────────────┘ │ [Método de Pago ▼]              │
│                          │ [Cash amount + quick buttons]    │
│                          │                                  │
│                          │ ┌─────────────┬────────────────┐ │
│                          │ │   COBRAR    │  Guardar       │ │
│                          │ │  $86.400    │  cotización    │ │
│                          │ │    F9       │                │ │
│                          │ └─────────────┴────────────────┘ │
└──────────────────────────┴──────────────────────────────────┘
```

### 4.2 Búsqueda de Productos

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Debounce 250ms | OK | Evita requests excesivos |
| Indicador "Buscando..." | OK | Orange text visible |
| Primer resultado resaltado | OK | Orange background, Enter lo agrega |
| Producto sin stock deshabilitado | OK | Visual claro |
| Empty state "No se encontraron" | OK | Mensaje claro |
| Estado inicial "Escribe para buscar" | OK | Guía al usuario |

**UX-07 (Crítico):** No hay feedback sonoro al agregar un producto al carrito. En un POS físico con teclado/escáner, el cajero mira la pantalla del cliente, no la suya. Un "beep" corto al agregar producto (y un tono diferente al error de stock) es estándar en POS comerciales. Considerar `new Audio()` o Web Audio API.

**UX-08 (Importante):** Al escanear un código de barras (que simula typing + Enter), el producto se agrega correctamente. Pero si el producto ya está en el carrito, se agrega una segunda vez como nuevo item en lugar de incrementar la cantidad. Verificar en el flujo `addToCart` si esto ya está manejado — si no, debe sumar +1 a la cantidad existente.

**UX-09 (Importante):** Los hints de teclado (`/`, `Enter`, `Esc`, `F9`) son visibles solo en una sección estática. Un POS moderno mostraría estos como badges sutiles en los elementos relevantes (el `/` dentro del placeholder del search ya existe, pero `F9` solo se muestra en el botón Cobrar). Considerar agregar un onboarding tooltip la primera vez que el usuario usa el POS.

### 4.3 Carrito

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Incremento/Decremento cantidad | OK | Botones +/- claros |
| Límite por stock disponible | OK | + deshabilitado cuando qty >= stock |
| Eliminar producto | OK | Botón rojo con X |
| Subtotal por línea | OK | Verde, alineado a la derecha |
| Carrito vacío | OK | Ícono + "Carrito vacío" |
| Scroll en carrito grande | REVISAR | Ver UX-10 |

**UX-10 (Importante):** El carrito no tiene altura máxima visible. Con 10+ productos, el área de descuento, totales, método de pago y botón "Cobrar" se empujan fuera de viewport. El cajero tiene que hacer scroll para llegar al botón de cobro — esto rompe el flujo rápido.

**Sugerencia:** Fijar la sección de totales + botón "Cobrar" al bottom del panel derecho con `sticky bottom-0`, y hacer el carrito scrollable con `overflow-y-auto max-h-[calc(100vh-400px)]`.

**UX-11 (Crítico):** No hay manera de editar la cantidad directamente escribiendo un número. Los botones +/- son lentos para cantidades grandes (ej: 20 unidades de un producto). Permitir click en el número de cantidad para convertirlo en un input editable (inline edit pattern).

### 4.4 Descuentos y Pago

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Descuento porcentual/fijo | OK | Dropdown claro |
| Monto descuento visible (rojo) | OK | Feedback inmediato |
| Método de pago dinámico | OK | Se carga de DB |
| Cash: quick buttons 10k-100k | OK | Aceleran el cobro |
| Cash: botón "Exacto" | OK | Útil para pago exacto |
| Cambio calculado automáticamente | OK | Visible solo si aplica |
| Validación cash >= total | OK | Toast de error |

**UX-12 (Crítico):** Los quick buttons de efectivo son estáticos: 10k, 20k, 30k, 40k, 50k, 100k. No se adaptan al total de la venta. Si el total es $87.400, los botones útiles serían $90.000 y $100.000. Un POS comercial calcula los billetes probables dinámicamente.

**Sugerencia:** Generar botones basados en el total: "Exacto", siguiente billete redondo (ej: $90.000), siguiente denominación estándar (100k), y opcionalmente el doble. Denominaciones colombianas estándar: $1.000, $2.000, $5.000, $10.000, $20.000, $50.000, $100.000.

### 4.5 Botón "Cobrar"

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Gradiente visual | OK | Destaca como acción principal |
| Muestra total en el botón | OK | Excelente — el cajero ve cuánto cobrar |
| Badge F9 | OK | Indica atajo de teclado |
| Estado disabled | OK | Si carrito vacío o procesando |
| Loading "Procesando..." | OK | Feedback durante submit |

**Sin observaciones negativas.** El botón Cobrar es uno de los elementos mejor diseñados del POS.

### 4.6 Post-Venta

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Auto-clear del carrito | OK | Se limpia todo tras éxito |
| Auto-focus en búsqueda | OK | Listo para la siguiente venta |
| Auto-print si impresora conectada | OK | Flujo transparente |
| Toast de éxito | OK | "¡Venta registrada!" |
| Reset del método de pago | OK | Via formKey increment |

**UX-13 (Importante):** Tras una venta exitosa, no hay confirmación visual del monto del cambio que el cajero debe devolver. El toast dice "¡Venta registrada!" pero el cajero ya perdió de vista el cambio porque el carrito se limpió. En pagos en efectivo, el cambio debería mostrarse de forma prominente por 3-5 segundos (overlay grande o toast con el monto).

**Sugerencia:** Para pagos en efectivo, mostrar un toast personalizado con: "Cambio: $12.600" en tamaño grande, duración 5 segundos, con estilo diferenciado (azul o verde).

---

## 5. Flujo de Ventas (CRUD)

### 5.1 Sales Index

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Filtros (búsqueda, estado, fechas) | OK | Completos y funcionales |
| Date range con presets | OK | "Hoy", "Esta semana", etc. ahorra clicks |
| Dual-view (tabla + cards) | OK | Responsive correcto |
| Status badges consistentes | OK | Verde/amarillo/rojo + íconos |
| Paginación con query string | OK | Filtros persisten entre páginas |

**UX-14 (Menor):** La búsqueda es por submit (Enter/form), no en tiempo real. En un listado con paginación server-side esto es correcto, pero un indicador visual de "presiona Enter para buscar" o un botón de búsqueda explícito mejoraría la orientación. Algunos usuarios esperan búsqueda en vivo.

### 5.2 Sales Show

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Detalle completo de venta | OK | Todos los campos relevantes |
| QR code del código | OK | Útil para re-escaneo |
| Historial de devoluciones inline | OK | Sin necesidad de navegar |
| Print thermal + browser print | OK | Dos opciones de impresión |
| Botón "Devolución" | OK | Disabled si no hay productos para devolver |

**UX-15 (Importante):** El botón "Editar" de la venta está disponible solo para admin, pero no hay tooltip explicando por qué está oculto para otros roles. Si un encargado necesita corregir una venta, no sabe si la funcionalidad existe o no.

---

## 6. Flujo de Devoluciones

### 6.1 SaleReturnForm (Modal)

```
┌─────────────────────────────────────┐
│ Registrar Devolución                │
├─────────────────────────────────────┤
│                                     │
│ ☐ Producto A (máx: 3)  [__2__]     │
│ ☐ Producto B (máx: 1)  [__1__]     │
│ ☐ Producto C (máx: 0)  disabled    │
│                                     │
│ [Devolver todo]  [Limpiar todo]     │
│                                     │
│ Motivo: [___________________]       │
│                                     │
│ [Cancelar]          [Registrar]     │
└─────────────────────────────────────┘
```

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Max returnable (original - returned) | OK | Cálculo correcto |
| "Devolver todo" shortcut | OK | Agiliza devoluciones completas |
| Motivo opcional | OK | No fuerza al cajero a inventar razones |
| Dedup guard 30s | OK | Backend previene doble-click |
| No auto-cierra el modal tras éxito | REVISAR | Ver UX-16 |

**UX-16 (Menor):** El modal de devolución no se cierra automáticamente tras el éxito — muestra "Devolución registrada correctamente" en verde dentro del modal. El usuario tiene que cerrar manualmente. Esto es defensivo (permite revisar), pero puede sentirse como que "no pasó nada". Considerar cerrar automáticamente tras 2 segundos con opción de "Ver recibo" o agregar un botón "Cerrar y ver recibo".

---

## 7. Flujo de Sesiones de Caja

### 7.1 Apertura (Modal en POS)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Modal bloqueante (strict mode) | OK | El cajero NO puede vender sin abrir caja |
| Modal opcional (soft mode) | OK | Configurable por negocio |
| Input de monto apertura | OK | Default 0, numérico |
| Notas opcionales | OK | Textarea para observaciones |
| Guard "ya hay sesión abierta" | OK | Backend previene duplicados |

**Sin observaciones negativas.** El flujo de apertura es limpio.

### 7.2 Movimientos durante turno

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Toggle Ingreso/Egreso | OK | Verde vs rojo, claro visualmente |
| Concepto obligatorio | OK | Fuerza documentar el motivo |
| Dropdown desde session pill | OK | Accesible sin salir del POS |

**Sin observaciones negativas.**

### 7.3 Cierre de Caja

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Resumen de ventas por método | OK | Tabla clara |
| Movimientos manuales listados | OK | Ingreso/egreso diferenciados |
| Expected cash (no-blind) | OK | Muestra el esperado para no-vendedores |
| Cierre ciego para vendedores | OK | Buena práctica POS |
| Input de conteo físico | OK | Campo numérico |
| Discrepancia con color | OK | Verde/rojo/ámbar según signo |

**UX-17 (Importante):** En el formulario de cierre, el campo "Efectivo contado físicamente" es un input numérico simple. En un cierre de caja real, el cajero cuenta por denominación (billetes de 50k, 20k, 10k, 5k, monedas). Un desglose por denominación que sume automáticamente el total ayuda a reducir errores de conteo.

**Sugerencia:** Agregar un modo opcional "Contar por denominación":
```
$100.000 × [__] = $___
 $50.000 × [__] = $___
 $20.000 × [__] = $___
 $10.000 × [__] = $___
  $5.000 × [__] = $___
  $2.000 × [__] = $___
  $1.000 × [__] = $___
  Monedas:       $[___]
  ─────────────────────
  TOTAL:         $___
```

---

## 8. Flujo de Inventario y Stock

### 8.1 Productos

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Búsqueda debounced | OK | 350ms, correcto |
| Filtros (status, categoría, branch) | OK | Completos |
| Stock visual (rojo si bajo) | OK | Alerta clara |
| Image upload con drag-drop | OK | UX moderna |
| Código auto-generado | OK | Botón "Generar código" |
| Tax cookie persistente | OK | Recuerda IVA entre sesiones |
| Stock read-only en edit | OK | Previene cambios accidentales |
| QR descargable en show | OK | Útil para etiquetado |
| Trashed + restore | OK | Soft delete con recuperación |

**UX-18 (Importante):** Al crear un producto, el campo de stock no tiene indicación de que es la cantidad INICIAL. Un nuevo usuario podría confundir "stock" con "stock mínimo". Agregar help text: "Cantidad inicial en inventario" debajo del campo.

### 8.2 Movimientos de Stock

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Filtros completos (tipo, branch, producto, fechas) | OK | Muy completo |
| Type badges con colores | OK | 6 colores diferenciados |
| Producto buscable en filtro | OK | Dropdown con código + nombre |
| Mobile cards con símbolo +/−/= | OK | Intuitivo |
| Label dinámico según tipo | OK | "Cantidad a ingresar" vs "retirar" vs "nuevo stock total" |

**UX-19 (Menor):** Tras crear un movimiento de stock desde la página de un producto (`/products/{id}` → "New Stock Movement"), el redirect va a `/stock-movements` (index general), no de regreso al producto. El usuario pierde contexto.

**Sugerencia:** Si el movimiento viene desde un producto, redirigir a `/products/{id}/movements` (historial del producto).

---

## 9. Dashboard

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Saludo dinámico (Buenos días/tardes/noches) | OK | Toque personal |
| Métricas con trend (% hoy vs ayer) | OK | Contexto temporal útil |
| Alerta de stock bajo collapsible | OK | No intrusiva pero visible |
| Ventas recientes con status badge | OK | Quick overview |
| Top products | OK | Visibilidad de más vendidos |
| Role-based (admin ve branches) | OK | Filtrado correcto |

**UX-20 (Menor):** La alerta de stock bajo muestra "X productos requieren atención" con badges "sin stock" y "bajo mínimo", pero no tiene acción masiva. El encargado ve la lista pero tiene que ir producto por producto a reabastecer. Un botón "Crear orden de compra" o "Exportar lista" agilizaría el proceso.

---

## 10. Reportes

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Periodo presets (mes actual, anterior, personalizado) | OK | Agiliza selección |
| Filtros por branch, categoría, estado | OK | Completos |
| Export PDF/Excel | OK | Acciones claras top-right |
| 5 tabs (Resumen, Productos, Sucursales, Vendedores, Pagos) | OK | Organización lógica |
| Stats cards (4 métricas) | OK | Resumen visual |
| Mobile: tabs con scroll horizontal | OK | Funcional en pantallas pequeñas |

**Sin observaciones negativas mayores.** El módulo de reportes está bien organizado.

---

## 11. Configuración y Settings

### 11.1 Navegación Settings

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Sidebar izquierdo con 6 items | OK | Estructura clara |
| Active state via pathname | OK | Detección correcta |
| Responsive (stacked en mobile) | OK | Funcional |

### 11.2 Ticket Template

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Preview en vivo | OK | El usuario ve cambios antes de guardar |
| Tabs para venta vs devolución | OK | Separación lógica |
| Toggles configurables | OK | show_logo, show_nit, etc. |
| Test print | OK | Prueba antes de usar en producción |

**UX-21 (Importante):** La página de configuración de impresora tiene 5 pasos de setup que son texto estático. Un wizard interactivo con estado de progreso (paso 1 completado ✓, paso 2 pendiente) y detección automática (ej: detectar si QZ Tray está corriendo) mejoraría significativamente la experiencia de setup inicial.

---

## 12. Validación y Manejo de Errores

### 12.1 Patrón General

```
Flujo de validación:
1. Frontend: validación básica (required, min, max) → toast error
2. Submit a backend
3. Backend: validación completa → errors object
4. Frontend: muestra errors debajo de campos + toast

Ejemplo en SaleController::store():
  "products.0.quantity" → "Stock insuficiente para X. Disponible: Y"
```

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Errores bajo campos en formularios | OK | Patrón estándar, text-red-500 |
| Toast para errores de validación POS | OK | No interrumpe el flujo |
| Campos required marcados con * | OK | Convención universal |
| Error de stock con nombre de producto | OK | Específico y útil |
| Cash session required | OK | Toast + auto-abre modal |

**UX-22 (Importante):** En el POS, los errores de stock se muestran como toast que desaparece en ~4 segundos. Si hay múltiples errores de stock (ej: completando una cotización con 5 productos sin stock), el usuario solo ve el último toast. Considerar un toast persistente o un panel de errores que no desaparezca hasta que el usuario lo cierre.

**UX-23 (Importante):** Cuando el backend devuelve errores de validación en formularios (ej: producto create), los errores se muestran debajo de cada campo pero el scroll no se mueve al primer error. Si el error está en un campo fuera del viewport, el usuario no sabe por qué el submit "no funcionó".

**Sugerencia:** Agregar `scrollIntoView` al primer campo con error, o un banner de resumen de errores al inicio del formulario.

---

## 13. Estados de Carga y Retroalimentación

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Skeleton loaders en búsqueda mobile | OK | 6 placeholder cards |
| "Buscando..." text en POS | OK | Feedback inmediato |
| "Procesando..." en botón Cobrar | OK | Disabled + texto |
| "Guardando..." en formularios | OK | Spinner en botón |
| "Cargando..." en dropdowns | OK | PaymentMethodSelect, etc. |
| "Imprimiendo..." en print buttons | OK | Temporal durante QZ Tray call |

**UX-24 (Importante):** Las páginas de listado (Sales Index, Products Index, Stock Movements) no muestran loading state durante la navegación entre páginas de paginación. El usuario hace click en "Página 2" y la tabla se queda estática hasta que Inertia completa el request. Un overlay semi-transparente o skeleton de la tabla daría feedback de que algo está pasando.

**Sugerencia:** Usar el hook `useForm` de Inertia o escuchar `router.on('start')` para mostrar un indicador de loading durante navegación.

---

## 14. Accesibilidad

### 14.1 Lo que está BIEN

| Aspecto | Implementación |
|---------|---------------|
| ARIA en breadcrumbs | `aria-label="breadcrumb"`, `aria-current="page"` |
| ARIA en sidebar | Radix primitives con roles automáticos |
| Focus visible | `focus-visible:ring-2` en todos los componentes interactivos |
| sr-only text | En triggers del sidebar, botones de icono |
| Keyboard sidebar toggle | `Ctrl+B` / `Cmd+B` |
| Semantic HTML | `<nav>`, `<main>`, `<button>`, `<form>`, `<label>` |
| Dialog focus trap | Radix Dialog maneja focus automáticamente |

### 14.2 Lo que necesita ATENCIÓN

**UX-25 (Crítico):** Los botones +/- del carrito POS y los quick-cash buttons no tienen `aria-label` descriptivo. Un lector de pantalla diría "button, minus" sin contexto de qué producto. Debe ser `aria-label="Disminuir cantidad de {product.name}"`.

**UX-26 (Importante):** El color es el único indicador de estado en varios lugares:
- Stock bajo = rojo, normal = verde (sin icono alternativo)
- Movimientos: 6 tipos diferenciados solo por color (sin patrón o icono único)
- Discrepancia de caja: verde/rojo/ámbar solo por color

Para usuarios con daltonismo, agregar un icono o patrón secundario (ej: ↑ para ingreso, ↓ para egreso, = para ajuste).

**UX-27 (Importante):** Las tablas de datos no tienen `<caption>` o `aria-label` para identificarlas. Con múltiples tablas en una página (ej: Sales Show tiene tabla de productos + tabla de devoluciones), un lector de pantalla no puede distinguirlas.

**UX-28 (Importante):** El POS tiene atajos de teclado (`/`, `F9`, `Esc`, `Enter`) pero no hay manera de descubrirlos via teclado. Considerar un shortcut `?` o `Ctrl+/` que abra un panel de atajos disponibles.

---

## 15. Responsividad Móvil

### 15.1 Patrón General

| Breakpoint | Comportamiento |
|-----------|----------------|
| < md (768px) | Sidebar → Sheet drawer, tablas → cards, formularios → 1 columna |
| md - lg | Sidebar visible colapsable, 2 columnas |
| > lg (1024px) | Layout completo, sidebar expandido |

### 15.2 POS en Móvil

**UX-29 (Crítico para móvil):** El POS tiene layout `md:flex-row` que apila los paneles verticalmente en móvil. Esto significa que el panel de búsqueda y el carrito están en la misma columna con scroll infinito. En una tablet (uso común en POS), el cajero tiene que hacer scroll constantemente entre búsqueda y carrito.

**Sugerencia para tablets:** Considerar un layout con tabs en móvil: Tab 1 = Buscar productos, Tab 2 = Carrito y cobro. O un bottom sheet que sube con el carrito al agregar items.

### 15.3 Tablas → Cards

La conversión tabla-a-cards está bien implementada con `hidden md:block` / `block md:hidden`. Los cards mobile muestran la información relevante con labels inline.

---

## 16. Hallazgos Priorizados

### CRÍTICOS (Impacto alto en el día a día)

| # | Hallazgo | Módulo | Estado | Descripción |
|---|----------|--------|--------|-------------|
| UX-07 | Sin feedback sonoro | POS | ✅ RESUELTO | Hook `use-sound.ts` con Web Audio API: beep success/error/warning |
| UX-11 | Cantidad no editable | POS | ✅ RESUELTO | Input numérico editable reemplaza span estático, select-on-focus |
| UX-12 | Quick-cash estáticos | POS | ✅ RESUELTO | Botones dinámicos basados en denominaciones COP redondeadas al total |
| UX-25 | ARIA labels faltantes en carrito | POS | ✅ RESUELTO | aria-label en botones +/−, input qty, eliminar, agregar, exacto |

### IMPORTANTES (Mejoran significativamente la experiencia)

| # | Hallazgo | Módulo | Estado | Descripción |
|---|----------|--------|--------|-------------|
| UX-03 | Items ocultos sin explicación | Sidebar | PENDIENTE | Vendedores no saben qué módulos existen |
| UX-06 | Sin link a venta tras cobro | POS | ✅ RESUELTO | Toast custom con link "Ver venta" + código |
| UX-08 | Producto duplicado en carrito | POS | ✅ YA ESTABA OK | addToCart ya suma qty al producto existente |
| UX-10 | Carrito sin max-height | POS | ✅ RESUELTO | Panel derecho con min-h-0 flex-1, carrito scrollable |
| UX-13 | Cambio no visible post-venta | POS | ✅ RESUELTO | Toast muestra cambio en verde por 6s en pagos efectivo |
| UX-15 | Editar oculto sin tooltip | Sales | PENDIENTE | Encargados no saben que la funcionalidad existe |
| UX-17 | Cierre sin desglose denominación | Caja | PENDIENTE | Contar efectivo en un solo campo causa errores |
| UX-22 | Toast de errores desaparece | POS | ✅ RESUELTO | Errores múltiples agrupados en toast persistente con botón cerrar |
| UX-23 | Sin scroll a primer error | Forms | ✅ RESUELTO | Hook `use-scroll-to-error.ts` en 9 formularios |
| UX-24 | Sin loading en paginación | Listados | ✅ RESUELTO | Barra progreso Inertia con color marca + spinner |
| UX-26 | Color como único indicador | General | ✅ RESUELTO | Iconos Lucide en badges de tipo de movimiento de stock |
| UX-27 | Tablas sin aria-label | General | ✅ RESUELTO | aria-label en componente Table + 10 instancias |
| UX-28 | Atajos no descubribles | POS | PENDIENTE | No hay panel de help para shortcuts |

### MENORES (Nice-to-have)

| # | Hallazgo | Módulo | Estado | Descripción |
|---|----------|--------|--------|-------------|
| UX-01 | Naranja sobrecargado | General | PENDIENTE | Mismo color para búsqueda, categorías activas, cotizaciones |
| UX-02 | Iconos sin tooltip | General | ✅ RESUELTO | title nativo en EyeButton + botones mobile |
| UX-04 | Sub-menú se cierra al navegar | Sidebar | ✅ RESUELTO | Initializer dinámico detecta grupo activo por URL |
| UX-05 | POS sin prominencia en sidebar | Sidebar | PENDIENTE | Mismo tamaño que otros links |
| UX-09 | Hints de teclado estáticos | POS | PENDIENTE | Podrían ser tooltips contextuales |
| UX-14 | Búsqueda no indica "Enter" | Sales | PENDIENTE | Sin botón de búsqueda visible |
| UX-16 | Modal devolución no auto-cierra | Devoluciones | PENDIENTE | Requiere cierre manual |
| UX-18 | Campo stock sin help text | Productos | ✅ RESUELTO | Label "Stock inicial" + help text "Cantidad inicial en inventario" |
| UX-19 | Redirect incorrecto post-movimiento | Stock | ✅ RESUELTO | from_product flag redirige a /products/{id} |
| UX-20 | Stock bajo sin acción masiva | Dashboard | PENDIENTE | No hay "exportar lista" ni "crear orden" |
| UX-21 | Setup impresora sin wizard | Settings | PENDIENTE | Pasos estáticos sin detección automática |

---

## Anexo: Comparación con Estándares de Industria POS

| Práctica Estándar | Stokity v2 | Estado |
|-------------------|------------|--------|
| Keyboard-driven workflow | / Enter Esc F9 + input qty editable | ✅ OK |
| Beep on scan/add | Web Audio API (use-sound hook) | ✅ OK |
| Smart cash suggestions | Denominaciones COP dinámicas | ✅ OK |
| Change display post-sale | Toast custom con cambio + link a venta | ✅ OK |
| Barcode scanner support | Enter agrega primer resultado | OK |
| Offline mode / queue | No implementado | N/A para cloud POS |
| Customer-facing display | No implementado | N/A (futuro) |
| Training/onboarding mode | No implementado | DESEABLE |
| Session timeout warning | No implementado | DESEABLE |
| Quick product favorites | No implementado | DESEABLE |
| Receipt email/SMS | No implementado | DESEABLE |
| Multi-currency | No (solo COP) | N/A |
| Split payment | No implementado | DESEABLE |
