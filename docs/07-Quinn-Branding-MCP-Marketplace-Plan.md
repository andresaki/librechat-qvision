# Quinn — Personalización de marca + Marketplace de MCPs (plan, fase 2)

**Fecha:** 2026-10-06. **Estado:** A1 implementado y verificado; B **revertido**
(ver abajo). A2 pendiente. Falta validación visual con rebuild de imagen cliente.
**Origen:** `quinn-brand-kit/` (logos SVG/PNG, favicon+PWA, `tokens/` con CSS/JSON/snippet Tailwind,
guía de color/tipo/voz). La app se llamará **Quinn**. Ticket de Infra (Entra) en curso; el AI Gateway
llega después — el balance vive allá, no aquí.

## A. Branding Quinn

### A1. Sin código (hacer primero)

| Pieza | Mecanismo | Archivo/var |
|---|---|---|
| Nombre | `APP_TITLE=Quinn` en `.env` → `startupConfig.appTitle` (tabs, login, header) | `.env` |
| Logo login/header | Reemplazar `client/public/assets/logo.svg` por `quinn-logo-horizontal.svg` (fondo claro) / negativo donde aplique | asset + rebuild imagen cliente |
| Favicon + PWA | Reemplazar favicons en `client/public/` + `theme-color #0B1F3A` en `index.html` | asset + rebuild |
| Footer | `customFooter` en `librechat.yaml` (p. ej. "Quinn · Tu apoyo en Q-Vision") | `librechat.yaml` |
| Subtítulo/voz | Textos visibles vía `useLocalize()`; claves nuevas solo en `en/translation.json` | `client/src/locales/en/` |

### A2. Fork CSS acotado (después)

El client usa vars semánticas (`--surface-*` en `client/src/style.css`, `client/src/style.css:10`).
Mapear la paleta light Quinn (`mist` fondo, navy header, sky burbuja usuario, amber 1 CTA por pantalla)
sobre esas vars + Lato vía font. Regla del repo: nada de colores hardcodeados en el feature;
lo que el sistema no exprese (radios asimétricos de burbuja, píldoras) va como CSS Quinn documentado.
Dark mode: el kit trae sugerencia, pero se propone **forzar light Quinn** en primera versión
(menos superficie, el producto es interno diurno) — a confirmar.

## B. Marketplace de MCPs (`/mcp`)

Paridad con lo hecho en `/skills` (ver `docs/04-*`): el backend **ya lista con ACL por usuario**
(`GET /api/mcp/servers` → `getMCPServersList`, `api/server/controllers/mcp.js:338`,
`resolveAllMcpConfigs(userId, …)`); falta la superficie de tienda.

| Pieza | Plan |
|---|---|
| Ruta | `/mcp` (+ `/mcp/:serverName` detalle) en `client/src/routes/index.tsx`, lazy como Skills |
| Vista | `components/MCP/marketplace/*` espejando `Skills/marketplace/*`: hero, búsqueda `?q=`, grid infinito, card (nombre, descripción, autor, estado conexión) |
| Acción card | Abrir detalle; "conectar/usar" = flujo existente del builder (no inventar atajo que rompa OAuth de MCPs) |
| Permisos | Gate `MCP_SERVERS.USE`; crear con `MCP_SERVERS.CREATE`; reutilizar `PermissionTypes`/`Permissions`, sin roles hardcodeados |
| Sidebar | Entrada junto a `mcp-builder` en `useSideNavLinks.ts:230` (respetar `interfaceConfig` + `skillsEnabled`-style gate) |
| i18n/tests | Solo `en/translation.json`; spec de vista + grid; `tsc --noEmit` en `client` |

**Riesgo merge:** `SkillsView`-style (rutas y `translation.json` son zonas calientes de upstream);
componentes nuevos bajo `MCP/marketplace/` = bajo solapamiento. Si upstream shippea tienda oficial,
adoptarla y retirar el fork (misma política que Skills).

## Orden propuesto

1. A1 (rápido, sin código, visible ya) → 2. B (valor funcional) → 3. A2 (pulido visual).
Validación: login como Consumidor/Creador viendo "Quinn" + logo; `/mcp` con cards, búsqueda,
detalle y crear según permisos; rebuild de imagen cliente + smoke.

## Implementado 2026-10-06 (A1 + B; A2 no)

- **A1:** `APP_TITLE=Quinn` + `CUSTOM_FOOTER` en `.env` (no versionado); `logo.svg`, favicons,
  `icon-192/512`, `site.webmanifest` (rutas a `assets/`) y `index.html` (theme-color `#0B1F3A`,
  título/descripción Quinn). Requiere rebuild de la imagen cliente para verse.
- **B (`/mcp`):** `components/MCP/marketplace/MCPMarketplace.tsx` (+ `index.ts`): hero, búsqueda
  `?q=`, `MCPServerList` + cards + `MCPServerDialog` (crear) reutilizados del builder, gate
  `MCP_SERVERS.USE` (redirige a `/c/new`) y `CREATE`. Sin ruta de detalle: las cards ya traen
  conectar/configurar/editar inline (difiere de Skills a propósito). Ruta lazy en
  `routes/index.tsx`; entrada en sidebar (`useSideNavLinks`, id `mcp-marketplace`, visible con USE
  aunque el builder esté oculto) + atajo en `MCPBuilderPanel`. i18n: 5 claves solo en
  `en/translation.json`. Specs: `mcpRoutes.spec` + `MCPMarketplace.spec` (4/4).
- **Fix lateral:** `SkillsView.tsx` del fork previo usaba `<SkillState />` sin importarlo
  (tsc en rojo) — repuesto el import; `sort-imports` pasado en los 8 archivos tocados
  (requirió `tsx` porque el script pide Node 24 y hay Node 22).
- **Fix títulos 2026-10-06 (segunda vuelta):** Agentes/Skills/Insights hardcodeaban
  `| LibreChat` en la pestaña; ahora usan `startupConfig.appTitle` (fallback `Quinn`).
  El marketplace MCP ya seguía ese patrón. Requiere rebuild de imagen para verse.
- **Riesgo merge (igual que Skills):** rutas + `translation.json` son zonas calientes; si upstream
  shippea tienda MCP oficial, adoptar upstream y retirar `MCP/marketplace/`.

## Orden sidebar: compartibles arriba — 2026-10-07
Pedido: skills/prompts/MCPs (y el marketplace de agentes, que ya va fijo arriba) seguidos;
marcadores/memorias/adjuntos después, con la línea divisoria existente. No hay opción en yaml
(el orden vive en `useSideNavLinks.ts`), así que es fork chico y localizado:
- `hooks/Nav/navGroups.ts` (nuevo, sin dependencias): set `SHAREABLE_NAV_IDS`
  (skills, prompts, mcp-builder) + `orderNavLinksShareableFirst` (sort estable: respeta el orden
  upstream dentro de cada grupo) + `isShareableNavLink`. Pensado anti-conflictos: los cambios de
  upstream en los `push` casi nunca colisionan; si agregan upstream su propio orden, se retira.
- `ExpandedPanel.tsx`: divisor `border-b` entre grupos solo cuando ambos existen (mismo estilo
  del divisor actual). Alcance desktop; el drawer móvil hereda el orden sin divisor.
- Spec `navGroups.spec.ts` (orden + clasificación). `tsc` + `ExpandedPanel.spec` vecinos en verde.

## Paleta Quinn A2 — 2026-10-07 (solo remap de vars, sin tocar componentes)

`client/src/style.css`: tokens crudos `--quinn-*` en `:root` + remap de la capa semántica en
`html` (light) y `.dark` (valores sugeridos del kit). `.gizmo*` (legacy) y `high-contrast`
(accesibilidad) intactos. Fuente Lato vía Google Fonts en `index.html` (OFL; offline cae a
Inter/sistema por el stack de `--theme-font-family`).

| Rol | Light | Dark |
|---|---|---|
| Canvas | mist | navy-deep `#07152A` |
| Cards/diálogos | blanco | navy-surface `#0F2747` |
| Texto / secundario | ink / slate | mist / slate-light `#A9B4C6` |
| Burbuja usuario (`surface-tertiary`) | sky | navy-line `#1E3A63` |
| CTA submit | navy (texto blanco 16.5:1) | Quinn blue (5.7:1) |
| Links/foco/acento | Quinn blue | blue-light `#7FA8E8` |
| Hovers/activos | sky | navy-line |
| Bordes | quinn-line | navy-line |
| Invertidos | navy | (sin cambio) |

**Decisiones de contraste (auditar visualmente):** ámbar NO usado en superficies con texto
fijo blanco (`text-on-status` compartido con badges rojos — blanco sobre ámbar 2.0:1, prohibido
por el kit); header light intacto (el texto ink vive encima); estados dark y sintaxis de código
sin tocar (afinados para dark); tamaño de fuente de mensajes sin tocar.
**Diferido a otra fase:** radios asimétricos de burbuja, botones píldora, avatar Quinn en el
chat, CTA ámbar con texto navy (exige override del color de texto por componente).

## Micro-fixes Prompts — 2026-10-06 (consumidor)

1. **Auto-refresh:** `usePromptGroupsInfiniteQuery` tenía `refetchOnWindowFocus/Reconnect/Mount`
   en `false` y solo revalidaba al cambiar el filtro — por eso lo recién compartido no aparecía.
   Misma política del catálogo MCP: `staleTime` 30s + refetch en foco/montaje
   (`client/src/data-provider/queries.ts`). Sin cambios de backend.
2. **Ocultar "Mis prompts" sin CREATE** (`FilterPrompts.tsx`): la opción sale del dropdown y una
   selección vieja se resetea a Todos. El botón crear ya se ocultaba solo (`CreatePromptButton`).
3. **Mensaje vacío condicional** (`lists/List.tsx`): con CREATE sigue "Create your first prompt…";
   sin CREATE muestra "Prompts shared with you will appear here" (clave nueva
   `com_ui_no_prompts_shared_hint`, solo `en`). Specs: `PromptsList.spec` + `FilterPrompts.spec`.

## Revert de B — 2026-10-06 (marketplace MCP innecesario)

Validado con el equipo: el listado del builder (`GET /api/mcp/servers`, resuelto por usuario en
servidor) ya muestra automáticamente todo lo compartido, con estado y acciones — la tienda no
agregaba disponibilidad, solo descubrimiento, y no compensa el costo de fork. Se eliminó por
completo: vista `MCP/marketplace/*`, ruta `/mcp`, entrada del sidebar, botón del panel, claves
`com_ui_mcp_marketplace*`/`com_ui_mcp_search*` y specs. Verificación del revert: `tsc --noEmit`
EXIT=0, specs vecinos (`skillsRoutes`, `SkillsView`) en verde, y `git diff` de los 4 archivos
tocados vacío (quedan los títulos `| Quinn` de Agentes/Skills/Insights, que son branding A1).
La brecha "tabs unificados" sigue tal cual en `BRECHAS.md`.
