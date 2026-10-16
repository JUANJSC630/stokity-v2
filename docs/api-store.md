# API de tienda de Stokity (`/api/v1/store`)

Contrato técnico para quien consume la API (por ejemplo la tienda web de Lu Accesorios). Todo lo descrito es aditivo: ningún campo ni ruta anterior cambió de significado.

- Base: `https://<host>/api/v1/store`
- Autenticación: `Authorization: Bearer <llave>` (excepto `health`).
- Formato: JSON, UTF-8. Las fechas son ISO 8601 con zona (`2026-10-16T14:03:22-05:00`, zona horaria America/Bogota).
- Los errores de esta API siempre son JSON, aunque el cliente no envíe `Accept: application/json`.

## 1. Rutas y permisos

| Método y ruta | Qué hace | Permiso de la llave |
|---|---|---|
| `GET /health` | Salud del servicio | ninguno (sin llave) |
| `GET /info` | Datos públicos del negocio | lectura |
| `GET /categories` | Categorías con productos visibles | lectura |
| `GET /branches` | Sucursales activas | lectura |
| `GET /payment-methods` | Métodos de pago activos | lectura |
| `GET /products` | Listado de productos | lectura |
| `GET /products/{slug}` | Detalle de un producto | lectura |
| `PATCH /products/{identifier}` | Visibilidad y foto de portada | administración |
| `POST /products/{identifier}/images` | Agregar imagen a la galería (cuerpo: `image_url`, y `alt_text` opcional de hasta 255 caracteres) | administración |
| `PUT /products/{identifier}/images/order` | Reordenar la galería | administración |
| `DELETE /products/{identifier}/images/{imageId}` | Quitar imagen | administración |
| `POST /order-reference` | Número de referencia de pedido | solo pedidos |

### Tipos de llave

Cada negocio tiene tres llaves, creadas con `php artisan store:keys:create` (ver sección 8):

| Perfil | Nombre | Lee catálogo | Escribe (PATCH/imágenes) | Pide número de pedido | Límite por cubeta |
|---|---|---|---|---|---|
| Lectura | `lu-lectura` | sí | no | no | 300/min |
| Administración | `lu-admin` | sí | sí | no | 120/min |
| Solo pedidos | `lu-pedidos` | **no** | no | sí | 30/min |

Una llave sin el permiso requerido recibe `403` con `{"message": "..."}`. Una llave ausente, inválida o revocada recibe `401`. Una llave de un negocio suspendido recibe `403`.

## 2. Límites de peticiones

Cada llave tiene **tres cubetas independientes**, y cada una cuenta aparte:

| Cubeta | Rutas |
|---|---|
| `read` | todos los `GET` autenticados |
| `write` | `PATCH`, `POST/PUT/DELETE` de imágenes |
| `orders` | `POST /order-reference` |

El límite de cada cubeta es `rate_limit_per_minute` de la llave (por defecto 60 si no se configuró). Agotar `read` nunca consume `orders`.

Cabeceras en **todas** las respuestas de rutas con llave (incluidos 403 y 404):

- `X-RateLimit-Limit`: límite de la cubeta.
- `X-RateLimit-Remaining`: peticiones que quedan en la ventana.

Al superarlo: `429` con `Retry-After: <segundos>`, `X-RateLimit-Reset` y cuerpo `{"message": "Too Many Attempts."}`.

`GET /health` tiene su propio límite de 120/min por IP, independiente de las llaves.

## 3. Salud

```
GET /api/v1/store/health
```

```json
{"status":"ok","version":"a1b2c3d","time":"2026-10-16T14:34:24-05:00","db":"ok"}
```

Si la base de datos no responde: `503` con `"status":"error"` y `"db":"error"`. No incluye datos de ningún negocio. `version` es `APP_VERSION`, o el commit corto de Railway, o `dev`.

## 4. Productos

### `GET /products`

| Parámetro | Descripción |
|---|---|
| `q` | Texto a buscar en el nombre (máx. 100 caracteres). Distingue tildes según la base de datos; se conserva por compatibilidad. |
| `search` | Búsqueda por nombre que ignora mayúsculas y tildes (máx. 80 caracteres). Ver sección 4.1. Si se envían `search` y `q`, manda `search`. |
| `tag` | Slug de etiqueta (`artesanal`). Varios separados por coma = productos con **cualquiera** de ellas. |
| `category_id`, `branch_id` | Filtros por categoría y sucursal. |
| `page` | Página (por defecto 1). |
| `per_page` | 1 a **100** (por defecto 24). |
| `visibility=all` | Solo para llaves de administración: incluye productos aún no publicados. |
| `updated_since` | ISO 8601. Activa el modo de sincronización (sección 6). |

Sin `updated_since` el orden es por `name` y solo salen productos activos con `show_in_storefront = true`.

Respuesta (producto completo, lista blanca; el resto de campos internos nunca se exponen):

```json
{
  "data": [
    {
      "code": "CAM-9457",
      "slug": "camiseta-polo",
      "name": "Camiseta Polo",
      "description": "…",
      "price": 75000,
      "is_service": false,
      "in_stock": true,
      "available_stock": 98,
      "image_url": "https://….webp",
      "gallery": [{"id": 1, "url": "https://….webp", "alt_text": "Camiseta polo azul vista de frente", "sort_order": 0}],
      "category": {"id": 10, "name": "Ropa", "slug": "ropa", "description": "…", "image_url": null, "created_at": "2026-09-03T10:27:07-05:00", "updated_at": "2026-09-03T10:27:07-05:00"},
      "branch": {"id": 8, "name": "La Unión", "address": "…", "phone": "…"},
      "tags": [{"slug": "artesanal", "name": "Artesanal"}],
      "material": "Algodón pima",
      "dimensions": "Talla M, largo 68 cm",
      "weight_grams": 180,
      "origin": "Hecho en Medellín, Colombia",
      "manufacturing": "supplier",
      "care_instructions": "Lavar a máquina en frío.",
      "color": "Azul",
      "style": "Casual",
      "seo_title": "Camiseta polo azul",
      "seo_description": "Camiseta polo de algodón pima, corte clásico.",
      "created_at": "2026-09-03T10:27:07-05:00",
      "updated_at": "2026-09-22T08:13:56-05:00"
    }
  ],
  "links": {…},
  "meta": {"current_page": 1, "per_page": 24, "total": 4, "last_page": 1, …}
}
```

`available_stock` ya descuenta el stock reservado. Para servicios es `null` y `in_stock` es `true`. Las llaves de administración reciben además `show_in_storefront`.

#### Campos de información del producto

Todos opcionales; **siempre están presentes** y valen `null` si el negocio no los llenó. Se editan en el panel de Stokity (formulario del producto, «Información para la tienda web»), no por la API.

| Campo | Tipo | Límite |
|---|---|---|
| `material` | texto | 255 |
| `dimensions` | texto libre | 255 |
| `weight_grams` | entero | 0 a 100000 |
| `origin` | texto | 255 |
| `manufacturing` | `handmade`, `supplier`, `mixed` o `null` | |
| `care_instructions` | texto | 1000 |
| `color`, `style` | texto | 60 |
| `seo_title` | texto | 70 |
| `seo_description` | texto | 160 |

`gallery[].alt_text` (texto de hasta 255, o `null`) se edita en el panel, en la sección «Fotos de la galería» de cada producto.

`tags` es siempre un arreglo (vacío si el producto no tiene etiquetas), ordenado por nombre. Las etiquetas se administran en el panel (Catálogo → Etiquetas); un producto puede tener hasta 10. El `slug` de una etiqueta no cambia al renombrarla.

### 4.1 Búsqueda

`GET /products?search=brazalete`

- Busca dentro del **nombre** del producto (contiene el texto, no solo al inicio).
- Ignora mayúsculas y tildes en ambos lados: `brazalete` encuentra «Brazaléte» y «BRAZALETE», y `camion` encuentra «Camión».
- Máximo 80 caracteres; más responde `422`. Los caracteres `%` y `_` se buscan literalmente.
- En MySQL la comparación se fuerza a `utf8mb4_unicode_ci`, así que no depende de la collation de la columna.
- Solo busca entre los productos visibles (o todos, con `visibility=all` y llave de administración).
- Medido: ~14 ms (mediana) para una búsqueda sobre 1.000 productos en MySQL local, incluyendo todo el procesamiento de la petición.

### `GET /products/{slug}`

El producto con la misma forma de arriba. `404` si no existe, no está activo o no está publicado.

## 4.2 Categorías

`GET /categories`: categorías activas con al menos un producto visible, ordenadas por nombre.

```json
{
  "data": [
    {
      "id": 10,
      "name": "Ropa",
      "slug": "ropa",
      "description": "Categoría de ropa",
      "image_url": null,
      "products_count": 4,
      "created_at": "2026-09-03T10:27:07-05:00",
      "updated_at": "2026-09-03T10:27:07-05:00"
    }
  ]
}
```

- `slug`: minúsculas, sin tildes, con guiones; **único por negocio** y **estable**: no cambia al renombrar la categoría. Si dos nombres dan el mismo slug, el segundo recibe `-2`, el tercero `-3`... Úsalo en la URL `/category/{slug}`.
- `products_count`: productos visibles de esa categoría.
- `image_url`: siempre `null` por ahora (las categorías no tienen imagen); el campo ya es parte del contrato.
- Dentro de un producto, `category` trae los mismos campos salvo `products_count`.
- Cambiar el slug a propósito: `php artisan store:categories:regenerate-slug <negocio> <id-categoría>` (cambia una URL pública).

## 5. Cabeceras condicionales (ETag)

`GET /products` y `GET /products/{slug}` devuelven:

- `ETag: W/"<hash>"` (débil, calculado sobre el cuerpo)
- `Cache-Control: no-cache, private` (se puede guardar, pero hay que revalidar)
- `Vary: Authorization`

Si se envía `If-None-Match` con ese valor (o varios separados por coma, o `*`) y no hubo cambios, la respuesta es `304` sin cuerpo. En modo `updated_since`, `meta.synced_at` no cuenta para el ETag.

## 6. Cómo sincronizar (`updated_since`)

`GET /products?updated_since=2026-10-16T14:03:22-05:00`

- Devuelve los productos con `updated_at >= updated_since` (comparación **inclusiva**: deduplica por `code`).
- Orden estable `updated_at ASC, id ASC`; pagina con `page` y `per_page` (hasta 100).
- Un valor inválido responde `422`. Codifica el `+` del desfase como `%2B` en la URL (si llega como espacio, se interpreta como `+`). También se aceptan `Z`, sin zona (hora de Bogotá) y solo fecha.
- `meta.synced_at`: hora del servidor al empezar la consulta. Úsala como siguiente `updated_since`; no dependas del reloj de la tienda.
- Cada fila tiene **exactamente una** de estas tres formas. El formato es deliberado: de un producto que dejó de ser público **nunca** se envía precio ni stock.

**1. Producto visible: el producto completo (igual que en el listado normal) más `visible: true`.**

```json
{"code": "CAM-9457", "slug": "camiseta-polo", "name": "Camiseta Polo", "price": 75000, "available_stock": 97, "tags": [], "updated_at": "2026-10-16T14:33:56-05:00", "visible": true}
```
(recortado; trae todos los campos de la sección 4)

**2. Producto que dejó de ser público (inactivo o sacado de la tienda): solo `code`, `slug`, `visible: false` y `updated_at`.** Sin nombre, precio, stock, etiquetas ni imágenes.

```json
{"code": "CAM-9457", "slug": "camiseta-polo", "visible": false, "updated_at": "2026-10-16T11:00:00-05:00"}
```

**3. Producto eliminado: solo `code`, `slug`, `deleted: true`, `deleted_at` y `updated_at`.**

```json
{"code": "CAM-9457", "slug": "camiseta-polo", "deleted": true, "deleted_at": "2026-10-16T11:00:00-05:00", "updated_at": "2026-10-16T11:00:00-05:00"}
```

La tienda debe tratar las formas 2 y 3 como «quitar este `code`». En el listado normal (sin `updated_since`) los productos ocultos y eliminados no aparecen y las filas no traen el campo `visible`.

Solo se informan como ocultos o eliminados los productos que alguna vez se publicaron (los que tienen `slug`): un artículo interno que nunca llegó a la tienda no aparece en la sincronización.

Qué cuenta como cambio (actualiza `updated_at`): cualquier edición del producto, ventas y devoluciones (stock), reservas y liberaciones de separados/créditos (`reserved_stock`), ajustes de inventario, cambios en la galería de imágenes (incluido su texto alternativo), asignar o quitar etiquetas (o renombrarlas/borrarlas), y renombrar o desactivar su categoría.

### Algoritmo

1. **Primera carga**: pide `GET /products?per_page=100&page=N` hasta terminar. Guarda `meta.synced_at` de la primera página como marca.
2. **Cada ciclo**: pide `GET /products?updated_since=<marca>&per_page=100` y recorre todas las páginas.
3. Por cada fila: si `deleted: true` o `visible: false` → **quita** el producto (por `code`); si no → **crea o reemplaza** por `code`.
4. Cuando termines todas las páginas, guarda como nueva marca el `meta.synced_at` de la **primera** página de este ciclo. Descontar unos segundos de margen es seguro porque la comparación es inclusiva y se deduplica por `code`.
5. Si una respuesta falla, repite con la misma marca.

## 7. Número de pedido

```
POST /api/v1/store/order-reference
```

`201` `{"order_number": "000123"}`. No crea ningún pedido; solo reserva el número. El número es el contador propio del negocio, con 6 dígitos y **sin prefijo** (cada negocio tiene su propia secuencia: dos negocios pueden tener ambos el `000001`).

### Idempotencia

Cabecera opcional `Idempotency-Key` (8 a 64 caracteres: letras, números, `-` y `_`).

- Primera petición: `201` y un número nuevo.
- Repetición con la **misma llave de API** y la misma `Idempotency-Key` durante 24 horas: `200`, **el mismo número**, cabecera `Idempotency-Replayed: true`, sin consumir número.
- Peticiones simultáneas con la misma clave producen un solo número.
- Formato inválido: `422`.
- Sin la cabecera, cada llamada consume un número nuevo (comportamiento anterior).

Se recomienda enviar un `Idempotency-Key` estable por pedido (por ejemplo el identificador del carrito) y reintentar con la misma clave ante un timeout.

## 8. Operación de llaves

Crear las tres llaves de un negocio (cada una se muestra **una sola vez** en la terminal):

```
php artisan store:keys:create <slug-o-id-del-negocio> [--prefix=lu] [--read-limit=300] [--admin-limit=120] [--orders-limit=30]
```

Si ya existen llaves activas con esos nombres, el comando se niega (usa `--rotate`).

### Rotar una llave sin caída

1. `php artisan store:keys:create <negocio> --rotate=lectura` (o `admin` / `pedidos`). Crea **solo** la llave nueva, con el mismo perfil y límite; la vieja sigue funcionando.
2. Cambia la llave en la tienda (variable de entorno en Vercel) y despliega.
3. Comprueba que la tienda funciona con la nueva (`last_used_at` de la vieja deja de moverse).
4. `php artisan store:keys:revoke <id-de-la-llave-vieja>`. Es reversible solo creando otra llave: revocar es definitivo.

## 9. Comprobaciones de despliegue

Herramientas del repositorio para quien despliega (ninguna escribe en producción, salvo el número de pedido que consume el script de humo):

- `php artisan store:preflight [--tenant=luaccesorios] [--expect-migrated]`: **solo lectura**. Imprime entorno, `APP_DEBUG`, caché (y si es compartido entre réplicas), versión y collation de la base, negocios, llaves por perfil (sin imprimir llaves, hashes ni prefijos) y migraciones pendientes. Termina con `PREFLIGHT OK` (código 0) o `PREFLIGHT ATENCION: …` (código 1). Úsalo antes de desplegar y, con `--expect-migrated`, después.
- `scripts/store-api-smoke.sh`: humo posterior al despliegue. Lee `STORE_BASE_URL`, `STORE_READ_KEY`, `STORE_ORDERS_KEY` y `STORE_ADMIN_KEY` **solo del entorno** (nunca argumentos; las llaves no se imprimen ni aparecen en la línea de comandos de `curl`). Comprueba salud, permisos por perfil, `updated_since`, ETag/304, idempotencia y cabeceras `X-RateLimit-*`. **Consume un número de pedido** del entorno probado. Código 0 si todo pasa, 1 si algo falla, 2 si faltan variables. `STORE_INSECURE=1` acepta un certificado autofirmado (Herd).
- `scripts/store-api-rehearsal.sh <respaldo.sql> [slug]`: ensayo del despliegue sobre una copia local de un respaldo (solo contra MySQL en esta máquina): restaura, migra con tiempos, comprueba datos y slugs, corre `store:preflight` y el script de humo contra un servidor temporal. Deja un registro en `~/store-api-rehearsal-<fecha>.log`.

## 10. Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| 401 | Falta la llave, es inválida o fue revocada | `{"message": "…"}` |
| 403 | La llave no tiene el permiso, o el negocio está suspendido | `{"message": "…"}` |
| 404 | No existe el producto (o no está publicado) | `{"message": "…"}` |
| 422 | Parámetro inválido | `{"message": "…", "errors": {"campo": ["…"]}}` |
| 429 | Límite superado | `{"message": "Too Many Attempts."}` + `Retry-After` |
| 503 | Solo `health`, base de datos caída | `{"status": "error", "db": "error", …}` |
