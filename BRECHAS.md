# Brechas / pendientes (no se logró por configuración, o quedó sin confirmar)

<!-- Formato: ## Punto — qué se intentó — por qué no se logró / qué falta confirmar -->

## Asignación automática de roles por OpenID (Requiere cambio en backend): 

LibreChat no permite setear por configuración (ni en .env ni en librechat.yaml) un rol por defecto diferente de USER para los usuarios autenticados mediante SSO/OpenID. Para que los usuarios autenticados por Entra ID hereden automáticamente un rol específico al iniciar sesión (por ejemplo, Consumidor en lugar de USER), sería necesario modificar la estrategia de autenticación en el backend de Node.js. Actualmente la alternativa nativa es la asignación manual posterior desde el Admin Panel.


## Sincronía de grupos (Graph OBO) resuelta — pero grupo≠rol, sigue sin confirmar
 
El fix de "Expose an API" (`access_as_user`, ver `CHANGELOG.md` 2026-09-24) cerró el error de intercambio on-behalf-of; ahora los grupos de Entra ID sí se sincronizan y alimentan el ACL (compartir por grupo funciona, confirmado con prueba de las 4 visibilidades). Lo que sigue sin confirmar: si existe algún mecanismo nativo para que, al pertenecer a un grupo de Entra ID específico, a un usuario se le asigne automáticamente un **rol personalizado** (Creador/Consumidor) en vez de tener que hacerlo a mano desde el Admin Panel → Members. No se encontró esa opción en el panel durante este laboratorio; se documenta como pendiente de confirmar en la documentación oficial o en una versión futura, no como algo intentado y fallido.

## Nota de metodología — SSO / sincronía de grupos
Validado contra un tenant de Microsoft 365 Developer Program (sandbox propio,
no el tenant de producción @qvision.us), porque el consentimiento de admin
en el tenant real de Q-Vision requiere aprobación de Infra (tiempo estimado
del ticket: 3+ días, fuera del plazo del laboratorio).
Resultado: el mecanismo técnico (OIDC + Microsoft Graph + sincronía de
grupos) queda validado y funciona. Para producción, el único paso pendiente
es que Infra repita este mismo App registration + consentimiento en el
tenant real — no requiere cambios de configuración adicionales en LibreChat.

## Balance por grupo/departamento — no existe nativamente

El saldo es por usuario (`balances.user` + `tokenCredits`). OpenAI y Anthropic ya descuentan de esa misma bolsa (confirmado con Consumidor el 2026-09-23). No hay campo de grupo en `balances` ni un bloque de `librechat.yaml` para cuota por departamento. Aproximación operativa: fijar a mano el mismo saldo a cada miembro con `add-balance` / `set-balance`.

## 1.1 librechat.yaml no montado — resuelto el 2026-09-23

Quedó montado vía `docker-compose.override.yml` (`./librechat.yaml` → `/app/librechat.yaml`). El archivo exige `version` (p. ej. `1.3.16`); sin eso Zod rechaza el yaml y la API no arranca.

## People picker / Graph — el código ya busca usuarios y grupos — el OBO sigue rechazado por Entra

Tras el login con `offline_access`, el log sigue en `exchangeTokenForGraphAccess` / `getUserEntraGroups`: `server responded with an error in the response body`. Eso ocurre antes de `/groups` o `/users`. Esas búsquedas no piden `photo/$value`; un 404 de foto no las tumba. Cada función ya captura el error, lo deja en el log y devuelve lista vacía.

LibreChat cambia el access token de la app por un token de Graph (flujo on-behalf-of). Entra solo acepta esa aserción si el token de login va dirigido a la propia app. Con el scope actual (`openid profile email offline_access`) el token no tiene esa audiencia. Falta, en la App registration, **Expose an API** con URI `api://87c90a81-d4b6-4a71-a508-8968b9f97d1e`, scope delegado `access_as_user`, el mismo client ID autorizado, consentimiento de admin, y entonces añadir ese scope a `OPENID_SCOPE`. No se toca código. El código AADSTS exacto está en el registro de inicios de sesión de Entra ID.

## Foto de perfil Graph 404 — el log es ruidoso — no tumba la sesión

`resizeIdentityProviderAvatar` en `api/strategies/openidStrategy.js` ya captura el 404 de `https://graph.microsoft.com/v1.0/me/photo/$value` (cuenta sin foto), registra el error y devuelve `''`. El mismo request sigue y escribe `login success`. No hay variable de entorno para omitir esa descarga ni para bajar el log a warning. Silenciarlo exigiría editar la estrategia, fuera del alcance de este laboratorio.

La sesión se cae después, en otro paso: `OpenID refresh returned no refresh token`, porque el scope no pedía `offline_access`. Eso sí se corrige en `.env` (`OPENID_SCOPE`). El fallo de `exchangeTokenForGraphAccess` es el intercambio on-behalf-of con Graph, independiente de la foto; si persiste tras un login nuevo, el código AADSTS está en el log de inicios de sesión de Entra ID, no en este 404.

## Roles personalizados — no salen de librechat.yaml — el panel sí los crea

`interface` en `librechat.yaml` solo siembra los permisos del rol de sistema `USER` al arrancar. No hay bloque para declarar roles con nombre propio (`Creador`, `Consumidor`). Esos dos se crearon en el Admin Panel (`http://localhost:3000/access` → Roles → Create role) y quedaron en la colección `roles`.

## Un usuario, un rol — el panel no acumula roles

La documentación del laboratorio dice que un usuario puede tener varios roles y que los permisos se unen. En esta versión, **Members** escribe un solo campo `user.role`. Añadir a alguien a `Consumidor` le quita `USER` o `ADMIN`. No se puede ser admin y Creador a la vez desde el panel.

## El rol USER sigue pudiendo crear — hasta que se asigne Consumidor

Los defaults de `USER` dejan `AGENTS.CREATE` y `SKILLS.CREATE` en true (y `MARKETPLACE.USE` en false). El rol `Consumidor` corrige eso, pero solo para quien se le asigne. Quien se quede en `USER` sigue viendo el builder.

## OpenID no hace ADMIN a la primera cuenta — el panel queda cerrado

`access:admin` está concedido al rol `ADMIN`. Las dos cuentas OpenID entraron como `USER` (el alta local sí promueve a la primera cuenta; OpenID no, salvo `OPENID_ADMIN_ROLE`). Sin un `ADMIN`, el panel muestra login y luego "Access denied". Se promovió `ad102131@outlook.com` a `ADMIN` en Mongo y se registró `admin.lab@qvision.local` como admin local, porque el SSO del panel pide la contraseña de Microsoft en el navegador y no había sesión.

## Code Interpreter — fuera de alcance de este bloque — error confirmado en UI

El 2026-09-23 **Run Code** devolvió «Se produjo un error al ejecutar el código». El Compose de LibreChat no incluye ClickHouse/code-interpreter. No se monta ese stack en este laboratorio. `RUN_CODE.USE` sigue en los roles; no hay sandbox detrás.

## RAG con GPT-5 / 4o y .txt — Chat Completions solo admite PDF como `file`

Un `.txt` indexado por `rag_api` sí se consulta con Claude Opus 5. Con GPT-5 y GPT-4o OpenAI rechaza `file_data` con MIME `text/plain`. Mitigación de configuración: `fileConfig.defaultLLMDeliveryPath` manda `text/plain` como texto. Un archivo ya subido no cambia de destino; hay que subir de nuevo. PDF nativo seguiría yendo a `provider`.

## Marketplace de Skills en `/skills` — resuelto con cambio en frontend (fork), 2026-09-25

LibreChat upstream lista skills en el **sidebar** pero `/skills` sin id mostraba solo empty state; no hay opción en `librechat.yaml` para activar una “tienda” como `/agents`. Implementación Q-Vision: `client/src/components/Skills/marketplace/*` + cableado en `SkillsView`. Análisis y mantenimiento: `docs/04-Marketplace-Skills-Analisis-Implementacion.md`.

**Sigue en brecha (requisito 4.1 completo):** un único marketplace con tabs Agentes / Skills / MCP / Tools — hoy agentes y skills tienen vistas separadas; MCP/tools siguen en el builder de agentes.

## Schedules de agentes — no arrancó el scheduler — no bloquea este laboratorio todavía

Log del API: el scheduler no arranca sin `USE_REDIS_STREAMS` o `SCHEDULES_SINGLE_PROCESS=true`. Las escrituras de schedules responden 503. Confirmar más adelante si hace falta automatización programada; no afecta login, Mongo ni RAG.

