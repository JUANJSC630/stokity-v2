# Rollback — despliegue RBAC PR-0

> Despliegue del 2 de septiembre de 2026. Cierra huecos de acceso por URL y
> devuelve a encargados/vendedores el acceso a su propia cuenta.
> **No incluye migraciones**: el esquema de la base de datos no cambia, así que
> no hay datos que restaurar. El rollback es solo de código.

## Punto de retorno

| | |
|---|---|
| **Deployment en vivo antes del cambio** | `cd75cd0b-de1a-4481-8662-39062a381179` (SUCCESS, 18/06/2026 17:29) |
| **Commit desplegado antes del cambio** | `0a07f86f9ba34b43bd747cc513f61546a370a5d7` |
| Proyecto / servicio Railway | `stokity` / `stokity` (producción; renombrado desde `Lu Accesorios`/`lu-accesorios` tras la migración a multi-tenant) |
| Dominio | https://stokity-v2-production.up.railway.app |
| Repo conectado | `JUANJSC630/stokity-v2`, rama `master` (auto-deploy en cada push) |
| Start command | `php artisan migrate --force && php artisan serve …` (sin migraciones nuevas: no-op) |

## Opción A — Rollback instantáneo desde Railway (~30 s, recomendado)

Es lo más rápido si algo se ve mal en caliente. No toca el repositorio.

1. Abrir el dashboard: `railway open` (o https://railway.app → proyecto **stokity** → servicio **stokity**).
2. Pestaña **Deployments**.
3. Buscar el deployment `cd75cd0b-de1a-4481-8662-39062a381179` (18/06/2026, commit `0a07f86`).
4. Menú `⋮` → **Redeploy**.

Railway vuelve a levantar exactamente esa imagen. El repositorio queda con el
cambio, así que después hay que decidir si se revierte también en git (opción B)
o si se corrige y se vuelve a desplegar.

## Opción B — Revertir en git (deja repo y producción consistentes)

```bash
cd ~/Herd/stokity-v2
git checkout master
git pull origin master
git revert --no-edit <SHA_DEL_MERGE>     # ver "Commits desplegados" abajo
git push origin master                    # dispara un deploy nuevo con el estado anterior
```

Para revertir solo una parte (por ejemplo, dejar el arreglo de contraseñas pero
soltar el bloqueo de reportes), es más limpio un commit nuevo que edite el
archivo de rutas concreto que un revert completo.

## Verificación después de un rollback

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://stokity-v2-production.up.railway.app/
railway deployment list | head -3
```

Y en la app: iniciar sesión como administrador y abrir `/reports` y `/users`.

## Qué mirar para decidir si hay que revertir

| Síntoma | Probable causa | Acción |
|---|---|---|
| Un administrador no entra a alguna sección | inesperado: el snapshot dio cero cambios para admin | Opción A y avisar |
| Mariana o Kelly ven "No tienes permisos" en una pantalla que sí usaban | gate de más en `reports`/`suppliers`/`stock-movements` | Opción A |
| Error 500 en Configuración | `settings/appearance` con datos de negocio faltantes | Opción A |
| La app no levanta / healthcheck falla | build o arranque | Opción A |

## Qué NO es motivo de rollback

- Que un vendedor no pueda abrir `/reports`, `/suppliers` o `/stock-movements`:
  **es el objetivo del cambio**. Además, hoy no hay ningún vendedor activo.
- Que `/users/relationships/definitive` devuelva un redirect: era un endpoint de
  depuración sin uso en la interfaz.

## Commits desplegados

| Commit | Descripción |
|---|---|
| `77f38be` | fix(rbac): close route-level access gaps and unblock own-account settings |
| `a171b4c` | docs(rollback): este runbook |
| `4ec44b7` | merge a `master` — **es el SHA a revertir en la opción B** |

**Desplegado el 2/09/2026 19:20** como deployment `7be3a662-8964-4a80-a13b-924ca4f9dd70`
(SUCCESS). Log de arranque: `INFO Nothing to migrate.` — confirmado que no hubo
cambios de esquema.
