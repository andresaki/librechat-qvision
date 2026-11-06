---
name: librechat-qvision
description: Contexto y checklist del laboratorio LibreChat vs Microsoft Copilot para Q-Vision. Usar siempre que la tarea sea configurar, revisar o validar LibreChat en este repo (auth con Microsoft 365/Entra ID, grupos por departamento, marketplace de agentes/skills/MCP, permisos, cuotas de tokens, AI Gateway).
---

# Laboratorio LibreChat — Q-Vision

## Contexto
Q-Vision compara LibreChat vs. Microsoft Copilot como asistente de IA organizacional.
Este repo configura una instancia local de LibreChat (Docker) que debe demostrar:
autenticación SSO con Microsoft 365 (`@qvision.us`/`.com`), grupos por departamento
(Devs, Infra, Marketing, People, RH), un marketplace interno de Agentes/Skills/MCP/Tools
con visibilidad privado/grupo/público, permisos de creación restringidos a ciertos roles,
y cuotas de consumo de tokens.

Documentos completos (léelos antes de trabajar): `docs/01-Requisitos-LibreChat-QVision.md`
y `docs/02-LibreChat-Opciones-Configuracion.md`.

## Regla de alcance
**Fase 1 (config) cerrada** — `.env`, `librechat.yaml`, `docker-compose.override.yml`.

**Fase 2 (fork acotado)** — cambios pequeños en código para brechas Q-Vision; ver tabla y reglas
en el bloque inicial de `AGENTS.md`. Preferir `client/`; backend solo si hace falta. Lo que quede
fuera de alcance sigue en `BRECHAS.md`.

## Checklist de validación (marcar cada uno con evidencia, no solo "debería funcionar")
- [ ] Docker Compose levantado (Mongo + RAG API).
- [ ] SSO Azure Entra ID funcionando con cuenta `@qvision.us`/`.com`.
- [ ] Sincronía de grupos de Entra ID (Devs/Infra/Marketing/People/RH) visible en el
      people picker (requiere `OPENID_REUSE_TOKENS=true` + scopes de Graph).
- [ ] Rol "creador" vs. rol "consumidor" probado: uno puede crear Agentes/MCP/Skills,
      el otro solo los usa desde el marketplace.
- [ ] Un recurso (agente/MCP/skill) probado en sus 3 visibilidades: privado, grupo, público.
- [ ] Marketplace mostrando cards (nombre, descripción, autor, botón de acción) filtradas
      por visibilidad.
- [ ] MCP externo ya existente conectado (no creado desde cero) — ej. vía Smithery.
- [ ] `balance` (cuotas de tokens) configurado; probar consumo con Anthropic y OpenAI y
      confirmar si comparten bolsa o son independientes (anotar el resultado, no asumir).
- [ ] Patrón de AI Gateway probado con un `endpoints.custom` apuntando a un proxy tipo LiteLLM.
- [ ] Code Interpreter probado con una ejecución simple.
- [ ] RAG probado: documento subido + pregunta respondida sobre su contenido.
- [ ] Sesión grabada/documentada con 3 usuarios distintos logueados mostrando vistas
      diferenciadas (requisito de demo para la revisión).

## Al terminar cada bloque
Actualizar `CHANGELOG.md` (qué se logró) y `BRECHAS.md` (qué no se logró por configuración
o quedó sin confirmar), con fecha. Esta es la evidencia que se entrega en la revisión.
