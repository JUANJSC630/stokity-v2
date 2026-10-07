# Dos librerías nuevas de animación React, comparadas

**bencho.dev y uiarc.dev son dos productos muy distintos.** Los dos son de un solo autor, salieron en septiembre de 2026 y se usan copiando el código a tu proyecto. **Bencho** es una galería de **48 micro-interacciones React** (botón "like" con partículas, OTP, slide-to-confirm, dock estilo macOS…). La hace el diseñador Lorenzo Cabra. Cada bloque se copia a mano como un `.tsx` más un `.css` plano. No hay CLI, ni paquete npm, ni repo público. Todo es MIT y gratis ([llms.txt](https://bencho.dev/llms.txt), [Licence](https://bencho.dev/licence)). **uiarc.dev ("Arc")** es una librería open-core de **240 piezas** (152 componentes y 88 bloques) con animación Motion incorporada. La hace Elia Kuratli. Se instala con el CLI de shadcn desde el registro `@uiarc`. **129 piezas son gratis (MIT)** y el resto es Pro: $129 al año, $199 lifetime o $599 para un equipo ([uiarc.dev](https://uiarc.dev), [Pricing](https://uiarc.dev/pricing)). Ninguna de las dos usa Tailwind. Por eso no chocan con Tailwind 4, pero cada una trae su propio sistema de tokens CSS. Para stokity-v2 Bencho entra casi sin fricción, pieza a pieza. Arc tiene un conflicto concreto: su `foundation.css` redefine en `:root` variables que shadcn ya usa (`--accent`, `--background`, `--border`) y gestiona el dark mode con `data-theme` en vez de la clase `.dark`. Si se importa sin aislarlo, cambia los hovers y bordes de toda la app ([arc-foundation.json](https://uiarc.dev/r/arc-foundation.json)). Ambas son proyectos de semanas, con bus factor 1. Para el día a día de un POS solo aportan unas pocas piezas útiles, y las piezas de Arc más valiosas para ecommerce y tablas densas son de pago.

## Bencho es un banco de 48 micro-interacciones para copiar, no un design system

Bencho se define como "a library of interactive React UI components and micro-interactions". Todo bloque es una demo en vivo que se puede tocar, ajustar con controles propios y copiar. Está "built with React, TypeScript and framer-motion" ([llms.txt](https://bencho.dev/llms.txt)). Lo creó **Lorenzo Cabra**, product designer, como experimento en su tiempo libre para ver hasta dónde llegaba combinando su diseño con Claude. Lo presentó en LinkedIn a mediados de septiembre de 2026 con **1.329 reacciones y 65 comentarios**, y prometió bloques nuevos cada semana ([LinkedIn](https://www.linkedin.com/posts/lorenzocabra_introducing-bencho-a-library-of-interactive-activity-7503850258419060736-IqKF)). El directorio vibing.inc lo registra el 14 de septiembre de 2026 ([vibing.inc](https://vibing.inc/library/bencho-vg-2238)). El sitemap tiene 206 URLs y la última modificación es del 2026-10-06: 48 páginas `/blocks/*` y 151 `/finds/*` ([sitemap.xml](https://bencho.dev/sitemap.xml)). Ojo con la ambigüedad del nombre. **El paquete npm `bencho` no tiene relación**: es un CLI de benchmarking ([npm](https://www.npmjs.com/package/bencho)). Tampoco tiene que ver Bencher (bencher.dev) ([bencher.dev](https://bencher.dev/docs/pt)).

El sitio tiene cuatro secciones ([llms.txt](https://bencho.dev/llms.txt)):

| Sección | Qué es |
|---|---|
| **Blocks** | El muro de componentes interactivos |
| **Finds** | Galería curada de unas 150 interacciones de otros diseñadores, en video y con crédito a su autor |
| **Sounds** | Sonidos sintetizados para UI |
| **Bench** | Lienzo para colocar y ajustar bloques lado a lado. Tiene menú por bloque con "Lock position", "Copy prompt" y "Remove" |

La cuenta es gratuita, por código de email, y sirve para guardar tu colección en un "bench" personal. El login con Google o X todavía no está activo (bundle JS de [bencho.dev](https://bencho.dev)).

El catálogo público tiene 48 bloques. Agrupados por utilidad práctica:

| Tipo | Bloques |
|---|---|
| **Formularios y entrada** | One-time code (OTP de 6 casillas que funcionan como un solo campo, con paste/autofill y shake en error), Label input (floating label), Upload dropzone (con progreso y rechazo por tamaño), Signature pad, Drag stepper (tap = +1, mantener = barrido), Time scrubber, Magnetic select, Aspect ratio, Palette, Range dial, Wheel, Progress ticks, Slosh slider, Liquid toggle |
| **Confirmaciones y acciones** | Slide to confirm, Inline confirm, Like, Notify, Escape button |
| **Navegación y menús** | Command bar, Radial menu, Create menu (metaballs), Canvas toolbar, Icon bar, Magnifying dock, Search expandible, Pull to refresh |
| **Listas y selección** | Selection list, Reorder list, Assignees, Checklist, Todo tower (to-do con física) |
| **Media y widgets** | Image compare, Image accordion, Carousel 3D, Now playing, Voice note, Dynamic island, Generate (loader de IA), Step player, Asset swap, Action node |
| **Efectos expresivos** | Heat map, Particles, Eye tracker, Tilt card, Glass bubble, Dragging ball |

Fuentes: [llms.txt](https://bencho.dev/llms.txt), [sitemap.xml](https://bencho.dev/sitemap.xml).

El chunk de código del sitio contiene **63 entradas**: las 48 públicas más 15 que no están en el sitemap. Entre ellas hay Rolling counter, Swipe row, Hold to delete, Tag input, Emoji reactions, Scratch card y Card stack, además de cuatro pósters del sponsor Mobbin (bundle JS de [bencho.dev](https://bencho.dev)). El `llms.txt` repite o trunca algunas descripciones. Es señal de un proyecto que se mueve rápido ([llms.txt](https://bencho.dev/llms.txt)). Bencho **no trae primitivas básicas** (Button, Dialog, Table, Select accesible). Sirve para detalles de "delight", no como base de una UI.

### Instalación por copia, con un prompt pensado para agentes de IA

No hay npm, CLI ni registro shadcn. Cada bloque tiene un panel de código con tres pestañas:

| Pestaña | Contenido |
|---|---|
| **Install** | El `npm install` de sus dependencias, o "# nothing to install beyond React" |
| **Usage** | Un snippet de import con las props rellenas con los valores que hayas ajustado en los controles |
| **Code** | Los archivos `tsx` y `css` |

Fuente: bundle JS de [bencho.dev](https://bencho.dev).

El snippet que genera tiene esta forma:

```tsx
import { Hold } from "./Hold";
import "./Hold.css";

<Hold hold={…} rewind={…} />
```

El botón **"Copy prompt"** copia instrucciones completas para Claude Code o Cursor, con el código fuente incluido. Le pide al agente cuatro cosas: crear el componente en una ruta sensata, instalar las dependencias, añadir el CSS y mapear los tokens CSS que el bloque lee y no define "to whatever this project already uses". Si el proyecto no tiene equivalente, el agente debe definirlos en la raíz del componente "so nothing leaks out". El prompt avisa también que las imágenes de Bencho son *stubs* "not licensed to travel" (bundle JS de [bencho.dev](https://bencho.dev); [BuilderTools](https://www.buildertools.sh/bencho)).

Técnicamente, los bloques son **React + TypeScript + CSS plano** con clases prefijadas (`.hld`, `.swp-card`…) y `@keyframes` propios. **No usan Tailwind, Radix, shadcn, `"use client"` ni ninguna API de Next.js.** En el código embebido solo aparecen imports de `react`, `lucide-react`, `framer-motion` y `liquid-gooey` (bundle JS de [bencho.dev](https://bencho.dev/assets/index-_AMJ4TW0.js)).

Las dependencias por bloque son ligeras. Sobre las 63 entradas: 26 no tienen ninguna, 19 usan solo `lucide-react`, 10 usan `framer-motion` + `lucide-react`, 4 solo `framer-motion` y 4 incluyen `liquid-gooey`. Este último es un paquete npm muy joven (v0.2.2, de Jakub Antalik) de efectos SVG "gooey" ([registry npm](https://registry.npmjs.org/liquid-gooey)). Otro análisis, sobre un subconjunto de 32 bloques con dependencias declaradas, da conteos algo distintos. La conclusión no cambia: **más de la mitad de los bloques no necesita librería de animación.**

Cada bloque expone como props los mismos controles del panel. Ejemplos:

| Bloque | Props |
|---|---|
| Magnetic select | `size, pull, bounce, give` |
| One-time code | `length, answer, corner, pace, ripple` |
| Hold | `hold, rewind, shake, corner` |

El theming va por custom properties que el bloque lee y no define (`--card`, `--ink`, `--ink-rgb`, `--fill-slab`, `--signal`, `--font-ui`…) y por atributos `data-fill`, `data-surface` y `data-stroke`. Los bloques respetan `prefers-reduced-motion` (bundle JS de [bencho.dev](https://bencho.dev)).

### Licencia MIT real y gratis de verdad

La licencia cubre "every block on the bench, and everything the Code pane hands you", y dice textualmente que "there is no tier of it that is not". Se permite el uso comercial **sin atribución en la interfaz**. La única obligación es conservar el aviso de copyright (MIT, © 2026 Lorenzo Cabra) en copias sustanciales del código. **No son MIT** el sitio en sí, la marca "Bencho" con su cabra, las fotografías ni la tipografía Maison Neue ([Licence](https://bencho.dev/licence)).

Algunos directorios lo clasifican como "Freemium" ([vibing.inc](https://vibing.inc/library/bencho-vg-2238)). El propio sitio lo desmiente. El negocio son **patrocinios de €400 al mes** (cinco plazas). El sponsor actual es Mobbin ([Sponsor](https://bencho.dev/sponsor)). No hay repo público: el repo que el bundle referencia, `lorenzo04us/Bencho`, devuelve 404 ([GitHub API](https://api.github.com/repos/lorenzo04us/Bencho)). Tampoco hay documentación formal fuera del panel.

## Arc es un kit open-core de 240 piezas distribuido como registro shadcn

uiarc.dev se presenta con "animated React components for shadcn and Next.js" y "152 React components and 88 blocks with motion built in" ([uiarc.dev](https://uiarc.dev)). Se define como una librería "designed for AI-assisted frontend development", con componentes copy-paste, metadatos de registro legibles por máquinas, skills de IA y MCP ([llms.txt](https://uiarc.dev/llms.txt)). La opera **"Arc, a sole proprietorship of Elia Kuratli"** desde Frauenfeld (Suiza) ([Imprint](https://uiarc.dev/imprint)).

El repo público `kuratlielia/arc-library` se creó el **2026-09-24**. Tiene **353 estrellas, 19 forks y 0 issues abiertos**, con licencia MIT ([GitHub API](https://api.github.com/repos/kuratlielia/arc-library)). Es un espejo de un repo privado, con commits "Sync from source…" casi diarios ([commits](https://github.com/kuratlielia/arc-library/commits/main)). Su `package.json` es `"version": "0.0.0"`, `"private": true`: **no hay paquete npm** ([package.json](https://raw.githubusercontent.com/kuratlielia/arc-library/main/package.json)). El 2026-09-30 entró en el **directorio oficial de registros de shadcn** como `@uiarc` ([PR #12059](https://github.com/shadcn-ui/ui/pull/12059), [directory.json](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/directory.json)).

El nombre "Arc" choca con otros productos (arc.dev, ARC UI de Arclight, Arc XP). Por eso cuesta encontrar opiniones ([Arclight](https://arclight.build/blog/announcing-arc-ui/), [design.arcxp.com](https://design.arcxp.com/release-notes/v1dot3dot0)).

### Qué es gratis y qué es Pro

**"129 of 240 items are free"**: 107 componentes y 22 bloques. Pro añade 45 componentes "motion" y 66 bloques completos ([llms.txt](https://uiarc.dev/llms.txt), [Pricing](https://uiarc.dev/pricing)). El `registry.json` público expone hoy 132 items ([registry.json](https://uiarc.dev/r/registry.json)). Las cifras cambian a diario.

La parte gratuita es sorprendentemente amplia ([llms.txt](https://uiarc.dev/llms.txt)):

| Categoría | Componentes gratis |
|---|---|
| **Inputs** | Input, Textarea, Password strength, Number field, **Money input** (agrupación en vivo, ancho estable, dígitos rodantes, salida en unidades menores), Phone input (E.164), Tag y Mention input, Select, Combobox, Multi-select, Date picker y **Date range picker** con presets, Time picker, Color picker, **Rich text editor** (menú slash, salida HTML/markdown), Signature pad, File dropzone |
| **Acciones** | Button, Split button, Copy button, **Confirm morph** (botón destructivo → confirmación inline → spinner → resultado con deshacer), Hold to confirm, Swipe actions, Dropdown y Context menu, Theme switcher |
| **Disclosure** | Tabs, Accordion, Dialog, Drawer, Bottom sheet, Popover, Tooltip, Resizable panels |
| **Feedback** | Toast, Toast stack, Progress, Skeleton, Stepper, Countdown, Usage meter |
| **Datos** | Line, Bar y Donut chart, Sparkline, Gauge, Treemap, Activity heatmap, **Sortable data table**, Filter toolbar, Metric card, Tree view, JSON viewer, Timeline, Chat thread |

Los **22 bloques gratis** son sobre todo de marketing y autenticación: Sign in con código de 6 dígitos, login passkey-first, OTP, Command palette, Notification center, File upload, hero, FAQ, pricing y footer.

Lo Pro concentra lo más valioso para producto ([llms.txt](https://uiarc.dev/llms.txt)):

| Grupo | Piezas Pro |
|---|---|
| **Tablas y gráficos** | **Data grid** tipo hoja de cálculo (selección de rango, edición inline, fill handle), Sankey, Funnel, Radar, Realtime stream a 60 fps |
| **Ecommerce** | **Cart drawer**, **Checkout summary**, **Product listing/detail** |
| **Back-office** | Invoice studio, **Roles and permissions** (matriz), Metrics dashboard, Revenue explorer, MRR waterfall, Settings page, API keys, Webhooks |
| **Plantillas** | Arc SaaS, Arc AI y Arc Startup. El roadmap promete una al mes ([Roadmap](https://uiarc.dev/roadmap)) |

### Herramientas para agentes de IA

Arc trae un **servidor MCP remoto** de solo lectura en `https://uiarc.dev/api/mcp`, con OAuth y cuenta gratuita. Sus herramientas son `search_components`, `get_component` y `get_install_command`. Se añade a Claude Code con `claude mcp add --transport http arc https://uiarc.dev/api/mcp` ([AI docs](https://uiarc.dev/docs/ai)).

También hay una skill instalable con `npx shadcn@latest add https://uiarc.dev/r/arc-skill.json`, que va a `.claude/skills/arc`. Las skills Pro incluyen generación de páginas completas y "Refactor to Arc" desde shadcn, MUI o Chakra ([AI docs](https://uiarc.dev/docs/ai)). Completan el paquete `llms.txt`, `llms-full.txt` y una página markdown por componente.

### Estilos, theming y motion: un design system propio y opinado

Requisitos: **React 19 + TypeScript**, compilable bajo `strict`, `noUncheckedIndexedAccess` y `verbatimModuleSyntax`, con `lib` ES2023 o superior. Funciona en Next.js App Router o Vite. **"No Tailwind is required. Arc styles are CSS modules that read CSS variables"** ([README](https://github.com/kuratlielia/arc-library)).

Dependencias en los 132 items públicos: `motion` (import `motion/react`) en **125**, `lucide-react` en **81**, y Radix solo en unos 20 (dialog, popover, dropdown, select…) ([registry.json](https://uiarc.dev/r/registry.json)). Ningún archivo usa `cn()` ni clases Tailwind. Hay 134 archivos `.module.css`.

El theming va con tokens semánticos ([Theming](https://uiarc.dev/docs/theming)):

| Grupo | Tokens |
|---|---|
| Color | `--background`, `--surface`, `--foreground`, `--border`, `--accent`, `--success`, `--danger` |
| Radios | `--radius-control` 18px, `--radius-panel` 26px, `--radius-surface` 34px |
| Tipografía | Geist (display) e Inter (cuerpo) |

El dark mode se activa con **`data-theme="dark"` en `<html>`**. Los acentos van con `data-accent`: neutral, violet, blue, green, amber, orange, coral o rose.

Las animaciones usan presets de spring centralizados en `motion-tokens.ts` ([Motion](https://uiarc.dev/docs/motion)):

| Preset | Valores | Uso |
|---|---|---|
| `snappy` | visualDuration 0.26, bounce 0.12 | Pulsaciones y toggles |
| `smooth` | 0.4, bounce 0 | Paneles |
| `morph` | 0.42, bounce 0.16 | Highlights compartidos |

Cada animación tiene rama de reduced-motion ([Motion](https://uiarc.dev/docs/motion)):

```tsx
const reduce = useReducedMotion();
<motion.span animate={{ x: on ? 20 : 0 }}
  transition={reduce ? { duration: 0 } : motionTokens.spring.snappy} />
```

La API de los componentes calca la de shadcn/Radix. El Dialog, por ejemplo, usa `DialogTrigger asChild`, `DialogContent title=… description=…` y `DialogClose`, y `title` es obligatorio ([dialog](https://uiarc.dev/components/dialog/markdown)). Cada página de componente documenta teclado, accesibilidad, motion, responsive y "Notes for AI" ([Docs](https://uiarc.dev/docs)).

### Precios y licencia Pro

| Plan | Precio | Contenido |
|---|---|---|
| Free | $0 | 107 componentes + 22 bloques, CLI, MCP, docs IA. Sin cuenta |
| Pro anual | **$129/año** | Todo, 1 asiento |
| Pro lifetime | **$199** pago único | Todo, 1 asiento (terminó el precio "founder") |
| Team | **$599** único o **$349/año** | Hasta 10 personas |

Fuente: [Pricing](https://uiarc.dev/pricing).

La licencia Pro permite:

- Proyectos ilimitados, incluidos trabajos para clientes, SaaS de pago y repos privados.
- Seguir usando el código ya integrado si cancelas el plan anual.

Prohíbe:

- Revender o redistribuir el código suelto, o empaquetarlo como kit o plantilla.
- Exponerlo en un MCP o registro público.
- Compartir tokens.
- Usarlo para entrenar modelos ofrecidos a terceros.

Las compras son finales, salvo un fallo que el autor no pueda arreglar. **Tanto la licencia como el imprint dicen ser un borrador "not been reviewed by a lawyer yet"** ([License](https://uiarc.dev/license)). Existe un port no oficial a Vue, `uiarc-vue` ([npm](https://registry.npmjs.org/uiarc-vue)).

## Integrarlas en stokity-v2 cuesta poco con Bencho y una tarde con Arc

El stack de stokity-v2 es Laravel 12, Inertia 2, React 19, Tailwind 4 y shadcn: el mismo del starter kit oficial de Laravel ([Laravel starter kits](https://laravel.com/docs/12.x/starter-kits)). El `components.json` tiene `"rsc": false`, alias `components: "@/components"` e `iconLibrary: "lucide"`. `package.json` ya incluye `lucide-react ^0.475.0`, `react ^19`, `tailwindcss ^4`, `vite ^6` y build SSR, pero **ni `motion` ni `framer-motion`**. Archivos: `/Users/juanjsc/Herd/stokity-v2/components.json` y `/Users/juanjsc/Herd/stokity-v2/package.json`.

Ninguna de las dos depende de Tailwind. Por tanto **Tailwind v3 o v4 da igual**, y eso es una ventaja frente a Magic UI o Aceternity. Vite soporta CSS Modules sin configuración ([Vite](https://vite.dev/guide/features#css-modules)).

### Bencho: copiar, mapear tokens y unificar Motion

Bencho no necesita adaptación de framework. El flujo es:

1. Instalar las dependencias del bloque.
2. Copiar el `.tsx` y el `.css` a algo como `resources/js/components/bencho/`.
3. Importar el CSS desde el componente.

Las clases van prefijadas, así que el riesgo de colisión es bajo. El trabajo real es **mapear sus tokens** a los de shadcn: por ejemplo `--ink` → `--foreground` y `--card` → `--card`, definidos tanto en claro como en `.dark`. Hay una trampa: los tokens `-rgb` esperan "tres números sueltos" y no el formato oklch de Tailwind 4 (bundle JS de [bencho.dev](https://bencho.dev)).

También conviene reescribir `from "framer-motion"` a `from "motion/react"`. Así no se cargan dos librerías de animación si después entra Arc. La API es la misma en Motion 11+.

Para SSR hay que revisar a mano los bloques de física, canvas o puntero por si acceden a `window` durante el render. No se auditaron uno por uno.

### Arc: el conflicto de `:root` es el punto crítico

`foundation.css` (15 KB) define en `:root` estas variables, que shadcn también usa:

| Variable | Valor en Arc |
|---|---|
| `--background` | `var(--neutral-0)` |
| `--foreground` | `var(--neutral-11)` |
| `--border` | `oklch(93.5% 0 0)` |
| `--accent` | `oklch(33% 0 0)`, un gris oscuro |
| `--accent-foreground` | `var(--background)` |

Además añade reglas globales de foco con `!important` ([arc-foundation.json](https://uiarc.dev/r/arc-foundation.json)). En stokity-v2, `resources/css/app.css` usa `--accent: oklch(0.97 0 0)`, un gris casi blanco que pintan los hovers de sidebar, menús y botones `ghost`. El dark mode va por clase (`@custom-variant dark (&:is(.dark *))`, con `use-appearance.tsx` alternando `.dark`).

**Si se importa `foundation.css` después de `app.css`, los hovers de toda la app pasan a gris oscuro.** En el orden inverso, los botones de acento de Arc salen casi blancos. Hay tres salidas:

- Scopear el `:root` de Arc a un wrapper como `.arc`.
- Renombrar las variables conflictivas (`--arc-accent`…), que es viable porque tras copiar el código es tuyo.
- Mapear los tokens de Arc a los de shadcn de forma deliberada.

La memoria del proyecto ya registra que en Tailwind 4 los alias de tema no se re-scopean bien redeclarando variables. Eso inclina la balanza hacia **renombrar**. Este conflicto es una inferencia a partir del código y no se probó en el repo.

### Las APIs de Next.js son un problema menor en Arc

El problema de Next.js es residual. 141 de 305 archivos llevan `"use client"`, que Vite ignora. Solo importan `next/image` tres bloques gratuitos: `site-header`, `newsletter-signup` y `changelog-feed`, este último además con el tipo `StaticImageData` ([registry.json](https://uiarc.dev/r/registry.json)). `avatar` y `breadcrumb` usan un `ArcProvider` que, "without a provider, renders a plain `<a>` and `<img>`". Acepta cualquier componente de enlace compatible ([avatar.json](https://uiarc.dev/r/avatar.json)).

Esto se arregló el 2026-10-07 tras el issue #13, que decía "they only work in Next.js" ([issue 13](https://github.com/kuratlielia/arc-library/issues/13)). El `Link` de `@inertiajs/react` ya usa `href`, así que el adaptador para visitas SPA es casi directo. Sin él, los enlaces de Arc harían recargas completas. Esta integración con Inertia no está documentada oficialmente.

### Pasos de configuración para Arc

```jsonc
// components.json
{
  "registries": {
    "@uiarc": "https://uiarc.dev/r/{name}.json",
    "@uiarc-pro": {
      "url": "https://uiarc.dev/r/pro/{name}.json",
      "headers": { "Authorization": "Bearer ${ARC_PRO_TOKEN}" }
    }
  }
}
```

1. **Registrar el namespace** en `components.json` como arriba. `@uiarc-pro` solo hace falta si hay licencia, con el token en `.env` y nunca en git.
2. **Instalar las bases** con `npx shadcn@latest add @uiarc/arc-foundation`. Crea `components/arc/foundation.css` y los motion tokens. Las fuentes son [Installation](https://uiarc.dev/docs/installation) y [shadcn namespaces](https://ui.shadcn.com/docs/registry/namespace).
3. **Renombrar o scopear las variables en conflicto** y revisar las reglas de foco antes de importar nada.
4. **Importar `foundation.css`** en `app.tsx` y `ssr.tsx`, o solo en el layout que use Arc.
5. **Sincronizar el dark mode.** En `use-appearance.tsx` hay que añadir `document.documentElement.dataset.theme = isDark ? 'dark' : 'light'`.
6. **Añadir componentes** con `npx shadcn@latest add @uiarc/money-input` y similares, e importarlos desde `@/components/arc/<item>/<item>`.
7. **Envolver la app** en `<ArcProvider link={InertiaArcLink}>`.
8. **Sustituir `next/image`** por `<img>` o `ArcImg` en los tres bloques citados.
9. **Validar** con `npm run build` y `npm run build:ssr`.

Sobre SSR: los accesos a `window.matchMedia` y `document` que aparecen en Arc están dentro de `subscribe` de `useSyncExternalStore`, no a nivel de módulo ([registry.json](https://uiarc.dev/r/registry.json)). 87 archivos usan `useLayoutEffect`, que conviene vigilar en SSR. Queda pendiente un detalle: con Tailwind 4 el campo `tailwind.config` de `components.json` puede apuntar a un archivo inexistente, y no se verificó cómo reacciona el CLI.

### Coste en bundle

El componente `motion` completo **no baja de unos 34 kb** con tree-shaking. Con `m` + `LazyMotion` se queda en ~4,6 kb más features ([motion.dev](https://motion.dev/docs/react-reduce-bundle-size)). Arc usa `motion.*` directo, así que cada página con un componente Arc paga ese peso. Gracias al code-splitting por página de Inertia, el coste se limita a esas páginas. Lucide ya está en el proyecto, y Radix probablemente ya está vía shadcn.

## Juventud, un solo autor y licencias en borrador son los riesgos reales

Las dos librerías tienen **semanas de vida y un único mantenedor**. Bencho sufre además las limitaciones de su formato:

- **Sin actualizaciones.** No hay paquete ni CLI que avise de cambios.
- **Sin documentación ni repo público.** Tampoco hay issues donde reportar fallos.
- **Imágenes no reutilizables.** Sus fotos hay que reemplazarlas.
- **Sin garantía.** La licencia dice que "if one breaks something, that is on the person who shipped it" ([Licence](https://bencho.dev/licence)).
- **Nombre conflictivo.** En hindi/urdu es un insulto, y la comunidad lo señaló en el lanzamiento ([LinkedIn](https://www.linkedin.com/posts/lorenzocabra_introducing-bencho-a-library-of-interactive-activity-7503850258419060736-IqKF)).

Arc tiene la ventaja de un repo con issues, y su historial es elocuente. Entre el 30 de septiembre y el 7 de octubre, usuarios técnicos reportaron estos fallos ([issues](https://github.com/kuratlielia/arc-library/issues?q=is%3Aissue)):

| Issue | Problema |
|---|---|
| #10 | `foundation.css` eliminaba todos los outlines de foco, lo que **incumplía WCAG 2.2 (2.4.7)** |
| #11 | Unos **4.150 errores de TypeScript** bajo `noUncheckedIndexedAccess` |
| #4 | El CLI ignoraba los alias de `components.json` |
| #5 | El registro listaba fragmentos de código como dependencias npm |
| #13 | Dependencia dura de Next.js |

**Todos se cerraron en días.** Muestra inmadurez de salida, pero también capacidad de respuesta.

Siguen abiertas cuatro limitaciones estructurales:

- **Textos en inglés.** La localización solo existe en algunos componentes, tras peticiones (#7, #9). Importa para una app en español con COP.
- **Sin versionado.** No hay semver: actualizar significa reinstalar y sobrescribir archivos locales.
- **Estética muy definida.** Radios de 18 a 34 px, Geist + Inter, y reglas que prohíben gradientes y pesos bold ([llms.txt](https://uiarc.dev/llms.txt)). Choca con el look shadcn existente.
- **Lo mejor es de pago.** Las piezas más útiles para un POS con ecommerce (data grid, cart, checkout, product pages) son Pro.

No se encontraron reseñas independientes de ninguna de las dos en Reddit, Hacker News o Product Hunt. Tampoco benchmarks de tamaño o rendimiento.

## Magic UI, Aceternity y React Bits encajan mejor en un proyecto shadcn

El ecosistema de registros animados para shadcn está dominado por librerías que sí usan **Tailwind + `cn()`**. Por eso se integran de forma nativa en stokity-v2:

- **Magic UI** se describe como "150+ free, open-source animated components… React, Tailwind CSS and Motion" ([DEV](https://dev.to/hiteshbhardwaj/5-best-animated-component-libraries-for-react-and-nextjs-in-2026-1382), [marquee.json](https://magicui.design/r/marquee.json)).
- **Aceternity** ofrece efectos más dramáticos, aunque algunos items importan `next/image` ([apple-cards-carousel.json](https://ui.aceternity.com/registry/apple-cards-carousel.json)).
- **React Bits** evita Framer Motion y usa CSS o GSAP ([pkgpulse](https://www.pkgpulse.com/guides/react-bits-vs-aceternity-magic-ui-2026), [SplitText](https://reactbits.dev/r/SplitText-TS-TW.json)).

La diferencia de escala es grande. Estrellas en GitHub a 2026-10-07:

| Repo | Estrellas |
|---|---|
| shadcn/ui | 125.245 |
| React Bits | 48.615 |
| Magic UI | 22.487 |
| coss (Origin UI) | 10.669 |
| motion-primitives | 6.478 |
| 21st | 5.486 |
| animate-ui | 4.367 |
| **Arc** | **353** |
| **Bencho** | Sin repo público |

Fuentes: [GitHub API](https://api.github.com/repos/DavidHDev/react-bits) y [magicui](https://api.github.com/repos/magicuidesign/magicui).

Origin UI se consolidó en `cosscom/coss`, cuyo repo figura como AGPL-3.0. Antes de adoptarlo hay que verificar qué licencia aplica a los componentes ([coss](https://api.github.com/repos/cosscom/coss)).

| | Distribución | Estilos | Animación | APIs Next | Encaje en stokity-v2 |
|---|---|---|---|---|---|
| **Arc** | Registro shadcn `@uiarc` + Pro con token, MCP | CSS Modules + tokens propios | `motion` | 3 bloques con `next/image`; provider para Link/Image | Medio: hay que aislar tokens |
| **Bencho** | Copiar/pegar TSX + CSS | CSS global prefijado | `framer-motion` (+ `liquid-gooey`) | Ninguna | Alto para piezas sueltas; sin updates |
| Magic UI | Registro shadcn | Tailwind + `cn()` | `motion` | No en lo revisado | Alto, nativo |
| Aceternity | Registro shadcn | Tailwind + `cn()` | `motion` | Algunos `next/image` | Alto, adaptando imágenes |
| React Bits | Registro (TS/JS, CSS/TW) | CSS o Tailwind | CSS/GSAP | No en lo revisado | Alto |

Arc se diferencia por su design system completo, su motion "calm" y su enfoque AI-first (MCP, skills, llms.txt). Bencho se diferencia por la calidad artesanal de pocas interacciones y por su prompt de integración para agentes.

## Conclusión

La pregunta útil no es "¿cuál de las dos?" sino "¿qué piezas concretas?". **Bencho funciona como cantera**: de su catálogo, One-time code, Slide to confirm, Inline confirm o Hold to delete, Drag stepper, Upload dropzone y Command bar tienen sentido en un POS. Su coste de entrada es casi nulo. **Arc gratuito** aporta piezas con encaje directo en stokity-v2 que shadcn no trae: Money input con salida en unidades menores, Date range picker con presets, Confirm morph con deshacer y gráficos animados. Pero adoptarlo como *segundo design system* en paralelo a shadcn duplica tokens, estilos de foco y estética. Lo sensato es instalar componentes concretos, renombrar sus variables y traducir sus textos, en vez de importar `foundation.css` globalmente.

Las dos usan el modelo shadcn: el código se copia a tu repo. Eso neutraliza buena parte del riesgo de abandono, porque lo que copias sigue funcionando aunque el autor desaparezca. A cambio, el mantenimiento pasa a ser tuyo. Antes de comprar Arc Pro (el Data grid y el bloque de roles serían los candidatos para stokity) conviene esperar a que la licencia deje de ser borrador. Y si el objetivo es solo añadir animación sin fricción, Magic UI o React Bits encajan con menos trabajo en el stack Tailwind 4 + shadcn.
