# Diseño — Rol y balance dinámicos por grupo de Entra ID (fork fase 2)

**Fecha:** 2026-10-06. **Estado: EN PAUSA — no implementar.**
Pendiente de confirmar si el balance/cuotas vive en LibreChat o en el AI Gateway
(si va en el gateway, este diseño queda descartado).
**Alcance vigente:** solo autenticación (docs/05) + personalización (nombre, colores).
**Motiva:** en producción se quiere que al hacer login el usuario herede rol
(Creador/Consumidor) y cuota de tokens según su grupo de Entra ID, sin asignación manual.
**Brecha que cierra:** `BRECHAS.md` ("grupo≠rol", "balance por grupo no existe nativamente").

## Hallazgo previo (verificado en código, no asumir desde docs)

- Existe un role sync genérico nativo: `applyOpenIdRoleSync` en
  `api/strategies/openidStrategy.js:483` + lógica en
  `packages/api/src/auth/openidRoleSync.ts`. Mapea **valores de un claim del token** a roles de
  LibreChat **por coincidencia de nombre** (`selectOpenIdRole`), valida que existan
  (`getLibreChatRolesForOpenIdSync`) y **nunca toca ADMIN** (se salta si `user.role === ADMIN`).
- Consecuencia: con el claim `groups` (Object IDs) **no** mapea a `Creador`/`Consumidor` porque los
  IDs no coinciden con esos nombres. El camino nativo es con **App Roles de Entra** (claim `roles`
  con valores `Creador`/`Consumidor`), no con grupos directos.
- Punto de sincronía de grupos en cada login OAuth: `api/server/controllers/auth/oauth.js:79`
  (`syncUserEntraGroupMemberships`, implementado en `api/server/services/PermissionService.js:503`).
  Este es el seam para cualquier lógica post-login por grupo.
- Balance: un documento por usuario (`balances.user` + `tokenCredits`,
  `packages/data-schemas/src/schema/balance.ts`). Sin campo de grupo. El descuento ocurre en
  `checkBalance` (`api/app/clients/BaseClient.js`, `chatV1.js`, etc.).

## Opción A — Nativa, sin código (probar primero en sandbox)

1. En la App registration → **App roles**: crear `Creador` y `Consumidor`
   (los nombres deben coincidir exactamente con los roles del Admin Panel).
2. Asignar cada rol a los grupos de departamento correspondientes
   (Enterprise app → Users and groups).
3. En `.env`:
   `OPENID_ROLE_SYNC_ENABLED=true`, `OPENID_ROLE_SYNC_SOURCE=id`,
   `OPENID_ROLE_SYNC_CLAIM=roles`, `OPENID_ROLE_SYNC_ROLE_PRIORITY=Creador`,
   `OPENID_ROLE_SYNC_FALLBACK_ROLE=Consumidor` (o `USER`).
4. Requiere claim `roles` en el token (Token configuration si hace falta) y que Infra lo consienta.
5. Limitaciones: un usuario = un rol (gana el primero en prioridad); ADMIN nunca se degrada;
   el balance **no** se puede manejar por aquí.

## Opción B — Fork acotado (si A no alcanza): mapeo grupo→rol y grupo→balance

- **Módulo nuevo en `packages/api`** (p. ej. `src/auth/entraGroupPolicy.ts`): recibe
  `{ groupIds, policy }` (objetos planos, sin Mongoose en la firma) y devuelve
  `{ role?, minBalance? }`. La política llega por configuración (nuevo campo en `configSchema`,
  default = comportamiento actual), no hardcodeada.
- **Cableado mínimo en `/api`**: tras `syncUserEntraGroupMemberships` en `oauth.js:79`, llamar al
  módulo y aplicar `user.role` + ajuste de balance vía los métodos existentes de `data-schemas`
  (`updateBalance`), dentro del mismo request ya cargado (sin lecturas seriales extra).
- **Reglas de negocio propuestas:** prioridad `Creador > Consumidor > fallback`;
  jamás degradar `ADMIN`; balance con semántica **ensure-minimum** (recargar solo si está por debajo
  de la cuota del grupo — un "reset en cada login" equivaldría a créditos infinitos);
  el consumo sigue descontando de la misma bolsa (`tokenCredits`).
- **Riesgo de merge:** medio-bajo; toca `oauth.js` (wiring) + módulo nuevo en `packages/api` con spec
  vecino (`*.spec.ts`) + `npx tsc --noEmit` en workspaces tocados. Conflictos probables con upstream
  solo si `dev` reescribe el callback OAuth o el role sync.
- **Validación:** login con 2 usuarios de grupos distintos → rol y saldo esperados en Mongo
  (`users.role`, `balances.tokenCredits`); quitar a alguien del grupo → en el siguiente login cae al
  fallback sin perder su historial.

## Decisión pendiente

Probar A en sandbox primero (cero código, reversible con variables). Si el claim `roles` no llega o
la granularidad por departamento no alcanza, implementar B.
