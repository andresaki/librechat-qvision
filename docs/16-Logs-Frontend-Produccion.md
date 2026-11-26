# Logs de depuración del frontend en producción

## Alcance

El objetivo es que los mensajes de depuración propios de LibreChat no aparezcan en la consola del
navegador en una compilación de producción. Esto no elimina avisos de rendimiento generados por
Chrome, errores de extensiones ni mensajes emitidos por código externo.

## Mecanismo

- `VITE_ENABLE_LOGGER=false` desactiva la salida de consola del logger del frontend. La variable
  se sustituye durante el build; cambiarla después de construir la imagen no modifica el bundle.
- Los diagnósticos de reanudación (`ResumeOnLoad`) y parada de generación usan el logger inyectado
  por `ChatHost`, en vez de llamar directamente a `console.log`.
- Vite/Rolldown usa `manualPureFunctions` de Oxc para retirar llamadas directas a
  `console.log`, `console.info` y `console.debug` del código propio que entra en el bundle de
  producción. `console.warn` y `console.error` no se eliminan con esta salvaguarda; dependencias
  de terceros pueden conservar sus propios llamados.

Los errores enviados mediante el logger pueden seguir llegando al sink de telemetría, aunque no
se impriman en DevTools. Un usuario con DevTools siempre puede inspeccionar o interceptar el
JavaScript que se entrega al navegador.

## Validación

1. Compilar el frontend con `VITE_ENABLE_LOGGER=false`.
2. Cargar una conversación nueva, una conversación existente y un flujo de reanudación.
3. Confirmar que no aparece `[ResumeOnLoad]` ni otra depuración propia del frontend.
4. Confirmar que la telemetría de errores y los logs del contenedor backend siguen disponibles.
5. Ejecutar el typecheck de `client` y `packages/chat`, además de las pruebas del logger y del
   flujo resumable.
