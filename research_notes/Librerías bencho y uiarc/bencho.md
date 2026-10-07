# Bencho (bencho.dev) — dossier

Método: además de búsquedas web, se descargaron y analizaron directamente (2026-10-07) el HTML de https://bencho.dev, su `robots.txt`, `sitemap.xml`, `llms.txt`, el bundle JS principal (`/assets/index-_AMJ4TW0.js`, ~1.37 MB) y el chunk de código fuente de los bloques (`/assets/blocks-DFA3nK03.js`, ~1.5 MB, exporta `BLOCKS` con el `tsx`/`css`/`deps`/`tokens` de cada bloque). Las citas "bundle JS" se refieren a esos archivos servidos desde bencho.dev. El sitio es una SPA (Vite + React); WebFetch normal solo ve el título, por eso se leyó el bundle.

## 1. ¿Qué es bencho.dev, quién lo hace, cuándo se lanzó y en qué estado está?

### Takeaway
Bencho es una galería/biblioteca **copy-paste** de "bloques" interactivos de React (micro-interacciones y componentes animados), hecha por el diseñador Lorenzo Cabra con ayuda de Claude, lanzada a mediados de septiembre de 2026. NO es un paquete npm ni una herramienta de benchmarking (existe un paquete npm homónimo `bencho` sin relación, un CLI de benchmarking). Está activa y se actualiza casi a diario (sitemap con lastmod 2026-10-06).

### Cited Findings
- Meta title: "Bencho — Interactive React UI Components & Micro-interactions"; description: "A library of interactive UI blocks you can explore, tweak, and take straight into your projects. Everything is live, not mocked." — [bencho.dev HTML](https://bencho.dev)
- `llms.txt`: "Bencho (bencho.dev) is a library of interactive React UI components and micro-interactions. Every block is live, not a recording: it can be played with, tuned with its own controls, and its source copied into a project." "Built with React, TypeScript and framer-motion." "48 blocks, each with its own page, live demo and adjustable values; most include their full source to copy." "Made by Lorenzo Cabra. On X: @benchodev." — [bencho.dev/llms.txt](https://bencho.dev/llms.txt)
- Footer del sitio: "Built by Lorenzo Cabra" enlazando a https://x.com/cabralorenzo; "© 2026"; email de contacto `hello@bencho.dev` — bundle JS de [bencho.dev](https://bencho.dev)
- Post de lanzamiento en LinkedIn ("Introducing Bencho. A library of interactive UI blocks you can explore, tune, bench, and take into your own projects"), publicado ~3 semanas antes del 2026-10-07; dice que lo empezó en su tiempo libre como experimento para ver hasta dónde podía llevar su diseño combinado con Claude; anuncia nuevos bloques cada semana; 1,329 reacciones y 65 comentarios — [LinkedIn, Lorenzo Cabra](https://www.linkedin.com/posts/lorenzocabra_introducing-bencho-a-library-of-interactive-activity-7503850258419060736-IqKF)
- Lorenzo Cabra es descrito como product designer en MetaLab (marcas, productos digitales, interacciones de IA) — resumen de búsqueda que cita [lorenzocabra.xyz](https://lorenzocabra.xyz/) y [x.com/cabralorenzo](https://x.com/cabralorenzo) (no verificado directamente).
- Directorio vibing.inc lo registra como añadido el 14-sep-2026, "Freemium", tags UI Components & Libraries / playground / ui-blocks — [vibing.inc](https://vibing.inc/library/bencho-vg-2238)
- BuilderTools: "Updated October 2, 2026", autor Lorenzo Cabra, MIT — [buildertools.sh/bencho](https://www.buildertools.sh/bencho)
- Sitemap: 206 URLs; 48 páginas `/blocks/*`, 151 páginas `/finds/*`; lastmod más reciente 2026-10-06 — [bencho.dev/sitemap.xml](https://bencho.dev/sitemap.xml)
- El paquete npm `bencho` (v0.2.0, "A command-line benchmarking tool", repo mrmlnc/bencho) es un proyecto distinto inspirado en hyperfine — [npm bencho](https://www.npmjs.com/package/bencho); [registry.npmjs.org/bencho](https://registry.npmjs.org/bencho). Tampoco confundir con Bencher (bencher.dev), suite de continuous benchmarking — [bencher.dev](https://bencher.dev/docs/pt)
- Comentario del propio código: el sitio también se distribuye como "one self-contained bundle.html you can send to somebody and open off a disk" — comentario HTML en [bencho.dev](https://bencho.dev)
- La página de licencia tiene "Last updated 10 September 2026" — bundle JS de [bencho.dev/licence](https://bencho.dev/licence)

### Inferences
- No hay "versión" semver: es un sitio vivo con bloques añadidos de forma continua; madurez = proyecto personal muy joven (~1 mes en público a oct-2026).
- El sitio en sí está construido con React 19.2.8 (cadena `19.2.8` en el bundle), Vite, framer-motion, lucide-react y Supabase (auth/cuentas) — deducido del bundle JS.

### Gaps
- No se pudo acceder a X/Twitter (403) para ver posts de @benchodev / @cabralorenzo ni métricas de seguidores.
- No se encontró Product Hunt ni hilos de Reddit sobre Bencho.

## 2. Catálogo completo (bloques, Finds, Sounds, Bench)

### Takeaway
Cuatro secciones: **Blocks** (48 bloques públicos, cada uno con demo live, controles ajustables y código), **Finds** (galería curada de ~146–151 interacciones de otros diseñadores, en video, acreditadas), **Sounds** (librería de sonidos UI sintetizados) y **Bench** (canvas para arreglar y ajustar bloques lado a lado). El chunk de código contiene 63 entradas: las 48 públicas + 15 no listadas en sitemap (algunas son de sponsor).

### Cited Findings
Secciones — [llms.txt](https://bencho.dev/llms.txt):
- Blocks: "the full wall of interactive components"; Finds: "a curated gallery of UI interactions by other designers, credited to their makers"; Sounds: "a library of synthesised sounds for UI interactions"; Bench: "a canvas for arranging and tuning blocks side by side".

Los 48 bloques públicos (nombre / slug / nombre SEO / descripción resumida) — [llms.txt](https://bencho.dev/llms.txt), [sitemap](https://bencho.dev/sitemap.xml):
1. Asset swap `/blocks/asset-swap` (Crypto Swap UI with Coin Picker): invertir el swap con la flecha; tocar moneda abre selector.
2. Heat map `/blocks/heat-word` (Heat Map Hover Effect): campo de puntos que se convierte en mapa de calor bajo el cursor; 4 paletas.
3. Image compare `/blocks/image-compare` (Image Comparison Slider): comparar dos imágenes arrastrando la línea, con inercia.
4. Like `/blocks/like` (Animated Like Button): corazón con partículas y contador tipo odómetro.
5. Signature pad `/blocks/signature`: tinta que varía con la velocidad; Clear rebobina trazo a trazo.
6. Voice note `/blocks/voice-note` (Hold to Record): mantener para grabar, waveform en vivo, deslizar para descartar, reproducir/scrub.
7. Eye tracker `/blocks/eye-tracker`: cubo con ojos que siguen al cursor.
8. Dynamic island `/blocks/dynamic-island`: píldora negra estilo iPhone que se expande (timer, llamada, música).
9. Time scrubber `/blocks/time-scrubber` (Time Picker Scrubber): regla arrastrable con inercia y snap.
10. Upload dropzone `/blocks/upload-dropzone`: drag & drop con progreso y rechazo por tamaño.
11. Particles `/blocks/particles`: forma de puntos que se dispersan del puntero; shockwave al presionar.
12. Label input `/blocks/label-input` (Floating Label Input).
13. One-time code `/blocks/one-time-code` (OTP Input): 6 casillas que son un solo campo (paste/autofill/backspace), shake en error.
14. Generate `/blocks/generate` (AI Image Generation Loader).
15. Step player `/blocks/step-player` (Step Progress Indicator).
16. Todo tower `/blocks/todo-tower` (Physics To-Do List): to-do con física de ladrillos.
17. Image accordion `/blocks/image-accordion`.
18. Glass bubble `/blocks/glass-bubble` (Liquid Glass Refraction Effect).
19. Action node `/blocks/action-node` (Automation Node Card).
20. Magnetic select `/blocks/magnet-select` (Magnetic Chip Select).
21. Slide to confirm `/blocks/slide-confirm`.
22. Assignees `/blocks/picker` (Assignee Picker with Avatars).
23. Checklist `/blocks/checklist` (Animated Checklist).
24. Carousel `/blocks/carousel` (3D Card Carousel).
25. Palette `/blocks/palette` (Color Palette Generator).
26. Aspect ratio `/blocks/aspect` (Aspect Ratio Crop Selector 4:3/1:1/3:4).
27. Tilt card `/blocks/tilt` (3D Tilt Card Hover Effect).
28. Now playing `/blocks/sound` (Music Player Widget).
29. Dragging ball `/blocks/drag-ball` (Draggable Squishy Ball).
30. Search `/blocks/seek` (Expanding Search Bar).
31. Pull to refresh `/blocks/pull`.
32. Escape button `/blocks/escape` (Runaway Button).
33. Slosh slider `/blocks/slosh` (Liquid Fill Slider).
34. Create menu `/blocks/liq-create` (Gooey Create Menu, metaballs).
35. Reorder list `/blocks/liq-arrange` (Drag to Reorder List, metaballs).
36. Canvas toolbar `/blocks/toolbar` (Floating Canvas Toolbar).
37. Radial menu `/blocks/radial`.
38. Drag stepper `/blocks/stepper` (Number Stepper with Drag: tap = +1, mantener = barrido).
39. Inline confirm `/blocks/confirm` (Inline Delete Confirmation).
40. Notify `/blocks/toasts` (Notify Me Button con campana oscilante).
41. Icon bar `/blocks/icon-bar` (Animated Tab Bar).
42. Magnifying dock `/blocks/dock` (macOS Magnifying Dock).
43. Progress ticks `/blocks/progress` (Tick Slider).
44. Wheel `/blocks/humidity` (Circular Dial Slider).
45. Command bar `/blocks/command`.
46. Selection list `/blocks/roster` (Multi-Select List).
47. Range dial `/blocks/sleep` (Circular Range Slider).
48. Liquid toggle `/blocks/liq-toggle` (Liquid Toggle Switch).

- Nota: en `llms.txt` algunas descripciones están copiadas/erróneas (Radial menu e Inline confirm repiten el texto de Canvas toolbar; Dragging ball y Slosh slider están truncadas) — [llms.txt](https://bencho.dev/llms.txt)
- Entradas extra en el chunk de código no publicadas en el sitemap: `ascii-wake` (AsciiWake), `rolling-counter` (Counter), `swipe-row` (Swipe), `hold-delete` (Hold to delete), `tag-input` (Tags), `emoji-reactions` (Reactions), `foggy-glass`, `scratch-card`, `card-stack`, `fold`, `browser-tabs`, y `mb-spot`/`mb-holo`/`mb-deck`/`mb-compare` (pósters del sponsor Mobbin) — bundle `blocks-DFA3nK03.js` de [bencho.dev](https://bencho.dev)
- Finds: 151 URLs en sitemap, ~146 entradas en el bundle; cada una con título, autor, enlace al post original en X, nota descriptiva, tags (p. ej. `Scroll`, `Morph`) y video mp4. Ej.: "Mood wheel" de Lorenzo Dossi — [sitemap](https://bencho.dev/sitemap.xml), bundle JS
- Cuentas: "Sign in and your collection is saved to your account."; botón "Join for free"; login por email (código) con Google/X pendientes de activar ("sign-in is not switched on yet"); backend Supabase — bundle JS de [bencho.dev](https://bencho.dev). "a free account saves them to a personal bench" — resumen de [buildertools.sh](https://www.buildertools.sh/bencho)
- Bench (canvas): menú contextual por bloque con "Lock position", "Copy prompt", "Remove", reglas y medidas de gaps; contador de visitantes en vivo — bundle JS

### Inferences
- Es más "galería de micro-interacciones de diseñador" que un design system: no hay primitivas básicas (Button, Dialog, Table, Select accesible, etc.). Útil para detalles de "delight" puntuales, no como base de UI.
- Muchos bloques son demostraciones lúdicas (Escape button, Eye tracker, Todo tower, Particles) con poca aplicación directa a un POS.

### Gaps
- No se enumeró el catálogo de Sounds (renderizado en cliente; no se extrajo la lista) ni su formato (¿Web Audio sintetizado en código o archivos?).
- No se sabe por qué las 15 entradas extra no están en el sitemap (borradores, retiradas o sponsor).

## 3. Instalación e integración

### Takeaway
No hay paquete npm, ni CLI, ni registry de shadcn. El flujo es **copy-paste** desde el panel "Code" de cada bloque: pestaña Install (comando `npm install` de las dependencias), Usage (snippet de import), Code (archivos `.tsx` y `.css`), o botón **"Copy prompt"** que copia un prompt completo para un agente de código (Claude Code, Cursor…) con la fuente incluida.

### Cited Findings
- El panel de código tiene tres secciones: `Install` (genera `npm install <deps>` o `# nothing to install beyond React`), `Usage` y `Code` con pestañas `tsx` / `css` — bundle JS de [bencho.dev](https://bencho.dev)
- Snippet de uso generado (plantilla real del código): 
  ```tsx
  import { Hold } from "./Hold";
  import "./Hold.css";

  <Hold
    hold={…}
    rewind={…}
  />
  ```
  (las props se rellenan con los valores ajustados en el panel) — función `qB` en bundle JS
- Texto del "Copy prompt": "Add the "<Name>" component from Bencho to my project. It is MIT licensed — bencho.dev/licence. Please: 1. Create the component at a sensible path for this project, named <Name>, from the source below. 2. Install what it needs: npm i <deps> 3. Add the CSS to the project's stylesheet. 4. THE PART THAT NEEDS YOUR JUDGEMENT. The CSS reads these custom properties and does not define them: … Map each one to whatever this project already uses … If the project has no equivalent, define it locally on the component's own root so nothing leaks out. Anything ending -rgb wants three bare numbers … 5. <X> is a stub — Bencho's own pictures are not licensed to travel … Keep the comments." seguido de `--- Name.tsx ---` y `--- css ---` — función `UP` en bundle JS
- La nota de la UI: "The CSS reads these tokens from the page: … Map them to your own theme, or copy the prompt and let your agent…" — bundle JS
- Búsqueda/directorio: "The code tab copies the block's usage snippet and CSS, or a prompt that walks a coding agent through adding the React source, installing its dependencies, and wiring up the CSS." — resumen de [buildertools.sh](https://www.buildertools.sh/bencho)
- Existe en el bundle un mapeo legacy de bloques a archivos en `github.com/lorenzo04us/Bencho` (`src/lab/*.tsx`) con el comentario "this is the API, not the source — The source is in the repository"; ese repo devuelve 404 en la API de GitHub (privado o inexistente) — bundle JS; [api.github.com/repos/lorenzo04us/Bencho](https://api.github.com/repos/lorenzo04us/Bencho)

### Inferences
- Integración en un proyecto Inertia + React 19 + Vite (como Stokity) es directa: archivo `.tsx` + `.css` + `npm i framer-motion lucide-react` según el bloque; no depende de Next.js ni de "use client" (ningún bloque contiene la directiva).
- Si el bloque se usa en Next.js App Router habría que añadir `"use client"` manualmente (usa hooks/eventos de puntero) — inferencia.

### Gaps
- No hay documentación formal (no existe /docs); toda la guía está en el panel y en el prompt.

## 4. Requisitos técnicos (React, TS, Tailwind, motion, Radix, shadcn, framework)

### Takeaway
Bloques en **React + TypeScript + CSS plano** (clases con prefijo propio y custom properties), **sin Tailwind**, sin Radix, sin shadcn. Dependencias por bloque: ninguna (26 bloques), `lucide-react` (19), `framer-motion` + `lucide-react` (10), `framer-motion` (4), `framer-motion` + `liquid-gooey` (3), `liquid-gooey` + `lucide-react` (1). Framework-agnóstico dentro de React; el propio sitio usa React 19.2.8.

### Cited Findings
- Conteo de `deps` sobre las 63 entradas del chunk: `[]` ×26, `lucide-react` ×19, `framer-motion,lucide-react` ×10, `framer-motion` ×4, `framer-motion,liquid-gooey` ×3, `liquid-gooey,lucide-react` ×1 — bundle `blocks-DFA3nK03.js`
- Imports: usan el paquete `framer-motion` (`import { AnimatePresence, motion } from "framer-motion"`), no `motion/react` — bundle `blocks-DFA3nK03.js`
- Ningún bloque usa clases utilitarias de Tailwind; el CSS es plano con prefijos (`.hld`, `.slp-figure`…) y `@keyframes` propios. Ej. Hold to delete: `background: var(--fill-slab, var(--card)); color: var(--fill-on, var(--ink)); font-family: var(--font-ui);` — bundle `blocks-DFA3nK03.js`
- Tokens CSS que los bloques leen y no definen (varían por bloque): `--card`, `--fill-on`, `--fill-on-rgb`, `--fill-slab`, `--font-ui`, `--font-num`, `--ink`, `--ink-rgb`, `--ink-2..5`, `--pane`, `--pane-edge`, `--signal`, `--surface-2/3`, `--bg`, `--slab`, `--on-slab`, etc. — campo `tokens` del bundle
- `liquid-gooey` (npm, v0.2.2, MIT, autor Jakub Antalik, repo Jakubantalik/Libraries.dev, creado 2026-08-11): "Liquid UI effects for React: Morph (gooey merge, jelly shape change, contact dissolve), Move (liquid-rubber trails), Melt … and Bend …" con capa de filtros SVG — [registry.npmjs.org/liquid-gooey](https://registry.npmjs.org/liquid-gooey)
- Los bloques respetan `prefers-reduced-motion` (ej.: `const stillness = () => … matchMedia("(prefers-reduced-motion: reduce)")`) — código de Hold to delete en bundle
- Fuente del código incluye comentarios extensos de diseño; uno menciona "CLAUDE.md is not complimentary about the one permanent requestAnimationFrame" (desarrollado con Claude Code) — bundle `blocks-DFA3nK03.js`
- React del sitio: `19.2.8` — bundle JS principal

### Inferences
- Compatible con React 19 (el sitio corre React 19.2.8 y los bloques son componentes de función con hooks estándar). Probablemente también React 18.
- Al no usar Tailwind, convive con Tailwind v3 o v4 sin conflicto; el trabajo de integración es mapear los tokens CSS a los del proyecto (p. ej. `--ink` → `--foreground`, `--card` → `--card` de shadcn). Ojo: varios tokens `-rgb` esperan "tres números sueltos", distinto del formato oklch de shadcn/Tailwind v4.
- framer-motion es el paquete legacy-nombre (hoy `motion`); funciona pero añade ~peso si el proyecto no lo usa.

### Gaps
- No se verificó accesibilidad (roles ARIA/teclado) bloque por bloque.

## 5. Ejemplos de código, configuración/theming y modo oscuro

### Takeaway
Cada bloque expone props que corresponden a los controles del panel (p. ej. `bounce`, `corner`, `speed`, `size`); el panel global tiene Fill (light/dark), Stroke (hairline on/off) y parámetros por bloque. Dark mode del sitio: `data-theme` en `<html>` con preferencia guardada en localStorage y fallback a `prefers-color-scheme`; los bloques heredan vía tokens CSS y atributos `data-fill`/`data-surface`/`data-stroke`.

### Cited Findings
- Props por bloque (extracto): Asset swap `assets, bounce, corner`; Magnetic select `size, pull, bounce, give`; Glass bubble `size, bend, fringe, corner`; Hold `hold, rewind, shake, corner`; Upload `speed, bounce, corner`; Time scrubber `step, momentum, format, corner`; Dynamic island `activity, bounce, tone`; One-time code `length, answer, corner, pace, ripple`; Todo tower `gravity, slip, count, shape, reach, force, grain` — campo `props` del bundle
- Controles globales: `Fill` ("light or dark, whatever the theme", opciones Light/Dark), `Stroke` ("a hairline round the edge", Off/On), más params específicos (fill, stroke, speed, width, corner radius) — bundle JS; [buildertools.sh](https://www.buildertools.sh/bencho)
- Tema: clave localStorage `cabra-theme` (`light`/`dark`), fallback `(prefers-color-scheme: dark)`; observa atributos `data-theme`, `data-fill`, `data-surface`, `data-stroke` — bundle JS
- CSS ej.: `[data-stroke="on"] .hld { box-shadow: inset 0 0 0 1px var(--pane-edge); }` y `.hld:focus-visible { box-shadow: 0 0 0 2px var(--fill-slab, #fff), 0 0 0 4px var(--signal, #2231dd); }` — bundle `blocks-DFA3nK03.js`
- Algunos bloques usan "stubs" de imágenes (`MARKS`, `AVATARS`, `SHOTS`, `COVER`, `COW`, `SHEEP`, `BUTTERFLY`) que hay que sustituir — campo `stubs` del bundle

### Inferences
- Para dark mode en el proyecto destino hay que definir los tokens en ambos temas (o mapearlos a variables ya tematizadas); los bloques no traen su propio dark mode autónomo salvo lo que derive de esos tokens y `data-fill`.

### Gaps
- No hay documentación pública de la API de props (tipos/defaults) fuera del código copiado.

## 6. Licencia, precios, repo, comunidad

### Takeaway
Bloques **MIT** (Copyright (c) 2026 Lorenzo Cabra), sin tier de pago para el código; el sitio, la marca "Bencho"/la cabra y las fotos no son MIT. Gratis (cuenta gratuita opcional). Monetización por **sponsorships a €400/mes** (5 spots). No hay repo público ni paquete npm.

### Cited Findings
- Página Licence: "Every block on the bench, and everything the Code pane hands you when you press Copy. That is the whole point of Bencho, and there is no tier of it that is not." "You may: Use it commercially, inside a company, in a product you sell … No attribution on your interface, no link back." "You must: Keep the copyright notice with substantial copies of the source." — bundle JS de [bencho.dev/licence](https://bencho.dev/licence)
- "What is not": "Bencho itself — The wall, the workbench, the panel, the account … © 2026 Lorenzo Cabra, all rights reserved." "The name and the mark … a trademark". "The photographs … are licensed to this site and are not ours to pass on." "Maison Neue is a licensed typeface and is deliberately not bundled." — mismo
- Texto MIT completo, "Copyright (c) 2026 Lorenzo Cabra" — mismo
- Sponsor: "Five spots, three placements — a card in the Blocks feed, a tile in the Finds wall, or both."; checkout "€400/month … Your mark in the header, a card on the Blocks wall and a tile in the Finds gallery. Billed monthly." Sponsor actual: Mobbin (spots header/blocks/finds) — [bencho.dev/sponsor](https://bencho.dev/sponsor) + bundle JS
- vibing.inc lo clasifica "Freemium"; BuilderTools dice "Free (with optional paid account…)" — [vibing.inc](https://vibing.inc/library/bencho-vg-2238), [buildertools.sh](https://www.buildertools.sh/bencho); contradicho por el propio sitio, cuyo botón dice "Join for free" y la licencia dice que no hay tier de pago — bundle JS
- GitHub: el repo referenciado `lorenzo04us/Bencho` da 404; el usuario `lorenzo04us` existe (3 repos públicos, creado 2019) — [GitHub API](https://api.github.com/users/lorenzo04us)
- Comunidad: lanzamiento en LinkedIn con 1,329 reacciones / 65 comentarios — [LinkedIn](https://www.linkedin.com/posts/lorenzocabra_introducing-bencho-a-library-of-interactive-activity-7503850258419060736-IqKF); listado en Sidebar.io — [sidebar.io](https://sidebar.io/domain/bencho.dev)

### Inferences
- Sin repo público no hay stars, issues, PRs ni changelog; la "comunidad" es la audiencia de diseño en X/LinkedIn.

### Gaps
- Número de seguidores de @benchodev/@cabralorenzo y tráfico: no accesible.

## 7. Problemas conocidos, limitaciones y opiniones

### Takeaway
Limitaciones principales: no es un paquete instalable (sin actualizaciones automáticas), sin docs formales, dependencia de tokens CSS propios a mapear, imágenes no licenciadas para reutilizar, proyecto de una sola persona muy reciente, y el nombre tiene una connotación vulgar en hindi/urdu señalada por usuarios.

### Cited Findings
- Comentario en el lanzamiento: "As a South Asian I literally wouldn't choose this name bro 😭"; en X aparece "Delhi se hu bencho💀" (el término es un insulto en hindi) — [LinkedIn](https://www.linkedin.com/posts/lorenzocabra_introducing-bencho-a-library-of-interactive-activity-7503850258419060736-IqKF); [x.com/DrDatta_AIIMS](https://x.com/DrDatta_AIIMS/status/2098664406020460750)
- Duda técnica de la comunidad: "curious how you are handling state and timing consistency across blocks"; otra: "how much of this was you directing Claude vs picking from what it gave you" — [LinkedIn](https://www.linkedin.com/posts/lorenzocabra_introducing-bencho-a-library-of-interactive-activity-7503850258419060736-IqKF)
- Opinión positiva: "a thoughtful bridge between a component library and a playground—tuning interactions in context is huge" — mismo
- Licencia: "There is no warranty … If one breaks something, that is on the person who shipped it." — bundle JS de [bencho.dev/licence](https://bencho.dev/licence)
- Las fotos de los bloques no se pueden reutilizar; hay que reemplazarlas (stubs) — mismo + prompt "Copy prompt"
- `llms.txt` contiene descripciones duplicadas/erróneas (señal de proyecto en evolución rápida) — [llms.txt](https://bencho.dev/llms.txt)
- El sitio desactiva pinch-zoom (`maximum-scale=1.0, user-scalable=no`) — HTML de [bencho.dev](https://bencho.dev) (afecta al sitio, no a los bloques)

### Inferences
- Para un POS (Stokity) los candidatos útiles serían pocos y puntuales: One-time code, Hold to delete / Inline confirm, Slide to confirm, Upload dropzone, Drag stepper, Label input, Rolling counter, Command bar, Selection list; el resto son piezas expresivas/lúdicas.
- Bundles de bloque grandes (algunos con >100 KB de fuente incl. comentarios, p. ej. action-node, icon-bar, liq-toggle porque agrupan varios componentes) — revisar tamaño antes de copiar.

### Gaps
- No se encontraron reviews independientes en Reddit, Product Hunt o blogs técnicos; no hay issues públicos.
