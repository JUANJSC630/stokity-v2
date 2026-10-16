#!/usr/bin/env bash
#
# Smoke test of the storefront API after a deploy.
#
#   STORE_BASE_URL=https://host STORE_READ_KEY=… STORE_ORDERS_KEY=… STORE_ADMIN_KEY=… \
#     scripts/store-api-smoke.sh
#
# The three keys are read ONLY from the environment (never from arguments, so
# they do not show up in `ps`) and are never printed. They are handed to curl
# through its config on stdin, not on its command line.
#
# SIDE EFFECT: it consumes exactly ONE order-reference number on the target
# environment (the idempotency check). Everything else is read-only; the admin
# PATCH check targets a product that does not exist.
#
# Optional: STORE_INSECURE=1 accepts a self-signed certificate (local Herd).
# Exit code: 0 all passed · 1 something failed · 2 bad usage.

set -u

usage_error() {
    echo "ERROR: $1" >&2
    echo "Uso: STORE_BASE_URL=https://host STORE_READ_KEY=… STORE_ORDERS_KEY=… STORE_ADMIN_KEY=… $0" >&2
    exit 2
}

[ -n "${STORE_BASE_URL:-}" ] || usage_error "falta STORE_BASE_URL"
[ -n "${STORE_READ_KEY:-}" ] || usage_error "falta STORE_READ_KEY"
[ -n "${STORE_ORDERS_KEY:-}" ] || usage_error "falta STORE_ORDERS_KEY"
[ -n "${STORE_ADMIN_KEY:-}" ] || usage_error "falta STORE_ADMIN_KEY"

BASE="${STORE_BASE_URL%/}/api/v1/store"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

CURL_EXTRA=()
[ "${STORE_INSECURE:-0}" = "1" ] && CURL_EXTRA+=(--insecure)

PASSED=0
FAILED=0

pass() { PASSED=$((PASSED + 1)); echo "  PASS  $1"; }
fail() { FAILED=$((FAILED + 1)); echo "  FAIL  $1${2:+ — $2}"; }

# request <key-var-name|-> <METHOD> <path> [extra curl args...]
# Leaves the HTTP status in $STATUS, headers in $WORK/h, body in $WORK/b.
request() {
    local key_var="$1" method="$2" path="$3"
    shift 3
    local auth=""
    : >"$WORK/h" && : >"$WORK/b"
    if [ "$key_var" != "-" ]; then
        auth="header = \"Authorization: Bearer ${!key_var}\""
    fi

    STATUS=$(printf '%s\n' "$auth" | curl -sS -K - ${CURL_EXTRA[@]+"${CURL_EXTRA[@]}"} --max-time 20 \
        -X "$method" -H 'Accept: application/json' \
        -D "$WORK/h" -o "$WORK/b" -w '%{http_code}' "$@" "$BASE/$path" 2>"$WORK/err") || STATUS="000"
}

header_value() { grep -i "^$1:" "$WORK/h" | head -1 | cut -d: -f2- | tr -d '\r' | sed 's/^ *//'; }
body_has() { grep -q "$1" "$WORK/b"; }
expect_status() { # name expected
    if [ "$STATUS" = "$2" ]; then pass "$1 ($STATUS)"; else fail "$1" "esperaba $2 y recibió $STATUS"; fi
}

echo "Humo de la API de tienda → ${STORE_BASE_URL%/}"
echo

echo "[salud]"
request - GET health
if [ "$STATUS" = "000" ]; then
    echo "  FAIL  no se pudo conectar a ${STORE_BASE_URL%/} ($(head -c 200 "$WORK/err" | tr '\n' ' '))"
    echo
    echo "Resumen: 0 aprobadas, 1 falladas (sin conexión; se omiten las demás comprobaciones)"
    exit 1
fi
expect_status "GET /health sin llave" 200
body_has '"status":"ok"' && body_has '"db":"ok"' && pass "/health informa status ok y db ok" || fail "/health informa status ok y db ok"

echo "[llave de lectura]"
request STORE_READ_KEY GET "products?per_page=1"
expect_status "lectura puede leer productos" 200
[ -n "$(header_value x-ratelimit-limit)" ] && [ -n "$(header_value x-ratelimit-remaining)" ] \
    && pass "cabeceras X-RateLimit-Limit y X-RateLimit-Remaining presentes" || fail "cabeceras X-RateLimit-* presentes"
request STORE_READ_KEY POST order-reference
expect_status "lectura NO puede pedir número de pedido" 403
[ -n "$(header_value x-ratelimit-limit)" ] && pass "X-RateLimit-* también en respuestas 403" || fail "X-RateLimit-* también en respuestas 403"
request STORE_READ_KEY PATCH "products/smoke-producto-inexistente" -H 'Content-Type: application/json' --data '{"show_in_storefront":true}'
expect_status "lectura NO puede escribir (PATCH)" 403

echo "[sincronización y ETag]"
request STORE_READ_KEY GET "products?updated_since=2000-01-01T00:00:00Z&per_page=1"
expect_status "updated_since responde" 200
body_has '"synced_at"' && pass "updated_since trae meta.synced_at" || fail "updated_since trae meta.synced_at"
request STORE_READ_KEY GET "products?per_page=1"
ETAG="$(header_value etag)"
if [ -n "$ETAG" ]; then
    pass "el listado trae ETag"
    request STORE_READ_KEY GET "products?per_page=1" -H "If-None-Match: $ETAG"
    expect_status "If-None-Match con el ETag devuelve 304" 304
else
    fail "el listado trae ETag"
fi

echo "[llave de solo pedidos]"
request STORE_ORDERS_KEY GET "products?per_page=1"
expect_status "pedidos NO puede leer productos" 403
IDEMPOTENCY_KEY="smoke-$(date +%s)-$$-$RANDOM"
request STORE_ORDERS_KEY POST order-reference -H "Idempotency-Key: $IDEMPOTENCY_KEY"
expect_status "pedidos puede pedir número (primera vez)" 201
FIRST="$(sed -n 's/.*"order_number":"\([^"]*\)".*/\1/p' "$WORK/b")"
[ -n "$FIRST" ] && pass "la respuesta trae order_number" || fail "la respuesta trae order_number"
request STORE_ORDERS_KEY POST order-reference -H "Idempotency-Key: $IDEMPOTENCY_KEY"
expect_status "repetir la misma Idempotency-Key devuelve 200" 200
SECOND="$(sed -n 's/.*"order_number":"\([^"]*\)".*/\1/p' "$WORK/b")"
[ -n "$FIRST" ] && [ "$FIRST" = "$SECOND" ] && pass "la repetición devuelve el mismo número" || fail "la repetición devuelve el mismo número" "primero '$FIRST', luego '$SECOND'"
[ "$(header_value idempotency-replayed)" = "true" ] && pass "cabecera Idempotency-Replayed: true" || fail "cabecera Idempotency-Replayed: true"

echo "[llave de administración]"
request STORE_ADMIN_KEY GET "products?per_page=1"
expect_status "administración puede leer" 200
request STORE_ADMIN_KEY POST order-reference
expect_status "administración NO pide número de pedido" 403
request STORE_ADMIN_KEY PATCH "products/smoke-producto-inexistente" -H 'Content-Type: application/json' --data '{"show_in_storefront":true}'
expect_status "administración puede escribir (404 = pasó el permiso; el producto no existe)" 404

echo
echo "Resumen: ${PASSED} aprobadas, ${FAILED} falladas"
[ "$FAILED" -eq 0 ] && exit 0 || exit 1
