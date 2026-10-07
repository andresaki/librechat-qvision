# Referencia de Configuración de LibreChat (sin tocar código)

Este documento reúne **todas las piezas de configuración nativas de LibreChat** (v0.8.x) que permiten cumplir el documento de requisitos (`01-Requisitos-LibreChat-QVision.md`). Todo se logra con:

1. Variables de entorno (`.env`)
2. El archivo `librechat.yaml`
3. El **Panel de Administración** (Admin Panel) y diálogos de la UI (share, MCP settings, agent builder)
4. Configuración en Azure Portal (Entra ID) — fuera de LibreChat pero necesaria para el SSO

No requiere editar código fuente en ningún punto.

---

## 1. Instalación local (Docker)

- Repositorio: `github.com/danny-avila/LibreChat`
- Servicios mínimos vía `docker-compose.yml`: `api` (LibreChat), `mongodb`, opcional `meilisearch` (búsqueda), `vectordb` + `rag_api` (RAG sobre documentos propios).
- Archivos clave a personalizar:
  - `.env` (secretos, endpoints, feature flags globales)
  - `librechat.yaml` (configuración declarativa de la app: interfaz, endpoints, agentes, MCP, permisos por defecto)
  - `docker-compose.override.yml` (para montar `librechat.yaml` y personalizaciones sin tocar el compose base)

## 2. Autenticación — Microsoft 365 / Entra ID (OIDC)

Configuración 100% vía `.env`, sin tocar código. Pasos en Azure Portal + variables:

**En Azure Portal (App registration):**
1. Nueva "App registration", tipo *Web*.
2. Redirect URI: `http://localhost:3080/oauth/openid/callback` (local) o `https://<dominio>/oauth/openid/callback` (remoto).
3. Copiar `Application (client) ID` y `Directory (tenant) ID`.
4. En *Authentication*: habilitar Access tokens e ID tokens.
5. En *Certificates & Secrets*: crear un client secret.
6. (Para restringir por grupo/rol) En *Token configuration*: agregar el *group claim*.

**En `.env` de LibreChat:**
```
ALLOW_SOCIAL_LOGIN=true
OPENID_CLIENT_ID=<Application client ID>
OPENID_CLIENT_SECRET=<client secret>
OPENID_ISSUER=https://login.microsoftonline.com/<Tenant ID>/v2.0/
OPENID_SESSION_SECRET=<string aleatorio>
OPENID_SCOPE="openid profile email"
OPENID_CALLBACK_URL=/oauth/openid/callback
OPENID_REQUIRED_ROLE_TOKEN_KIND=id
OPENID_REQUIRED_ROLE_PARAMETER_PATH="roles"
OPENID_REQUIRED_ROLE="QVision-AllStaff"   # restringe a un grupo del tenant
OPENID_USE_END_SESSION_ENDPOINT=true
```
- Para **deshabilitar el registro/login local** y forzar solo Microsoft 365: usar las variables `ALLOW_REGISTRATION=false` (opcional, deja solo el admin de respaldo con cuenta local) y ocultar el formulario local vía `librechat.yaml` (`registration.socialLogins` / interfaz de login).

**Sincronización de grupos y personas (Microsoft Graph) — necesario para que Devs/Infra/Marketing/People/RH lleguen desde Entra ID:**
```
OPENID_REUSE_TOKENS=true                  # obligatorio para lo siguiente
USE_ENTRA_ID_FOR_PEOPLE_SEARCH=true
ENTRA_ID_INCLUDE_OWNERS_AS_MEMBERS=true
OPENID_GRAPH_SCOPES=User.Read,People.Read,GroupMember.Read.All,User.ReadBasic.All
```
- Permisos delegados requeridos en Azure: `User.Read`, `People.Read`, `GroupMember.Read.All`, `User.ReadBasic.All` (requiere consentimiento de administrador de Q-Vision).
- Con esto, el **selector de personas** (people picker) de los diálogos de "compartir" puede buscar usuarios y **grupos reales de Entra ID**, y cada grupo sincronizado guarda su Entra Object ID — los cambios de membresía en el tenant se reflejan solos en el siguiente login.
- Integración opcional con **SharePoint/OneDrive** (adjuntar archivos corporativos respetando permisos de SharePoint): variables `ENABLE_SHAREPOINT_FILEPICKER`, `SHAREPOINT_BASE_URL`, scopes `AllSites.Read` / `Files.Read.All`.

Otras opciones de auth disponibles (no necesarias para este laboratorio pero existen): Google, GitHub, Facebook, Discord, Apple, SAML, LDAP/AD, Auth0, Authelia, Authentik, AWS Cognito, Keycloak.

## 3. Modelo de control de acceso de LibreChat (la pieza central)

LibreChat implementa **tres capas independientes de autorización**, todas configurables sin código:

### Capa 1 — Permisos de función (por rol)
Responde "¿este rol puede crear/usar/compartir X?". Cada rol tiene una matriz **tipo de permiso × acción**:

| Tipo de permiso | Acciones |
|---|---|
| `AGENTS` | `USE`, `CREATE`, `SHARE`, `SHARE_PUBLIC` |
| `PROMPTS` | `USE`, `CREATE`, `SHARE`, `SHARE_PUBLIC` |
| `MCP_SERVERS` | `USE`, `CREATE`, `SHARE`, `SHARE_PUBLIC`, `CONFIGURE_OBO` |
| `SKILLS` | `USE`, `CREATE`, `SHARE`, `SHARE_PUBLIC` |
| `REMOTE_AGENTS` | `USE`, `CREATE`, `SHARE`, `SHARE_PUBLIC` |
| `MARKETPLACE` | `USE` |
| `PEOPLE_PICKER` | `VIEW_USERS`, `VIEW_GROUPS`, `VIEW_ROLES` |
| `MEMORIES`, `BOOKMARKS`, `MULTI_CONVO`, `TEMPORARY_CHAT`, `RUN_CODE`, `WEB_SEARCH`, `FILE_SEARCH`, `FILE_CITATIONS`, `SHARED_LINKS` | según función |

- Roles base: `ADMIN` (primera cuenta creada) y `USER` (por defecto).
- **Roles personalizados** (desde v0.8.5): se crean desde el Panel de Administración, cada uno con su propia matriz. Un usuario puede tener varios roles; sus permisos son la unión de todos.
- **Esto es exactamente lo que resuelve el requisito 5**: crear un rol/perfil "Devs" con `MCP_SERVERS.CREATE=true`, `SKILLS.CREATE=true`, y un rol "RH"/"Marketing" con esas mismas acciones en `false` pero `USE=true` y `MARKETPLACE.USE=true`.
- `SHARE` vs `SHARE_PUBLIC` son permisos distintos: se puede permitir compartir con grupos/usuarios puntuales sin permitir publicar para toda la instancia — resuelve el requisito 5.4.
- **Dónde se configura:**
  - Recomendado: **Panel de Administración** → edita la matriz por rol en caliente (sin redeploy).
  - Alternativa "legacy"/bootstrap: bloque `interface:` en `librechat.yaml`, que inicializa el rol `USER` por defecto al arrancar (útil para dejar la instancia lista desde el primer despliegue).

Ejemplo `librechat.yaml` (bootstrap inicial):
```yaml
interface:
  agents: true
  peoplePicker:
    users: true
    groups: true
    roles: true
  marketplace:
    use: true
  mcpServers:
    use: true
```

- **Anulaciones de configuración por grupo/rol** (v0.8.5): permite asignar una configuración distinta (más endpoints, otro límite de recursión, otras capacidades de agente) a un grupo/rol específico — por ejemplo, dar a "Devs" acceso a modelos/herramientas que "Marketing" no tiene, todo desde el Admin Panel, sin instancias separadas. Resuelve el requisito 3.4/3.5.

### Capa 2 — ACL de recursos (compartir por elemento)
Cada Agente, Prompt, Servidor MCP, Skill y Archivo tiene su propia lista de control de acceso, independiente del rol. Así es como el **dueño** de un recurso decide con quién lo comparte (requisito 6):

- Tipos de recurso con ACL: `agent`, `promptGroup`, `mcpServer`, `remoteAgent`, `file`, `project`.
- **Roles de acceso** (presets) al compartir:
  | Rol | Puede |
  |---|---|
  | **Viewer** | Usar el recurso |
  | **Editor** | Ver y modificar instrucciones/herramientas/archivos |
  | **Owner** | Editar, eliminar y volver a compartir |
- Flujo en la UI: abrir el recurso → botón **Share** → buscar **usuarios, grupos o roles** en el people picker → elegir Viewer/Editor/Owner → opcionalmente activar **acceso público** (requiere el permiso `SHARE_PUBLIC` del rol).
- Compartir con un grupo de 500 personas = **una sola entrada de ACL**; si el grupo viene de Entra ID, los cambios de membresía se autopropagan.
- **Herencia por Proyecto** (`project`): un recurso agregado al "Proyecto Global" queda disponible para todos automáticamente — es la base del concepto de "compartido con toda la organización" sin tener que listar usuarios uno a uno.
- El creador original siempre conserva control total; los `ADMIN` pueden gestionar cualquier recurso de la instancia (requisito 4.5 / 5.5).

### Capa 3 — Concesiones del sistema (delegación de administración)
Tabla de capacidades administrativas que se pueden delegar sin volver `ADMIN` completo a alguien: `access:admin`, `manage:users`, `manage:groups`, `manage:roles`, `manage:configs`, `manage:agents`, `manage:prompts`, `manage:mcpservers`, `read:usage`, etc. Se otorgan/revocan desde el Panel de Administración. Útil, por ejemplo, para dar a un líder de "Devs" permiso de `manage:mcpservers` sin hacerlo admin de toda la plataforma.

### Principales (a quién se le puede otorgar acceso, en cualquiera de las 3 capas)
- **Usuario** individual
- **Grupo** — local o **sincronizado desde Entra ID** (esto es lo que da los "departamentos" Devs/Infra/Marketing/People/RH)
- **Rol** — de sistema o personalizado
- **Público** — todo usuario autenticado de la instancia

### Visibilidad del selector de personas
```yaml
interface:
  peoplePicker:
    users: true
    groups: true
    roles: false   # ocultar compartir-por-rol a usuarios normales si se quiere
```

## 4. Marketplace de Agentes / Skills / MCP / Tools

- LibreChat ya incluye un **Agent Marketplace** nativo: descubrir y usar agentes propios o de otros usuarios de la instancia, con botón para empezar a usarlos ("card" con nombre, descripción, autor, acción).
- Se activa/controla con el permiso de función `MARKETPLACE.USE` (capa 1) y con `interface.marketplace.use: true` en `librechat.yaml` como valor inicial.
- Los **Servidores MCP** creados por usuarios (no solo los de `librechat.yaml`) participan del mismo sistema de ACL y aparecen listables/compartibles igual que los agentes (requisito 4).
- Las **Skills** (paquetes de instrucciones tipo `SKILL.md` reutilizables por los agentes) tienen su propio tipo de permiso (`SKILLS`: `USE/CREATE/SHARE/SHARE_PUBLIC`) y también participan de ACL — se listan/comparten igual.
- **Prompts** (equivalentes a "Tools" reutilizables de texto/plantillas) siguen el mismo patrón (`PROMPTS`).
- Para que el marketplace muestre pestañas por tipo (Agentes, Skills, MCP, Prompts) no hace falta tocar código: es el comportamiento nativo de la UI cuando estas funciones están habilitadas vía `interface:` — el laboratorio debe documentar cómo luce cada pestaña con ejemplos creados (uno por departamento, con distinta visibilidad).

## 5. Agentes (Agent Builder)

- Constructor no-code de agentes personalizados: instrucciones, modelo, herramientas (MCP, Code Interpreter, File Search, Web Search), archivos de conocimiento.
- Se comparten igual que cualquier otro recurso vía Capa 2 (ACL): privado / grupo(s) / público, con Viewer/Editor/Owner.
- Soporta **Sub-agentes** y **Agents API (remote agents)** para flujos multiagente — no es indispensable para el laboratorio pero es un punto de la matriz de comparación frente a Copilot Studio.

## 6. Servidores MCP

- Configuración declarativa en `librechat.yaml` (bloque `mcpServers:`), o desde la UI (panel "MCP Settings", sin editar archivos ni reiniciar).
- Soporta transporte recomendado para producción: **Streamable HTTP** (evitar STDIO/SSE en entornos multiusuario reales).
- Autenticación por servidor: API key propia del usuario (`customUserVars`), o **OAuth 2.0 con PKCE** (cada usuario autentica su propia sesión, tokens aislados por usuario).
- `chatMenu: false` permite que un MCP solo esté disponible dentro de agentes, no en el desplegable de chat libre — útil para MCP internos sensibles (p. ej. MCP de infraestructura solo dentro de agentes de "Infra").
- Placeholders dinámicos disponibles en URL/headers: `{{LIBRECHAT_USER_ID}}`, `{{LIBRECHAT_USER_EMAIL}}`, `{{LIBRECHAT_USER_ROLE}}`, `{{LIBRECHAT_USER_USERNAME}}`, y (con Entra ID) `{{LIBRECHAT_OPENID_*}}` / `{{LIBRECHAT_GRAPH_*}}` — permite que un MCP corporativo sepa quién lo está llamando y aplique lógica por usuario/rol del lado del servidor MCP.
- Comparten el mismo modelo de ACL (privado/grupo/público, Viewer/Editor/Owner) que agentes y prompts.

## 7. Panel de Administración (Admin Panel, desde v0.8.5)

Interfaz web dedicada (sin editar `librechat.yaml` a mano) para:
- Gestionar usuarios y grupos (locales o vistos desde Entra ID).
- Crear/editar roles personalizados y su matriz de permisos.
- Asignar anulaciones de configuración por grupo/rol.
- Otorgar/revocar concesiones del sistema (delegar administración parcial).
- Moderar/gestionar cualquier agente, prompt o MCP publicado en la instancia.

Este panel es la herramienta principal para demostrar en el laboratorio los requisitos 5 y 6 (quién puede crear qué, y con quién se comparte cada cosa) sin tocar código ni archivos.

## 8. RAG sobre conocimiento propio / búsqueda documental (para el caso de uso de la actividad 1)

- Servicio `rag_api` + base vectorial (por defecto, vector store integrado en el stack de Docker de LibreChat).
- Los usuarios (o los agentes) suben documentos; se indexan y quedan disponibles como *File Search* dentro de una conversación o de un agente.
- Se puede restringir qué usuarios/roles tienen `FILE_SEARCH.USE` (capa 1) y compartir un archivo/carpeta de conocimiento con un grupo específico igual que cualquier otro recurso (capa 2) — por ejemplo, una base de conocimiento de "People/RH" visible solo para ese grupo.
- **Code Interpreter API**: ejecución de código en sandbox aislado (Python, Node.js/TS, Go, C/C++, Java, PHP, Rust, Fortran), con manejo de archivos de entrada/salida (subir, procesar, descargar). Es autoalojable (basado en el motor de ClickHouse code-interpreter) y se habilita/restringe con el permiso `RUN_CODE.USE` (capa 1) — este es el punto concreto que responde al requisito 8.3 (validar "ejecución de código").
- **Automatización tipo "Cowork" (requisito 8.5):** LibreChat no tiene un producto separado llamado "Cowork", pero el conjunto Agentes + MCP + Skills + Code Interpreter + File Search es el equivalente funcional: un agente puede encadenar herramientas, ejecutar código y consultar documentos en una sola tarea delegada. La brecha real frente a "Cowork" (Claude) o "Copilot Studio" es la **orquestación multiagente prearmada y la interfaz dedicada de "espacio de trabajo agéntico"** — en LibreChat esto existe como Sub-agentes/Agents API, pero requiere configurarse manualmente agente por agente, no viene como un producto guiado. Documentar esta brecha en la matriz comparativa.

## 9. Gobierno de consumo: presupuesto y cuotas de tokens ("balance")

LibreChat trae un **sistema de balance de créditos de tokens por usuario**, configurable 100% en `librechat.yaml` (reemplaza las antiguas variables `.env` `CHECK_BALANCE`/`START_BALANCE`):

```yaml
balance:
  enabled: true            # activa el control de créditos de tokens
  startBalance: 20000      # tokens que recibe cada usuario nuevo al registrarse
  autoRefillEnabled: true  # recarga automática periódica
  refillIntervalValue: 30
  refillIntervalUnit: "days"
  refillAmount: 10000
```

- Es un balance **por usuario individual**; los administradores pueden además fijar o ajustar el saldo de una persona puntual desde la línea de comandos (`npm run set-balance <email> <tokens>` / `add-balance`), útil para dar distintas cuotas a distintas personas (ej. simular que Devs tiene más presupuesto que Marketing) sin tocar código.
- **No hay, de forma nativa y documentada, un "balance por grupo/departamento" out-of-the-box** (como sí existe para permisos vía Capa 1/ACL) — cada balance se administra por cuenta de usuario. Para aproximar una cuota por departamento (requisito 7.1 del documento de requisitos) hay dos caminos a validar en el laboratorio:
  1. Fijar manualmente el mismo `startBalance`/balance a cada usuario de un grupo (aproximación operativa, no automática).
  2. Explorar si las **anulaciones de configuración por grupo/rol** (v0.8.5, ver sección 3 de este documento) permiten expresar un bloque `balance` distinto por grupo — **pendiente de confirmar en la práctica durante el laboratorio**, ya que la documentación pública no lo detalla explícitamente.
- El consumo se registra por transacción en la colección `Transactions` de MongoDB, y el medidor de contexto/costo en la UI se activa con `interface.contextCost`.
- **Sobre el consumo con varios proveedores simultáneos** (Anthropic + OpenAI, requisito 7.2): el balance de LibreChat es una sola bolsa de "tokens" a nivel de cuenta de usuario, independiente del endpoint/proveedor que se use — es decir, se descuenta del mismo saldo sin importar si la respuesta la generó Anthropic u OpenAI. Esto debe verificarse en el laboratorio generando conversaciones con ambos proveedores y observando el descuento de saldo.

## 10. AI Gateway (enrutar todo el tráfico de LibreChat por un gateway central)

Se logra sin tocar código, usando **endpoints personalizados** (`endpoints.custom`) en `librechat.yaml`, apuntando `baseURL` al gateway en lugar de al proveedor directo. Ejemplo con LiteLLM Proxy (patrón aplicable a cualquier AI Gateway compatible con la API de OpenAI, como Portkey, Kong AI Gateway, etc.):

```yaml
endpoints:
  custom:
    - name: "AI-Gateway-QVision"
      apiKey: "sk-from-config-file"      # clave que espera TU gateway, no la del proveedor
      baseURL: "http://litellm:8000/v1"  # URL interna del gateway
      models:
        default: ["gpt-4o", "claude-3-7-sonnet"]
        fetch: true                       # LibreChat carga la lista real de modelos que expone el gateway
      titleConvo: true
```

- Con esto, **todo** el tráfico de chat/agentes que use ese endpoint pasa primero por el gateway, que es quien centraliza logging, rate-limiting, costeo y políticas de salida (DLP) antes de llegar al proveedor real — exactamente el punto de "gobernanza y seguridad" que pide el comparativo del laboratorio (AI Gateway + DLP del lado LibreChat vs. Purview/Agent 365 del lado Microsoft).
- Se puede dejar además cualquier endpoint nativo (OpenAI, Anthropic, Azure) en paralelo, o eliminarlos para forzar que todo pase por el gateway.

## 11. Flexibilidad de modelos (multi-proveedor)

- `librechat.yaml` permite declarar múltiples `endpoints` simultáneos: OpenAI, Azure OpenAI, Anthropic, AWS Bedrock, Google/Vertex AI, además de *custom endpoints* compatibles con OpenAI (Ollama, Groq, Mistral, OpenRouter, etc.).
- Se puede limitar, por rol/grupo (vía anulaciones de configuración de la capa 1), qué endpoints/modelos ve cada departamento — por ejemplo, que solo "Devs" tenga acceso a un modelo más costoso o a Code Interpreter con ejecución de código.

## 12. Otras opciones de configuración relevantes de `librechat.yaml` / `.env`

| Área | Qué permite configurar |
|---|---|
| `interface` | Mostrar/ocultar: agentes, prompts, marketplace, MCP, web search, code interpreter, bookmarks, multi-conversación, chat temporal, people picker, etc. — todo por defecto para el rol `USER` al iniciar. |
| Branding | `APP_TITLE`, `CUSTOM_FOOTER`, banner personalizado, favicon. |
| Moderación | Sistema de moderación automatizada de contenido (`mod_system`). |
| Registro/telemetría | Integración con Langfuse, métricas, sistema de logging propio. |
| Búsqueda | Meilisearch para búsqueda de conversaciones/mensajes. |
| Enlaces compartibles | Habilitar/deshabilitar compartir conversaciones vía link público (`SHARED_LINKS`). |
| Restablecimiento de contraseña | Solo relevante si se mantiene algún login local (ej. el admin de respaldo). |

## 13. Brechas / lo que LibreChat NO ofrece "de fábrica" (anotar en la matriz comparativa)

- No existe una pantalla llamada literalmente **"Workspace"** por departamento (como Teams/Slack); se **simula** con Grupos + Roles personalizados + anulaciones de configuración + Proyecto Global. Funcionalmente cubre el requisito, pero la experiencia de usuario no tiene una etiqueta "Workspace" visible — punto a documentar como diferencia frente al ecosistema Microsoft (Teams/M365 ya tiene esa noción nativa).
- El **Admin Panel** de gestión de usuarios/roles/grupos es relativamente nuevo (v0.8.5); algunas de estas capacidades antes solo eran editables directamente en MongoDB. Verificar en el laboratorio qué queda cubierto por UI y qué todavía requiere el archivo `librechat.yaml` como bootstrap.
- La integración nativa con Teams/Outlook/M365 (como sí tiene Copilot) no existe; LibreChat se usa como app web independiente (aunque puede conectarse a M365 vía SSO, Graph y SharePoint como fuente de archivos).

## 14. Checklist de configuración para el laboratorio

- [ ] Docker Compose levantado con Mongo + RAG API.
- [ ] App registration en Azure Entra ID + variables `OPENID_*` en `.env`.
- [ ] `OPENID_REUSE_TOKENS` + scopes de Graph configurados (sincronía de grupos).
- [ ] Grupos Devs/Infra/Marketing/People/RH visibles en el people picker.
- [ ] Rol personalizado "Creador" (o similar) con `AGENTS.CREATE`, `MCP_SERVERS.CREATE`, `SKILLS.CREATE` = true, asignado solo a Devs/Infra.
- [ ] Rol "Consumidor" (resto de departamentos) con `*.USE` y `MARKETPLACE.USE` = true, `*.CREATE` = false.
- [ ] Al menos un Agente, un Skill y un servidor MCP creados y probados en los tres estados de visibilidad: privado, por grupo, público.
- [ ] Verificación en el marketplace de que cada card muestra nombre, descripción, autor y botón de acción, y que el filtrado por visibilidad funciona.
- [ ] Un documento cargado a RAG y consultado exitosamente desde el chat.
- [ ] Capturas/evidencia del Admin Panel gestionando roles, grupos y contenido compartido, para el anexo del laboratorio.
- [ ] Un MCP **ya existente en el mercado** (ej. vía Smithery) conectado y consumido sin construirlo desde cero, como flujo alterno al de creación propia.
- [ ] `balance` configurado y probado: verificar consumo de tokens generando mensajes con Anthropic y con OpenAI, y confirmar si descuentan del mismo saldo o de bolsas separadas.
- [ ] Un endpoint `custom` de prueba apuntando a un gateway (real o simulado con LiteLLM) para validar el patrón de "AI Gateway".
- [ ] Prueba de Code Interpreter (ejecución de código simple) documentada.
- [ ] Grabación/capturas de la sesión con 3 usuarios distintos logueados mostrando vistas diferenciadas, para la demo del viernes.
- [ ] Lista explícita de "qué se logró por configuración" vs. "qué requeriría código" (backlog), para el anexo de conclusiones.

## 15. Referencias oficiales usadas para este documento

- Control de acceso: https://www.librechat.ai/es/docs/features/access_control
- Azure Entra ID (SSO + Graph + SharePoint): https://www.librechat.ai/es/docs/configuration/authentication/OAuth2-OIDC/azure
- MCP: https://www.librechat.ai/es/docs/features/mcp
- Agentes: https://www.librechat.ai/es/docs/features/agents
- Skills: https://www.librechat.ai/es/docs/features/skills
- Panel de administración: https://www.librechat.ai/es/docs/features/admin_panel
- `librechat.yaml` / interfaz: https://www.librechat.ai/es/docs/configuration/librechat_yaml/object_structure/interface
- Uso de tokens / Balance: https://www.librechat.ai/es/docs/configuration/token_usage
- LiteLLM como endpoint personalizado (patrón de AI Gateway): https://www.librechat.ai/es/docs/configuration/librechat_yaml/ai_endpoints/litellm
