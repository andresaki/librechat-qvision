# Guía de estilo español — Quinn (T4)

Aplica a `client/src/locales/es/translation.json` y a copy nuevo en Q-Vision.

## Trato

- **Tú** en toda la interfaz (imperativos: *Haz clic*, *Ingresa*, *Selecciona*, *Suelta*).
- Evitar usted (*Haga*, *Ingrese*, *su mensaje*, *Desactívelo*, *¿Está seguro de que desea…?*).
- Confirmaciones: **¿Seguro que quieres…?**

## Mayúsculas

- Estilo oración: solo la primera palabra (y nombres propios, siglas y marcas).
- No copiar Title Case del inglés (*Mostrar Todo* → *Mostrar todo*).

## Glosario (un término por concepto)

| Concepto   | Usar en UI | Evitar |
|-----------|------------|--------|
| Conversación en menús | **chat** | mezclar *conversación* en el mismo menú |
| Prompt    | **prompt** (sin traducir) | indicaciones |
| Skill     | **skill** (sin traducir) | — |
| Agente    | **agente** | — |
| Proyecto  | **proyecto** | — |
| Endpoint  | **modelo** | endpoint, punto de conexión (salvo claves técnicas internas) |
| Badge     | **etiqueta** (estado del chat) | insignia |
| Búsqueda de archivos | **búsqueda de archivos** | Title Case |

## Números y fechas

- Miles con punto: `361.000`.
- Fechas en copy de producto: `24 nov 2026` cuando aplique.

## Términos en inglés aceptados

`prompt`, `skill`, nombres de producto (Quinn, MCP, API, JSON, etc.).

## Mantenimiento

- Aplicar lote: `node client/scripts/apply-t4-es-style.mjs`
- Comprobar regresiones: `node client/scripts/check-es-t4-style.mjs`