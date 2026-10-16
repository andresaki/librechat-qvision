# MCP Microsoft 365 (Softeria) en el laboratorio

**Fecha:** 2026-10-13. Servicio Compose `m365-mcp`. Imagen `ghcr.io/softeria/ms-365-mcp-server:0.165.0`.

Servidor de la comunidad sobre Microsoft Graph (delegado). No es Work IQ ni el MCP de directorio de Entra.

## Qué quedó cableado

| Pieza | Dónde |
|---|---|
| Contenedor | `docker-compose.override.yml` → `m365-mcp` |
| URL interna | `http://m365-mcp:9003/mcp` |
| Probe local | `http://127.0.0.1:9003/mcp` (solo localhost) |
| Allowlist SSRF | `librechat.yaml` → `mcpSettings.allowedAddresses: m365-mcp:9003` |
| App Entra | La misma del login (`OPENID_CLIENT_ID` / `OPENID_CLIENT_SECRET`) |
| Tenant | `MS365_MCP_TENANT_ID` en `.env` |

El preset de arranque es `outlook` (correo, calendario y contactos). La entrada vive en `librechat.yaml` → `mcpServers.outlook`, con `oauth.send_resource_parameter: false`. El Creador no puede guardar ese flag y, si lo hiciera, Entra responde `invalid_target` porque LibreChat manda `resource=http://m365-mcp:9003/mcp`. Una entrada creada en la UI con el mismo nombre tapa a la del yaml: hay que borrarla.

## Qué falta en Entra (misma app)

1. Permisos delegados de Graph, con admin consent: `Mail.ReadWrite`, `Mail.Send`, `MailboxSettings.ReadWrite`, `Calendars.ReadWrite`.
2. Redirect URI adicional: `http://localhost:3080/api/mcp/outlook/oauth/callback` (el slug tiene que coincidir con el nombre de la entrada).
3. No agregar esos scopes a `OPENID_SCOPE`. El login sigue con los de siempre; el correo se pide al conectar el MCP.

SharePoint no entra en este proceso. Hace falta otro contenedor con `--org-mode` y un preset de sitios, más `Sites.Read.All` o `Sites.Selected` y `Files.Read`.

## Entrada

Está en `librechat.yaml` (`mcpServers.outlook`), con `requiresOAuth: true`. Sin ese flag, `startup: false` hace que LibreChat marque el servidor como no-OAuth y un 401 del contenedor cierra la conexión sin abrir el login. El scope no incluye `offline_access`: el SDK de MCP, al verlo, manda `prompt=consent`, y en este tenant un usuario no admin vuelve a la pantalla de aprobación aunque el consentimiento de administrador ya esté en verde. Los permisos de Graph van con prefijo `https://graph.microsoft.com/` porque esta app también expone `access_as_user`; sin el prefijo Entra emite un token para LibreChat y Graph responde 401. El redirect sigue siendo `http://localhost:3080/api/mcp/outlook/oauth/callback`.

Si en MCP Settings aparece un Outlook creado a mano, bórralo: esa ficha tapa la del yaml y vuelve a mandar `resource` a Entra.

Reiniciar `api` después de cambiar el yaml: `docker compose restart api`.

## Producción

El tenant de las URLs de authorize/token sale de `MS365_MCP_TENANT_ID` (el mismo del contenedor). No dejar el GUID del laboratorio en el yaml.

En la app de Entra de **prod** (plataforma Web), además de los redirect del login:

- Redirect: `https://quin.q-vision.co/api/mcp/outlook/oauth/callback`
- Permisos delegados, con admin consent: `Mail.ReadWrite`, `Mail.Send`, `MailboxSettings.ReadWrite`, `Calendars.ReadWrite`
- Esos scopes no se agregan a `OPENID_SCOPE`. El login sigue con `openid profile email offline_access`.

`DOMAIN_SERVER` tiene que ser `https://quin.q-vision.co` sin barra final: LibreChat arma el callback con ese host.
