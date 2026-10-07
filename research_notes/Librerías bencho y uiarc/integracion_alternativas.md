# Integración de bencho.dev y uiarc.dev (Arc) en Laravel 12 + Inertia + React 19 + TS + Tailwind 4 + Vite, y comparación con alternativas

Notas de investigación, 2026-10-07. Método: además de las páginas públicas, se descargaron y analizaron programáticamente **los 132 items del registry gratuito de Arc** (`https://uiarc.dev/r/registry.json` y cada `https://uiarc.dev/r/{name}.json`, 305 archivos) y el bundle JS de bencho.dev (que embebe el código fuente de cada bloque como texto). Los conteos ("125 de 132 items dependen de `motion`", etc.) salen de ese análisis directo; la URL citada es la del registry o el bundle. También se contrastó con la configuración real de stokity-v2 (`components.json`, `resources/css/app.css`, `use-appearance.tsx`).

## Qué ofrece cada sitio (verificación breve)

### Takeaway
Bencho es una colección pequeña (48 bloques) de micro-interacciones React de copiar y pegar (TSX + un archivo CSS plano), sin CLI. Arc (uiarc.dev) es una librería más grande de componentes y bloques que se distribuye como **registry compatible con shadcn** (gratis + Pro), con su propio sistema de tokens CSS y CSS Modules, **no Tailwind**.

### Cited Findings
- Bencho se describe como "a library of interactive React UI components and micro-interactions"; "Built with React, TypeScript and framer-motion"; bloques con licencia MIT; "48 blocks, each with its own page, live demo and adjustable values; most include their full source to copy". Hecho por Lorenzo Cabra (@benchodev en X). También incluye "Finds" (galería curada de interacciones de otros diseñadores), "Sounds" (sonidos UI sintetizados) y "Bench" (lienzo para combinar bloques) — [bencho.dev/llms.txt](https://bencho.dev/llms.txt)
- El sitio bencho.dev es en sí una SPA de Vite (HTML con `/assets/index-*.js` y comentarios que mencionan `main.tsx`), no una app Next.js — [bencho.dev (HTML fuente)](https://bencho.dev)
- La UI de cada bloque muestra tres paneles: **Install** (`npm install <deps>` o "# nothing to install beyond React"), **Usage** y **Code** con pestañas `tsx` y `css`; también un botón "Copy prompt… paste it into your agent" — [bundle de bencho.dev](https://bencho.dev/assets/index-_AMJ4TW0.js)
- Prensa: Dr. Web describe Bencho como bloques que "corren como componentes React reales" usando Framer Motion y filtros SVG para efectos "gooey", MIT y utilizable en proyectos comerciales — [drweb.de](https://www.drweb.de/bencho-ui-bausteine/)
- Arc: "152 React components and 88 blocks with motion built in"; instalación vía shadcn CLI o copiar/pegar; tiers Free y Pro (Pro incluye "45 motion components and the larger blocks"); creado por Elia Kuratli — [uiarc.dev](https://uiarc.dev)
- Arc según su llms.txt: "Free items install with the shadcn CLI from a public registry; Pro items are licensed and install from the token-gated @uiarc-pro registry"; "129 of 240 items are free" — [uiarc.dev/llms.txt](https://uiarc.dev/llms.txt)
- Nota de inconsistencia: la home dice 152 componentes + 88 bloques (=240) y el llms.txt dice 129 de 240 gratis, pero el `registry.json` público expone 132 items (107 `registry:ui`, 22 `registry:block`, 2 `registry:item`, 1 `registry:file`) — [uiarc.dev](https://uiarc.dev); [uiarc.dev/r/registry.json](https://uiarc.dev/r/registry.json)
- Repo: `kuratlielia/arc-library`, MIT, "free, open source React components with calm motion. Copy the code or install with the shadcn CLI" — [GitHub](https://github.com/kuratlielia/arc-library)

### Inferences
- Son productos de naturaleza distinta: Bencho = "galería de recetas" de interacciones vistosas para copiar una por una; Arc = "kit de componentes" con design system propio pensado para construir apps/landings enteras (y para agentes de IA).

### Gaps
- No se verificó el contenido exacto de Arc Pro (requiere token).

## ¿Dependen de APIs específicas de Next.js? ¿Qué hay que adaptar para Inertia/Vite?

### Takeaway
Casi nada. Bencho no usa ninguna API de Next.js (ni siquiera `"use client"`). Arc pone `"use client"` (inofensivo en Vite) y sólo **4 items gratuitos** (3 bloques + el provider) importan `next/image`; `next/link`/`next/image` en `avatar` y `breadcrumb` se resuelven con un `ArcProvider` inyectable que por defecto renderiza `<a>`/`<img>`.

### Cited Findings
- Bencho: en el código fuente embebido de los bloques sólo aparecen imports de `react` (64), `lucide-react` (30), `framer-motion` (17) y `liquid-gooey` (4); cero `"use client"`, cero `next/*`, cero alias `@/` — [bundle de bloques bencho.dev](https://bencho.dev/assets/index-_AMJ4TW0.js)
- Bencho: los estilos son clases CSS globales con prefijo por bloque (p. ej. `swp`, `swp-card`, `swp-coin` en el bloque de swap), distribuidas como archivo `.css` aparte, no Tailwind — [bundle de bencho.dev](https://bencho.dev/assets/index-_AMJ4TW0.js)
- Arc: 141 de 305 archivos del registry gratuito llevan `"use client"`; imports de Next.js encontrados sólo en `newsletter-signup` (`next/image`), `changelog-feed` (`next/image` + tipo `StaticImageData`), `site-header` (`next/image`), y en el comentario de documentación de `lib/arc-provider.tsx` (incluido por `avatar` y `breadcrumb`) — [uiarc.dev/r/registry.json](https://uiarc.dev/r/registry.json) (análisis de cada `https://uiarc.dev/r/{name}.json`)
- `arc-provider.tsx`: "Without a provider, Arc renders a plain `<a>` and `<img>`, so components work in any React app (Vite, Remix, Astro, plain React)"; se puede pasar cualquier componente compatible, "such as … a React Router Link wrapped to map `href` to `to`"; las props de imagen son "a subset of next/image's props" (`fill`, `width/height`, `sizes`, `priority`) — [uiarc.dev/r/avatar.json](https://uiarc.dev/r/avatar.json)
- Ejemplo de uso con `next/image` en `site-header`: `<Image src={…} alt={…} fill sizes="260px" />` — [uiarc.dev/r/site-header.json](https://uiarc.dev/r/site-header.json)
- Para comparar: Aceternity `apple-cards-carousel` también importa `next/image`; Magic UI `marquee`/`globe` y Aceternity `3d-card`/`floating-dock` no importan `next/*` — [ui.aceternity.com/registry/apple-cards-carousel.json](https://ui.aceternity.com/registry/apple-cards-carousel.json); [magicui.design/r/globe.json](https://magicui.design/r/globe.json)

### Inferences
- Adaptación para Inertia: `"use client"` se puede dejar (es una directiva de string ignorada por Vite/React fuera de RSC; el `components.json` del proyecto ya tiene `"rsc": false`). En los 3 bloques con `next/image`, reemplazar `import Image from "next/image"` por un `<img>` simple o por el `ArcImg` exportado por `arc-provider.tsx` (que ya entiende `fill`/`priority`), y cambiar el tipo `StaticImageData` por `string`.
- Para navegación SPA: envolver la app en `<ArcProvider link={InertiaLinkAdapter}>` donde el adaptador pase `href` al `Link` de `@inertiajs/react` (que ya usa `href`, así que el mapeo es casi directo). Sin esto los enlaces de Arc harán recargas completas en vez de visitas Inertia.
- Bencho no requiere adaptación de framework; sólo importar el `.css` del bloque (globalmente o desde el componente).

### Gaps
- No se analizó el código Pro de Arc (token-gated); podría tener más usos de `next/*`.
- No se verificó si el comentario `eslint-disable @next/next/no-img-element` en Arc provoca warnings de ESLint en un proyecto sin el plugin de Next (normalmente ESLint avisa "Definition for rule … was not found" sólo si la regla no existe y se referencia en un disable con `reportUnusedDisableDirectives`).

## Compatibilidad con setups shadcn/ui (components.json, alias @/, cn()), Tailwind v3 vs v4, React 19

### Takeaway
Arc usa el CLI de shadcn y respeta el alias `components` de `components.json`, pero **no usa Tailwind ni `cn()`**: usa CSS Modules + variables CSS propias. El mayor riesgo real es que `foundation.css` **redefine en `:root` las mismas variables que shadcn** (`--background`, `--foreground`, `--border`, `--accent`, `--accent-foreground`) con valores distintos, y aplica reglas globales de foco con `!important`. Bencho usa CSS plano con prefijos: independiente de la versión de Tailwind.

### Cited Findings
- Instalación Arc: `npx shadcn@latest add https://uiarc.dev/r/arc-foundation.json` y luego items; o registrar `{ "registries": { "@uiarc": "https://uiarc.dev/r/{name}.json" } }` en `components.json` y `npx shadcn@latest add @uiarc/button @uiarc/dialog` — [uiarc.dev/llms.txt](https://uiarc.dev/llms.txt)
- "Files install into an `arc/` folder under the `components` alias from `components.json` … and import each other with relative paths, so no `tsconfig.json` change is needed"; "Import the tokens once in the root layout: `import "@/components/arc/foundation.css";`"; "Components use CSS modules and CSS variables, not Tailwind classes. Dark mode: `data-theme="dark"` on `<html>`. Accent: `data-accent` = neutral, violet, blue, …" — [uiarc.dev/llms.txt](https://uiarc.dev/llms.txt)
- Análisis del registry: 134 archivos `.module.css`; 0 archivos usan `cn(`; 0 usan clases utilitarias Tailwind; el alias `@/` sólo aparece en docs/skills, no en imports de componentes — [uiarc.dev/r/registry.json](https://uiarc.dev/r/registry.json)
- `foundation.css` (15 KB) define en `:root`: `--background: var(--neutral-0)`, `--foreground: var(--neutral-11)`, `--border: oklch(93.5% 0 0)`, `--accent: oklch(33% 0 0)` (gris oscuro), `--accent-foreground: var(--background)`, más `:root[data-theme="dark"]`, `:root[data-accent=…]`, y reglas globales `:focus:not(:focus-visible){ outline:none !important }` y un outline `:focus-visible` con `!important` — [uiarc.dev/r/arc-foundation.json](https://uiarc.dev/r/arc-foundation.json)
- En stokity-v2, shadcn (Tailwind 4) usa en `resources/css/app.css` `--accent: oklch(0.97 0 0)` (gris muy claro, usado para hovers) y dark mode por clase (`@custom-variant dark (&:is(.dark *))`; `use-appearance.tsx` hace `classList.toggle('dark', …)`) — archivo local `/Users/juanjsc/Herd/stokity-v2/resources/css/app.css` y `/Users/juanjsc/Herd/stokity-v2/resources/js/hooks/use-appearance.tsx`
- `components.json` del proyecto: `"rsc": false`, alias `components: "@/components"`, `ui: "@/components/ui"`, `iconLibrary: "lucide"` — `/Users/juanjsc/Herd/stokity-v2/components.json`
- Namespaced registries: `{ "registries": { "@acme": "https://registry.acme.com/resources/{name}.json" } }`; soporte de headers con `"Authorization": "Bearer ${REGISTRY_TOKEN}"` expandido desde `process.env` — [shadcn docs: namespace](https://ui.shadcn.com/docs/registry/namespace)
- Arc Pro usa exactamente ese mecanismo: `"@uiarc-pro": { "url": "https://uiarc.dev/r/pro/{name}.json", "headers": { "Authorization": "Bearer ${ARC_PRO_TOKEN}" } }`, token en `.env.local` "never committed" — [uiarc.dev/llms.txt](https://uiarc.dev/llms.txt)
- El starter kit React de Laravel 12 usa "Inertia 2, React 19, Tailwind 4, and shadcn/ui" y publica componentes con `npx shadcn@latest add switch` en `resources/js/components/ui/` — [Laravel 12 starter kits](https://laravel.com/docs/12.x/starter-kits)
- Magic UI y Aceternity sí usan `cn()` (Tailwind) en sus items — [magicui.design/r/marquee.json](https://magicui.design/r/marquee.json); [ui.aceternity.com/registry/3d-card.json](https://ui.aceternity.com/registry/3d-card.json)

### Inferences
- **Conflicto de tokens (crítico para stokity-v2):** si se importa `foundation.css` globalmente después de `app.css`, el `--accent` de shadcn pasaría de casi blanco a gris oscuro, rompiendo los hovers de menús/sidebar/botones `ghost` en toda la app; `--border` y `--background` también cambiarían ligeramente. Orden inverso → los componentes Arc tomarían los valores de shadcn (p. ej. botones de acento casi blancos). Opciones: (a) importar `foundation.css` sólo en las páginas/layouts que usan Arc y reescribir sus selectores `:root` a un wrapper (p. ej. `.arc-scope`), (b) renombrar las variables conflictivas en el CSS de Arc (`--arc-accent`, etc.) — tiene sentido porque el código es propio tras copiarse, o (c) mapear los tokens de Arc a los de shadcn de forma deliberada. La memoria del proyecto ya advierte que en Tailwind 4 los alias de tema no se pueden re-scopear redeclarando variables, lo que refuerza la opción (b).
- **Dark mode:** Arc espera `data-theme="dark"` en `<html>`; el proyecto usa clase `.dark`. Hay que setear ambos en `use-appearance.tsx` (una línea: `document.documentElement.dataset.theme = isDark ? 'dark' : 'light'`).
- **Foco global:** las reglas `!important` de foco de Arc afectarían también a los inputs shadcn (quita outline en `:focus` de inputs). Revisar/scopear si se mantiene el foco de shadcn.
- **Tailwind v3 vs v4:** irrelevante para Arc y Bencho (no usan Tailwind). Ningún item analizado depende de la config de Tailwind. Esto es una ventaja frente a Magic UI/Aceternity, cuyos componentes sí dependen de clases/keyframes Tailwind.
- **React 19:** ambas usan APIs estándar (`forwardRef`, `useLayoutEffect`, `useSyncExternalStore`); `forwardRef` sigue funcionando en React 19 (deprecado a futuro, no eliminado). No se encontró ningún bloqueo.
- CSS Modules funcionan nativamente en Vite (archivos `*.module.css`) sin configuración — ver [Vite: CSS Modules](https://vite.dev/guide/features#css-modules).

### Gaps
- No se probó una instalación real con el CLI en este repo (fuera de alcance; no se modificó código). En particular, no se verificó que el CLI acepte un item `registry:item` con target `@components/arc/...` cuando `tailwind.config` apunta a un archivo inexistente (`tailwind.config.js` en un proyecto Tailwind 4) — puede requerir dejar `"config": ""`.
- No se encontró documentación oficial de Arc sobre convivencia con shadcn/ui tokens.

## Dependencias (motion/framer-motion, radix, lucide…) e impacto en bundle

### Takeaway
Arc usa `motion` (paquete nuevo, import `motion/react`) en 125/132 items, `lucide-react` en 81 y Radix sólo en ~20 items. Bencho usa `framer-motion` (paquete antiguo) en ~11 de 32 bloques con deps listadas, `lucide-react` y en algunos `liquid-gooey`. Mezclar ambos podría duplicar la librería de animación (`motion` + `framer-motion`) en el bundle.

### Cited Findings
- Conteo de dependencias npm en el registry gratuito de Arc: `motion` 125, `lucide-react` 81, `@radix-ui/react-dropdown-menu` 5, `@radix-ui/react-dialog` 4, `@radix-ui/react-popover` 3, `@radix-ui/react-tooltip` 2, `@radix-ui/react-tabs` 2, `@radix-ui/react-select`/`checkbox`/`switch`/`accordion` 1 c/u — [uiarc.dev/r/registry.json](https://uiarc.dev/r/registry.json)
- Ej.: `button` → deps `["motion"]` + `arc-motion-tokens`; importa `AnimatePresence, animate, motion, useIsPresent, useMotionValue, useReducedMotion` de `motion/react`. `dialog` → `@radix-ui/react-dialog`, `lucide-react`, `motion` — [uiarc.dev/r/button.json](https://uiarc.dev/r/button.json); [uiarc.dev/r/dialog.json](https://uiarc.dev/r/dialog.json)
- Bencho, mapa de dependencias por bloque: `["lucide-react"]` ×11, `[]` ×9, `["framer-motion","lucide-react"]` ×5, `["framer-motion","liquid-gooey","lucide-react"]` ×4, `["framer-motion"]` ×2, `["framer-motion","liquid-gooey"]` ×1 — [bundle de bencho.dev](https://bencho.dev/assets/index-_AMJ4TW0.js)
- `liquid-gooey` (v0.2.2, autor Jakub Antalik): "Liquid UI effects for React: Morph (gooey merge…), Move, Melt and Bend… SVG-filter silhouette layer" — [npm registry: liquid-gooey](https://registry.npmjs.org/liquid-gooey)
- Tamaño de Motion: el componente `motion` completo no puede reducirse por tree-shaking por debajo de ~34 kb; con `m` + `LazyMotion` el render inicial es ~4.6 kb, más `domAnimation` (+15 kb) o `domMax` (+25 kb, añade drag/layout) — [motion.dev: reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size)
- Adopción npm (semana 2026-09-28 a 10-04): `framer-motion` 58.5 M descargas, `motion` 28.3 M — [npm downloads API framer-motion](https://api.npmjs.org/downloads/point/last-week/framer-motion); [npm downloads API motion](https://api.npmjs.org/downloads/point/last-week/motion)
- stokity-v2 ya tiene `lucide-react ^0.475.0`, `react ^19`, `tailwindcss ^4`, `vite ^6`, `@inertiajs/react ^2`; no tiene `motion` ni `framer-motion` — `/Users/juanjsc/Herd/stokity-v2/package.json`
- React Bits evita Framer Motion; usa CSS y GSAP/Three.js/Matter.js sólo cuando hace falta — [pkgpulse](https://www.pkgpulse.com/guides/react-bits-vs-aceternity-magic-ui-2026); confirmado: `SplitText-TS-TW` depende de `gsap` y `@gsap/react` — [reactbits.dev/r/SplitText-TS-TW.json](https://reactbits.dev/r/SplitText-TS-TW.json)

### Inferences
- Adoptar Arc añade ~34 kb (min+gz aprox., cifra de Motion) a cualquier página que use un componente Arc, porque los componentes usan `motion.*` (no `m` + LazyMotion). Con code-splitting por página de Inertia (`import.meta.glob` en `app.tsx`) el coste queda limitado a las páginas que los usen, no a toda la app.
- Recomendación: estandarizar en `motion` (`motion/react`). Al copiar bloques de Bencho, cambiar `from "framer-motion"` → `from "motion/react"` (la API es la misma en Motion 11+/12), evitando cargar dos librerías de animación.
- `lucide-react` ya está en el proyecto, así que no añade dependencia nueva; Radix probablemente ya esté vía shadcn.

### Gaps
- No se midió el bundle real (no se ejecutó build). No se verificó la versión mínima de `motion` que requiere Arc ni si `liquid-gooey` (v0.2.x, muy joven) tiene peer deps de React 19.

## Pasos de integración en Laravel + Inertia + React + Vite; SSR

### Takeaway
Arc: registrar el namespace `@uiarc` en `components.json`, instalar `arc-foundation`, scopear/renombrar sus tokens para no pisar shadcn, sincronizar dark mode, y opcionalmente `ArcProvider` con un adaptador del `Link` de Inertia. Bencho: `npm install` de las deps del bloque y copiar TSX + CSS. Ambos son seguros para el SSR de Inertia salvo bloques que toquen `window`/`document` fuera de efectos (no se hallaron casos a nivel de módulo en Arc).

### Cited Findings
- Comando y namespace de Arc, y import de `foundation.css` "once in the root layout" — [uiarc.dev/llms.txt](https://uiarc.dev/llms.txt)
- Arc ofrece servidor MCP (`https://uiarc.dev/api/mcp`, OAuth con cuenta Arc; Pro desbloquea código Pro) y una "skill" para agentes: `npx shadcn@latest add https://uiarc.dev/r/arc-skill.json` — [uiarc.dev/llms.txt](https://uiarc.dev/llms.txt)
- Reglas que Arc impone a agentes: usar tokens semánticos, presets de `motion-tokens.ts` (`snappy`, `smooth`, `morph`), "no focus rings on pointer focus", "no decorative gradients or glows", rama de reduced-motion por animación — [uiarc.dev/llms.txt](https://uiarc.dev/llms.txt)
- SSR en starter kits de Laravel: `npm run build:ssr` y `composer dev:ssr` — [Laravel 12 starter kits](https://laravel.com/docs/12.x/starter-kits); stokity-v2 ya tiene `"build:ssr": "vite build && vite build --ssr"` y `ssr: 'resources/js/ssr.tsx'` en `vite.config.ts` — `/Users/juanjsc/Herd/stokity-v2/package.json`
- Arc: sólo 5 archivos contienen guardas `typeof window/document`; 87 archivos usan `useLayoutEffect`; los accesos a `window.matchMedia` / `document.addEventListener` encontrados están dentro de funciones `subscribe` de `useSyncExternalStore` (p. ej. `user-menu`, `toast-stack`, `countdown`), no a nivel de módulo — [uiarc.dev/r/registry.json](https://uiarc.dev/r/registry.json)

### Inferences — guía paso a paso propuesta (Arc)
1. `components.json`: añadir `"registries": { "@uiarc": "https://uiarc.dev/r/{name}.json" }` (y `@uiarc-pro` con header `Bearer ${ARC_PRO_TOKEN}` si hay licencia; el token en `.env`, no en git).
2. `npm install motion` (el CLI lo hace al añadir items).
3. `npx shadcn@latest add @uiarc/arc-foundation` → crea `resources/js/components/arc/foundation.css` + `lib/motion-tokens.ts`.
4. Antes de importarlo: renombrar en `foundation.css` y en los `.module.css` las variables que chocan con shadcn (`--background`, `--foreground`, `--border`, `--accent*`) o envolver todo bajo un selector `.arc` en lugar de `:root`; revisar las reglas globales de foco `!important`.
5. Importar `foundation.css` en `resources/js/app.tsx` (y `ssr.tsx`) o sólo en el layout que use Arc.
6. Dark mode: en `use-appearance.tsx` setear también `data-theme` en `<html>`; opcional `data-accent`.
7. `npx shadcn@latest add @uiarc/<item>`; importar desde `@/components/arc/<item>/<item>`.
8. Si se usan `avatar`/`breadcrumb`/bloques con enlaces: crear `InertiaArcLink` que envuelva `Link` de `@inertiajs/react` y pasarlo a `<ArcProvider link={…}>` en el root de `app.tsx`.
9. En `site-header`, `newsletter-signup`, `changelog-feed`: sustituir `next/image` por `<img>`/`ArcImg` (y `StaticImageData` → `string`).
10. Verificar `npm run build` y `npm run build:ssr`.

### Inferences — Bencho
1. `npm install` de las deps mostradas en el panel Install (preferir `motion` y reescribir import a `motion/react`).
2. Copiar el `.tsx` a `resources/js/components/bencho/` y el `.css` junto a él; importarlo desde el componente. Las clases ya tienen prefijo (`swp-…`) así que el riesgo de colisión es bajo; opcionalmente renombrar a `.module.css`.
3. SSR: revisar manualmente bloques con física/canvas/puntero (p. ej. Todo tower, Particles) por accesos a `window` en render; no se auditó cada uno.

### Gaps
- No se encontró documentación oficial ni de Arc ni de Bencho específica para Vite, Inertia o Laravel; las instrucciones anteriores son inferencias a partir del código.
- No se verificó el comportamiento de `useLayoutEffect` en SSR con React 19 (versiones previas emitían warnings en servidor).

## Alternativas comparables y en qué se diferencian bencho/uiarc

### Takeaway
Magic UI, Aceternity y la mayoría del ecosistema "shadcn-registry animado" usan **Tailwind + cn() + motion**, por lo que encajan de forma más natural en un proyecto shadcn/Tailwind 4 como stokity-v2. Arc se diferencia por su design system propio (CSS Modules + tokens), su enfoque "calm motion" y AI-first (MCP, skills, llms.txt). Bencho se diferencia por ser pocos bloques muy pulidos de micro-interacción, sin CLI ni registry.

### Cited Findings
- Magic UI: "150+ free, open-source animated components … built with React, Tailwind CSS and Motion, all designed to drop into a shadcn codebase" — [DEV Community](https://dev.to/hiteshbhardwaj/5-best-animated-component-libraries-for-react-and-nextjs-in-2026-1382) / [designrevision](https://designrevision.com/alternatives/magic-ui)
- Aceternity UI: efectos más dramáticos/oscuros — [pkgpulse](https://www.pkgpulse.com/guides/react-bits-vs-aceternity-magic-ui-2026); sus items usan `@tabler/icons-react` + `motion`, y algunos `next/image` — [ui.aceternity.com/registry/apple-cards-carousel.json](https://ui.aceternity.com/registry/apple-cards-carousel.json)
- React Bits: "#3 in JS Rising Stars 2025 with 26K new GitHub stars", no requiere Framer Motion — [pkgpulse](https://www.pkgpulse.com/guides/react-bits-animated-components-2026)
- Origin UI y Kibo UI se citan como registries más amplios — [pkgpulse](https://www.pkgpulse.com/guides/react-bits-vs-aceternity-magic-ui-2026); el repo `origin-space/originui` ya no responde en la API de GitHub (404), y `cosscom/coss` (donde se consolidó el trabajo de Origin UI según el ecosistema) figura con licencia AGPL-3.0 a nivel de repo — [api.github.com/repos/cosscom/coss](https://api.github.com/repos/cosscom/coss)
- Estrellas GitHub (2026-10-07): shadcn-ui/ui 125,245; DavidHDev/react-bits 48,615; magicuidesign/magicui 22,487; cosscom/coss 10,669; ibelick/motion-primitives 6,478; serafimcloud/21st 5,486; imskyleen/animate-ui 4,367; **kuratlielia/arc-library 353** (creado 2026-09-24) — GitHub API: [shadcn](https://api.github.com/repos/shadcn-ui/ui), [react-bits](https://api.github.com/repos/DavidHDev/react-bits), [magicui](https://api.github.com/repos/magicuidesign/magicui), [coss](https://api.github.com/repos/cosscom/coss), [motion-primitives](https://api.github.com/repos/ibelick/motion-primitives), [21st](https://api.github.com/repos/serafimcloud/21st), [animate-ui](https://api.github.com/repos/imskyleen/animate-ui), [arc-library](https://api.github.com/repos/kuratlielia/arc-library)
- Bencho no tiene repo público identificable en GitHub (búsqueda "bencho" sólo devuelve proyectos no relacionados como benchopt/benchopt) — [GitHub search API](https://api.github.com/search/repositories?q=bencho)

### Inferences — tabla resumida
| | Distribución | Estilos | Animación | Next-only APIs | Encaje en stokity-v2 (shadcn + TW4) |
|---|---|---|---|---|---|
| **Arc (uiarc)** | shadcn registry `@uiarc` (+Pro con token), MCP | CSS Modules + tokens propios | `motion` | 3 bloques con `next/image`; provider para Link/Image | Medio: requiere aislar tokens que chocan |
| **Bencho** | Copiar/pegar TSX+CSS | CSS global prefijado | `framer-motion` (+`liquid-gooey`) | Ninguna | Alto para piezas sueltas; sin CLI ni updates |
| Magic UI | shadcn registry | Tailwind + `cn()` | `motion` | No en los items revisados | Alto (nativo shadcn) |
| Aceternity | shadcn registry | Tailwind + `cn()` | `motion` | Algunos `next/image` | Alto, adaptar `next/image` |
| React Bits | registry (variantes TS/JS, CSS/TW) | CSS o Tailwind | CSS/GSAP | No en el item revisado | Alto |

### Gaps
- No se verificó el estado actual exacto de Origin UI (marca/licencia de los componentes individuales tras moverse a coss); la licencia AGPL corresponde al repo completo según GitHub y podría no aplicar a los componentes.
- 21st.dev es un marketplace/registro comunitario; no se analizaron sus items.

## Opiniones de la comunidad y señales de adopción

### Takeaway
Ambas son muy recientes y con poca tracción medible: Arc tiene 353 estrellas a dos semanas de crear el repo y desarrollo activo; Bencho tiene cobertura en prensa de diseño (Dr. Web) y cuenta en X, pero no repo público. No se encontraron hilos de Reddit/HN relevantes sobre ninguna.

### Cited Findings
- arc-library: 353 estrellas, 19 forks, creado 2026-09-24, último push 2026-10-07, 0 issues abiertos, MIT — [GitHub API](https://api.github.com/repos/kuratlielia/arc-library)
- El código de Arc referencia un issue que añadió el provider para frameworks no-Next ("kuratlielia/arc-library#13"), señal de que la comunidad ya pidió soporte Vite/Remix — [uiarc.dev/r/avatar.json](https://uiarc.dev/r/avatar.json)
- Bencho cubierto por Dr. Web (blog alemán de diseño web) — [drweb.de](https://www.drweb.de/bencho-ui-bausteine/)
- Búsquedas web por "uiarc"/"Arc UI Elia Kuratli" devolvieron resultados de proyectos homónimos no relacionados (Arc-UI de Arc XP / Washington Post, una skill "arc-ui-skills" inspirada en el navegador Arc, un mod de Hytale) — [design.arcxp.com](https://design.arcxp.com/release-notes/v1dot3dot0); [skills.cat](https://skills.cat/skills/ihlamury/design-skills/arc-ui-skills)

### Inferences
- Riesgo de longevidad: ambos proyectos son de un solo autor y muy nuevos; dado que el código se copia al repo (modelo shadcn), el riesgo de abandono es bajo en lo funcional pero no habrá actualizaciones vía CLI para Bencho.
- El nombre "Arc" colisiona con otros productos, lo que dificulta encontrar opiniones/soporte.

### Gaps
- No se encontraron discusiones en Reddit, Hacker News ni hilos de X verificables sobre bencho.dev o uiarc.dev (búsqueda limitada; X no es indexable vía estas herramientas).
- No hay datos de descargas npm porque ninguno se distribuye como paquete npm.
