# Auditoría UI/UX — Stokity v2

**Agente:** Design Auditor (UI/UX) · **Fecha:** 2026-10-07 · **Alcance:** `resources/js` (≈38k líneas TSX/TS), `resources/css/app.css`, `resources/views/app.blade.php`, middleware Inertia (solo para flujos de feedback)
**Método:** revisión estática del código (sin modificar nada), con métricas por grep y lectura completa de los flujos críticos: POS, ventas, caja, productos, créditos, mayorista, roles y auth. Los contrastes se calcularon con las fórmulas de luminancia de WCAG 2.1 a partir de los valores de Tailwind/OKLCH del código.

---

### Estado Actual

**Stack visual:** Tailwind 4 + shadcn/ui (Radix) + tokens OKLCH en `app.css` (estilo shadcn "neutral"), tema claro/oscuro por clase `.dark`, color de marca por tenant inyectado en tiempo de ejecución (`components/brand-colors.tsx` → `--brand-primary`, `--brand-secondary`), `react-hot-toast` para el feedback, `react-date-range` para los rangos de fechas, Instrument Sans + Playfair Display (Bunny Fonts).

**Lo que está bien (hay que conservarlo):**
- `CurrencyInput` (`components/ui/currency-input.tsx`) está bien resuelto: `inputMode="numeric"`, separador de miles es-CO y selección completa al enfocar.
- El POS ya tiene atajos de teclado (`/`, Enter, Esc, F9, `?`), sonidos de feedback, `aria-label` en los controles de cantidad, tab bar móvil con `safe-area-inset-bottom` y un banner para sesiones de caja abiertas demasiado tiempo (F7).
- Hay tests de regresión de UI (`components/__tests__`, `hooks/__tests__`), `useScrollToError` en los formularios grandes, vistas en tarjetas para móvil en 28 páginas y `PaginationFooter` con ventana de páginas en móvil.
- El detalle de crédito (`pages/credits/show.tsx`) usa `Dialog` de forma correcta: título, descripción, estados `submitting` y validación del monto máximo.
- El scope `auth-light-scope` está documentado y resuelve bien el conflicto del modo oscuro en las páginas de auth.

**Métricas de deuda de diseño (código fuente actual):**

| Indicador | Valor | Lectura |
|---|---|---|
| Clases de paleta Tailwind hardcodeadas en páginas y componentes (red/green/amber/blue/purple/orange/yellow/emerald) | **≈1.287** | No hay tokens semánticos (success/warning/info). El color se decide en cada archivo |
| Usos de `dark:` en páginas | 1.018 | El modo oscuro se mantiene a mano, clase por clase |
| `text-[9px]`/`[10px]`/`[11px]` | 118 | Microtipografía en una pantalla que se lee a distancia de mostrador |
| Modales caseros `fixed inset-0` (fuera de `ui/`) | 10 (6 en POS) | Sin semántica de diálogo |
| `confirm()` nativo | 4 | Contradice la regla del propio proyecto |
| `<Link><Button>` anidados sin `asChild` | 57 | HTML inválido y doble parada de tabulación |
| `Button size="icon"` con `aria-label` | 0 de 44 | Solo llevan `title` |
| Definiciones locales de `formatCOP`/`formatCurrency` | 20 | Existe `lib/format.ts`, pero casi no se usa |
| Soporte de `prefers-reduced-motion` | 0 | Hay animaciones infinitas en login/welcome |
| Páginas > 700 líneas | 8 (`pos/index.tsx` = 2.095 líneas, ~45 `useState`) | Monolitos que dificultan la consistencia |

**Diagnóstico de raíz:** el proyecto adoptó shadcn/ui, pero nunca lo completó como **sistema de diseño**. Faltan tres piezas: (1) tokens semánticos de estado y un `foreground` de marca calculado por contraste, (2) primitivas compuestas (ConfirmDialog, FormField, StatusBadge, PageHeader, Combobox, IconButton) y (3) un canal global de feedback (flash → toast). Sin ellas, cada página reimplementa modales, colores, badges y formateo, y los defectos de accesibilidad se reproducen en cada archivo nuevo. La mayoría de los hallazgos de abajo vienen de esta causa.

---

### Problemas Identificados

#### Tabla resumen (ordenada por severidad)

| ID | Problema | Área | Prioridad | Esfuerzo |
|---|---|---|---|---|
| UX-01 | F9 puede registrar la venta dos veces (el atajo ignora `submitting`) | POS | **Crítica** | 1 h |
| UX-02 | El cierre ciego de caja deja ver el efectivo esperado (resumen por método + movimientos visibles) | Caja | **Crítica** | 3–4 h |
| UX-03 | Los mensajes `flash('error')` nunca llegan al frontend; `success` solo se muestra en 8 de 26 controladores | Global / feedback | **Crítica** | 4–6 h |
| UX-04 | El color de marca del tenant no valida contraste: texto blanco fijo sobre cualquier color, e iconos casi invisibles en modo oscuro con el color por defecto | Theming multi-tenant | **Crítica** | 1 día |
| UX-05 | Pérdida silenciosa del carrito: sin persistencia, sin aviso al navegar y sin crear cliente desde el POS | POS | **Crítica** | 1–1,5 días |
| UX-06 | Modales caseros sin `role="dialog"`, foco atrapado, Escape ni retorno de foco | POS, admin, ventas | Alta | 1 día |
| UX-07 | `confirm()` nativo en acciones destructivas | POS, proveedores, finanzas | Alta | 2–3 h |
| UX-08 | Escáner/Enter agrega un resultado obsoleto o no agrega nada (debounce + `results[0]`) | POS | Alta | 4–6 h |
| UX-09 | El selector de cliente no permite buscar (Radix `Select` con todos los clientes) | POS, ventas, mayorista, créditos | Alta | 1 día |
| UX-10 | Sistema de color fragmentado: púrpura heredado, focos naranjas, badges de estado definidos 4 veces | Global | Alta | 2–3 días |
| UX-11 | Foco visible insuficiente (`--ring` gris claro al 50 %, `focus:outline-none` ×43) | Global | Alta | 4 h |
| UX-12 | Contraste insuficiente en acciones clave (ámbar, verde y rojo con texto blanco; `red-300`; `orange-500`) | POS, caja, créditos | Alta | 4 h |
| UX-13 | El cambio (vuelto) solo aparece en un toast de 6 s | POS | Alta | 4–6 h |
| UX-14 | Altura del POS fijada con un número mágico `calc(100dvh-64px)`: el botón Cobrar queda fuera de pantalla y aparece doble scroll | POS | Alta | 2–3 h |
| UX-15 | Microtipografía (9–11 px) en badges, chips, kbd y tab bar | Global / POS | Media | 4 h |
| UX-16 | Encabezados y layout de página inconsistentes; falta un `PageHeader` y un `h1` en settings/POS | Global | Media | 1 día |
| UX-17 | Interactivos anidados, botones-icono sin nombre accesible, paginación sin `aria-current`/labels | Global | Media | 1 día |
| UX-18 | Errores de formulario sin asociar al campo, labels huérfanos, `<select>`/`<input>` nativos sueltos | Formularios | Media | 1–2 días |
| UX-19 | El descuento % acepta valores > 100; la fila de descuento se desborda en 420 px | POS | Media | 2 h |
| UX-20 | "Cargar cotización" sobrescribe el carrito actual sin avisar | POS | Media | 2 h |
| UX-21 | Lógica de UI atada a nombres de rol (`'vendedor'`) o a `branches.length` en vez de permisos | Sucursales, finanzas, gastos | Media | 3–4 h |
| UX-22 | Cierre de caja: el desglose por denominación exige un clic extra (valor obsoleto) y no hay confirmación ni resumen | Caja | Media | 4 h |
| UX-23 | Sin `prefers-reduced-motion`; orbes con blur de 90–110 px animados sin fin | Auth / welcome | Media | 2–3 h |
| UX-24 | Login: `status` en rojo, `tabIndex` positivos, toggle de contraseña fuera del orden de teclado, textos en inglés | Auth | Media | 2–3 h |
| UX-25 | Navegación plana de 17 ítems sin grupos, con el POS en 7.º lugar | IA / sidebar | Media | 4–6 h |
| UX-26 | Toaster sin tema oscuro, colocado sobre las acciones del header | Global | Baja | 1–2 h |
| UX-27 | Formato de moneda inconsistente (20 implementaciones, `$ 1.234` frente a `$1.234`) | Global | Baja | 4 h |
| UX-28 | Dependencias de UI redundantes o desactualizadas (Headless UI + Radix, `react-date-range`) y colores fijos en terceros | Global | Baja | 1 día |
| UX-29 | El gráfico de 7 días escala las barras por % del total y no por % del máximo | Dashboard | Baja | 1 h |
| UX-30 | Huecos del modo oscuro (badges de movimientos, botón "Exacto", badges azules) | Caja, POS, créditos | Baja | 2 h |
| UX-31 | Páginas monolíticas (POS de 2.095 líneas, `sales/create` 973, `settings/ticket` 809) | Mantenibilidad visual | Baja (habilitador) | ver Roadmap |

---

#### Detalle — Prioridad CRÍTICA

##### UX-01 · Doble cobro con F9
- **Estado actual:** `handleSubmit` (`pages/pos/index.tsx:599`) valida carrito, método de pago y caja, pero **no comprueba `submitting`**. El botón "Cobrar" sí se deshabilita (`:1806 disabled={submitting || cart.length === 0}`), pero el listener global de teclado (`:796 if (e.key === 'F9') handleSubmit()`) lo salta.
- **Escena:** en hora pico el cajero presiona F9; la red tarda 800 ms, cree que no funcionó y vuelve a presionar F9. Salen dos `router.post('sales.store')` con el mismo carrito.
- **Impacto:** ventas duplicadas, stock descontado dos veces, cuadre de caja descuadrado y posible doble impresión. Afecta a todos los tenants que usan teclado o lector.
- **Recomendación:** (1) añadir `if (submitting) return;` al inicio de `handleSubmit`, `handleSaveQuote` y `handleCreditSubmit`, y usar un `useRef` (`submittingRef`) para cerrar la ventana entre renders; (2) que el agente de backend confirme si hay una clave de idempotencia (sugerido: un `client_request_id` UUID generado al montar el carrito y validado como único).
- **Esfuerzo:** 1 h en frontend (+2–4 h si se añade idempotencia en backend). **Prioridad:** Crítica.

##### UX-02 · El cierre ciego deja ver el efectivo esperado
- **Estado actual:** en `pages/cash-sessions/close.tsx` solo el bloque "Efectivo esperado en caja" depende de `!isBlind` (`:181`). En cambio, la tabla **"Ventas del turno" por método con totales** (`:95-125`), los **movimientos manuales con totales de ingresos y egresos** (`:128-160`) y los **abonos de crédito** (`:163-175`) se muestran siempre.
- **Escena:** un vendedor con cierre ciego ve "Efectivo — 23 ventas — $1.240.000", ingresos +$50.000 y egresos −$30.000. Con el fondo inicial que él mismo digitó, calcula el esperado exacto y declara ese número.
- **Impacto:** se anula el control antifraude que el negocio activó a propósito. Es un riesgo de negocio directo para cada tenant con vendedores.
- **Recomendación:** si `isBlind`, ocultar totales monetarios (dejar solo el número de ventas por método, o nada) y totales de movimientos. Lo ideal es que el backend **no envíe** `salesSummary.total`, `movements.amount` ni `creditPaymentsTotal` cuando el cierre es ciego (coordinar con el agente de seguridad), porque ocultarlo solo en la UI no basta: los datos quedan en `page.props`, visibles desde devtools.
- **Esfuerzo:** 3–4 h (front + back). **Prioridad:** Crítica.

##### UX-03 · Feedback del servidor que se pierde en silencio
- **Estado actual:** `HandleInertiaRequests.php:65-71` comparte `flash.success`, `last_sale_*`, `temporaryPassword` y `plainApiKey`, pero **no `error`**. Hay 5 controladores que hacen `->with('error', …)`, entre ellos `ProductController.php:278` ("No puedes eliminar X porque tiene N unidades…"), `PaymentMethodController.php:100`, `CategoryController.php:159`, `UserController.php:260` y `StockMovementController.php:144`. `pages/products/index.tsx:57-76` ya lee `flash.error`, que **nunca existe**. Además hay 84 `->with('success')` en 26 controladores, pero solo 8 páginas escuchan `flash`. No existe un listener global.
- **Escena:** un admin intenta eliminar un producto con stock, se cierra el diálogo y no pasa nada. No hay mensaje y el producto sigue ahí. Lo intenta de nuevo y vuelve a fallar sin explicación.
- **Impacto:** fallos silenciosos que generan tickets de soporte, la percepción de un sistema "roto" y acciones repetidas. Las confirmaciones de éxito tampoco se ven en la mayoría de los CRUD.
- **Recomendación:** (1) compartir `flash.error`, `flash.warning` y `flash.info` en el middleware; (2) crear `<FlashToaster />` en `app-layout.tsx`, que escuche `usePage().props.flash` (y `router.on('success')`) y dispare `toast.success` o `toast.error` una sola vez por visita; (3) quitar los `useEffect` de flash duplicados en páginas.
- **Esfuerzo:** 4–6 h. **Prioridad:** Crítica.

##### UX-04 · Theming multi-tenant sin control de contraste
- **Estado actual:**
  - `settings/appearance.tsx:105-130`: un `<input type="color">` libre, sin validación ni vista previa real (la "vista previa" es una barra de color, `:133`).
  - El texto blanco está fijo sobre `--brand-primary` en al menos 21 sitios (`bg-[var(--brand-primary)] … text-white`) y en `.nav-item-active { color: white !important }` (`app.css:213`). También lo usan `btn-auth`, el botón Cobrar (`pos:1808`), el cierre de caja (`close.tsx:291`) y el sub-ítem activo (`ui/sidebar.tsx:685`).
  - `--brand-primary` se usa además como **color de texto/icono** (`text-[var(--brand-primary)]`, 20 usos; todos los iconos del sidebar en `nav-main.tsx`) en claro **y en oscuro**, sin variante.
- **Escenas:**
  - Una tienda de accesorios elige amarillo `#FACC15`: "Cobrar", el ítem activo del sidebar y "Iniciar sesión" quedan con texto blanco sobre amarillo (≈1,5:1, ilegible).
  - Un tenant nuevo con el gris por defecto `#3F3F46` activa el modo oscuro: los iconos del sidebar quedan sobre `oklch(0.205)` ≈ `#171717` con **≈1,7:1** (WCAG 1.4.11 exige 3:1) y prácticamente desaparecen.
- **Impacto:** cada tenant puede romper su propia interfaz sin saberlo. Falla WCAG 1.4.3 y 1.4.11. Al ser SaaS, el defecto se multiplica por el número de clientes y llega como "la app se ve mal".
- **Recomendación:**
  1. En `BrandColors` calcular la luminancia relativa y emitir `--brand-primary-foreground` (blanco o `#0a0a0a`, el que dé ≥4,5:1). Reemplazar todos los `text-white` sobre marca por `text-[var(--brand-primary-foreground)]` o, mejor, mapear `--color-brand` y `--color-brand-foreground` en `@theme` para escribir `bg-brand text-brand-foreground`.
  2. Generar `--brand-primary-on-dark` (aclarar en OKLCH hasta ≥3:1 contra `--sidebar`) y usarlo en `.dark` para iconos y texto de marca.
  3. En `appearance.tsx`, mostrar una vista previa real (botón, ítem de sidebar e icono en claro y oscuro) con indicador AA y aviso o bloqueo si no cumple. Validar también en backend.
- **Esfuerzo:** 1 día. **Prioridad:** Crítica.

##### UX-05 · Pérdida silenciosa del carrito en el POS
- **Estado actual:** `cart` es `useState` puro (`pos:322`), sin `localStorage`/`sessionStorage` ni `router.on('before')`/`beforeunload` (verificado: 0 ocurrencias). Hay varios caminos que lo destruyen:
  - Cualquier ítem del sidebar.
  - "Cerrar caja" dentro del `CashSessionWidget` (`pos:181`, `router.visit` directo).
  - El enlace "Ir al inicio" del modal estricto (`pos:1140`, un `<a href>` que además recarga la página completa).
  - El polling no lo destruye, pero un 409 de Inertia (recarga dura, ya documentado en `pos:441`) sí.
  - El flujo de crédito exige un cliente distinto de "Consumidor final" (`pos:1040`, `:1830`), pero el POS **no permite crear cliente** (no hay `CardCreateClient` en el POS). El cajero tiene que salir a `/clients/create` y pierde el carrito.
- **Escena:** un cliente nuevo quiere separar 6 productos. El cajero los escanea, pulsa "Vender a crédito" y recibe "Selecciona un cliente". Va a Clientes, lo crea, vuelve al POS y el carrito está vacío. Escanea todo otra vez con fila detrás.
- **Impacto:** tiempo perdido por transacción, frustración, ventas abandonadas. Afecta directamente a la conversión en tienda.
- **Recomendación:** (1) persistir `{cart, clientId, discount, activePendingId}` en `sessionStorage` con clave por usuario y sucursal, con TTL, y restaurarlo con un aviso "Se recuperó un carrito en curso"; (2) guard con `router.on('before')` + `ConfirmDialog` cuando `cart.length > 0`; (3) botón "+ Nuevo cliente" dentro del combobox de cliente (ver UX-09), con un diálogo de 2 campos (nombre y documento/teléfono) como el que ya existe en mayorista (`ec8ef12`).
- **Esfuerzo:** 1–1,5 días. **Prioridad:** Crítica.

---

#### Detalle — Prioridad ALTA

##### UX-06 · Modales caseros sin semántica ni gestión de foco
- **Estado actual:** el POS implementa 6 overlays a mano: el modal estricto "Abrir caja" (`:1107`), precio variable (`:1149`), movimiento de efectivo (`:1183`), apertura en modo suave (`:1258`), panel de cotizaciones (`:1889`) y crédito (`:1955`). Hay 3 más en `admin/tenants/show.tsx:436,503,525` y el popover del rango de fechas en `sales/index.tsx:430`. Ninguno tiene `role="dialog"`, `aria-modal`, `aria-labelledby`, foco atrapado, cierre con Escape ni retorno de foco. Los dropdowns `CashSessionWidget` y `PrinterWidget` (`pos:126-262`) tampoco exponen `aria-expanded` ni navegación con flechas.
- **Escena:** con el modal de "Ingreso de efectivo" abierto, Tab salta al buscador del POS que está detrás, y Escape no cierra nada. Un lector de pantalla no anuncia que se abrió un diálogo.
- **Impacto:** falla WCAG 2.1.2, 2.4.3 y 4.1.2. El trabajo con teclado, central en un POS, se vuelve torpe. También hay riesgo funcional: con un modal abierto, F9 sigue disparando `handleSubmit`.
- **Recomendación:** migrar todo a `components/ui/dialog.tsx` (Radix, que ya está instalado y se usa en 33 archivos) y a `Sheet` para el panel lateral. Los dos widgets del header pasan a `DropdownMenu` y `Popover`. Mientras haya un diálogo abierto, el listener global de atajos debe ignorar las teclas (`if (document.querySelector('[role=dialog]')) return`).
- **Esfuerzo:** 1 día. **Prioridad:** Alta.

##### UX-07 · `confirm()` nativo en acciones destructivas
- **Estado actual:** `pos/index.tsx:1555` (vaciar carrito), `:1940` (eliminar cotización), `suppliers/show.tsx:58` y `finances/index.tsx:394`. Esto contradice la regla documentada del proyecto ("No usar confirm()/alert() nativos").
- **Impacto:** un diálogo del navegador sin marca, que bloquea el hilo, cuyo texto puede salir en inglés según el navegador ("This page says…") y que en kioscos o PWA puede estar suprimido. La experiencia es inconsistente con el resto de confirmaciones (p. ej. `DeleteWithReasonDialog`).
- **Recomendación:** crear `useConfirm()` + `<ConfirmDialog>` (promesa: `if (await confirm({title, description, tone:'destructive'}))`) y reemplazar los 4 usos. Añadir una regla ESLint `no-restricted-globals: ['confirm','alert']`.
- **Esfuerzo:** 2–3 h. **Prioridad:** Alta.

##### UX-08 · Escáner de códigos y Enter con resultados obsoletos
- **Estado actual:** la búsqueda tiene un debounce de 250 ms (`pos:478`). Enter ejecuta `addToCart(results[0])` (`:791`) **sin comprobar** que `results` corresponda al `query` actual ni que `searching` sea `false`.
- **Escena:**
  - (a) Un lector USB "teclea" `7702001123456⏎` en 40 ms. En ese momento `results` está vacío (se limpió tras el último agregado) y no pasa nada. El cajero tiene que pulsar Enter otra vez.
  - (b) El cajero escribió "cami" a mano, ve resultados y luego escanea un código. Enter agrega la **primera camiseta** de la búsqueda anterior, que es un producto equivocado.
- **Impacto:** errores de cobro, productos mal descontados del inventario y desconfianza en el lector. El flujo con lector es el principal en retail.
- **Recomendación:** en Enter, si `searching` está activo o hay un debounce pendiente, guardar un `pendingEnter` y resolverlo cuando lleguen los resultados del query vigente. Priorizar la **coincidencia exacta por código** (endpoint `?code=` o filtro local `p.code === query`). Si no hay coincidencia exacta y hay más de un resultado, no agregar automáticamente y resaltar la lista. Opcional: navegación ↑/↓ por los resultados con `aria-activedescendant`.
- **Esfuerzo:** 4–6 h. **Prioridad:** Alta.

##### UX-09 · Selector de cliente sin búsqueda
- **Estado actual:** Radix `Select` con **todos** los clientes en el POS (`:1523`, ordenados por id descendente), en `sales/create.tsx:493`, en `WholesaleOrderForm.tsx:151` y en el formulario de crédito. No existe un componente Combobox/Command.
- **Escena:** una tienda con 1.200 clientes. El cajero tiene que desplazarse por una lista sin filtro para encontrar a "María Gómez". Radix Select solo tiene type-ahead por la primera letra.
- **Impacto:** segundos perdidos en cada venta a cliente identificado, más errores de selección (un homónimo) y créditos asignados a la persona equivocada. Escala mal en todos los tenants que crecen.
- **Recomendación:** crear `<ClientCombobox>` (Popover + `cmdk`, o el patrón Command de shadcn) con búsqueda por nombre, documento y teléfono (server-side si hay más de 200 registros), badge "Mayorista", acción "+ Nuevo cliente" y "Consumidor final" fijado arriba. Reutilizarlo en los 4 flujos.
- **Esfuerzo:** 1 día. **Prioridad:** Alta.

##### UX-10 · Sistema de color fragmentado
- **Estado actual:**
  - Hay ≈1.287 clases de paleta fija y ningún token semántico de estado.
  - Queda un **púrpura heredado** en 12 archivos que no sigue la marca del tenant. En el POS se ve en el chip de categoría activo (`:356 border-[var(--brand-primary)] bg-purple-100 text-purple-700`: borde de marca con relleno púrpura), en el primer resultado (`:1479 bg-purple-50/50`), en el badge de mayorista (`:1660`) y en el icono del gráfico (`sales-chart.tsx:33`).
  - Los anillos de foco son **naranjas** (`focus:ring-orange-400`, 11 usos en POS, caja y negocio) junto a anillos de marca (`focus:ring-[var(--brand-primary)]`) en el mismo formulario (`pos:1119` vs `:1127`).
  - Los badges de estado están definidos de 4 formas distintas: `STATUS_CONFIG` copiado en `credits/index.tsx:41`, `credits/show.tsx:30` y `wholesale/index.tsx:29`; clases inline en `sales/index.tsx:262-316`; y `Badge` sin variantes de tono.
  - El estado activo de las pestañas usa `bg-primary` (casi negro, `credits/index.tsx:131`), mientras otras vistas usan el color de marca.
  - El progreso de Inertia está fijo en `#3F3F46` (`app.tsx:22`) y el rango de fechas en `#3b82f6` (`sales/index.tsx:441`).
- **Escena:** un tenant con marca verde ve chips activos púrpura, focos naranjas, pestañas negras y un calendario azul en la misma sesión. La interfaz parece un collage.
- **Impacto:** percepción de producto poco profesional, imposible de "re-marcar" por tenant y alto coste de mantenimiento (cada cambio de color toca decenas de archivos y el modo oscuro se rompe).
- **Recomendación:** definir en `app.css` los tokens `--success`, `--warning`, `--info`, `--danger` (+ `-foreground` y `-soft`) para claro y oscuro, y exponerlos en `@theme`. Crear `<StatusBadge tone="success|warning|danger|info|neutral">` y un mapa único `lib/status.ts` (venta, crédito, mayorista, caja). Reemplazar el púrpura y el naranja por tokens de marca o neutros. Pasar la marca al progreso de Inertia (leer `--brand-primary` en `setup`). Usar codemods o búsqueda y reemplazo por lotes.
- **Esfuerzo:** 2–3 días (tokens: 0,5 d; migración: 2 d). **Prioridad:** Alta.

##### UX-11 · Foco visible insuficiente
- **Estado actual:** `--ring: oklch(0.87 0 0)` y `Input`/`Button` usan `focus-visible:ring-ring/50`. El resultado es un anillo gris muy claro al 50 % sobre blanco, **≈1,2:1** (WCAG 1.4.11 pide ≥3:1). Hay 43 `focus:outline-none` y la mayoría de los ≈137 `<button>` nativos de las páginas no tienen `focus-visible:` (19 usos en total en páginas).
- **Impacto:** quien navega con teclado (cajeros con atajos, usuarios con baja visión) no sabe dónde está el foco. Falla WCAG 2.4.7.
- **Recomendación:** subir `--ring` a un tono con ≥3:1 (o usar `--brand-primary` con fallback por contraste), usar `ring-2 ring-offset-2` sin opacidad, y añadir una regla base `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` para todo `button, a, [role=button]`.
- **Esfuerzo:** 4 h. **Prioridad:** Alta.

##### UX-12 · Contraste insuficiente en acciones clave
| Ubicación | Combinación | Ratio aprox. | Requisito |
|---|---|---|---|
| `pos:1933` botón "Cargar" cotización | blanco / `amber-500` | **2,1:1** | 4,5:1 |
| `pos:1248` "Registrar" ingreso de efectivo | blanco / `green-500` | **2,3:1** | 4,5:1 |
| `pos:1248` "Registrar" egreso | blanco / `red-500` | 3,8:1 | 4,5:1 |
| `pos:694` "Cerrar" en el toast de errores | `red-300` / blanco | **≈2:1** | 4,5:1 |
| `credits/index.tsx:212` "Falta: $…" | `orange-500` / blanco (text-xs) | 2,8:1 | 4,5:1 |
| `pos:1563` icono "Vaciar carrito" | `red-400` / blanco | 2,8:1 | 3:1 (no textual) |
| Chips de categoría inactivos `pos:357` | `neutral-500` 11 px / blanco | 4,6:1 en 11 px | límite y difícil de leer |
- **Impacto:** acciones de dinero difíciles de leer bajo la luz de una tienda o en pantallas baratas. Falla WCAG 1.4.3.
- **Recomendación:** usar los pasos -600/-700 para rellenos con texto blanco (`amber-600` + `text-amber-950`, o los tokens de UX-10). Para texto pequeño usar mínimo -600 sobre blanco y -300 sobre oscuro. Validar con axe-core en CI (ver Roadmap).
- **Esfuerzo:** 4 h. **Prioridad:** Alta.

##### UX-13 · El vuelto solo existe en un toast efímero
- **Estado actual:** después de cobrar en efectivo, el carrito se limpia de inmediato (`pos:652`) y el "Cambio: $X" aparece solo en un toast arriba a la derecha que dura 6 s (`:620-650`). En pantalla no queda ningún registro de la última venta.
- **Escena:** el cajero se gira para entregar la bolsa y, al volver, el toast ya desapareció. No recuerda si el cambio era $12.000 o $21.000.
- **Impacto:** errores al dar el cambio, faltantes de caja y discusiones con el cliente.
- **Recomendación:** una tarjeta persistente de "Última venta" en el panel del carrito (código, total, recibido, **cambio en tipografía grande**, botones "Reimprimir" y "Ver venta"), que se cierre al agregar el siguiente producto. Mantener el toast como refuerzo.
- **Esfuerzo:** 4–6 h. **Prioridad:** Alta.

##### UX-14 · Altura del POS con número mágico
- **Estado actual:** `pos:1301 h-[calc(100dvh-64px)]`. Pero `SidebarInset` en variante `inset` añade `m-2` (16 px verticales, `ui/sidebar.tsx:308`), el header mide `h-12` con el sidebar colapsado (`app-sidebar-header.tsx:7`) y por encima se apilan `ImpersonationBanner` (~32 px) y el banner F7.
- **Escena:** en un portátil de 1366×768 la página tiene 16–48 px de scroll y el botón "Cobrar" queda cortado o se mueve. Se ven dos barras de scroll (la de la página y la de los resultados).
- **Impacto:** el botón principal del producto queda fuera de la vista en el hardware típico de mostrador.
- **Recomendación:** quitar el `calc`. Convertir `SidebarInset` a `h-svh`/`overflow-hidden` solo en la ruta POS (prop `fullHeight` en `AppLayout`) y usar `flex-1 min-h-0` en la cadena de contenedores.
- **Esfuerzo:** 2–3 h. **Prioridad:** Alta.

---

#### Detalle — Prioridad MEDIA

##### UX-15 · Microtipografía
- **Estado actual:** 118 usos de `text-[9px]`, `[10px]` y `[11px]`: badges de stock (`pos:1502-1507`), chips de categoría, contador de cotizaciones (`:1546`, 9 px), etiquetas de la tab bar móvil (`:1849`), pills de caja e impresora y badges de movimientos (`close.tsx:139`).
- **Impacto:** el stock disponible, un dato que decide la venta, se lee a 10 px a 50–70 cm de distancia. Hay fatiga visual en turnos de 10 h.
- **Recomendación:** fijar 12 px como mínimo en la escala (`text-xs`) y 14 px para datos operativos (stock, precio unitario). Añadir una regla de lint o revisión que prohíba `text-[<12px]`.
- **Esfuerzo:** 4 h. **Prioridad:** Media.

##### UX-16 · Encabezados y layout de página inconsistentes
- **Estado actual:**
  - Los `h1` varían: `text-3xl font-bold` (productos, ventas, clientes, proveedores), `text-2xl font-bold tracking-tight` (créditos, mayorista), `text-2xl font-bold` (usuarios) y `text-2xl font-semibold` (stock).
  - Los nombres también: "Gestión de Clientes" y "Administración de Ventas" frente a "Créditos" y "Mayorista". El sidebar dice "Catálogo" y "Ventas".
  - `components/heading.tsx` renderiza un `h2`, así que settings no tiene `h1`, y tampoco lo tienen POS, `cash-sessions/index` ni `sales/create`.
  - Los contenedores alternan `p-4`, `p-6`, `md:p-6` y `max-w-2xl` sin criterio.
- **Impacto:** jerarquía visual errática, navegación por encabezados rota para lectores de pantalla (WCAG 1.3.1 y 2.4.6) y sensación de producto "armado por partes".
- **Recomendación:** crear `<PageHeader title description actions breadcrumbs?>` con `h1` estándar (`text-2xl font-semibold tracking-tight`) y `<PageContainer size="default|narrow|full">`. Unificar los títulos con los nombres del sidebar. En el POS, un `h1` `sr-only` "Punto de venta".
- **Esfuerzo:** 1 día. **Prioridad:** Media.

##### UX-17 · Interactivos anidados y nombres accesibles
- **Estado actual:** 57 casos de `<Link><Button>` sin `asChild` (p. ej. `products/index.tsx:548`, `clients/show.tsx:339-361`), lo que es HTML inválido (`<button>` dentro de `<a>`) y crea dos paradas de tabulación. Los 44 `Button size="icon"` usan `title` sin `aria-label`. En `PaginationFooter` los botones anterior/siguiente no tienen label, las páginas no tienen `aria-current="page"` y falta un `<nav aria-label>`. En `common/Table.tsx` los `<th>` no tienen `scope` y las filas usan el índice como `key`. Varios textos `sr-only` siguen en inglés ("Close", "More", "Toggle Sidebar" en `ui/dialog.tsx:66`, `ui/sheet.tsx:75` y `ui/sidebar.tsx:272`).
- **Impacto:** falla WCAG 4.1.2 y 1.3.1, navegación por teclado redundante y lectores de pantalla que anuncian "botón" sin nombre.
- **Recomendación:** codemod `<Link><Button>` → `<Button asChild><Link/></Button>`. Crear `<IconButton label="…">` con `aria-label` obligatorio por tipo. Arreglar la paginación (labels, `aria-current`, `nav`). Traducir los `sr-only` de `ui/`.
- **Esfuerzo:** 1 día. **Prioridad:** Media.

##### UX-18 · Formularios: errores y labels sin asociar
- **Estado actual:** `InputError` (`components/input-error.tsx`) renderiza un `<p>` sin `id` ni `role`, y solo hay 12 `aria-invalid` en todas las páginas. Los modales del POS y el cierre de caja usan `<label>` sin `htmlFor` ni control anidado (`pos:1114, 1216, 1226, 1237`, `close.tsx:270, 278`), así que hacer clic en el label no enfoca nada y el lector no asocia el campo. Hay `<select>` nativos en 9 páginas (`users/index.tsx:187`, `cash-sessions/index.tsx:87`, roles…) con estilos propios. El campo "Recibido" del POS (`:1735-1746`) reimplementa a mano el formateo de `CurrencyInput`.
- **Impacto:** falla WCAG 1.3.1, 3.3.1 y 4.1.2, y aspecto inconsistente entre formularios.
- **Recomendación:** crear `<FormField label error hint required>{control}</FormField>`, que genere `id`, `htmlFor`, `aria-describedby` y `aria-invalid` automáticamente (patrón Form de shadcn, sin necesidad de react-hook-form). Reemplazar los `<select>` nativos por `Select`. Usar `CurrencyInput` en "Recibido".
- **Esfuerzo:** 1–2 días. **Prioridad:** Media.

##### UX-19 · Descuento en el POS
- **Estado actual:** el input de porcentaje tiene `max={100}` (`pos:1686`), pero `onChange` acepta cualquier valor. Con 150 %, `total = Math.max(0, …)` da $0 sin advertencia. La fila (`:1657`) junta label, badge "Cliente mayorista · X % aplicado", `Select` w-32, input y monto en 420 px **sin `flex-wrap`**, y se desborda.
- **Impacto:** ventas en $0 por error de digitación y una zona de totales desordenada.
- **Recomendación:** limitar a 0–100 (y el fijo a ≤ bruto) con feedback inline. Pasar el badge de mayorista a una segunda línea (`flex-wrap`). Opcional: un permiso para descuentos por encima del X %.
- **Esfuerzo:** 2 h. **Prioridad:** Media.

##### UX-20 · "Cargar cotización" sobrescribe el carrito
- **Estado actual:** `loadPendingSale` (`pos:874-890`) hace `setCart(newCart)` aunque haya productos en el carrito actual.
- **Impacto:** se pierde el carrito sin aviso (es un caso de UX-05).
- **Recomendación:** si `cart.length > 0`, `ConfirmDialog` con "Reemplazar carrito", "Guardar actual como cotización y cargar" o "Cancelar".
- **Esfuerzo:** 2 h. **Prioridad:** Media.

##### UX-21 · UI atada a nombres de rol en un sistema de roles personalizados
- **Estado actual:** el conteo de "vendedores" por sucursal filtra `emp.role === 'vendedor'` (`branches/index.tsx:138, 278`; `branches/show.tsx:152-158`), así que un rol personalizado como "Cajero" nunca se cuenta. En `expenses/index.tsx:178, 311`, `expenses/templates.tsx:89, 248` y `finances/index.tsx:229` se usa `isAdmin = branches.length > 0`. En `products/index.tsx:96` se usa `isAdmin = can('branches.view')`.
- **Impacto:** cifras incorrectas para tenants con roles personalizados (que es la funcionalidad estrella del RBAC) y UI que no coincide con los permisos reales.
- **Recomendación:** mostrar "Empleados" (todos, sin el encargado) o agrupar por `role.display_name`. Reemplazar las heurísticas `isAdmin` por `can('<permiso específico>')` o un flag explícito del backend (`canFilterByBranch`).
- **Esfuerzo:** 3–4 h. **Prioridad:** Media.

##### UX-22 · Cierre de caja propenso a errores
- **Estado actual:** en el modo "Contar por denominación", el total contado **no se sincroniza** con `closing_amount_declared` hasta pulsar "Usar $X como monto contado" (`close.tsx:56, 255`). Si el cajero recuenta después, el formulario envía el valor viejo. "Confirmar cierre" es irreversible y no pide confirmación ni muestra un resumen (en modo no ciego, tampoco la diferencia esperado vs. contado antes de enviar).
- **Impacto:** cierres con montos equivocados, investigaciones de faltantes y un turno que no se puede corregir.
- **Recomendación:** derivar `closing_amount_declared` del desglose mientras ese modo esté activo (sin botón extra). Añadir un paso de confirmación con el resumen: declarado, y en modo no ciego esperado y diferencia con color.
- **Esfuerzo:** 4 h. **Prioridad:** Media.

##### UX-23 · Movimiento sin `prefers-reduced-motion`
- **Estado actual:** no hay ningún `motion-reduce:` ni media query. `auth-simple-layout.tsx:36-48` y `welcome.tsx` animan 3 orbes con `blur(70–110px)` en bucle infinito (14 s, 18 s y 10 s), más `logo-ring` infinito, `btn-auth` con `translateY` y barrido de brillo, `welcome-animate` escalonado hasta 1 s, y 11 `transition-all`.
- **Impacto:** WCAG 2.3.3 (AAA, recomendado) y molestias vestibulares. En terminales POS de gama baja o tablets, los blurs grandes animados consumen GPU y batería y causan jank en el login (y el login es lo primero que ve cada cajero en cada turno). Además, el contenido del login arranca con `opacity: 0` hasta 1 s.
- **Recomendación:** `@media (prefers-reduced-motion: reduce) { .welcome-animate, .logo-ring, [style*="orb-drift"] { animation: none !important; opacity: 1 } }`. Bajar el blur a ≤60 px o usar gradientes estáticos. Reemplazar `transition-all` por propiedades concretas.
- **Esfuerzo:** 2–3 h. **Prioridad:** Media.

##### UX-24 · Detalles de accesibilidad y copy en el login
- **Estado actual:** `login.tsx:38` pinta `status` en rojo (`bg-red-50 text-red-600`), aunque `status` suele ser un mensaje de éxito ("Te enviamos el enlace…"). Hay `tabIndex` positivos (1–5) en 5 elementos (anti-patrón, WCAG 2.4.3). El botón mostrar/ocultar contraseña tiene `tabIndex={-1}`, así que no se alcanza con teclado. `confirm-password.tsx:35` muestra "Password" en inglés. Los colores del login van en `style={{color: oklch(...)}}` inline en lugar de tokens.
- **Impacto:** confusión ("¿hice algo mal?"), orden de tabulación frágil y un toggle inaccesible.
- **Recomendación:** `status` en un estilo neutro/éxito. Quitar los `tabIndex` positivos y dejar el toggle en el orden natural. Traducir los textos. Pasar los colores a clases o tokens de `auth-page`.
- **Esfuerzo:** 2–3 h. **Prioridad:** Media.

##### UX-25 · Arquitectura de información del sidebar
- **Estado actual:** `app-sidebar.tsx:39-226` tiene 17 ítems planos (más 2 grupos), con configuración (Usuarios, Sucursales, Métodos de pago, Categorías) mezclada con la operación diaria. El POS, la pantalla más usada, está en 7.º lugar (destacado con `highlight`). El separador está fijado por título (`nav-main.tsx:63 item.title === 'Reportes'`). Cada ítem lleva `mb-2` más el gap, así que con 17 ítems un portátil de 768 px necesita scroll.
- **Impacto:** más carga cognitiva para un vendedor nuevo, scroll para llegar a Reportes y una navegación que no refleja las tareas.
- **Recomendación:** grupos con `SidebarGroupLabel`: **Operación** (POS, Ventas, Caja, Créditos, Mayorista), **Inventario** (Catálogo, Categorías, Movimientos, Proveedores), **Clientes**, **Finanzas** (Finanzas, Gastos, Reportes) y **Administración** (Usuarios, Sucursales, Métodos de pago). POS primero para los roles con `pos.access`. Separadores declarativos (`group` en `NavItem`). Densidad estándar de shadcn (`gap-1`).
- **Esfuerzo:** 4–6 h. **Prioridad:** Media.

---

#### Detalle — Prioridad BAJA

##### UX-26 · Toaster
`app-layout.tsx:15` usa `<Toaster position="top-right" />` sin `toastOptions` de tema: en modo oscuro salen toasts blancos brillantes, y en el POS se superponen a los widgets de caja e impresora del header. **Recomendación:** dar estilo con tokens (`--popover`), usar `position="top-center"` o `bottom-center` en móvil y dar más duración a los errores. **Esfuerzo:** 1–2 h.

##### UX-27 · Formato de moneda inconsistente
Hay 20 implementaciones locales de `formatCOP`/`formatCurrency`. `credits/index.tsx:30` produce `$ 1.234` (con espacio, sin `Intl` de moneda) y el resto `$1.234` o `$ 1.234` según la implementación. **Recomendación:** dejar `lib/format.ts` como única fuente (`formatCOP`, `formatNumber`) y añadir un componente `<Money value tone?>` con `tabular-nums` para alinear columnas. **Esfuerzo:** 4 h.

##### UX-28 · Dependencias de UI redundantes
`@headlessui/react` se usa solo en 3 archivos (`settings/profile.tsx`, `settings/password.tsx`, `admin/account.tsx`), duplicando lo que ya hace Radix. `react-date-range` está sin mantenimiento activo, exige una hoja `rdr-dark-overrides.css` y lleva colores fijos. Playfair Display (3 pesos) se carga en todas las páginas, aunque solo la usan auth y welcome. **Recomendación:** migrar a Radix y Transition de CSS, reemplazar el rango de fechas por `Calendar` de shadcn (react-day-picker) con presets ("Hoy", "7 días", "Mes") y cargar Playfair solo en el layout de auth. **Esfuerzo:** 1 día.

##### UX-29 · Gráfico de ventas de 7 días
`sales-chart.tsx` dimensiona cada barra como `% del total semanal`: un día "fuerte" con el 20 % se ve corto. **Recomendación:** escalar contra el máximo del período y mostrar el valor absoluto. **Esfuerzo:** 1 h.

##### UX-30 · Huecos del modo oscuro
Badges INGRESO/EGRESO (`close.tsx:139`) y montos (`:146, 155`) sin `dark:`. Botón "Exacto" (`pos:1755`) azul claro fijo. `Badge` azul de abonos (`close.tsx:166`). Se resuelve en lote al aplicar los tokens de UX-10. **Esfuerzo:** 2 h.

##### UX-31 · Páginas monolíticas
`pos/index.tsx` (2.095 líneas, ~45 `useState`, JSX creado con `React.createElement` en los toasts `:625-700`), `sales/create.tsx` (973, que **duplica el flujo del POS** con otra UI), `settings/ticket.tsx` (809) y `finances/index.tsx` (804). No es un defecto visible por sí solo, pero es la razón por la que UX-01, 05, 06, 08 y 13 existen y son difíciles de testear. Ver "Componentes a refactorizar".

---

### Recomendaciones

**1. Completar el sistema de diseño (base de todo lo demás)**
- **Tokens:** añadir a `app.css` `--success|warning|info|danger` (+ `-foreground`, `-soft`, `-border`) en claro y oscuro, y `--brand`/`--brand-foreground`/`--brand-on-dark` calculados por contraste en `BrandColors`. Mapearlos en `@theme` para escribir `bg-brand text-brand-foreground` y `bg-success-soft text-success`.
- **Escala tipográfica operativa:** 12 px mínimo, 14 px para datos de venta, `tabular-nums` en todas las cifras monetarias, y el total del POS a ≥28 px.
- **Una sola fuente de verdad por concepto:** `lib/format.ts` (dinero y fechas), `lib/status.ts` (estados de venta, crédito, pedido y caja con su etiqueta y tono).
- **Reglas de lint:** prohibir `confirm`/`alert`, `text-[<12px]`, `bg-(purple|orange)-*` en páginas y `<Link><Button>` sin `asChild` (regla personalizada o revisión de PR).

**2. POS: velocidad y seguridad de la transacción**
- Guardas de envío (UX-01), persistencia y aviso al salir (UX-05), Enter/escáner deterministas (UX-08), tarjeta de "Última venta" con el cambio en grande (UX-13), altura fluida (UX-14), combobox de cliente con alta rápida (UX-09).
- **Mejora visual sugerida:** jerarquía fuerte en el panel de pago. El total y el cambio deben ser lo que más pesa en la pantalla (hoy el total es `text-lg`, igual que muchos textos secundarios). Los botones secundarios (cotización y crédito) deben ser neutros con icono de color, no rellenos ámbar y azul que compiten con "Cobrar".
- Estado de "Procesando…" con spinner dentro del botón y `aria-busy`, y bloqueo de atajos mientras se envía.

**3. Feedback y gestión de errores coherentes**
- `FlashToaster` global (UX-03), `ConfirmDialog` único (UX-07), errores de formulario asociados (UX-18) y mensajes de error del backend en español con acción sugerida (el de `ProductController:278` ya es un buen modelo; solo necesita llegar a pantalla).

**4. Accesibilidad WCAG 2.1 AA, de forma sistemática**
- Arreglar en las primitivas: Dialog/Sheet para todos los overlays, `FormField`, `IconButton`, paginación y tabla con `scope`, anillo de foco con 3:1. Así no hay que corregir página por página.
- Añadir `@axe-core/react` en desarrollo y `vitest-axe` (o Playwright + axe) en CI sobre POS, login, cierre de caja, crear producto y crear crédito.

**5. Theming multi-tenant seguro**
- Vista previa real y validación AA en `/settings/appearance`, con paletas sugeridas accesibles y la opción "auto" (derivar el secundario).

**6. Rendimiento visual**
- `prefers-reduced-motion`, blurs más pequeños o estáticos, `transition-[prop]` en vez de `transition-all`, fuentes condicionales y `loading="lazy"` + `width`/`height` en las imágenes de los resultados del POS (`pos:1483`) para evitar saltos de layout (CLS).

---

### Componentes a refactorizar

| Componente / archivo | Acción | Justificación | Esfuerzo |
|---|---|---|---|
| `pages/pos/index.tsx` (2.095 l.) | Dividir en `PosLayout`, `ProductSearch` (con `useProductSearch` + coincidencia exacta), `CartList`, `PaymentPanel`, `LastSaleCard`, `PendingSalesSheet`, `CreditDialog`, `CashMovementDialog`, `OpenSessionDialog`, `VariablePriceDialog`. Estado del carrito en `useReducer` + `usePersistentCart` | Resuelve de raíz UX-01, 05, 06, 08, 13 y 20 y permite tests unitarios | 3–4 días |
| `CashSessionWidget` / `PrinterWidget` (`pos:113-298`) | Migrar a `DropdownMenu` / `Popover` de Radix y mover a `components/pos/` | Teclado, `aria-expanded`, cierre con Escape | 3 h |
| **Nuevo** `components/ui/confirm-dialog.tsx` + `useConfirm()` | API de promesa con tono destructivo | Reemplaza `confirm()` y unifica confirmaciones | 3 h |
| **Nuevo** `components/ui/combobox.tsx` + `ClientCombobox` | Patrón Command de shadcn (cmdk), búsqueda server-side opcional, acción "Nuevo cliente" | UX-09 y UX-05; reutilizable para productos y proveedores | 1 día |
| **Nuevo** `components/ui/form-field.tsx` | Label + control + hint + error con IDs y ARIA automáticos | UX-18; elimina `InputError` suelto | 4 h + migración 1 d |
| **Nuevo** `components/ui/status-badge.tsx` + `lib/status.ts` | Tonos semánticos; mapa único de estados | Reemplaza los 3 `STATUS_CONFIG` duplicados y los badges inline de ventas | 4 h |
| **Nuevo** `components/page-header.tsx` / `page-container.tsx` | `h1` estándar, acciones y ancho | UX-16 | 4 h + migración 4 h |
| **Nuevo** `components/ui/icon-button.tsx` | `label` obligatorio por tipo → `aria-label` + Tooltip | UX-17 | 2 h + codemod |
| **Nuevo** `components/flash-toaster.tsx` | Listener global de `flash` | UX-03 | 2 h |
| `components/brand-colors.tsx` | Calcular `--brand-foreground` y `--brand-on-dark` por contraste | UX-04 | 3 h |
| `pages/settings/appearance.tsx` | Vista previa real claro/oscuro + indicador AA + labels asociados | UX-04 | 4 h |
| `components/common/PaginationFooter.tsx` | `<nav aria-label="Paginación">`, `aria-current`, labels en anterior/siguiente | UX-17 | 1 h |
| `components/common/Table.tsx` | `scope="col"`, `key` estable, `caption` opcional, variante responsive (cards) integrada | Unificar las 24 tablas (hoy solo 14 usan el componente) | 1 día |
| `components/nav-main.tsx` / `app-sidebar.tsx` | Grupos declarativos, POS primero, densidad estándar, tokens de marca seguros | UX-25, UX-04 | 4–6 h |
| `layouts/auth/auth-simple-layout.tsx` + `app.css` (auth/welcome) | Reduced-motion, blur menor, colores a tokens | UX-23, UX-24 | 3 h |
| `pages/cash-sessions/close.tsx` | Modo ciego real, sincronización del desglose, paso de confirmación, `FormField` | UX-02, UX-22 | 1 día |
| `pages/sales/create.tsx` (973 l.) | Evaluar unificarlo con los componentes del POS (`CartList`, `PaymentPanel`) o limitarlo a "venta manual / retroactiva" con un propósito claro | Hay dos UIs distintas para la misma tarea | 1–2 días |
| `react-date-range` → `Calendar` de shadcn + presets | Componente `DateRangeFilter` único | UX-28; elimina el CSS de overrides | 1 día |

---

### Roadmap

**Fase 0 — Correcciones de riesgo de negocio (semana 1, ≈3–4 días-persona)**
1. UX-01 guarda de doble cobro (1 h) y coordinación de idempotencia con backend.
2. UX-02 cierre ciego real (front + back).
3. UX-03 `flash.error` en el middleware + `FlashToaster` global.
4. UX-07 `ConfirmDialog` + reemplazo de los 4 `confirm()`.
5. UX-12 contrastes puntuales (cambio de clases) y UX-19 límite del descuento.
6. UX-14 altura fluida del POS.
→ *Resultado:* se eliminan las duplicaciones de venta, la fuga del cierre ciego y los fallos silenciosos.

**Fase 1 — Fundaciones del sistema de diseño (semanas 2–3, ≈6–8 días)**
1. Tokens semánticos + marca con contraste automático + vista previa en la configuración de apariencia (UX-04, UX-10, UX-11).
2. Primitivas: `FormField`, `StatusBadge`, `PageHeader`, `IconButton`, `Combobox`, a11y de `PaginationFooter` y `Table`.
3. `lib/format.ts` y `lib/status.ts` como fuente única (UX-27).
4. Reglas de lint y axe en desarrollo.
→ *Resultado:* cada página nueva nace consistente y accesible.

**Fase 2 — Refactor del POS (semanas 3–4, ≈5–6 días)**
1. División del componente + `useReducer` + carrito persistente con aviso al salir (UX-05, UX-31).
2. Búsqueda determinista para escáner (UX-08), `ClientCombobox` con alta rápida (UX-09), `LastSaleCard` (UX-13), cotizaciones con confirmación (UX-20).
3. Todos los overlays a Dialog/Sheet/DropdownMenu (UX-06) y bloqueo de atajos con diálogos abiertos.
4. Tests: Vitest para el reducer del carrito y Playwright para "escanear → cobrar → cambio → imprimir" y "doble F9".
→ *Resultado:* un POS más rápido, sin pérdidas de carrito ni errores de cobro.

**Fase 3 — Migración y pulido (semanas 5–6, ≈5 días)**
1. Migrar las páginas a tokens y primitivas (codemods: `<Link><Button>`, púrpura/naranja → tokens, `text-[10px]` → `text-xs`) (UX-10, 15, 16, 17, 18, 30).
2. Sidebar agrupado (UX-25), cierre de caja mejorado (UX-22), corrección de roles en la UI (UX-21).
3. Auth: reduced-motion, `tabIndex`, copy (UX-23, UX-24). Toaster con tema (UX-26).
4. Reemplazo de `react-date-range` y de Headless UI (UX-28). Gráfico (UX-29).

**Fase 4 — Gobernanza continua**
- axe-core en CI con umbral de 0 violaciones "serious/critical" en las 6 pantallas críticas.
- Regresión visual con capturas de Playwright en claro, oscuro y con 2 colores de marca extremos (amarillo claro y azul oscuro) para detectar regresiones de contraste por tenant.
- Checklist de PR de UI: tokens, primitivas, foco, labels, sin `text-[<12px]`, sin modales caseros.

**KPIs sugeridos para medir el impacto:** tiempo medio por venta en el POS (objetivo −20 %), ventas duplicadas/anuladas por día (objetivo 0), diferencias de cierre de caja por turno, tickets de soporte de tipo "no pasó nada" o "no veo el botón", y violaciones de axe en las pantallas críticas (objetivo 0 serious/critical).
