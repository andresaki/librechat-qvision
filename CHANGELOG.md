# Changelog de configuración

<!-- Formato: ## YYYY-MM-DD — qué se hizo -->

## 2026-10-06 — Ticket Infra para producción (Entra ID)

- Nuevo `docs/05-Pase-a-Produccion-Ticket-Infra-Entra-ID.md`: pasos de App registration,
  Redirect URIs (chat + admin panel), `Expose an API` (`access_as_user`), permisos Graph + admin
  consent, verificación de grupos/usuarios ya creados, tabla de datos de retorno y criterios de
  aceptación. Listo para pegar en el ticket. Sin cambios de código.
- 2026-10-06 (ampliación): convivencia `localhost` + dominio prod (hasta 256 Redirect URIs),
  detalle de expiración del secret (máx. 24 meses, error AADSTS7000222 al vencer) y acceso para toda
  la empresa (`Assignment required = No`, sin `OPENID_REQUIRED_ROLE`).
- 2026-10-06 (diseño): `docs/06-Diseno-Roles-Balance-Dinamicos.md` — rol y balance dinámicos por
  grupo: opción A nativa (App Roles + `OPENID_ROLE_SYNC_*`, sin código) vs opción B fork acotado
  (seam en `oauth.js:79`, lógica en `packages/api`). **EN PAUSA, no implementar:** pendiente de
  confirmar si las cuotas viven en LibreChat o en el AI Gateway. Alcance vigente: autenticación + personalización.
- 2026-10-06 (plan): `docs/07-Quinn-Branding-MCP-Marketplace-Plan.md` — app se llamará Quinn
  (`quinn-brand-kit/`): branding A1 sin código (APP_TITLE, logo, favicon, footer) → marketplace de
  MCPs `/mcp` (fork client espejo de Skills) → branding A2 fork CSS. Sin implementar.
- 2026-10-06 (Quinn A1 implementado; A2 no): branding sin código (`APP_TITLE=Quinn`,
  `CUSTOM_FOOTER`, logo/favicon/manifest Quinn, `index.html` navy).
  Ver `docs/07`. Pendiente: rebuild imagen cliente + smoke visual. Fix lateral vigente:
  import `SkillState` faltante en `SkillsView.tsx` del fork previo (dejaba `tsc` en rojo).
- 2026-10-06 (Quinn títulos): Agentes/Skills/Insights usaban `| LibreChat` fijo en la pestaña;
  ahora usan `startupConfig.appTitle` (fallback `Quinn`). Requiere rebuild de imagen.
- 2026-10-06 (revert `/mcp`): el marketplace de MCPs resultó innecesario — la lista del builder
  ya publica automáticamente lo compartido (ACL por usuario en servidor). Eliminados vista, ruta,
  sidebar, botón, i18n y specs; `tsc` + vecinos en verde. Detalle en `docs/07`.
- 2026-10-06 (prompts consumidor): auto-refresh de la lista (stale 30s + refetch foco/montaje,
  paridad MCP), se oculta "Mis prompts" sin `PROMPTS.CREATE`, mensaje vacío condicional
  (`com_ui_no_prompts_shared_hint`, solo `en`). Specs 5/5 + `tsc` en verde. Requiere rebuild.
- 2026-10-07 (sidebar Quinn): compartibles primero (skills, prompts, MCPs) + divisor hacia
  personales (marcadores, memorias, adjuntos); helper aislado `navGroups.ts`, spec + vecinos
  en verde. No configurable por yaml. Requiere rebuild.
- 2026-10-07 (paleta Quinn A2): remap de vars semánticas a tokens `--quinn-*` en light y dark
  + Lato; sin tocar componentes ni high-contrast. Requiere rebuild + auditoría visual
  (contraste ámbar y header documentados en `docs/07`).
- 2026-10-07 (temas alto contraste off): fuera del selector (login y configuración); motor y
  contraste del SO intactos. Spec actualizado. Requiere rebuild.
- 2026-10-07 (roadmap): `docs/08-Roadmap-Produccion-Quinn.md` — qué está listo, qué espera
  SSO/gateway/decisiones, y guion de smoke reutilizable.
- 2026-10-07 (roadmap): sección 6 en `docs/08` — contenido anticipado (staging local +
  recreación en prod; roles, skills, agentes, prompts, MCPs).
- 2026-10-07 (runCode off global): `interface.runCode: false` en `librechat.yaml` — el arranque
  escribe `RUN_CODE.USE=false` en USER y ADMIN (verificado en log; Creador/Consumidor ya estaban
  en OFF desde el panel y el yaml no los toca). Solo restart de `api`, sin rebuild.
- 2026-10-08 (multiConvo off global): `interface.multiConvo: false` (mismo patrón; verificado en
  log para USER/ADMIN; Creador/Consumidor se apagan en el panel). Solo restart, sin rebuild.

## 2026-09-25 — Marketplace de Skills (fork frontend)

- `/skills` muestra grid + búsqueda (`?q=`) al estilo del marketplace de agentes; permiso `SKILLS.USE`, crear con `SKILLS.CREATE`.
- Documentación: `docs/04-Marketplace-Skills-Analisis-Implementacion.md`.

## 2026-09-23 — Gateway, RAG y Code Interpreter (pruebas de UI)

### AI Gateway (`endpoints.custom`)
Chat en la UI con **AI-Gateway-QVision** / `qvision-sim`: el mensaje sale al contenedor `ai-gateway-qvision`, no a OpenAI ni Anthropic. El patrón de la sección 10 queda cubierto.

### RAG / File Search
Índice: `rag_api` recibió `POST /text` HTTP 200 al subir `lab/qvision-conocimiento.txt`.

- **Claude Opus 5**: respondió con código **QV-ARCHIVO-4817**, responsable **Marina Soler**, ubicación **piso 3, sala B**, vigencia **15 de marzo de 2027**.
- **GPT-5 y GPT-4o**: 400 `Invalid file data` / MIME `text/plain`. Chat Completions de OpenAI solo acepta PDF como parte `file`; LibreChat envió el `.txt` como `file_data`.

Ajuste en `librechat.yaml` (`fileConfig.defaultLLMDeliveryPath`): `text/plain` y `text/markdown` van como **texto** en el mensaje, no como archivo nativo. Hace falta **chat nuevo y volver a subir** el `.txt` (el archivo viejo ya quedó con destino `provider`). Claude no necesita ese reintento.

### Code Interpreter
No se persigue en este laboratorio. **Run Code** en la UI: «Se produjo un error al ejecutar el código». No hay servicio sandbox en este Compose. Ver `BRECHAS.md`.

## 2026-09-23 — Endpoint custom AI-Gateway-QVision (simulado)

Patrón de la sección 10 de `docs/02`: `endpoints.custom` en `librechat.yaml` con `baseURL` interno `http://ai-gateway:4000/v1`. No llama a OpenAI ni Anthropic.

- Servicio Compose `ai-gateway` (`python:3.12-alpine` + `ai-gateway/server.py`).
- Clave en `.env` como `GATEWAY_API_KEY` (gitignored); el yaml usa `${GATEWAY_API_KEY}`.
- Modelo listado: `qvision-sim`.
- Evidencia desde el contenedor `LibreChat`: `POST /v1/chat/completions` (stream) HTTP 200. El cuerpo incluye el prefijo `[AI-Gateway-QVision]`.
- Confirmado también en la UI.

## 2026-09-23 — Balance de tokens (una sola bolsa)

Se montó `librechat.yaml` en la API (`docker-compose.override.yml`) con:

```yaml
version: 1.3.16
balance:
  enabled: true
  startBalance: 20000
  autoRefillEnabled: false
```

Prueba con `rh@ad102131outlook.onmicrosoft.com` (rol Consumidor): un chat `gpt-3.5-turbo` y otro `claude-sonnet-4-5-20250929`, ambos con "hola".

En Mongo hay **un** documento de `balances` para esa cuenta. Tras las dos respuestas quedó en **14066.5** créditos (partió de 20000). Las transacciones de OpenAI y Anthropic descuentan del mismo `tokenCredits`; no hay saldo por proveedor.

## 2026-09-24 — Fix de sincronía de grupos vía Graph (OBO) — resuelto, y prueba de ACL por grupo confirmada

Se agregó en Azure Portal, App registration: **Expose an API** con el Application ID URI (`api://87c90a81-.../access_as_user`), scope delegado `access_as_user` habilitado, el mismo Client ID autorizado en *Authorized client applications*, y `Grant admin consent` (posible porque en el tenant sandbox soy admin). Se agregó el scope a `OPENID_SCOPE` en `.env` y se reinició el contenedor `LibreChat`.

Login nuevo de `dev1@ad102131outlook.onmicrosoft.com` (2026-09-24 14:09):

```
[PermissionService.syncUserEntraGroupMemberships] Syncing 1 groups for user 6ab40d04a742687e33232f77
[PermissionService.syncUserEntraGroupMemberships] Successfully synced groups for user 6ab40d04a742687e33232f77
```

Ya no aparece el error `exchangeTokenForGraphAccess` / *server responded with an error in the response body* que estaba en `BRECHAS.md`. El intercambio on-behalf-of con Graph queda cerrado.

**Nota de alcance:** esto sincroniza grupos para ACL (con quién se comparte un recurso), no asigna el rol Creador/Consumidor automáticamente por pertenecer a un grupo. La asignación de rol sigue siendo manual desde el Admin Panel (ver entrada de Roles más arriba). No se confirmó si existe un mapeo automático grupo→rol para roles personalizados; queda anotado en `BRECHAS.md`.

### Prueba de ACL por grupo — confirmada de punta a punta

Con la cuenta `Creador`, se creó un MCP de prueba y se probó en sus 4 formas de compartir:

| Compartido como | Con quién | Resultado en el marketplace de `dev1` (miembro del grupo sincronizado) |
|---|---|---|
| Privado | Nadie | No aparece para ningún otro usuario, solo para el creador. |
| Grupo | El grupo de Entra ID sincronizado (el mismo al que pertenece `dev1`) | Aparece automáticamente en el marketplace de `dev1`, sin agregarlo manualmente. Confirma que la sincronía de grupos (arriba) alimenta el ACL en la práctica, no solo en el log. |
| Personas específicas | Un usuario puntual (sin usar el grupo) | Solo el usuario elegido lo ve; otros miembros del mismo grupo NO lo ven, aunque compartan grupo con esa persona. |
| Público | Toda la instancia (requiere `SHARE_PUBLIC`, solo disponible en rol `Creador`, no en `Consumidor`) | Visible para cualquier usuario autenticado, incluidos quienes no pertenecen a ningún grupo relacionado. |

Esto cierra la validación del requisito 6.1/6.3 de `docs/01-Requisitos-LibreChat-QVision.md`: la visibilidad privado/grupo/persona-específica/público funciona como se esperaba. No se probó agregar a alguien nuevo al grupo en Entra ID y verificar que lo hereda sin reloguearse dos veces; queda como prueba adicional si hay tiempo.


Hecho desde el panel (`http://localhost:3000/access`), no desde `librechat.yaml`. El bloque `interface` del yaml solo inicializa el rol de sistema `USER`; no declara roles personalizados.

Cuentas con acceso al panel (hace falta `ADMIN`):

- `ad102131@outlook.com` quedó en `ADMIN`. El login OpenID no promueve a la primera cuenta; ver `BRECHAS.md`.
- Cuenta local `admin.lab@qvision.local` (rol `ADMIN`) para entrar con email y contraseña. La contraseña no se versiona.

Roles creados y leídos de vuelta en Mongo (`roles`):

| Rol | Crear Agentes / MCP / Skills | Usar + Marketplace | Compartir con equipo | Publicar a toda la instancia |
|---|---|---|---|---|
| Creador | sí | sí | sí (`SHARE`) | no (`SHARE_PUBLIC` apagado) |
| Consumidor | no | sí | no | no |

Ambos pueden chatear (bookmarks, multi-conversación, chat temporal, run code, web search, file search, memorias) y ver usuarios, grupos y roles en el people picker. Prompts: solo usar. Remote agents y shared links: apagados.

### Cómo repetirlo en la demo

1. Abrir `http://localhost:3000` e iniciar sesión como `ADMIN` (SSO con la cuenta promovida, o email/contraseña de `admin.lab@qvision.local`).
2. Barra izquierda → **Access** → pestaña **Roles**.
3. **Create role** (a la derecha del buscador; si no se ve, ensanchar la ventana).
4. **Details**: nombre `Creador` y la descripción de que puede crear y compartir con su equipo, sin publicar a toda la organización.
5. **Permissions** y activar, sin usar "Select all" en Agentes/MCP/Skills (eso enciende también *Share publicly*):
   - **Agents**: Use, Create, Share. Dejar *Share publicly* apagado.
   - **MCP servers**: Use, Create, Share. Dejar *Share publicly* y *Configure on-behalf-of* apagados.
   - **Skills**: Use, Create, Share. Dejar *Share publicly* apagado.
   - **Prompts**: solo Use.
   - **Memories**: Select all.
   - **People picker**: Select all.
   - **Marketplace**, Bookmarks, Multi conversation, Temporary chat, Run code, Web search, File search, File citations: encendidos.
6. **Create role**.
7. Repetir para `Consumidor` con la misma base, pero en Agents, MCP servers, Skills y Prompts dejar **solo Use** (Create, Share y Share publicly apagados). Marketplace encendido.
8. Para que un usuario deje de poder crear, abrir el rol → **Members** → buscarlo y añadirlo. Eso **reemplaza** su rol actual (`USER` o `ADMIN`). El rol `USER` de sistema sigue pudiendo crear agentes y skills hasta que se le asigne `Consumidor`.

## 2026-09-23 — Despliegue local Docker Compose (Mongo + RAG API)

- Se creó/completó `.env` local (gitignored) a partir de `.env.example`: secretos `CREDS_*`, `JWT_*`, `MEILI_MASTER_KEY`, `ADMIN_PANEL_SESSION_SECRET`; `ADMIN_PANEL_URL=http://localhost:3000`; `UID=0` / `GID=0` para Docker Desktop en Windows.
- Se creó `docker-compose.override.yml` (gitignored) con `user: "0:0"` en `api`, `mongodb` y `meilisearch`. **No se montó `librechat.yaml`.**
- Stack levantado con `docker compose up -d`. Contenedores en ejecución: `LibreChat` (api), `chat-mongodb`, `rag_api`, `vectordb`, `chat-meilisearch`, `admin-panel`.
- Verificación:
  - `GET http://localhost:3080/health` → `OK`
  - Logs API: `Connected to MongoDB` y `RAG API is running and reachable at http://rag_api:8000`
  - RAG interno `GET http://127.0.0.1:8000/health` → `{"status":"UP"}`
  - Mongo `db.runCommand({ ping: 1 })` → `{ ok: 1 }`
  - UI: `http://localhost:3080/login` (página "Welcome back" / registro local)
  - Admin panel: `http://localhost:3000/` → HTTP 200, contenedor `healthy`