# 404 amigable y detalle técnico

## Comportamiento

Cuando una URL no coincide con una ruta de LibreChat, la pantalla muestra por defecto una
experiencia 404 orientada al usuario:

- mensaje breve y visual con la marca Quinn;
- botón **Back to home** que navega a `/c/new`;
- sin stack trace, URL ni datos internos visibles.

El detalle técnico se conserva para soporte. En la misma pantalla se revela con
`Ctrl+Shift+Alt+D` en Windows/Linux o `Cmd+Shift+Alt+D` en macOS. El atajo no usa
`Ctrl+Shift+L`, porque esa combinación ya archiva conversaciones en el cliente.

## Alcance

El cambio se aplica únicamente a errores de ruta con estado HTTP 404. Los fallos de renderizado,
errores de loaders y errores de chunks continúan usando `RouteErrorBoundary` en su modo técnico
actual, incluida la recuperación de assets y el reporte RUM.

El detalle técnico del 404 incluye el estado, el mensaje disponible, la URL solicitada y los
datos adicionales o stack trace cuando existen.

## Validación manual

1. Abrir una URL inexistente, por ejemplo `/ddd`.
2. Confirmar que aparece la pantalla 404 amigable y que el botón lleva a un chat nuevo.
3. Pulsar `Ctrl+Shift+Alt+D` y confirmar que aparecen el estado `404 Not Found` y la URL.
4. Pulsar la misma combinación de nuevo y confirmar que los detalles vuelven a ocultarse.
5. Provocar un error de runtime o una carga obsoleta de chunk y confirmar que conserva la pantalla
   técnica y la recuperación existentes.
