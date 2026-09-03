# Runbook — Despliegue de Multi-Tenancy a Producción

> Instrucciones ordenadas para activar multi-tenancy correctamente. **Sigue el orden exacto.**
>
> Rama: `feature/multitenancy-infra` → `master` · Plataforma: Railway (proyecto "stokity", servicio `stokity`, MySQL; renombrado desde "Lu Accesorios"/`lu-accesorios` tras la migración a multi-tenant).

---

## ¿Qué le pasa a los datos del cliente actual?

> **Respuesta corta: absolutamente nada se borra. Todo se conserva.**

Al hacer merge, Railway corre las migraciones en orden. La migración clave es la **000002 (backfill)**:

1. Busca si ya existe un registro en la tabla `tenants`. Si no existe, lo **crea automáticamente** tomando el nombre del negocio desde `business_settings.name` (el nombre que ya tiene el cliente en producción).
2. Toma el ID de ese tenant y hace `UPDATE` en **23 tablas**: productos, ventas, clientes, sucursales, usuarios, métodos de pago, movimientos de caja, gastos, etc. — poniendo `tenant_id = <id>` en cada fila que aún tenga `NULL`.
3. Todo esto corre dentro de una **transacción**: si algo falla a mitad, se revierte completo. No hay estado inconsistente.

**Resultado:** el negocio que ya existía queda convertido en el **Tenant #1** de la plataforma. Sus usuarios, productos, ventas, configuración y todo lo demás quedan intactos, ahora con `tenant_id` asignado. El cliente existente no nota ningún cambio — entra con sus mismas credenciales y ve exactamente sus mismos datos.

Lo **único nuevo** es que ahora tú (como SuperAdmin) puedes ver ese negocio desde `/admin/tenants` y crear negocios adicionales.

---

## ⚠️ Regla de oro

La rama **NO está mergeada**. Al mergear, Railway despliega y corre `migrate --force`, que ejecuta la **migración de backfill** descrita arriba. Es irreversible sin backup. **Backup primero, siempre.**

---

## Paso 1 — Backup de producción (OBLIGATORIO, antes de todo)

Elige una opción:

- **A) Dashboard de Railway** (recomendado): servicio **MySQL** → pestaña **Backups** → **Create backup**. Espera a que aparezca el snapshot.
- **B) Dump local** — `railway connect MySQL` abre un cliente interactivo, **no** genera un archivo. Para un dump real:
  ```bash
  railway connect MySQL --tunnel-only
  # deja esa terminal abierta; en otra, con los datos que imprime:
  mysqldump -h 127.0.0.1 -P <puerto> -u root -p<password> railway \
    --single-transaction --routines --triggers --add-drop-table > backup.sql
  ```
  Verifica el archivo antes de continuar: `tail -3 backup.sql` debe terminar en `-- Dump completed`, y `grep -c "^CREATE TABLE" backup.sql` debe dar el número de tablas esperado (31 en este esquema).

✅ No continúes hasta tener el backup confirmado y verificado.

---

## Paso 2 — Mergear el PR #8

Una vez revisado, en GitHub: **Merge** del PR `feature/multitenancy-infra` → `master`.
Esto dispara el deploy en Railway automáticamente.

---

## Paso 3 — Esperar y verificar el deploy

El deploy construye el frontend (`npm run build`) y corre `migrate --force`. Verifica que terminó **verde** en el dashboard de Railway (Deployments). El build tarda ~2-3 min.

Despierta el servicio si está dormido:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://stokity-v2-production.up.railway.app/login
```

---

## Paso 4 — Verificar que el negocio actual quedó intacto y asignado

Confirma que el backfill creó el tenant y asignó tus datos (no debe haber `tenant_id` nulos).

Revisa **las 23 tablas** que toca el backfill, no solo `products` — un backfill
parcial puede dejar `tenant_id` nulo en `users`, `sales` u otra tabla y pasar
desapercibido si solo se mira una.

**Forma recomendada (`railway ssh`, no interactivo):**
```bash
railway ssh --service stokity -- "php artisan tinker --execute='
\$tables = [\"business_settings\",\"branches\",\"users\",\"archived_users\",\"categories\",
  \"products\",\"clients\",\"payment_methods\",\"suppliers\",\"sales\",\"sale_products\",
  \"sale_returns\",\"sale_return_products\",\"stock_movements\",\"cash_sessions\",
  \"cash_movements\",\"credit_sales\",\"credit_sale_items\",\"credit_payments\",\"expenses\",
  \"expense_categories\",\"expense_templates\",\"product_supplier\"];
echo \"Tenants: \".App\Models\Tenant::count().PHP_EOL;
foreach (\$tables as \$t) {
  \$n = DB::table(\$t)->whereNull(\"tenant_id\")->count();
  echo str_pad(\$t, 24).\": \".\$n.(\$n > 0 ? \"  <-- SIN ASIGNAR\" : \"\").PHP_EOL;
}
'"
```

**Esperado:** `Tenants: 1` y **0** en las 23 tablas. Cualquier tabla con un
número mayor que 0 significa backfill incompleto — **no sigas** al Paso 5 hasta
resolverlo.

> 💡 **En local** (tu máquina con `migrate:fresh --seed`) sí verás filas sin
> tenant — normal, los seeders crean datos sin tenant. Este chequeo de "0 en
> todas" aplica **solo en producción**, donde el backfill corre sobre datos
> que ya existían.

---

## Paso 5 — Convertir tu cuenta en SuperAdmin

> Decisión tomada: **se promueve la cuenta actual** (`juansc0630@gmail.com`, hoy administrador del tenant),
> no se crea una cuenta nueva. Efecto real: esa cuenta deja de operar el POS del negocio
> (`tenant_id` queda `null`); Daniela (también administrador del mismo tenant) sigue
> operando el día a día sin ningún cambio.

Hay dos comandos, para dos casos distintos:

| Comando | Cuándo usarlo |
|---|---|
| `tenancy:make-super-admin` | Crear un SuperAdmin con un email **nuevo** que no existe todavía |
| `tenancy:promote-super-admin` | **Este caso** — convertir una cuenta que **ya existe** y ya opera un tenant |

`tenancy:promote-super-admin` verifica antes de tocar nada que la cuenta no tenga
ventas, sesiones de caja, sucursales administradas, movimientos de stock ni gastos
a su nombre — si los tuviera, promoverla dejaría esos registros "sin vendedor" para
el resto del negocio (el scope de tenant oculta al usuario una vez que `tenant_id`
es `null`). Se verificó en producción antes de este deploy: **0 en todos los casos**,
así que es seguro.

**Ejecuta vía `railway ssh` (no interactivo, corre dentro del contenedor real):**
```bash
railway ssh --service stokity -- "php artisan tenancy:promote-super-admin juansc0630@gmail.com --force"
```

`--force` omite la confirmación interactiva (no hay TTY vía este canal) — es seguro
aquí porque el chequeo de datos históricos ya se hizo y dio limpio.

Para promover a alguien más adelante, sin `--force`, el comando pide confirmación
y explica el efecto antes de aplicar el cambio.

---

## Paso 6 — Verificar los dos tipos de acceso

1. **Negocio existente:** entra con un usuario actual (admin del negocio). Debe ver sus productos, ventas, etc., **exactamente como antes**.
2. **SuperAdmin:** entra con la misma cuenta ya promovida → te redirige a **`/admin/tenants`** y ves tu negocio actual en la lista.

Si ambos funcionan, la migración fue exitosa. ✅

---

## Paso 7 — Operación diaria (gestión de clientes)

Desde **`/admin/tenants`** (logueado como SuperAdmin):

| Acción | Cómo |
|--------|------|
| **Crear negocio** | Botón "Nuevo negocio" → llena datos del negocio + su admin. Se crea con sucursal, métodos de pago y cliente "Consumidor Final" listos. |
| **Suspender** | Botón "Suspender" → sus usuarios quedan bloqueados (403). |
| **Activar** | Reactiva un negocio suspendido. |
| **Eliminar (archivar)** | Botón papelera → soft-delete; datos se conservan, usuarios pierden acceso. |
| **Tu contraseña** | "Mi cuenta" en el menú. |

Cada negocio queda **aislado**: sus usuarios solo ven sus propios datos.

---

## Paso 8 — Limpiar datos de un negocio (si lo necesitas)

El comando ahora **exige** el tenant (ya no borra global):
```bash
railway ssh "php artisan db:clean-transactional --tenant=ID --force"
```
Borra ventas/productos/etc. **solo** de ese negocio; conserva sus usuarios, sucursales y ajustes.

---

## 🔙 Plan de rollback (si algo sale mal en el deploy)

1. En Railway: MySQL → **Backups** → localiza el snapshot del Paso 1 → **Restore**.
   Railway solo *stagea* el cambio en ese momento — no aplica nada todavía.
2. Click en **Deploy** en el canvas del proyecto para aplicar el volumen
   restaurado. Sin este paso, el restore queda pendiente y sin efecto.
3. Verifica el contenido de la base (`railway ssh` + tinker, igual que el
   Paso 4) **antes** de seguir.
4. Revierte el merge en GitHub (o redeploy del commit anterior a `master`)
   para que el código vuelva a coincidir con los datos restaurados.

Si el backup fue un `mysqldump` (Opción B del Paso 1) en vez del snapshot
nativo de Railway, restaura importando ese archivo directamente:
`mysql -h <host> -P <puerto> -u root -p<password> railway < backup.sql`.

---

## Cómo funciona el aislamiento (resumen)

- **Automático:** cada request fija el tenant del usuario logueado (`IdentifyTenant`); todas las consultas Eloquent se filtran solas por `tenant_id`. Un usuario nunca ve datos de otro negocio.
- **SuperAdmin:** sin tenant, vive en `/admin`, no puede entrar a rutas de negocio (se le redirige).
- **Negocio suspendido, con prueba vencida o borrado (archivado):** sus usuarios reciben 403 (excepto logout).
- **Códigos por negocio:** dos negocios pueden tener el mismo código de producto, documento de cliente, etc. (uniques compuestos por tenant). El **email de usuario sigue siendo único global** (identidad de login).

---

## Checklist rápido

- [ ] Backup de producción creado
- [ ] PR #8 mergeado
- [ ] Deploy verde en Railway
- [ ] Verificación Paso 4 OK (Tenants: 1, sin nulos)
- [ ] SuperAdmin promovido (tenancy:promote-super-admin)
- [ ] Login negocio existente OK
- [ ] Login SuperAdmin → `/admin/tenants` OK
