# Plan: Storefront público de Lu Accesorios (fork de `e-commerce-project`)

> Estado: documento de investigación + diseño, sin código todavío. Complementa a [`ECOMMERCE_API_PLAN.md`](./ECOMMERCE_API_PLAN.md) (la API que este storefront va a consumir).
>
> Este documento vive por ahora en el repo de Stokity porque conecta dos proyectos; una vez exista el repo nuevo, su versión definitiva debería copiarse a `docs/PROJECT.md` de ese repo, siguiendo su propia convención.

## 1. Resumen ejecutivo

Revisé a fondo `/Users/juanjsc/Herd/e-commerce-project` (repo `JUANJSC630/e-commerce-project`, alias interno "Dulce Infancia") — es un boilerplate de ecommerce **ya construido, en producción-ready, y diseñado explícitamente para clonarse por cliente** ("white-label configurable", cita literal de su propio `docs/PROJECT.md"). Esto cambia la recomendación por completo: **no hay que diseñar un proyecto desde cero** — hay que **forkear ese repo** y hacer tres reemplazos quirúrgicos:

1. **Quitar el backend propio de productos** (Prisma + Postgres + admin `/admin/productos`) y conectar el storefront a la **API de Stokity** (la que se diseñó en `ECOMMERCE_API_PLAN.md`) — porque Lu Accesorios ya administra su catálogo/precios/stock ahí, y duplicarlo en una segunda base de datos es la receta perfecta para que se desincronicen.
2. **Reemplazar el checkout con pasarela** por el flujo "Carrito → Verificar disponibilidad → WhatsApp" que pediste, usando el mismo patrón de abstracción (`PaymentProvider`) que el boilerplate ya tiene — así el día que quieran cobrar en línea, se agrega un provider nuevo sin tocar el resto.
3. **Rehacer la identidad de marca** (colores, tipografía, copy) para Lu Accesorios — el boilerplate ya trae el mecanismo exacto para esto (`store.config.ts` + `theme.config.ts` + `.impeccable.md`), solo hay que llenarlo con la marca correcta en vez de la de "Dulce Infancia".

Todo lo demás (Next.js 15, Tailwind v4, shadcn/ui, arquitectura de carrito, SEO, deploy en Vercel) se conserva tal cual — es sólido y ya está probado.

## 2. Qué es exactamente `e-commerce-project`

| | |
|---|---|
| Framework | Next.js 15 (App Router + Turbopack) |
| Lenguaje | TypeScript strict |
| Estilos | Tailwind CSS v4 + tokens OKLCH |
| Componentes | shadcn/ui (Radix UI) |
| Base de datos | PostgreSQL vía Prisma v7 |
| Auth | NextAuth v4 (JWT) — staff y clientes sobre el mismo modelo `User`/`Role` |
| Imágenes | UploadThing v7 |
| Pagos | Abstracción `PaymentProvider` propia + implementación MercadoPago (Checkout API: tarjeta + PSE) |
| Email | Resend |
| Deploy | Vercel |

Tiene: storefront completo (home, categorías, detalle de producto con galería y variantes talla/color, búsqueda, favoritos, cuenta de cliente), panel `/admin` multi-rol (productos, categorías, pedidos, usuarios, roles, descuentos, media library, y **settings de tema/tipografía/marca/menú/envíos/pagos/redes/localización editables desde el propio admin**), cron de pedidos abandonados, scripts de verificación E2E (`verify:payments`, `verify:account`, etc.).

### 2.1 El mecanismo de white-label (por qué forkear es tan limpio)

Todo lo específico de marca vive en **dos archivos**:

- **`src/config/store.config.ts`** — nombre, tagline, rutas, navegación, envíos, moneda, métodos de pago mostrados, contenido del home, SEO por página, redes sociales, contacto.
- **`src/config/theme.config.ts`** — paleta de colores en OKLCH (5 tokens: `base`, `onBase`, `surface`, `surfaceAlt`, `muted`, `ink`), tipografía (display + body vía `next/font/google`), radio de bordes.

El propio archivo lo dice en su encabezado: *"To clone for a new client, update this file + theme.config.ts"*. Esto es exactamente lo que hay que hacer para Lu Accesorios.

### 2.2 El patrón `PaymentProvider` — la pieza clave para "sin pasarela ahora, pero abierto a futuro"

```ts
// src/lib/payments/types.ts
export interface PaymentProvider {
  readonly name: string
  createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckout>
}
```

El boilerplate ya resuelve "múltiples formas de concretar la compra" con una interfaz intercambiable (`MockProvider` para pruebas, `MercadoPagoProvider` para producción). **Esta es la pieza que hace que tu requisito encaje perfecto**: en vez de escribir un `WhatsAppProvider` como un hack aparte, se implementa como **un `PaymentProvider` más**, cuyo `createCheckout()` no cobra nada — genera el link de WhatsApp con el resumen del pedido y lo devuelve como la "URL de checkout". El botón del carrito sigue llamando al mismo sitio (`createCheckout()`); el día que quieran una pasarela real, se agrega `MercadoPagoProvider` (o Wompi, PayU, etc.) y se cambia una sola línea de configuración — cero refactor del carrito, del catálogo, ni de las páginas de producto.

### 2.3 `.impeccable.md` — ya tienes el formato para definir la marca de Lu Accesorios

El repo trae un archivo `.impeccable.md` con el "Design Context" de Dulce Infancia (usuarios, personalidad de marca, dirección estética, anti-referencias, principios de diseño) — este es el formato de entrada que usa la skill **`impeccable`** de este mismo entorno Claude Code para producir diseño "distintivo, no genérico". Para Lu Accesorios habría que escribir el equivalente (accesorios/bisutería artesanal — personalidad de marca totalmente distinta a "ropa de bebé tierna y cálida": probablemente algo más aspiracional, colorido, juvenil, dado que ya se ve en Stokity que maneja "manillas custom multicolor"). Esto se hace en la fase de diseño, antes de tocar componentes.

## 3. La decisión de arquitectura más importante: de dónde vienen los productos

### Opción A — Clonar también el backend propio (Prisma + Postgres + `/admin`) — ❌ no recomendada

Sería el camino de "menor esfuerzo inicial" (el boilerplate ya lo trae funcionando), pero crea un problema estructural: **Lu Accesorios tendría que mantener su catálogo en DOS lugares** — Stokity (donde ya vende, controla stock, hace mayoreo, etc.) y el admin de este nuevo sitio. Eso garantiza que tarde o temprano un precio o un stock se desactualice en uno de los dos.

### Opción B — El storefront consume el catálogo real de Stokity vía API — ✅ recomendada

El storefront **no tiene tabla `Product` propia**. Su capa de datos (`src/lib/products.ts` en el boilerplate, hoy hace queries Prisma) se reemplaza por llamadas a la API pública de Stokity diseñada en `ECOMMERCE_API_PLAN.md` (`GET /api/v1/store/products`, `/categories`, `/branches`, `/payment-methods`, `/info`). Como esas funciones ya tienen firma estable (`getProducts()`, `getProductBySlug()`, etc.) y los componentes (`ProductCard`, páginas de categoría/detalle) reciben un tipo `Product` genérico, **el resto del storefront no necesita cambiar** — solo el archivo que trae los datos.

Efecto práctico: Lu Accesorios sigue entrando únicamente a Stokity para dar de alta un producto, cambiar un precio o ajustar stock — el sitio público se actualiza solo (con caché corto, ver §7.3).

**Esto confirma que `ECOMMERCE_API_PLAN.md` es un prerequisito real de este proyecto, no un "nice to have" — sin esa API, este storefront no tiene de dónde traer datos reales.**

## 4. Qué se reutiliza, qué se reemplaza, qué se elimina del boilerplate

| Pieza del boilerplate | Decisión | Por qué |
|---|---|---|
| Next.js 15 + Tailwind v4 + shadcn/ui | ✅ Reutilizar tal cual | Base sólida, ya production-ready |
| `store.config.ts` / `theme.config.ts` | ✅ Reutilizar el mecanismo, reescribir el contenido | Es exactamente el punto de entrada para clonar a un cliente nuevo |
| Carrito (`cart-provider.tsx`, `use-cart.ts`, `mini-cart.tsx`) | ✅ Reutilizar casi tal cual | El carrito es 100% client-side (localStorage), no depende de si hay pasarela o no |
| Páginas storefront (home, categoría, detalle, búsqueda) | ✅ Reutilizar la estructura, rediseñar visualmente | Solo cambia de dónde vienen los datos (§3) y el copy/CTA (§5) |
| `src/lib/products.ts`, `categories.ts` | 🔁 Reemplazar internamente | Pasan de queries Prisma a fetch contra la API de Stokity |
| Prisma + PostgreSQL + `prisma/schema.prisma` completo | ❌ Eliminar (o reducir drásticamente) | No hay catálogo propio que persistir — ver excepción en §7.4 sobre analítica |
| Panel `/admin` (productos, categorías, pedidos, descuentos, roles, usuarios) | ❌ Eliminar todo el árbol `/admin/*` | Lu Accesorios administra desde Stokity, no desde un segundo panel |
| NextAuth (cuentas de cliente, `/cuenta`, login/registro) | ❌ Eliminar para v1 | No hay checkout con cuenta ni pedidos que rastrear todavía — revisar en Fase 3 si se quiere favoritos persistentes |
| UploadThing | ❌ Eliminar | Las imágenes de producto ya viven en Vercel Blob, servidas por Stokity — se consumen las URLs tal cual (`Product.image_url`) |
| `PaymentProvider` (interfaz) | ✅ Reutilizar la interfaz | Es la pieza que hace elegante el flujo de WhatsApp (§2.2, §5) |
| `MockProvider` / `MercadoPagoProvider` (implementaciones) | 🔁 Reemplazar por `WhatsAppProvider` | Nueva implementación de la misma interfaz — MercadoPago queda listo para reactivarse en el futuro sin rediseñar nada |
| Checkout multi-paso (`/checkout-flow`, formulario de envío/tarjeta) | ❌ Eliminar/simplificar drásticamente | No hay envío que cotizar ni tarjeta que tokenizar en v1 — el "checkout" es un resumen + botón de WhatsApp |
| Cron de pedidos abandonados, emails transaccionales (Resend) | ❌ Eliminar para v1 | No hay `Order` persistida que pueda "abandonarse" — reevaluar si se agrega tracking de "carritos vistos" |
| `.impeccable.md`, sistema de diseño OKLCH | ✅ Reutilizar el mecanismo, rehacer el contenido | Ver §2.3 |

## 5. El flujo central: Carrito → Verificar disponibilidad → WhatsApp

### 5.1 Cambio de concepto en el copy

- El botón que hoy dice **"Agregar al carrito"** se mantiene igual — el carrito sigue siendo "los productos que me interesan".
- El botón que hoy dice **"Comprar" / "Pagar"** (en el detalle de producto y en el resumen del carrito) cambia a **"Verificar disponibilidad"**. Esto es importante para las expectativas del comprador: no está pagando, está confirmando que ese producto (y esa combinación custom, si aplica) sigue disponible antes de coordinarlo.

### 5.2 Diseño técnico — `WhatsAppCheckoutProvider`

```ts
// Implementa la misma interfaz PaymentProvider del boilerplate
class WhatsAppCheckoutProvider implements PaymentProvider {
  readonly name = "whatsapp"

  async createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckout> {
    const mensaje = construirMensajeWhatsApp(input.cart) // lista de productos, cantidades, total estimado
    const url = `https://wa.me/${numeroLuAccesorios}?text=${encodeURIComponent(mensaje)}`
    return { redirectUrl: url, provider: this.name }
  }
}
```

El "checkout" completo es: el comprador arma su carrito → clic en "Verificar disponibilidad" → se abre WhatsApp (app o web) con un mensaje **prellenado** listando los productos, cantidades y el link de vuelta a cada producto (o sus imágenes, si WhatsApp lo permite en el mensaje) → la conversación real (confirmar disponibilidad, coordinar pago y entrega) sucede en WhatsApp, fuera del sitio.

### 5.3 Qué pasa después (el punto que hay que dejar claro con Lu Accesorios)

El sitio **no crea ningún pedido en Stokity automáticamente** — es simplemente el punto de partida de la conversación. Cuando Lu Accesorios confirma la venta por WhatsApp, **ella la registra manualmente en Stokity** (en el POS normal, o en el módulo Mayorista si es un pedido custom grande) — exactamente como hace hoy. Esto es coherente con que la API de Stokity (fase 1) sea **solo lectura** — no hay riesgo de que un mensaje de WhatsApp "cree stock negativo" solo porque alguien mandó el mensaje sin que la venta se concrete.

### 5.4 Camino hacia pago real (cuando decidan activarlo)

Se implementa un provider nuevo (`MercadoPagoProvider`, `WompiProvider`, lo que elijan) que cumpla la misma interfaz `PaymentProvider`. El botón del carrito sigue llamando a `createCheckout()` — solo cambia cuál provider está activo (una constante de configuración, ver `store.config.ts` del boilerplate como referencia de dónde vivirían esos flags). **Cero rediseño del carrito o de las páginas de producto** cuando llegue ese momento.

## 6. Gaps que hay que resolver en Stokity para que el storefront se vea "moderno e innovador"

Revisando el modelo `Product` real de Stokity contra lo que un storefront moderno necesita (comparando con el modelo `Product`/`ProductImage`/`ProductVariant` del boilerplate), hay 3 huecos reales:

1. **Una sola imagen por producto** (`products.image`) — un storefront "llamativo" necesita galería (varias fotos por producto, ej. la manilla desde distintos ángulos o con distintos colores de pepas). Hoy Stokity no tiene tabla de imágenes múltiples por producto.
2. **Sin campo "visible en tienda online"** — no todo lo que Lu Accesorios tiene en su inventario de POS necesariamente debería aparecer en el sitio público (ej. insumos, productos de mayoreo, cosas agotadas hace meses). Falta un flag tipo `show_in_storefront` en `products`.
3. **Sin slug SEO-friendly** — Stokity identifica productos por `code`/`id`, no por un slug legible (`/products/manilla-titi-maki-negro`) que un storefront moderno necesita para SEO y URLs compartibles.

Estos tres puntos son extensiones pequeñas y no invasivas a Stokity (nuevas columnas, no cambian nada existente) — se pueden agregar como parte de construir la API de la Fase 1 de `ECOMMERCE_API_PLAN.md`, antes de empezar el storefront.

## 7. Roadmap de fases

### Fase 0 — Prerequisito (en Stokity, no en el storefront)
- Construir la API de solo lectura de `ECOMMERCE_API_PLAN.md` (catálogo, categorías, sucursales, métodos de pago, info del negocio).
- Agregar a `products`: `show_in_storefront` (boolean) y `slug`.

### Fase 1 — Fork y setup del storefront
- Fork de `e-commerce-project` → nuevo repo (ej. `lu-accesorios-store`).
- Eliminar Prisma/Postgres/`/admin`/NextAuth/UploadThing/checkout multi-paso (tabla §4).
- Nueva capa de datos en `src/lib/products.ts`/`categories.ts` apuntando a la API de Stokity.
- `.impeccable.md` + `store.config.ts` + `theme.config.ts` reescritos para la marca de Lu Accesorios.
- Implementar `WhatsAppCheckoutProvider`.

### Fase 2 — Contenido y lanzamiento
- Cargar productos reales (ya vienen de Stokity, solo falta marcarlos `show_in_storefront = true`).
- Dominio propio + deploy en Vercel.
- SEO básico (metadata, sitemap, Open Graph para compartir productos en redes).

### Fase 3 — Crecimiento (opcional, a evaluar con datos reales de uso)
- Analítica: cuántas veces se pidió "verificar disponibilidad" por producto (útil para saber qué se vende sin depender de WhatsApp Business como única fuente).
- Favoritos persistentes (requeriría alguna forma de identidad de visitante — no necesariamente cuentas completas).
- Activar pasarela de pago real (§5.4).

## 8. Preguntas para decidir antes de arrancar

1. ¿El número de WhatsApp de Lu Accesorios ya está listo (WhatsApp Business normal, no la API de Meta — eso es innecesario para el enlace `wa.me`)?
2. Los 3 gaps de la sección 6 (galería de imágenes, flag de visibilidad, slug) — ¿los construimos en Stokity antes de empezar el storefront, o el storefront arranca con una sola imagen por producto en v1 y se mejora después?
3. ¿Todos los productos del inventario de Stokity deberían poder salir al público, o Lu Accesorios quiere curar manualmente cuáles sí (de ahí el flag `show_in_storefront`)?
4. Nombre de dominio y si ya lo tienen comprado.
5. ¿Se necesita algo de "seguimiento del pedido" para el comprador (aunque sea informal, tipo "tu pedido fue confirmado por WhatsApp el [fecha]"), o basta con que todo el rastro quede en la conversación de WhatsApp misma?
