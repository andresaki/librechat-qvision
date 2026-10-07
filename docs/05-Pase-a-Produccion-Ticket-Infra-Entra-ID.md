# Pase a producción — Ticket para Infra: App Entra ID, scopes y permisos (LibreChat)

**Fecha:** 2026-10-06
**Estado:** listo para pegar en el ticket de Infra.
**Contexto:** el laboratorio validó el mecanismo en un tenant sandbox (Microsoft 365 Developer Program).
Lo único pendiente para producción es **repetir el App registration + consentimiento en el tenant real
`@qvision.us` / `@qvision.com`**. No requiere cambios de código en LibreChat.
Referencias del lab: `BRECHAS.md` (nota de metodología SSO), `CHANGELOG.md` (2026-09-24 fix OBO),
`docs/02-LibreChat-Opciones-Configuracion.md` §2.

**Lo que ya existe (no pedir de nuevo):** usuarios y grupos por departamento ya creados en el tenant
de producción (Devs, Infra, Marketing, People, RH u equivalentes). Este ticket pide solo la parte de
**App registration + scopes + permisos + datos de retorno**.

---

## 1. Resumen para el ticket (copiar/pegar)

> Para poner LibreChat en producción con SSO corporativo necesitamos, en el **tenant de producción
> de Q-Vision**, un App registration (single-tenant) para LibreChat con sus Redirect URIs de producción,
> client secret, permisos delegados de Graph con admin consent, y el scope `access_as_user` en
> **Expose an API** (sin esto la sincronía de grupos falla). Los usuarios y grupos ya existen; solo
> pedimos verificación de grupos y los datos de retorno de la §4 para configurar `.env`.

| # | Pedido a Infra | Detalle rápido |
|---|----------------|----------------|
| 1 | App registration `LibreChat-QVision-Prod`, single-tenant (solo este directorio) | §2.1 |
| 2 | 2 Redirect URIs Web (chat + admin panel) con el dominio final HTTPS | §2.2 |
| 3 | Habilitar ID tokens (+ Access tokens) | §2.3 |
| 4 | Client secret nuevo + fecha de expiración (entrega por canal seguro) | §2.4 |
| 5 | **Expose an API**: URI `api://<clientId>` + scope delegado `access_as_user` + autorizar el propio client ID + admin consent | §2.5 — **crítico, lo que fallaba en el lab** |
| 6 | API permissions delegadas de Graph + **Grant admin consent**: `User.Read`, `People.Read`, `GroupMember.Read.All`, `User.ReadBasic.All` | §2.6 |
| 7 | (Opcional, solo si se quiere restringir login a un grupo) `Token configuration` → group claim | §2.7 |
| 8 | Enterprise Application: `Assignment required?` según decisión de acceso + informar | §2.8 |
| 9 | Verificar grupos/usuarios ya creados y devolver Object IDs | §3 |
| 10 | Devolver tabla de datos de la §4 (tenant ID, client ID, issuer, secret por canal seguro, etc.) | §4 |

**Decisiones que Infra debe confirmar antes de ejecutar** (si no vienen en el ticket, asumimos lo marcado
con ★):

- ★ Dominio: por ahora se puede salir **solo con `localhost`** (las URIs del lab ya registradas sirven)
  y sumar el dominio final HTTPS después — ambas listas conviven en la misma app (§2.2).
- ★ Single-tenant (recomendado). No usar `common` ni multi-tenant.
- ★ Expiración del secret según política Q-Vision (máx. 24 meses, recomendado < 12; ver §2.4).
- ★ Acceso: **toda la empresa** → `Assignment required = No` y sin `OPENID_REQUIRED_ROLE` (§2.8).

---

## 2. App registration — paso a paso

Todos los pasos son en **Microsoft Entra admin center** sobre el **tenant de producción**.
Ruta base: **Entra ID → App registrations → New registration** (o reusar la app si ya se creó una para el lab
y solo hay que clonarla al tenant prod — preferimos app nueva `LibreChat-QVision-Prod` para no arrastrar
URIs de `localhost`).

### 2.1 Crear la app

1. **Name:** `LibreChat-QVision-Prod`.
2. **Supported account types:** `Accounts in this organizational directory only (Single tenant)`.
3. **Redirect URI:** plataforma **Web**, valor inicial (se completa en §2.2):
   `https://<dominio-prod>/oauth/openid/callback`.
4. Registrar y anotar **Application (client) ID** y **Directory (tenant) ID**.

### 2.2 Redirect URIs (Web) + logout

En **Authentication → Web → Redirect URIs**, registrar las de producción. Las de `localhost` del
laboratorio **pueden quedarse conviviendo en la misma app**: Entra admite hasta 256 Redirect URIs
por app (cuentas corporativas) y permite `http://localhost` explícitamente para desarrollo, así que
no hay que borrar nada para sumar producción. Cada entorno usa la suya propia (la arma LibreChat con
`DOMAIN_SERVER` + `OPENID_CALLBACK_URL`), por eso todas las que se usen deben estar registradas:

1. `https://<dominio-prod>/oauth/openid/callback` — login del chat.
2. `https://<dominio-prod>/api/admin/oauth/openid/callback` — SSO del Admin Panel
   (el panel construye su redirect como `${DOMAIN_SERVER}/api/admin/oauth/openid/callback`).
3. (Transición) se pueden **mantener además** las del laboratorio:
   `http://localhost:3080/oauth/openid/callback` (y la del panel en `localhost:3080` si se usa),
   para seguir validando en local mientras se despliega producción.

Notas:

- Tipo **Web**, no SPA ni Native.
- Si el chat y el panel van en dominios distintos, usar el host de `DOMAIN_SERVER` en ambas.
- **Front-channel logout URL** (opcional pero recomendado si se usa `OPENID_USE_END_SESSION_ENDPOINT=true`):
  `https://<dominio-prod>/` o la URL de logout que indique el equipo app.
- En producción **HTTPS obligatorio**. Cada cambio de dominio/host requiere registrar de nuevo las URIs;
  una URI no registrada da error `redirect_uri mismatch` (se detecta en el log de sign-ins de Entra).

### 2.3 Tokens

En **Authentication → Implicit grant and hybrid flows**:

- ★ Marcar **ID tokens**. (En el lab también estaban marcados **Access tokens**; dejar ambos marcados
  como en el sandbox que funcionó.)

### 2.4 Client secret

En **Certificates & secrets → Client secrets → New client secret**:

1. Descripción: `LibreChat-Prod`.
2. Expiración según política Q-Vision. Al crearlo el portal ofrece 180 / 365 / 730 días o fecha
   personalizada, con **máximo 24 meses** (la opción "nunca expira" ya no existe). Microsoft recomienda
   menos de 12 meses. **Cuando el secret vence, el login muere** con `AADSTS7000222: The provided client
   secret keys are expired` — por eso se pide la fecha de expiración en la respuesta del ticket (§4)
   para agendar la rotación con tiempo.
   - Cómo ver el del sandbox (no quedó registrado en el repo porque los secretos no se versionan):
     **App registrations → (app del lab) → Certificates & secrets → columna Expires**. Sirve como
     referencia para pedir el mismo plazo en producción.
3. **Copiar el Value una sola vez** y entregarlo al equipo app **por canal seguro** (Key Vault / gestor
   de secretos — nunca por el ticket en claro ni en el yaml versionado).
4. Informar la **fecha de expiración** en la respuesta del ticket para agendar rotación
   (el secreto vive en `.env` como `OPENID_CLIENT_SECRET`, no en `librechat.yaml`).

### 2.5 Expose an API — `access_as_user` (CRÍTICO)

**Sin esto, el login funciona pero la sincronía de grupos falla** con
`exchangeTokenForGraphAccess / server responded with an error in the response body` (error OBO visto
en el lab; se cerró el 2026-09-24 agregando exactamente esto). No omitir.

1. Ir a **Expose an API → Set** (Application ID URI): aceptar el default
   `api://<Application-client-ID>` (p. ej. `api://87c90a81-…` en el sandbox; en prod será otro GUID).
2. **Add a scope:**
   - **Scope name:** `access_as_user`
   - **Who can consent:** `Admins and users`
   - **Admin consent display name:** `Access LibreChat as user`
   - **Admin consent description:** `Allows LibreChat to exchange the login token for Microsoft Graph (group sync) on behalf of the user.`
   - **State:** `Enabled`.
3. **Add a client application** (autorizar el propio cliente):
   - **Client ID:** el mismo **Application (client) ID** de esta app.
   - Marcar el scope `access_as_user`.
4. **Grant admin consent** para este scope (botón en Expose an API o en API permissions).

El equipo app añadirá este scope a `OPENID_SCOPE` (ver §5). El token de login queda así dirigido a la
propia app y Entra acepta el intercambio on-behalf-of hacia Graph.

### 2.6 API permissions (Graph) + admin consent

En **API permissions → Add a permission → Microsoft Graph → Delegated permissions**, agregar:

| Permiso delegado | Uso en LibreChat | Requiere admin consent |
|---|---|---|
| `User.Read` | perfil básico + userinfo | Sí (en tenant prod) |
| `People.Read` | people picker (búsqueda de personas) | Sí |
| `GroupMember.Read.All` | leer membresías de grupos | Sí |
| `User.ReadBasic.All` | listar usuarios básicos | Sí |
| `openid`, `profile`, `email`, `offline_access` | vienen del OIDC; `offline_access` es obligatorio para refresh (sin él: `OpenID refresh returned no refresh token`) | — |

Después: **Grant admin consent for Q-Vision** (botón en API permissions). Sin el consentimiento, el login
falla o los grupos llegan vacíos. En el sandbox el consentimiento lo dio el admin del tenant; en prod
requiere aprobación de Infra (en el lab se estimó **3+ días** — pedirlo cuanto antes).

> Nota: `OPENID_GRAPH_SCOPES` (people picker) y `OPENID_SCOPE` (login) son dos listas distintas en
> LibreChat. Los permisos de esta sección cubren ambas; el equipo app las configura en `.env`.

### 2.7 Token configuration (opcional — solo si se restringe por grupo)

**Solo si el ticket pide restringir el login a un grupo concreto** (p. ej. `QVision-AllStaff`).
Si entra todo el tenant, saltar esta sección.

- **Token configuration → Add groups claim:** incluir el claim de grupos en el **ID token**
  (tipo `Security groups` o el que corresponda al diseño de grupos de Q-Vision).
- Avisar al equipo app qué claim y valor usarán en
  `OPENID_REQUIRED_ROLE / OPENID_REQUIRED_ROLE_PARAMETER_PATH=roles / OPENID_REQUIRED_ROLE_TOKEN_KIND=id`.
- Alternativa sin claims: restringir por **Assignment required** (§2.8).

La sincronía de departamentos (Devs/Infra/…) **no** depende de este claim: se hace vía Graph OBO
(§2.5 + §2.6) y se refleja en el siguiente login.

### 2.8 Enterprise Application (acceso)

En **Entra ID → Enterprise apps → (la app creada) → Properties / Users and groups**:

- Decidir **Assignment required?**
  - ★ `No` (default, y lo que corresponde si **es para toda la empresa**): entra cualquier cuenta del
    tenant que se autentique (por defecto las apps están abiertas a todo el tenant; solo hay que
    asegurarse de **no** configurar `OPENID_REQUIRED_ROLE` ni group claim restrictivo en el equipo app).
  - `Yes`: solo entra quien esté asignado en **Users and groups**. Más seguro, pero Infra debe mantener
    las asignaciones (o el grupo `QVision-AllStaff` asignado). Con esta opción el error de un no asignado
    es `AADSTS50105`.
- Informar en la respuesta del ticket qué opción quedó activa.
- Conditional Access / MFA: no requieren configuración especial en LibreChat; se aplican en el login
  de Entra de forma transparente. Si existe una política que bloquee apps nuevas, excluir o permitir
  esta app.

---

## 3. Grupos y usuarios (ya creados — solo verificar y devolver IDs)

No hay que crear nada. Se pide a Infra **verificar y devolver**:

1. **Object ID** de cada grupo de departamento (Devs, Infra, Marketing, People, RH o equivalentes) —
   el equipo app lo usa para validar el ACL y el people picker.
2. Tipo de cada grupo (Security vs Microsoft 365) y que sea **legible por Graph** con los permisos de §2.6.
3. Que las **membresías estén al día** (los cambios se propagan solos al siguiente login; no hay que tocar
   nada en LibreChat).
4. **2–3 UPNs de administradores iniciales** (p. ej. el admin funcional + 1 respaldo) para promoverlos a
   `ADMIN` en el primer arranque (el login OpenID **no** promueve a la primera cuenta a admin por sí solo;
   en el lab se promovió a mano en Mongo — ver `BRECHAS.md`).
5. Confirmar que las cuentas de prueba pueden dar **consentimiento individual** o si todo va por admin
   consent (según política del tenant).

No se piden fotos de perfil: si una cuenta no tiene foto, Graph devuelve 404 y LibreChat lo ignora
(log ruidoso, no tumba la sesión — ver `BRECHAS.md`).

---

## 4. Datos que Infra debe devolver en el ticket (respuesta esperada)

| Dato | Ejemplo / formato | Sensible |
|---|---|---|
| Tenant ID (Directory ID) | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | No |
| Application (client) ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | No |
| Issuer OIDC | `https://login.microsoftonline.com/<TenantID>/v2.0/` | No |
| Application ID URI | `api://<clientId>` | No |
| Scopes confirmados (`access_as_user` + Graph) | lista + captura de admin consent concedido | No |
| Client secret (Value) | **solo por canal seguro, nunca en el ticket** | **Sí** |
| Expiración del secret | `YYYY-MM-DD` | No |
| Redirect URIs registradas | las 2 de §2.2, copiadas exactas | No |
| Object IDs de grupos | `Devs=…, Infra=…` | No |
| UPNs de admins iniciales | `nombre@qvision.us` | No |
| Assignment required | `Yes/No` + a quién se asignó | No |

Con esto el equipo app completa `.env` sin ir y venir.

---

## 5. Lo que hace el equipo app después (no es parte de este ticket)

Para que Infra sepa dónde termina su parte:

- `.env` (nunca versionado): `OPENID_CLIENT_ID`, `OPENID_CLIENT_SECRET` (de Key Vault),
  `OPENID_ISSUER`, `OPENID_SCOPE="openid profile email offline_access api://<clientId>/access_as_user"`,
  `OPENID_CALLBACK_URL=/oauth/openid/callback`, `OPENID_REUSE_TOKENS=true`,
  `USE_ENTRA_ID_FOR_PEOPLE_SEARCH=true`, `OPENID_GRAPH_SCOPES=User.Read,People.Read,GroupMember.Read.All,User.ReadBasic.All`,
  `DOMAIN_SERVER/DOMAIN_CLIENT=https://<dominio-prod>`, `ALLOW_REGISTRATION=false` (solo admin local de respaldo).
- Roles **Creador / Consumidor** y cuotas por usuario desde el Admin Panel (ya definidos en el lab;
  la asignación de rol es manual por usuario — pertenecer a un grupo **no** asigna rol automáticamente).
- DNS/TLS/proxy inverso, backups de Mongo y rotación del secret llegado su vencimiento (con Infra).

---

## 6. Validación (criterios de aceptación del ticket)

1. Admin consent concedido visible en **API permissions** (los 4 permisos en verde) y en **Expose an API**.
2. Login con cuenta `@qvision.us` llega a LibreChat sin `redirect_uri mismatch` ni pantalla de consentimiento repetida.
3. El log de la API **ya no** muestra `exchangeTokenForGraphAccess / server responded with an error…`
   y sí muestra `syncUserEntraGroupMemberships … Successfully synced groups`.
4. El people picker encuentra usuarios y los grupos de §3 por nombre (prueba con 2 usuarios de distintos departamentos).
5. Compartir un recurso con un grupo lo hace visible a sus miembros (prueba privado/grupo/persona/público
   del `CHANGELOG.md` 2026-09-24).

Si (3) falla, el primer lugar donde mirar es el **Sign-in log de Entra ID** (código AADSTS), no el log de LibreChat.

---

## 7. Notas del laboratorio (para evitar repetir errores conocidos)

- **OBO:** el token de login debe ir dirigido a la propia app (`access_as_user` en el scope). Con solo
  `openid profile email offline_access`, Graph rechaza el intercambio.
- **`offline_access`:** obligatorio; sin él no hay refresh token y la sesión se cae tras el login.
- **Foto 404:** ruido en el log, no bloquea.
- **Un usuario = un rol:** asignar `Consumidor` reemplaza `USER`; prever una cuenta por cada perfil de la demo.
- **Primer admin:** el SSO no crea el primer admin solo; promover los UPNs de §3/§4 a mano en el primer arranque
  y mantener 1 cuenta local de respaldo (`ALLOW_REGISTRATION=false` + admin local).
- **Merge/riesgo del fork:** este documento no toca código. Riesgo de rebase con upstream: nulo.
  Validación: revisión del ticket por el equipo app antes de enviarlo a Infra.

---

## 8. Anexo — referencias

- Doc de opciones §2 (SSO + Graph): `docs/02-LibreChat-Opciones-Configuracion.md`.
- Guía oficial Azure/Entra: https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/azure
- Evidencia OBO + ACL por grupo: `CHANGELOG.md` (2026-09-24).
- Limitaciones conocidas (rol único, foto, balance por grupo): `BRECHAS.md`.
- Dimensionamiento prod (100–300 usuarios): `docs/03-Dimensionamiento-Infraestructura-LibreChat.md`.
