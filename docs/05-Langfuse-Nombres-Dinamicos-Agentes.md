# Nombres dinámicos de agentes en Langfuse

## Alcance

La instrumentación de agentes usa `@librechat/agents` y su configuración
`langfuse`/`runName`; no usa una observación Langfuse creada manualmente en
LibreChat ni una integración local independiente de OpenTelemetry.

La observación raíz de cada ejecución se nombra con el agente primario:

```text
agent:quinn-emojis
```

Las observaciones internas (`AgentGraph`, `AgentRun`, modelos, herramientas,
MCP, uso, costes y errores) siguen siendo generadas por el runtime existente.

## Resolución de identidad

1. Se usa `agent.name` si contiene un valor útil.
2. Si no hay nombre, se usa `agent.id`.
3. Se recortan espacios, se colapsan separadores y se eliminan caracteres
   problemáticos; el resultado se limita a una longitud acotada.
4. El valor se antepone con `agent:`.

La metadata segura de la observación raíz incluye:

```json
{
  "agent_name": "quinn-emojis",
  "agent_id": "agent-42",
  "agent_type": "librechat_agent"
}
```

No se incluyen instrucciones, mensajes, URLs de MCP, credenciales, tokens ni
API keys. La UI, Chat Completions, Responses API, triggers/webhooks y
ejecuciones programadas convergen en el mismo runtime de agentes. No existe un
Experiment Runner local en este checkout.

## Validación

Las pruebas unitarias cubren nombres `emojis`, `quinn-emojis`, normalización,
fallback al ID y exclusión de secretos. Las pruebas de los controladores
conservan las rutas streaming y no streaming; el typecheck del workspace
`packages/api` es parte de la validación del cambio.
