#!/usr/bin/env bash
#
# Rehearsal of the storefront-API deploy on a COPY of the production database.
#
#   scripts/store-api-rehearsal.sh /path/to/production-backup.sql [tenant-slug]
#
# What it does, in a NEW local database (it never drops or deletes any database):
#   1. restores the backup,
#   2. snapshots row counts and categories,
#   3. runs `php artisan migrate --force` with the current branch (timing each migration),
#   4. checks nothing was lost, category slugs are complete/unique/stable, the unique index exists,
#   5. runs `store:preflight --expect-migrated`,
#   6. creates the three keys in the copy, starts a temporary local server on the copy and runs
#      scripts/store-api-smoke.sh against it.
#
# Safety: it only ever talks to a MySQL on this machine (127.0.0.1/localhost) and refuses any
# database whose name does not contain "rehearsal" or "scratch" or that is the one in .env.
# It NEVER drops a database: the name defaults to stokity_v2_rehearsal_<timestamp> and the run
# refuses to start if that database already exists. Leftover databases are left for you to delete.
# It prints no key. The log goes to ~/store-api-rehearsal-<timestamp>.log.
#
# Env: REHEARSAL_DB (default stokity_v2_rehearsal_<timestamp>) · REHEARSAL_PORT (default 8099, the
#      temporary web server) · REHEARSAL_DB_HOST / REHEARSAL_DB_PORT / REHEARSAL_DB_USER /
#      REHEARSAL_DB_PASSWORD to use another local MySQL (for example a Docker mysql:9.7.2 on 3307)
#      instead of the one in .env.
# Exit code: 0 everything passed · 1 something failed · 2 bad usage.

set -u

DUMP="${1:-}"
TENANT="${2:-}"
REHEARSAL_DB="${REHEARSAL_DB:-stokity_v2_rehearsal_$(date +%Y%m%d%H%M%S)}"
PORT="${REHEARSAL_PORT:-8099}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 2

[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "Uso: $0 <respaldo.sql> [slug-del-negocio]" >&2; echo "ERROR: falta el archivo de respaldo (o no existe)." >&2; exit 2; }
command -v mysql >/dev/null || { echo "ERROR: no se encontró el cliente mysql." >&2; exit 2; }

env_value() { grep -E "^$1=" .env | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
DB_HOST="${REHEARSAL_DB_HOST:-$(env_value DB_HOST)}"; DB_PORT="${REHEARSAL_DB_PORT:-$(env_value DB_PORT)}"; DB_USER="${REHEARSAL_DB_USER:-$(env_value DB_USERNAME)}"
DB_PASS="${REHEARSAL_DB_PASSWORD-$(env_value DB_PASSWORD)}"
DEV_DB="$(env_value DB_DATABASE)"
export MYSQL_PWD="$DB_PASS"

case "$DB_HOST" in 127.0.0.1|localhost) ;; *) echo "ERROR: DB_HOST=$DB_HOST no es local; el ensayo solo corre contra MySQL en esta máquina." >&2; exit 2 ;; esac
case "$REHEARSAL_DB" in *rehearsal*|*scratch*) ;; *) echo "ERROR: el nombre de la base de ensayo debe contener 'rehearsal' o 'scratch'." >&2; exit 2 ;; esac
[ "$REHEARSAL_DB" != "$DEV_DB" ] || { echo "ERROR: la base de ensayo no puede ser la de .env ($DEV_DB)." >&2; exit 2; }

LOG="$HOME/store-api-rehearsal-$(date +%Y%m%d-%H%M%S).log"
WORK="$(mktemp -d)"
SERVER_PID=""
cleanup() {
    [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
    rm -f "$ROOT/.env.rehearsal"
    rm -rf "$WORK"
}
trap cleanup EXIT

exec > >(tee "$LOG") 2>&1

PASSED=0; FAILED=0
ok()   { PASSED=$((PASSED + 1)); echo "  OK     $1"; }
bad()  { FAILED=$((FAILED + 1)); echo "  FALLA  $1${2:+ — $2}"; }
sql()  { mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --batch --skip-column-names "$REHEARSAL_DB" -e "$1"; }
now_ms() { python3 -c 'import time; print(int(time.time()*1000))'; }
artisan() { DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" DB_USERNAME="$DB_USER" DB_PASSWORD="$DB_PASS" DB_DATABASE="$REHEARSAL_DB" "$@"; }

echo "Ensayo del despliegue de la API de tienda"
echo "Respaldo: $DUMP ($(du -h "$DUMP" | cut -f1)) · Base de ensayo: $REHEARSAL_DB · Rama: $(git rev-parse --abbrev-ref HEAD) $(git rev-parse --short HEAD)"
echo

echo "[1] Restaurar el respaldo"
EXISTING="$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --batch --skip-column-names -e "select count(*) from information_schema.schemata where schema_name = '$REHEARSAL_DB'")"
[ "$EXISTING" = "0" ] || { echo "ERROR: la base '$REHEARSAL_DB' ya existe. Este script nunca borra bases: elige otro nombre con REHEARSAL_DB=… (o bórrala tú si ya no la necesitas)." >&2; exit 2; }
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "CREATE DATABASE \`$REHEARSAL_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" || { echo "ERROR creando la base"; exit 1; }
START=$(now_ms)
if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$REHEARSAL_DB" < "$DUMP" 2>"$WORK/restore.err"; then
    ok "respaldo restaurado en $(( $(now_ms) - START )) ms"
else
    bad "restaurar el respaldo" "$(head -c 300 "$WORK/restore.err")"
    echo; echo "Resumen: $PASSED correctas, $FAILED con falla"; exit 1
fi
echo "  MySQL del ensayo: $(sql 'select version()') ($DB_HOST:$DB_PORT)"
if [ -z "$TENANT" ]; then
    TENANT="$(sql "select slug from tenants where slug in ('lu-accesorios','luaccesorios') order by id limit 1")"
    [ -n "$TENANT" ] && echo "  negocio detectado: $TENANT" || echo "  (no se encontró lu-accesorios ni luaccesorios en el respaldo)"
fi

echo; echo "[2] Foto del antes"
count_tables() {
    for t in $(sql "select table_name from information_schema.tables where table_schema='$REHEARSAL_DB' and table_type='BASE TABLE' order by table_name"); do
        echo "$t $(sql "select count(*) from \`$t\`")"
    done
}
count_tables > "$WORK/counts-before.txt"
echo "  tablas: $(wc -l < "$WORK/counts-before.txt" | tr -d ' ') · negocios: $(sql 'select group_concat(concat(id,":",slug)) from tenants') · productos: $(sql 'select count(*) from products') · categorías: $(sql 'select count(*) from categories')"
HAD_SLUG="$(sql "select count(*) from information_schema.columns where table_schema='$REHEARSAL_DB' and table_name='categories' and column_name='slug'")"
if [ "$HAD_SLUG" = "1" ]; then
    sql "select id, slug from categories where slug is not null order by id" > "$WORK/slugs-before.txt"
    echo "  categorías con slug previo: $(wc -l < "$WORK/slugs-before.txt" | tr -d ' ')"
else
    : > "$WORK/slugs-before.txt"
    echo "  categories.slug no existía: ninguna URL pública de categoría puede cambiar"
fi
HAD_LIMIT_COLUMN="$(sql "select count(*) from information_schema.columns where table_schema='$REHEARSAL_DB' and table_name='tenant_api_keys' and column_name='rate_limit_per_minute'")"
echo "  migraciones ya aplicadas: $(sql 'select count(*) from migrations')"

echo; echo "[3] Migrar con esta rama"
START=$(now_ms)
artisan php artisan migrate --force > "$WORK/migrate.txt" 2>&1
MIGRATE_EXIT=$?
TOTAL=$(( $(now_ms) - START ))
sed 's/^/  /' "$WORK/migrate.txt"
[ "$MIGRATE_EXIT" -eq 0 ] && ok "migrate terminó sin error en ${TOTAL} ms (incluye arranque de PHP)" || bad "migrate falló (código $MIGRATE_EXIT)"
echo "  migraciones aplicadas ahora: $(sql 'select count(*) from migrations')"

echo; echo "[4] Revisar los datos"
count_tables > "$WORK/counts-after.txt"
export LC_ALL=C
sort -o "$WORK/counts-before.txt" "$WORK/counts-before.txt"; sort -o "$WORK/counts-after.txt" "$WORK/counts-after.txt"
LOST="$(join -j1 "$WORK/counts-before.txt" "$WORK/counts-after.txt" | awk '$1!="migrations" && $2!=$3 {print $1": "$2" → "$3}')"
[ -z "$LOST" ] && ok "ninguna tabla existente cambió su número de filas (salvo migrations)" || bad "cambió el número de filas" "$LOST"
NEW_TABLES="$(join -v2 -j1 "$WORK/counts-before.txt" "$WORK/counts-after.txt" | awk '{print $1"("$2")"}' | tr '\n' ' ')"
echo "  tablas nuevas: ${NEW_TABLES:-ninguna}"

NULLS="$(sql 'select count(*) from categories where slug is null')"
[ "$NULLS" = "0" ] && ok "todas las categorías (también las borradas) tienen slug" || bad "categorías sin slug" "$NULLS"
DUPES="$(sql 'select count(*) from (select tenant_id, slug from categories group by tenant_id, slug having count(*) > 1) d')"
[ "$DUPES" = "0" ] && ok "ningún slug repetido dentro de un negocio" || bad "slugs repetidos" "$DUPES"
INDEX="$(sql "select count(*) from information_schema.statistics where table_schema='$REHEARSAL_DB' and table_name='categories' and index_name='categories_tenant_id_slug_unique' and non_unique=0")"
[ "$INDEX" = "2" ] && ok "índice único (tenant_id, slug) creado" || bad "índice único (tenant_id, slug)" "columnas encontradas: $INDEX"
if [ "$HAD_SLUG" = "1" ]; then
    sql "select id, slug from categories where slug is not null order by id" > "$WORK/slugs-after.txt"
    sort -k1,1 -o "$WORK/slugs-before.txt" "$WORK/slugs-before.txt"; sort -k1,1 -o "$WORK/slugs-after.txt" "$WORK/slugs-after.txt"
    CHANGED="$(join -j1 "$WORK/slugs-before.txt" "$WORK/slugs-after.txt" | awk '$2!=$3 {print $1": "$2" → "$3}')"
    [ -z "$CHANGED" ] && ok "ningún slug previo cambió" || bad "slugs previos cambiados" "$CHANGED"
fi
echo "  categorías (negocio · id · nombre → slug):"
sql "select concat('    ', tenant_id, ' · ', id, ' · ', name, ' → ', slug, if(deleted_at is null, '', '  [borrada]')) from categories order by tenant_id, id"
SUFFIXED="$(sql "select concat(tenant_id, ' · ', name, ' → ', slug) from categories where slug regexp '-[0-9]+\$' order by tenant_id, id")"
if [ -n "$SUFFIXED" ]; then echo "  slugs con sufijo numérico (colisión o nombre que termina en número; revisar):"; echo "$SUFFIXED" | sed 's/^/    /'; else ok "ningún slug necesitó sufijo"; fi
ARTESANAL="$(sql "select count(*) from product_tags pt join tenants t on t.id = pt.tenant_id where t.slug = '$TENANT' and pt.slug = 'artesanal'")"
[ "$ARTESANAL" = "1" ] && ok "etiqueta «Artesanal» creada para $TENANT" || bad "etiqueta «Artesanal» para $TENANT" "encontradas: $ARTESANAL"
if [ "$HAD_LIMIT_COLUMN" = "0" ]; then
    BADLIMITS="$(sql "select count(*) from tenant_api_keys where can_read_catalog <> 1 or rate_limit_per_minute is not null")"
    [ "$BADLIMITS" = "0" ] && ok "las llaves existentes conservan lectura habilitada y límite por defecto (60)" || bad "alguna llave existente cambió de permisos o límite" "$BADLIMITS"
else
    echo "  (el respaldo ya traía las columnas de llaves; se omite la comprobación de llaves existentes)"
fi

echo; echo "[5] store:preflight"
artisan env APP_ENV=production APP_DEBUG=false php artisan store:preflight --tenant="$TENANT" --expect-migrated > "$WORK/preflight.txt" 2>&1
PREFLIGHT_EXIT=$?
sed 's/^/  /' "$WORK/preflight.txt"
[ "$PREFLIGHT_EXIT" -eq 0 ] && ok "store:preflight terminó en PREFLIGHT OK" || bad "store:preflight" "$(tail -1 "$WORK/preflight.txt")"

echo; echo "[6] Humo contra la copia (servidor temporal en 127.0.0.1:$PORT)"
PREFIX="ensayo$(date +%s)"
KEYS_OUT="$(artisan env APP_ENV=production APP_DEBUG=false php artisan store:keys:create "$TENANT" --prefix="$PREFIX" 2>&1)"
key_for() { printf '%s\n' "$KEYS_OUT" | grep -A1 "^$PREFIX-$1 " | tail -1 | grep -E '^sk_store_[A-Za-z0-9]{40}$'; }
READ_KEY="$(key_for lectura)"; ORDERS_KEY="$(key_for pedidos)"; ADMIN_KEY="$(key_for admin)"
if [ -z "$READ_KEY" ] || [ -z "$ORDERS_KEY" ] || [ -z "$ADMIN_KEY" ]; then
    bad "crear las tres llaves en la copia" "$(printf '%s' "$KEYS_OUT" | grep -v 'sk_store_' | head -3)"
else
    ok "tres llaves creadas en la copia (no se imprimen)"
    # `artisan serve` forwards APP_ENV but not DB_*; a temporary env file pins the copy.
    grep -vE '^(DB_HOST|DB_PORT|DB_USERNAME|DB_PASSWORD|DB_DATABASE|APP_ENV|APP_DEBUG|CACHE_STORE)=' .env > .env.rehearsal
    printf 'DB_HOST=%s\nDB_PORT=%s\nDB_USERNAME=%s\nDB_PASSWORD=%s\nDB_DATABASE=%s\nAPP_ENV=rehearsal\nAPP_DEBUG=false\nCACHE_STORE=database\n' "$DB_HOST" "$DB_PORT" "$DB_USER" "$DB_PASS" "$REHEARSAL_DB" >> .env.rehearsal
    APP_ENV=rehearsal php artisan serve --host=127.0.0.1 --port="$PORT" > "$WORK/server.log" 2>&1 &
    SERVER_PID=$!
    for _ in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$PORT/api/v1/store/health" && break; sleep 0.5; done
    if [ "$(sql 'select 1' >/dev/null 2>&1; curl -s "http://127.0.0.1:$PORT/api/v1/store/health" | grep -c '"db":"ok"')" = "1" ]; then
        STORE_BASE_URL="http://127.0.0.1:$PORT" STORE_READ_KEY="$READ_KEY" STORE_ORDERS_KEY="$ORDERS_KEY" STORE_ADMIN_KEY="$ADMIN_KEY" \
            scripts/store-api-smoke.sh > "$WORK/smoke.txt" 2>&1
        SMOKE_EXIT=$?
        sed 's/^/  /' "$WORK/smoke.txt"
        [ "$SMOKE_EXIT" -eq 0 ] && ok "el script de humo pasó completo" || bad "el script de humo" "$(grep Resumen "$WORK/smoke.txt")"
    else
        bad "arrancar el servidor temporal" "$(tail -3 "$WORK/server.log" | tr '\n' ' ')"
    fi
fi

echo
echo "Resumen del ensayo: $PASSED correctas, $FAILED con falla"
echo "Base de ensayo conservada (no se borra): $REHEARSAL_DB en $DB_HOST:$DB_PORT"
echo "Registro guardado en: $LOG"
[ "$FAILED" -eq 0 ] && { echo "ENSAYO OK"; exit 0; } || { echo "ENSAYO CON FALLAS"; exit 1; }
