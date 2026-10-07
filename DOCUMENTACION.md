# Documentación de Stokity

Los planes, auditorías, investigación, docs técnicos y manuales **no viven en este repo**. Están en un vault de Obsidian:

```
/Users/juanjsc/Documents/Obsidian Vault/Stokity/
```

Punto de entrada: `Índice.md` (lista y describe todos los documentos).

| Carpeta | Contenido |
|---|---|
| `Planes/` | `PLAN.md` (estado general), multitenancy, roles y permisos, API e-commerce, storefront |
| `Auditorías/` | Diagnóstico completo (UI/UX, performance, seguridad, arquitectura, testing) y `SEGUIMIENTO.md` (tracker activo) |
| `Investigación/` | Notas de librerías evaluadas (bencho, uiarc) |
| `Técnico/` | Reverb, polling, claves qztray, rollback RBAC |
| `Manuales/` | Manual de usuario |
| `Decisiones/` | Decisiones de arquitectura |

## Cómo acceder (modelos y agentes)

- Con el MCP `obsidian-vault` (configurado en `.mcp.json`): lee `Stokity/Índice.md` y sigue los enlaces.
- Sin MCP: lee los archivos directamente en la ruta de arriba.
- Los comentarios del código que mencionan `ROLES_PERMISSIONS_PLAN.md`, `ECOMMERCE_API_PLAN.md`, etc. se refieren a archivos de `Planes/`.

## Reglas

- No crear planes, auditorías ni notas de investigación dentro del repo; van al vault.
- En el repo solo se quedan `README.md`, `CLAUDE.md` y este archivo.
