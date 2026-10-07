# Seguimiento de la auditoría — Stokity v2

> Documento vivo para retomar el trabajo en otra sesión. Leer primero esto, luego `00-DIAGNOSTICO-COMPLETO.md` (plan maestro, IDs `C-nn`) y, si hace falta detalle, los informes `01`–`05`.
> **Última actualización:** 2026-10-07 · **Base auditada:** `master` @ `4cf28d9`
> **No subir `reports/audit/` a un repo público:** describe cómo explotar vulnerabilidades que todavía no están corregidas. Decisión pendiente: commitear o `.gitignore`.

## Reglas de trabajo acordadas

1. **Un PR pequeño por tema, en su propia rama.** Nada entra a `master` sin visto bueno explícito del usuario: **push a `master` = deploy a producción** (Railway, sin staging).
2. **Verificar que cada cambio sea real y correcto** (pedido explícito del usuario):
   - Reproducir el problema o confirmarlo leyendo el código antes de arreglarlo.
   - Correr la suite **en un checkout limpio** (`git worktree add`, `composer install`, `cp .env.example .env`, `key:generate`), no solo en la carpeta de trabajo. Un `.env` local oculta fallos que el CI sí verá.
   - Cada fix lleva un test que **falla antes y pasa después**.
   - Antes de dar algo por hecho, comprobar el resultado con un comando, no suponerlo.
3. **No leer ni imprimir secretos.** El clasificador bloquea leer variables de producción de Railway (`railway variables`); esas comprobaciones las hace el usuario.
4. Tras añadir permisos al catálogo: `roles:seed-defaults` en **local y producción**.
5. Cambios de impresión se validan con la impresora física (POS-5890U-L, 58 mm).
6. Comandos de comprobación de calidad (los mismos del CI): `./vendor/bin/pint --test` · `composer analyse` · `npm run types` · `npm test` · `./vendor/bin/pest`.

## Estado de los PRs

| # | PR / rama | Ítems | Estado | Notas |
|---|---|---|---|---|
| 1 | `ci/run-on-master` (`f848d44`) | C-01 | **Hecho en local, sin push** | Falta probarlo en GitHub Actions real y activar bloqueo (ver Pendientes) |
| 2 | Dinero duplicado | C-06 (UX-01, G2, G3, G5) | Siguiente | Doble F9 sin `submitting`; locks en `CreditPaymentService::register()`, `SaleController::completePending()` y `ProductController::updateStock()` |
| 3 | Aislamiento entre tenants | C-03, C-07 | Pendiente | `exists:` sin tenant (36 reglas; `SaleController.php:122-124` y `:745-747`), JOINs en `ReportQueryService.php:203,497`, `BlobStorageService::delete()` |
| 4 | Quick wins | C-10, C-15 parcial, C-12, C-09 | Pendiente | N+1 de `Product::image_url` (`Product.php:245`), healthcheck `/up`, usuarios desactivados, cierre ciego real |
| 5 | Permisos en servidor | C-04, C-11 | Pendiente, **riesgo medio** | `can:` en rutas; antes revisar roles reales en producción y compartir `flash.error` para que los 403 se vean |
| 6 | Sentry | C-08 | Pendiente | Mejor antes del PR 7 |
| 7 | Precios en servidor | C-05 | Pendiente, **riesgo alto** | Tests exhaustivos: precio variable, descuentos, cotizaciones, créditos |

Después: Sprint 1 y siguientes del plan maestro (ver `00-DIAGNOSTICO-COMPLETO.md`, sección "Timeline por fases").

## Pendientes del usuario (no los puedo hacer yo)

- [ ] **Comparar `APP_KEY` de Railway con la de `.env.example`.** Deben ser distintas. Si coinciden: rotar con `APP_PREVIOUS_KEYS`, vaciar el valor del ejemplo y avisar (C-02). La `APP_KEY` de `.env.example` es hoy idéntica a la del `.env` local.
- [ ] Hacer push de `ci/run-on-master` a GitHub y confirmar que los workflows corren en verde.
- [ ] Activar que el despliegue espere al CI ("Wait for CI" en Railway o protección de rama en GitHub). Sin esto el CI avisa pero no bloquea.
- [ ] Decidir qué hacer con `reports/audit/` (commit vs `.gitignore`).
- [ ] Consulta de solo lectura en producción para ver si ya hay referencias cruzadas entre tenants (la usa el PR 3).

## Deuda detectada durante el trabajo (no urgente)

- `prettier --check` falla en 42 archivos de `resources/`; `eslint` tiene 4 errores (`credits/show.tsx`: `paymentMethods`, `flash`, `idx` sin usar; `admin/tenants/show.tsx:207`). Por eso en el CI están como informativos (`continue-on-error`). Cuando se limpien, quitar `continue-on-error` en `lint.yml`.
- `composer install` en checkout limpio avisa: "The lock file is not up to date with the latest changes in composer.json". Revisar con `composer update --lock` (sin tocar versiones) y confirmar.
- Dos workflows nuevos asumen PHP 8.4 y Node 22; localmente hay PHP 8.3.33 y Node 18. Si el CI falla por versión, es lo primero a mirar.
- `PessimisticLockTest` es secuencial y no ejercita código de la app: da falsa confianza. La suite corre en SQLite y producción es MySQL 9.6, así que los tests de concurrencia reales necesitan MySQL en CI (C-20).

## Lecciones aprendidas (para no repetir)

- **En macOS `sed -i` necesita `-i ''`**: un `sed` fallido no aplicó el cambio y la verificación posterior pareció verde. Usar la herramienta Edit y comprobar el diff.
- 34 tests dependían del `BLOB_READ_WRITE_TOKEN` real del `.env` local. `phpunit.xml` ahora define un token falso (`test-token-not-real`).
- Los informes de los agentes son análisis estático: **verificar cada hallazgo en el código antes de actuar**. Ya confirmados por el coordinador: CI sin disparar en `master`, `APP_KEY` igual en ejemplo y local, rutas de ventas sin `can:`, `exists:` sin tenant, borrado de Blob por `str_contains`.
- Prioridades del plan maestro difieren de algunos informes fuente (UX-04, UX-05, B1 bajan a Alta; VC-04 sube a Crítica); explicado en el plan maestro.

## Cómo retomar

1. `git status` y `git branch --show-current`; `git log --oneline -5`.
2. Leer este archivo y la fila del PR que toca en `00-DIAGNOSTICO-COMPLETO.md`.
3. Crear rama desde `master`, reproducir el problema, escribir el test que falla, arreglar, correr los 5 comandos de calidad en un checkout limpio.
4. Commit en la rama, actualizar la tabla de arriba, **no hacer push a `master` sin confirmación**.
