# uiarc.dev (Arc UI) — dossier

Investigado el 2026-10-07. Todas las fuentes se consultaron directamente (sitio, registro shadcn, API de GitHub, npm). Nota de desambiguación: buscar "uiarc" en la web devuelve sobre todo **arc.dev** (una plataforma para contratar desarrolladores, sin relación) y **"ARC UI" de Arclight** (166 web components, otro producto distinto) — [arc.dev](https://arc.dev/hire-developers/ui-development), [Arclight](https://arclight.build/blog/announcing-arc-ui/). Ninguno de los dos es uiarc.dev.

## 1. Qué es uiarc.dev, quién lo hace, cuándo salió y en qué estado está

### Takeaway
uiarc.dev es **"Arc"**, una librería **open-core** de componentes y bloques React 19 con animación (Motion) incorporada. Se distribuye como registro shadcn (`@uiarc`), y la parte gratuita es MIT. La hace una sola persona, Elia Kuratli: Arc es su empresa unipersonal en Frauenfeld, Suiza. Es **muy reciente**: el repo público se creó el 2026-09-24, así que tiene unas 2 semanas a fecha de 2026-10-07. Se actualiza a diario y no tiene versiones semver.

### Cited Findings
- Eslogan de la portada: "animated React components for shadcn and Next.js", "152 React components and 88 blocks with motion built in", "Build interfaces that feel finished" — [uiarc.dev](https://uiarc.dev)
- Autodescripción en llms.txt: "Arc is a React component and block library designed for AI-assisted frontend development. It provides copy-paste components, complete interface blocks, machine-readable registry metadata, AI skills, and MCP compatibility. Components and blocks share design tokens, CSS modules, and Motion." — [llms.txt](https://uiarc.dev/llms.txt)
- Operador: "Arc, a sole proprietorship of Elia Kuratli", Unterfeldstrasse 3D, 8500 Frauenfeld, Suiza. No figura en el registro mercantil ni está registrada para el IVA suizo. Contacto: hello@uiarc.dev — [Imprint](https://uiarc.dev/imprint)
- Perfil de GitHub del autor: kuratlielia (Elia Kuratli), bio "Building", 5 repos públicos, 8 seguidores, cuenta creada en 2021-04, blog eliakuratli.com — [GitHub API user](https://api.github.com/users/kuratlielia)
- En X es @eliakuratli. La página de precios dice "Message me on X" — [X](https://x.com/eliakuratli/status/2104932927478042762), [Pricing](https://uiarc.dev/pricing)
- Repo `kuratlielia/arc-library`: creado el 2026-09-24, último push el 2026-10-07, **353 estrellas, 19 forks, 0 issues abiertos**, licencia MIT, topics react/shadcn/nextjs/motion/typescript, homepage uiarc.dev — [GitHub API repo](https://api.github.com/repos/kuratlielia/arc-library)
- El repo público es un **espejo sincronizado** de un repo privado. Los commits se llaman "Sync from source <sha>: N new item(s)", casi todos los días (02, 03, 05, 06 y 07 de octubre) — [commits](https://github.com/kuratlielia/arc-library/commits/main)
- `package.json` del repo: `"version": "0.0.0"`, `"private": true`, author Elia Kuratli, `engines.node >=20`. **No hay paquete npm**, se distribuye solo por el registro shadcn — [package.json](https://raw.githubusercontent.com/kuratlielia/arc-library/main/package.json)
- Changelog: "Initial release — 97 components and 22 blocks" y después altas casi diarias. Por ejemplo, 2026-09-30 Password strength / Expanding search / JSON viewer; 2026-10-01 Card stack; 2026-10-02 Button group ×3; 2026-10-03 Money input; 2026-10-05 Morph select; 2026-10-06 Countdown — [CHANGELOG.md](https://raw.githubusercontent.com/kuratlielia/arc-library/main/CHANGELOG.md)
- Las páginas legales (License, Imprint) llevan fecha del 26 de septiembre de 2026 y dicen "Draft, pending review. This text has not been reviewed by a lawyer yet and may change before launch." — [License](https://uiarc.dev/license), [Imprint](https://uiarc.dev/imprint)
- Precios: "Founder pricing has ended, so lifetime is $199" — [Pricing](https://uiarc.dev/pricing)
- Se aceptó en el directorio oficial de registros de shadcn. El PR propio del autor, #12055 (2026-09-29), se cerró con la respuesta "added this to #12059", y el PR #12059 "add community registries" se fusionó el 2026-09-30. `apps/v4/registry/directory.json` incluye `"name": "@uiarc"`, `"url": "https://uiarc.dev/r/{name}.json"`, `"author": "Elia Kuratli"` — [PR 12055](https://github.com/shadcn-ui/ui/pull/12055), [PR 12059](https://github.com/shadcn-ui/ui/pull/12059), [directory.json](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/directory.json)
- También aparece como conector MCP en Glama ("Arc UI - MCP Connector") y en el directorio shoogle.dev — [Glama](https://glama.ai/mcp/connectors/dev.uiarc/arc), [shoogle](https://shoogle.dev/directory/uiarc)

### Inferences
- Producto en fase de lanzamiento (septiembre-octubre de 2026), mantenido por una sola persona: es un riesgo de **bus factor 1**. El ritmo de publicación es muy alto (casi diario) y el autor responde rápido a los issues.
- Que el repo público sea un espejo implica que las contribuciones externas por PR seguramente no se fusionan directamente.

### Gaps
- No encontré el texto ni la fecha del tweet de lanzamiento (X devolvió 403). No hallé hilos de Reddit ni lanzamiento en Product Hunt específicos de uiarc.dev (la búsqueda solo devolvió librerías competidoras como GodUI y SmoothUI).
- No hay métricas de descargas porque no existe paquete npm.

## 2. Catálogo completo

### Takeaway
Hay 240 piezas en total: **152 componentes + 88 bloques**. **129 son gratis** (107 componentes + 22 bloques) y **111 son Pro** (45 componentes "motion" + 66 bloques). Hay además 3 plantillas Pro (SaaS, AI, Startup) y "skills" para agentes de IA. El catálogo cubre desde primitivas (button, input, dialog) hasta gráficos animados, inputs especiales (moneda, teléfono, firma, editor rico) y pantallas completas de SaaS, ecommerce y analytics.

### Cited Findings
- "129 of 240 items are free." — [llms.txt](https://uiarc.dev/llms.txt). Precios: Free = "107 components and 22 blocks"; Pro añade "45 motion components and 66 complete blocks" — [Pricing](https://uiarc.dev/pricing). El README badge dice "107 components", "22 blocks" — [README](https://github.com/kuratlielia/arc-library)
- `registry.json` público: 132 items (107 `registry:ui`, 22 `registry:block`, 2 `registry:item`, 1 `registry:file`) — [registry.json](https://uiarc.dev/r/registry.json)
- Las búsquedas web devuelven cifras viejas ("106 components") porque el catálogo crece a diario — [GitHub](https://github.com/kuratlielia/arc-library)

**Componentes gratis por categoría** (fuente de todo este bloque: [llms.txt](https://uiarc.dev/llms.txt))
- *Actions*: Button, Action button, Split button, Button group, Floating button group, Expanding button group, Copy button, Confirm morph (botón destructivo que se transforma en confirmación inline → spinner → resultado con deshacer), Hold to confirm, Swipe actions, Dropdown menu, Context menu, User menu (bottom sheet en móvil), Theme switcher (+ variantes Eclipse, Split, Rise).
- *Inputs*: Input, Textarea, Password field, Password strength, Search field, Expanding search, Inline edit, Number field, **Money input** ("currency field with live grouping, stable width, rolling digits, and minor-unit output"), Phone input (selector de país, salida E.164), Tag input, Mention input (@personas/#canales), Shortcut recorder, Select, Combobox, Multi-select, Morph select, Chip group, Radio cards, Billing toggle, Checkbox, Radio group, Switch, Segmented control, Slider, Calendar, Date picker, Date range picker (con presets), Time picker, Color picker (cuentagotas, contraste), Rich text editor (atajos markdown, toolbar flotante, menú slash, salida HTML/markdown), Signature pad (exporta PNG/SVG), File dropzone.
- *Disclosure*: Tabs, Breadcrumb, Scroll area, Accordion, Expandable card, Resizable panels, Dialog, Drawer, Bottom sheet, Popover, Hover card, Tooltip. (*Share access* es Pro.)
- *Feedback*: Alert, Toast, Toast stack, Announcement bar, Progress, Skeleton, Stepper, Countdown, Usage meter.
- *Data*: Pagination, Avatar, Avatar group, Badge, Card, Metric card, Empty state, Line chart, Bar chart, Donut chart, Streamgraph, Brush chart, Waffle chart, Slope chart, Sparkline, Gauge, Activity heatmap, Animated counter, Ridgeline, Treemap, Sortable data table, Tree view, Filter toolbar, Code block, JSON viewer, Timeline, Comment thread, Chat thread, Image compare, Carousel, Card stack.
- *Text*: Text reveal, In-view title, Text morph, Text shimmer. *Special (free)*: Slot text.

**Componentes Pro** ([llms.txt](https://uiarc.dev/llms.txt))
- Gráficos avanzados: Sunburst, Sankey flow, Funnel chart, Radar chart, Realtime stream (60 fps), Race bar chart, **Data grid** (hoja de cálculo con selección de rango, edición inline, fill handle, ordenación animada).
- Share access, Share sheet, Action morph, Morph nav, Dock, Liquid tab bar, Orbit menu, Glass menu, Glass card, Glass tab bar, Sheet stack, Wallet stack, Control center, Link unfurl, Product gallery (lupa al hover, variantes de color/talla), Lightbox gallery, Photo grid, Cover flow, Voice orb, Now playing, Voice recorder, Booking pill, Activity rings, Time dial, Date reel (rueda 3D estilo iOS), Sand text, Typewriter terminal, Stretch refresh, Morph loader, Skeleton morph, Page curl, Orbit logos, Dot grid, Gravity well, y las ilustraciones animadas Data flow, Payment flow, Multi-region failover y Vector search.

**Bloques gratis** ([llms.txt](https://uiarc.dev/llms.txt), [CHANGELOG](https://raw.githubusercontent.com/kuratlielia/arc-library/main/CHANGELOG.md))
- Sign up form, Logo marquee, Plan comparison, Command palette, Notification center, File upload, OTP input, Changelog feed, Sign in (email → código de 6 dígitos), Page header, Empty states, Centered login (passkey-first), Site header, Site footer, Hero section (3 variantes), FAQ section, Contact section, Blog grid, Comparison table, Stats band, CTA section, Newsletter signup.

**Bloques Pro** ([llms.txt](https://uiarc.dev/llms.txt))
- Release readiness, Wallet card, Team directory, Project board, Invoice studio, Availability picker, Metrics dashboard, Media player, Support conversation, Inbox triage, Multi-step form, Team showcase, Studio perspectives, Usage pricing, AI composer, Workspace sidebar, Settings page, Sidebar rail, Docs sidebar, Integrations, Billing overview, API keys, Inbox sidebar, Team members, Revenue explorer, Journey flow, Immersive login, Security settings (2FA), Cancel flow, Login split, Cohort retention, Support widget, Usage forecast, MRR waterfall, Webhooks, Roles and permissions (matriz de permisos), Metric explorer, Activity terrain (3D), Revenue globe, Customer galaxy, Semantic zoom, Layout morph, Agent run, Week calendar, Scroll story, Spotlight grid, Invite people, **Cart drawer**, Pricing calculator, AI chat, **Checkout summary**, Settings command, Usage billing, AI side panel, KPI drilldown, Feature bento, **Product listing**, **Product detail**, Hero signup, Search results, Market terminal, Budget variance, Choropleth explorer, Small multiples, Connected scatter, Line replay.

**Plantillas, solo Pro**
- Arc SaaS, Arc AI y Arc Startup — [llms.txt](https://uiarc.dev/llms.txt). El roadmap dice que se están construyendo "now" (octubre): "Complete Next.js products built from Arc blocks… A new template every month." — [Roadmap](https://uiarc.dev/roadmap)
- Peticiones más votadas en el roadmap: Autocomplete (9), SQL editor (5), informe financiero GAAP (4), más gráficos, bento grids, favoritos, componentes de layout — [Roadmap](https://uiarc.dev/roadmap)

**Herramientas para IA**
- Servidor MCP remoto de solo lectura en `https://uiarc.dev/api/mcp` (streamable HTTP, OAuth con cuenta Arc; basta una cuenta gratis). Herramientas: `search_components`, `list_components`, `get_component`, `get_install_command`, `get_skill` — [AI docs](https://uiarc.dev/docs/ai)
- Para añadirlo en Claude Code: `claude mcp add --transport http arc https://uiarc.dev/api/mcp` (con `--scope project` se comparte vía .mcp.json) — [AI docs](https://uiarc.dev/docs/ai)
- Skill para agentes: `npx shadcn@latest add https://uiarc.dev/r/arc-skill.json` (se instala en `.claude/skills/arc`). Incluye SKILL.md, INSTRUCTIONS.md, checklist, components, composition, copy, design, motion, accessibility, responsive y 3 ejemplos — [AI docs](https://uiarc.dev/docs/ai)
- Skills Pro: Full-page generation, Design system generation, "Refactor to Arc" (migrar desde shadcn/ui, MUI o Chakra), auditorías de motion, responsive y accesibilidad — [AI docs](https://uiarc.dev/docs/ai)
- `llms.txt`, `llms-full.txt`, `llms-small.txt`, `/r/catalog.json` y una página markdown por componente (`/components/<id>/markdown`) — [llms.txt](https://uiarc.dev/llms.txt)
- Guías: SaaS dashboard, motion con springs, registro shadcn para IA, settings page, onboarding, command menu — [llms.txt](https://uiarc.dev/llms.txt)

### Inferences
- Para un POS/back-office como Stokity, lo más relevante del lado gratuito es: Money input, Number field, Combobox, Date range picker, Sortable data table, Filter toolbar, Metric card, gráficos (line, bar, donut, sparkline), Toast, Dialog, Command palette y Empty state. Los bloques más útiles para ecommerce (Cart drawer, Product listing/detail, Checkout summary) y el Data grid son **Pro**.

### Gaps
- No verifiqué una por una las páginas de los componentes Pro (el código está detrás de autenticación).

## 3. Instalación e integración

### Takeaway
Hay que usar el CLI de shadcn (`npx shadcn@latest add @uiarc/<item>` o con la URL completa) o copiar el código a mano. **No existe paquete npm.** Antes hay que instalar una vez los tokens `arc-foundation` e importar `foundation.css` en la raíz. Los archivos se copian a `components/arc/...`.

### Cited Findings
- Requisitos: "A React 19 project with TypeScript and the @/* path alias. Arc components use CSS modules and CSS variables, so they work without Tailwind." — [Installation](https://uiarc.dev/docs/installation)
- Pasos (Next.js o Vite): `pnpm dlx shadcn@latest init` → añadir a `components.json`: `{ "registries": { "@uiarc": "https://uiarc.dev/r/{name}.json" } }` → `pnpm dlx shadcn@latest add @uiarc/arc-foundation` → `import "@/components/arc/foundation.css";` en `app/layout.tsx` o `src/main.tsx` → `pnpm dlx shadcn@latest add @uiarc/button @uiarc/dialog` — [Installation](https://uiarc.dev/docs/installation)
- También se puede instalar sin tocar la config: `npx shadcn@latest add https://uiarc.dev/r/button.json` — [README](https://github.com/kuratlielia/arc-library)
- Los archivos van a una carpeta `arc/` bajo el alias `components` (por ejemplo `components/arc/button/button.tsx`) y se importan entre sí con rutas relativas. Uso: `import { Button } from "@/components/arc/button/button";` — [Installation](https://uiarc.dev/docs/installation)
- Para Vite hay que mapear `@/*` → `./src/*` en tsconfig y en `vite.config.ts` (`resolve.alias`) — [Installation](https://uiarc.dev/docs/installation)
- Instalación manual: `pnpm add motion lucide-react` (cada página lista sus dependencias exactas), copiar `registry/foundation.css` y `lib/motion-tokens.ts`, y después los archivos del item desde la pestaña "Manual" — [Installation](https://uiarc.dev/docs/installation)
- Pro: hay que crear un token `arc_pro_…` en /account#pro-access, poner `ARC_PRO_TOKEN` en `.env.local` y añadir esta config de registro: `"@uiarc-pro": { "url": "https://uiarc.dev/r/pro/{name}.json", "headers": { "Authorization": "Bearer ${ARC_PRO_TOKEN}" } }` → `npx shadcn@latest add @uiarc-pro/dock` — [llms.txt](https://uiarc.dev/llms.txt)
- Ejemplo de un item del registro (button.json): `dependencies: ["motion"]`, `registryDependencies: ["https://uiarc.dev/r/arc-motion-tokens.json"]`, archivos `button.tsx` + `button.module.css` — [button.json](https://uiarc.dev/r/button.json)
- Integración con Next: `<ArcProvider link={Link} image={Image}>` desde `@/components/arc/lib/arc-provider` (opcional). Sin el provider se renderizan `<a>` e `<img>` normales — [Installation](https://uiarc.dev/docs/installation)

### Inferences
- En un proyecto Laravel + Inertia + Vite + React 19 (como Stokity) el camino de Vite debería funcionar. El alias `@/*` ya suele apuntar a `resources/js` en los starter kits de Laravel, y `components.json` de shadcn ya existe si se usó shadcn. Con `ArcProvider` se puede pasar el `Link` de Inertia como `link`. Esto **no está documentado** para Inertia; es una deducción a partir de la API del provider.

### Gaps
- No hay documentación oficial para Remix, Astro, Inertia ni TanStack Start, más allá de la afirmación de que los componentes renderizan `<a>`/`<img>` normales.

## 4. Requisitos técnicos

### Takeaway
Pide **React 19 + TypeScript**. Usa **Motion (`motion/react`, la evolución de Framer Motion)** en casi todo, lucide-react en muchos componentes y Radix en una minoría. **No usa Tailwind**: los estilos son CSS modules con variables CSS, así que funciona con Tailwind v3, v4 o sin él. Soporta Next.js (App Router) y Vite.

### Cited Findings
- README → Requirements: "React 19 with TypeScript. The source compiles under `strict`, `noUncheckedIndexedAccess` and `verbatimModuleSyntax`, and needs `lib` ES2023 or newer (a few items use `findLast`)"; "Next.js (App Router) or Vite"; "motion for animation. Some items also use lucide-react or a Radix UI primitive"; "No Tailwind is required. Arc styles are CSS modules that read CSS variables." — [README](https://github.com/kuratlielia/arc-library)
- Versiones de desarrollo del repo: react ^19.3.0, motion ^13.4.0, lucide-react ^1.47.0, next ^16.3.5, typescript ^6.0.3, @types/react ^19.3.0, y varios paquetes @radix-ui (accordion, checkbox, dialog, dropdown-menu, popover, select, switch, tabs, tooltip) — [package.json](https://raw.githubusercontent.com/kuratlielia/arc-library/main/package.json)
- Conteo de dependencias en los 132 items del registro público: motion 125, lucide-react 81, @radix-ui/react-dropdown-menu 5, react-dialog 4, react-popover 3, react-tooltip 2, react-tabs 2, select/checkbox/switch/accordion 1 cada uno — [registry.json](https://uiarc.dev/r/registry.json) (contado a partir del JSON)
- Dialog depende de `@radix-ui/react-dialog`, `motion` y `lucide-react` — [dialog markdown](https://uiarc.dev/components/dialog/markdown)
- Algunos bloques todavía importan `next/image`/`next/link` directamente: `changelog-feed`, `site-header`, `newsletter-signup`. Fuera de Next hay que sustituirlos por `<img>`/`<a>` o `ArcImage` — [README](https://github.com/kuratlielia/arc-library)

### Inferences
- Encaja con React 19 + Vite. Como no depende de Tailwind no choca con el pipeline v3/v4, pero **sí añade un segundo sistema de estilos** (CSS modules + tokens propios) en paralelo a Tailwind/shadcn.
- **Posible colisión de tokens CSS**: Arc define en `:root` variables con los mismos nombres que shadcn/Tailwind usa (`--background`, `--foreground`, `--border`, `--accent`), y cambia el tema con `data-theme="dark"`, mientras que shadcn usa la clase `.dark`. En un proyecto shadcn existente, importar `foundation.css` podría sobrescribir los valores de shadcn o al revés. Es una deducción sin probar; conviene hacerlo en una rama.

### Gaps
- No se documenta soporte para React 18 (el requisito declarado es React 19).

## 5. Ejemplos de código, theming, dark mode y motion

### Takeaway
El theming se hace con tokens CSS semánticos que se sobrescriben en `:root`. El dark mode va con `data-theme="dark"` en `<html>`. Hay 8 acentos vía `data-accent`. Las animaciones usan presets de spring centralizados en `motion-tokens.ts` y todas tienen rama de reduced-motion.

### Cited Findings
- Tokens de color: `--background`, `--surface`, `--surface-raised`, `--surface-muted`, `--foreground`, `--text-secondary`, `--text-muted`, `--border`, `--border-subtle`, `--border-strong`, `--accent`, `--success`, `--warning`, `--danger`. De forma: `--radius-control` (18px), `--radius-panel` (26px), `--radius-surface` (34px). Tipografía: `--font-display` (Geist) y `--font-body` (Inter). Sombra: `--shadow-floating` — [Theming](https://uiarc.dev/docs/theming)
- Dark mode: `data-theme="dark"` en `<html>`. Los valores oscuros están ajustados aparte, no invertidos. Hay un script anti-flash de ejemplo que lee `localStorage.theme` o `prefers-color-scheme` — [Theming](https://uiarc.dev/docs/theming)
- Acentos: `data-accent` = neutral, violet, blue, green, amber, orange, coral o rose — [Theming](https://uiarc.dev/docs/theming)
- Marca propia: `@import "../components/arc/foundation.css"; :root { --accent: #0f766e; --accent-strong: #0b5a54; --accent-subtle: rgb(15 118 110 / .12); --radius-control: 12px; } :root[data-theme="dark"] { --accent: #2dd4bf; ... }` — [Theming](https://uiarc.dev/docs/theming)
- Springs: `snappy` (visualDuration 0.26, bounce 0.12; para pulsaciones y toggles), `smooth` (0.4, bounce 0; paneles), `morph` (0.42, bounce 0.16; highlights compartidos), `responsive` (stiffness 520, damping 38; manipulación directa), `gentle` (340/34). Tokens CSS: `--ease-standard`, `--ease-enter`, `--ease-spring`, `--duration-fast` 160ms, `--duration-standard` 240ms, `--duration-considered` 480ms — [Motion](https://uiarc.dev/docs/motion)
- Ejemplo con tokens: `const reduce = useReducedMotion(); <motion.span animate={{ x: on ? 20 : 0 }} transition={reduce ? { duration: 0 } : motionTokens.spring.snappy} />` — [Motion](https://uiarc.dev/docs/motion)
- Ejemplo de Dialog: `<Dialog><DialogTrigger asChild><Button>Rename</Button></DialogTrigger><DialogContent title="Rename project" description="This changes the URL too.">…<DialogClose asChild><Button>Save</Button></DialogClose></DialogContent></Dialog>`. Props: `open`, `defaultOpen`, `onOpenChange` y las demás props de Radix; `title` obligatorio (hace un crossfade cuando cambia) — [dialog markdown](https://uiarc.dev/components/dialog/markdown)
- Cada página de componente documenta preview + código, instalación, uso y API, teclado, accesibilidad, motion, responsive, rendimiento y "Notes for AI" — [Docs intro](https://uiarc.dev/docs)
- Estilo que imponen las reglas para agentes: sentence case, solo pesos regular y medium, sin eyebrow labels ni em dashes, sin anillo de foco con puntero (sí con teclado), sin gradientes ni glows decorativos — [llms.txt](https://uiarc.dev/llms.txt)

### Inferences
- La estética es muy definida (radios grandes de 18-34px, Geist + Inter, motion "calm"). Habrá que reajustar los tokens si se quiere encajar con un design system existente.

### Gaps
- No hay soporte documentado para i18n más allá de issues concretos (password-strength y chat/comment-thread ya permiten traducir textos, ver la sección 7).

## 6. Licencia, precios, repo y comunidad

### Takeaway
La parte gratuita es MIT (© 2026 Elia Kuratli). Pro tiene licencia comercial propia: Pro anual cuesta **$129/año**, Pro lifetime **$199** de pago único, y Team (hasta 10 personas) **$599 de pago único o $349/año**. Se puede usar en proyectos comerciales y de clientes sin límite, pero no revender el código como kit o plantilla. Las compras son finales. La comunidad todavía es pequeña: 353 estrellas y 19 forks a las ~2 semanas.

### Cited Findings
- Planes: Free $0 ("107 components and 22 blocks, with the CLI, MCP and AI docs. No account needed"), Pro yearly $129/año, Pro lifetime $199 una vez, Team $599 una vez o $349/año (10 asientos; si ya tienes lifetime pagas solo la diferencia). Más de 10 personas: escribir a hello@uiarc.dev. El pago es con Stripe Checkout — [Pricing](https://uiarc.dev/pricing)
- Reembolsos: "Purchases are final, since you get the source right away… If something you bought is broken and we can't fix it, you get your money back." — [Pricing](https://uiarc.dev/pricing)
- Licencia Free: MIT, "Copyright (c) 2026 Elia Kuratli" — [License](https://uiarc.dev/license)
- Licencia Pro, lo permitido: proyectos ilimitados, personales o comerciales, trabajo para clientes, SaaS de pago, repos privados, y repos públicos si forman parte de un producto final.
- Licencia Pro, lo prohibido: redistribuir o revender el código suelto, hacer un UI kit, librería o plantilla con él, exponerlo en un MCP o registro público, compartir tokens, quitar los avisos de Arc Pro, o usarlo para entrenar modelos que se ofrezcan a terceros.
- Licencia Pro, asientos: 1 compra = 1 asiento (1 persona). Si se cancela el plan anual, el código ya integrado sigue licenciado para siempre — [License](https://uiarc.dev/license)
- La licencia está en borrador: "Draft, pending review… not been reviewed by a lawyer yet" — [License](https://uiarc.dev/license)
- Repo: 353 ⭐, 19 forks, 0 issues abiertos (20 issues/PR totales, todos cerrados), CI con GitHub Actions, CODE_OF_CONDUCT, CONTRIBUTING y SECURITY — [GitHub API](https://api.github.com/repos/kuratlielia/arc-library), [issues](https://github.com/kuratlielia/arc-library/issues?q=is%3Aissue)
- Port no oficial a Vue: paquete npm `uiarc-vue` 1.0.2 ("Arc UI ported to Vue 3… compatible with shadcn-vue"), creado el 2026-09-30 por "Antigravity & NingZeStudio" — [npm uiarc-vue](https://registry.npmjs.org/uiarc-vue), [GitHub NingZeStudio/uiarc-vue](https://github.com/NingZeStudio/uiarc-vue)
- Un post de agregador, "UI Arc — Claude Updates", menciona el producto; no se pudo leer por un error de certificado — [mortaf3.com](https://mortaf3.com/posts/ui-arc-jqt4h)

### Inferences
- La tracción inicial es buena para un proyecto de 2 semanas (350+ estrellas, entrada en el directorio shadcn, un port a Vue de terceros). Aun así es un proyecto muy joven, sin historial de estabilidad.

### Gaps
- No encontré reseñas independientes sustanciales (Reddit, Product Hunt, blogs) ni opiniones negativas o positivas detalladas fuera de los issues de GitHub.

## 7. Problemas conocidos, limitaciones y opiniones

### Takeaway
Los issues públicos, casi todos abiertos por usuarios técnicos exigentes entre el 30 de septiembre y el 7 de octubre de 2026, sacaron a la luz problemas serios de la primera versión. Todos se cerraron como resueltos en pocos días: dependencia de Next.js, focus ring eliminado (incumplía WCAG), errores de TypeScript estricto, alias ignorados y registro roto. Eso muestra inmadurez inicial, pero también capacidad de respuesta rápida.

### Cited Findings
- #13 "Components import next/image and next/link, so they only work in Next.js" (23 archivos). Arreglado el 2026-10-07: Avatar, Breadcrumb y Lightbox renderizan `<a>`/`<img>` + `ArcProvider`. Según el autor: "A few blocks are still Next.js page examples" — [issue 13](https://github.com/kuratlielia/arc-library/issues/13)
- #10 "Focus is invisible for keyboard users: foundation.css removes every outline". La regla original era `:is(*:focus, *:focus-visible, *:focus-within) { outline: none !important; }` y "fails WCAG 2.2, rule 2.4.7". Arreglado: outline de acento solo en `:focus-visible`, ajustable con `--focus-outline`, `--focus-outline-width` y `--focus-outline-offset` — [issue 10](https://github.com/kuratlielia/arc-library/issues/10)
- #11 "Source does not compile with noUncheckedIndexedAccess (about 4,150 errors in about 200 files)". Arreglado: todos los items gratis compilan con strict + noUncheckedIndexedAccess + verbatimModuleSyntax, y la CI lo vigila — [issue 11](https://github.com/kuratlielia/arc-library/issues/11)
- #15 "Every shadcn add writes foundation.css again". Arreglado: los motion tokens se separaron en el item `arc-motion-tokens` — [issue 15](https://github.com/kuratlielia/arc-library/issues/15)
- Otros issues cerrados:
  - #4 "Installed files ignore the project's components.json aliases and --path"
  - #5 "Registry: some items list code fragments as npm dependencies, so shadcn add fails"
  - #12 mismos nombres de export en archivos distintos, no se pueden re-exportar desde un index.ts
  - #9 y #7 localización de textos internos
  - #6 ai-chat re-wrap
  - #14–#20 peticiones para data-grid (columnas de fecha, agrupación, exportar .xlsx…) y un bug de botón disabled

  — [issues](https://github.com/kuratlielia/arc-library/issues?q=is%3Aissue)
- Algunos items requieren `lib` ES2023 (`findLast`) — [README](https://github.com/kuratlielia/arc-library)
- Los bloques `changelog-feed`, `site-header` y `newsletter-signup` siguen importando `next/*` directamente — [README](https://github.com/kuratlielia/arc-library)

### Inferences
- Limitaciones estructurales:
  - Proyecto de un solo autor y de semanas de vida.
  - Licencia Pro en borrador.
  - Sin versionado semver ni paquete npm: las actualizaciones se reciben reinstalando con el CLI y sobrescribiendo archivos locales, al estilo shadcn.
  - Sistema de estilos propio (CSS modules) en lugar de Tailwind.
  - Estética muy opinada.
  - Lo más valioso para ecommerce y dashboards densos (data grid, cart, checkout, product pages) es de pago.
- Los textos internos vienen en inglés. La localización solo se añadió en algunos componentes tras peticiones, lo que puede afectar a un producto en español (COP, es-CO).

### Gaps
- No hay benchmarks de rendimiento ni de tamaño de bundle publicados. No encontré opiniones de usuarios en redes fuera de GitHub.
