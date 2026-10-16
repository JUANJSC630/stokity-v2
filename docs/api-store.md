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
| `POST /products/{identifier}/images` | Agregar imagen a la galería | administración |
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
| `q` | Texto a buscar en el nombre (máx. 100 caracteres). |
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
      "gallery": [{"id": 1, "url": "https://….webp", "sort_order": 0}],
      "category": {"id": 10, "name": "Ropa", "description": "…", "created_at": "2026-09-03T10:27:07-05:00", "updated_at": "2026-09-03T10:27:07-05:00"},
      "branch": {"id": 8, "name": "La Unión", "address": "…", "phone": "…"},
      "created_at": "2026-09-03T10:27:07-05:00",
      "updated_at": "2026-09-22T08:13:56-05:00"
    }
  ],
  "links": {…},
  "meta": {"current_page": 1, "per_page": 24, "total": 4, "last_page": 1, …}
}
```

`available_stock` ya descuenta el stock reservado. Para servicios es `null` y `in_stock` es `true`. Las llaves de administración reciben además `show_in_storefront`.

### `GET /products/{slug}`

El producto con la misma forma de arriba. `404` si no existe, no está activo o no está publicado.

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
- Cada fila trae `visible: true` (producto completo) o es una de estas dos formas mínimas:

Producto que dejó de ser público (inactivo o sacado de la tienda):

```json
{"code": "CAM-9457", "slug": "camiseta-polo", "visible": false, "updated_at": "2026-10-16T11:00:00-05:00"}
```

Producto eliminado:

```json
{"code": "CAM-9457", "slug": "camiseta-polo", "deleted": true, "deleted_at": "2026-10-16T11:00:00-05:00", "updated_at": "2026-10-16T11:00:00-05:00"}
```

Solo se informan como ocultos o eliminados los productos que alguna vez se publicaron (los que tienen `slug`). El precio y el stock de un producto oculto no se envían.

Qué cuenta como cambio (actualiza `updated_at`): cualquier edición del producto, ventas y devoluciones (stock), reservas y liberaciones de separados/créditos (`reserved_stock`), ajustes de inventario, cambios en la galería de imágenes, y renombrar o desactivar su categoría.

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

`201` `{"order_number": "LUACCESORIOS-000123"}`. No crea ningún pedido; solo reserva el número.

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

## 9. Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| 401 | Falta la llave, es inválida o fue revocada | `{"message": "…"}` |
| 403 | La llave no tiene el permiso, o el negocio está suspendido | `{"message": "…"}` |
| 404 | No existe el producto (o no está publicado) | `{"message": "…"}` |
| 422 | Parámetro inválido | `{"message": "…", "errors": {"campo": ["…"]}}` |
| 429 | Límite superado | `{"message": "Too Many Attempts."}` + `Retry-After` |
| 503 | Solo `health`, base de datos caída | `{"status": "error", "db": "error", …}` |
