# Búsqueda de agentes sin distinguir tildes

## Comportamiento

En `/agents`, las consultas del marketplace no distinguen entre letras latinas con y sin
diacrítico. Por ejemplo, `anomalias` encuentra un agente cuyo nombre o descripción contiene
`anomalías`; la etiqueta guardada y mostrada no se modifica.

## Mecanismo

El endpoint de listado genera una expresión regular escapada para `name` y `description`. Como
MongoDB no aplica eliminación de diacríticos a una consulta `$regex` mediante collation, el patrón
incluye las variantes acentuadas de cada letra base antes de ejecutarse.

La transformación está centralizada en `packages/api/src/agents/marketplace.ts` y se valida con
pruebas unitarias, incluyendo el escape de metacaracteres de expresiones regulares.

## Validación manual

1. Abrir `/agents`.
2. Buscar `anomalias`.
3. Confirmar que aparece el mismo agente que al buscar `anomalías`.
