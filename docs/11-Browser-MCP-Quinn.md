# Browser MCP en Quinn (lab y producción)

**Fecha:** 2026-10-13. Servicio: `./browser_mcp` (MCP Streamable HTTP, Playwright/Chromium).

Sustituye la tool nativa `webSearch` (apagada: no hay Serper/Tavily/SearXNG). El modelo navega y extrae páginas con las tools MCP (`browser_session_create` → `browser_navigate` → `browser_observe`, etc.).

## Qué quedó cableado

| Pieza | Dónde |
|---|---|
| Contenedor | `docker-compose.override.yml` → servicio `browser-mcp` (`http://browser-mcp:8932/mcp`) |
| Allowlist SSRF | `librechat.yaml` → `mcpSettings.allowedAddresses: ['browser-mcp:8932']` |
| Registro | `librechat.yaml` → `mcpServers.browser` (`startup: true`, `chatMenu: true`) |
| Chat nuevo | sin spec por defecto; el MCP Browser se marca en el desplegable |
| Pin UI | `interface.defaultPinnedTools: [mcp, browser]` |

`webSearch: false` se mantiene. Esto no es un proveedor de búsqueda: es un navegador.

## Cómo se usa

- **Chat normal:** un chat nuevo no activa Browser solo. Hay que marcarlo en el desplegable MCP.
- **Agentes guardados:** el yaml **no** inyecta tools en agentes ya creados. En el builder hay que añadir el servidor **Browser**. Los agentes nuevos tampoco lo heredan solos.
- Rebuild: `docker compose up -d --build browser-mcp` y reiniciar `api` para recargar `librechat.yaml` (el yaml está montado; un restart de `api` basta si el MCP ya está healthy).

## Límites del laboratorio

- Windows / Docker Desktop: Chromium headless en contenedor (`shm_size: 1gb`). No es el sandbox de Code Interpreter.
- Sesiones del browser son memoria del proceso MCP: un restart pierde cookies/tabs.
- `MAX_SESSIONS` default 10. Ajustar en el servicio Compose si hay concurrencia real.

## Fix 2026-10-13 — BROWSER_NOT_AVAILABLE (Chromium no arrancaba)

Síntoma: `browser_session_create` → `BROWSER_NOT_AVAILABLE: "Chromium could not be launched"`, con el MCP healthy (0 sesiones, 1 error).

Causa: `package.json` pedía `playwright ^1.56.0` y el `Dockerfile` solo copiaba `package.json` (sin lockfile), así que el build instalaba 1.64 mientras la imagen base `mcr.microsoft.com/playwright:v1.63.0-noble` trae los browsers de 1.63. Playwright busca el Chromium de su versión exacta y no lo encontraba.

Fix (`browser_mcp/`): `playwright` pinnado a `1.63.0` exacto; `Dockerfile` copia `package-lock.json` y usa `npm ci` en ambas stages. Regla: la versión npm y el tag de la imagen base siempre iguales y exactos.

Validación: `tsc --noEmit` limpio, `jest` 6 suites / 64 tests en verde, `docker compose build + up -d browser-mcp`, probe in-container (`scripts/probe.js`): 2× `session_create` + `navigate https://example.com` → `Example Domain`, `total_errors: 0`.

## Producción

- Misma receta: servicio HTTP en red interna + `allowedAddresses` + `mcpServers` en yaml.
- El publish del compose es `127.0.0.1:8932:8932` (debug en el host). Quinn entra por `http://browser-mcp:8932` en la red de Compose. No abrir 8932 al exterior.
- Allowlist `ALLOWED_DOMAINS` si el scraping debe acotarse a dominios corporativos.
- Recrear en el tenant prod el spec y, en cada agente de negocio, el tool Browser.
- No copiar el MCP como stdio dentro del contenedor LibreChat: el transporte correcto es Streamable HTTP entre servicios.
