# Chat Quinn como conversación nueva predeterminada

## Problema

«Nuevo chat» podía heredar el último agente seleccionado porque el fallback de LibreChat reutiliza
`LAST_CONVO_SETUP` cuando no hay un modelo predeterminado fuerte. Esto hacía que un chat iniciado
desde un chat de Quinn o desde un agente dependiera del historial local del navegador.

## Configuración

El cliente reconoce el endpoint que `librechat.yaml` presenta con `modelDisplayLabel: Quinn`:

- etiqueta visible: `Chat Quinn`;
- endpoint: `AI-Gateway-QVision`;
- `execute_code` activo y fijado en la barra por defecto en chats nuevos.

Al construir una conversación nueva, ese endpoint tiene prioridad sobre la selección persistida
en `LAST_CONVO_SETUP`. No se crea un `modelSpec` adicional ni otra opción visible en el selector.
Una selección explícita de agente continúa funcionando en el chat donde se realiza; solo el
siguiente «Nuevo chat» vuelve al endpoint de Quinn. La activación predeterminada respeta una
desactivación explícita guardada por el usuario.

## Validación

1. Reconstruir el frontend o levantar `frontend:dev` para cargar el cambio del cliente.
2. Abrir un chat nuevo y confirmar que el selector muestra `Chat Quinn`.
3. Confirmar que `Run Code` aparece activo en la barra de herramientas.
4. Seleccionar un agente y confirmar que el chat actual usa ese agente.
5. Pulsar «Nuevo chat» y confirmar que vuelve a mostrar `Chat Quinn` con `Run Code` activo.

6. Provocar un error que muestre «Branch without files», pulsarlo y confirmar que la nueva rama
   conserva `Run Code` activo; si se había desactivado explícitamente antes, debe conservarse
   desactivado.

El cambio está acotado al cliente de Q-Vision y reutiliza `modelDisplayLabel`; si se rebasea la
rama sobre una versión que cambie la resolución de endpoints predeterminados, revisar la prioridad
frente a `LAST_CONVO_SETUP`.

La recuperación copia el estado de herramientas del chat origen al nuevo ID antes de navegar. Esto
es necesario porque una rama deja de usar `Constants.NEW_CONVO`, por lo que el inicializador del
default de Quinn ya no se ejecuta por sí solo.
