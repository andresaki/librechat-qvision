# Marketplace de Skills — entrega Q-Vision y extensión a Prompts / MCP

**Fecha:** 2026-09-25  
**Contexto:** Pedido de Jorge — al entrar en Skills, una “tienda” como la de Agentes (lista + búsqueda).  
**Documento relacionado:** `docs/04-Marketplace-Skills-Analisis-Implementacion.md` (plan técnico y riesgos de fork).

---

## 1. ¿Fue difícil crear la vista?

| Criterio | Valoración | Comentario |
|----------|------------|------------|
| **Complejidad global** | **Baja–media** | No hubo backend nuevo; el listado con búsqueda y ACL ya existía. |
| **Backend / API** | **Trivial** | `GET /api/skills` + `useSkillsInfiniteQuery` (cursor, `search`). |
| **Frontend nuevo** | **Media-baja** | Copiar el patrón visual de `AgentMarketplace` + `AgentGrid`, adaptado a skills. |
| **Permisos** | **Trivial** | Mismo gate que Skills: `SKILLS.USE`; crear con `SKILLS.CREATE`. |
| **Despliegue** | **Media** | Docker con imagen upstream **no** incluye el fork; hace falta **build** local (`librechat-qvision:local`). |
| **Tiempo orientativo** | **0,5–1 día** | Incluye ajustes UX (botón sidebar, placeholder, rebuild). |

**Por qué no fue “difícil”:** LibreChat ya tenía skills en sidebar (`SkillsSidePanel` + `FilterSkills`) pero **no** una landing en `/skills`. Solo faltaba la **superficie principal** y cableado de ruta.

**Lo que sí costó atención:** mantener paridad con agentes sin duplicar de más; generalizar `SearchBar` para i18n; documentar y operar el **fork** frente a upstream.

---

## 2. Qué se tocó (inventario del fork)

### 2.1 Vista marketplace (nuevo)

| Archivo | Rol |
|---------|-----|
| `client/src/components/Skills/marketplace/SkillsMarketplace.tsx` | Layout: hero, búsqueda URL (`?q=`), `SidePanelGroup`, crear skill |
| `client/src/components/Skills/marketplace/SkillGrid.tsx` | Grid + scroll infinito (`useSkillsInfiniteQuery`, `useInfiniteScroll`) |
| `client/src/components/Skills/marketplace/SkillMarketplaceCard.tsx` | Card: título, descripción, autor, categoría → `/skills/:id` |
| `client/src/components/Skills/marketplace/index.ts` | Exports |

### 2.2 Rutas y entrada

| Archivo | Cambio |
|---------|--------|
| `client/src/components/Skills/layouts/SkillsView.tsx` | Sin `skillId` → render `SkillsMarketplace` (antes empty state) |
| `client/src/components/Skills/sidebar/SkillMarketplaceSidebarButton.tsx` | Botón **Skill Marketplace** encima del filtro del panel |
| `client/src/components/Skills/sidebar/FilterSkills.tsx` | Integra el botón marketplace |

### 2.2 Reutilización / i18n

| Archivo | Cambio |
|---------|--------|
| `client/src/components/Agents/SearchBar.tsx` | Props opcionales de claves i18n (default = agentes) |
| `client/src/locales/en/translation.json` | `com_ui_skill_marketplace*`, `com_ui_skill_search_*` |

### 2.3 Tests

| Archivo | Cambio |
|---------|--------|
| `client/src/components/Skills/layouts/__tests__/SkillsView.spec.tsx` | Expectativa marketplace en `/skills` |

### 2.4 Infra laboratorio (no producto upstream)

| Archivo | Cambio |
|---------|--------|
| `docker-compose.override.yml` | `build` + `image: librechat-qvision:local` |
| `BRECHAS.md`, `CHANGELOG.md`, `AGENTS.md` | Fase 2 fork, cierre parcial requisito marketplace skills |
| `docs/04-Marketplace-Skills-Analisis-Implementacion.md` | Análisis y mantenimiento |

**No se modificó:** `/api`, `/packages/api`, `/packages/data-schemas` (salvo lo ya presente en la base v0.8.x del repo).

---

## 3. Comportamiento final (resumen)

- **`/skills`** → marketplace (grid + búsqueda con `?q=`).
- **`/skills/:id`** → detalle (sin cambio de producto).
- **Sidebar Skills** → botón **Skill Marketplace** + filtro lateral (lista “Mis skills”).
- **Permisos:** sin `SKILLS.USE` → redirección a `/c/new` (igual que antes).
- **Visibilidad:** la API filtra por ACL; no se duplicó lógica en el cliente.

---

## 4. Cómo replicar una vista “marketplace” para **Prompts**

### 4.1 Estado actual en LibreChat

| Aspecto | Prompts hoy |
|---------|-------------|
| Ruta | `prompts` y `prompts/new` redirigen a `/c/new`; solo **`prompts/:promptId`** tiene vista (`InlinePromptsView` → formulario) |
| Listado | Sidebar `PromptsAccordion` → `FilterPrompts` + grupos vía `usePromptGroupsInfiniteQuery` / contexto Recoil |
| Permiso | `PROMPTS.USE` / `PROMPTS.CREATE` |
| Marketplace agentes | Referencia en `/agents` + `useMarketplaceAgentsInfiniteQuery` |

**Brecha:** igual que skills antes del fork — **hay listado en panel lateral, no hay “tienda” en ruta dedicada**.

### 4.2 Pasos sugeridos (misma receta que Skills)

1. **Ruta** — En `client/src/routes/index.tsx`, definir **`/prompts`** (sin id) que no redirija a `/c/new`; lazy-load de una vista `PromptsMarketplace` (nueva carpeta `client/src/components/Prompts/marketplace/`).
2. **Vista** — Copiar estructura de `SkillsMarketplace`:
   - `SearchBar` con claves `com_ui_prompt_search_*` (nuevas en `en/translation.json`).
   - Grid con cards (nombre, descripción, autor, categoría) usando **`usePromptGroupsInfiniteQuery`** (ya en `~/data-provider` / `usePromptGroupsNav`).
3. **Detalle** — Card → `/prompts/:promptId` (ruta existente) o diálogo de preview (`PreviewPrompt`) si se prefiere modal como agentes.
4. **Sidebar** — Botón “Prompt Marketplace” en `FilterPrompts` (patrón `SkillMarketplaceSidebarButton`).
5. **Permisos** — Gate `PermissionTypes.PROMPTS` + `Permissions.USE` en la vista marketplace.
6. **Estado global** — Prompts usan Recoil (`store.promptsName`, `promptsCategory`) en mutaciones; el marketplace puede usar **solo URL `?q=`** para búsqueda y evitar acoplar al store, o sincronizar con `setName` del contexto si se quiere paridad sidebar ↔ main.
7. **Tests** — Spec de ruta + render marketplace; opcional spec del botón sidebar.
8. **Deploy** — Mismo rebuild Docker `librechat-qvision:local`.

### 4.3 Complejidad estimada Prompts

| Dimensión | vs Skills |
|-----------|-----------|
| API | Similar — listado paginado ya existe |
| UI | Similar — cards + search |
| Rutas | **Un poco más** — hay que **dejar de redirigir** `/prompts` a chat |
| Estado | **Algo más** — Recoil/contexto de grupos; conviene no mezclar dos fuentes de verdad para búsqueda |

**Esfuerzo orientativo:** 1–1,5 días (incluye pruebas ACL y roles creador/consumidor).

---

## 5. Cómo replicar una vista “marketplace” para **MCP**

### 5.1 Estado actual en LibreChat

| Aspecto | MCP hoy |
|---------|---------|
| Ruta dedicada | **No** hay `/mcp` tipo marketplace |
| Descubrimiento | Catálogo en **builder de agentes** (`ToolsMarketplaceDialog`, `MarketplaceCatalog`, `ToolCard` con `kind: 'mcp'`) |
| Listado API | `dataService.getMCPServers()` → `useMCPServersQuery` (lista completa, no infinite marketplace con search dedicado en UI global) |
| Permiso | `PermissionTypes.MCP_SERVERS` + `Permissions.USE` / `CREATE` |
| Config | Servidores también en `librechat.yaml` → `mcpServers` (operador); usuarios crean/gestionan instancias en DB según permisos |

**Brecha:** MCP está **integrado en herramientas del agente**, no como sección “tienda” navegable como `/agents` o `/skills`.

### 5.2 Pasos sugeridos (MCP)

1. **Decidir alcance**
   - **Solo MCP creados por usuarios** (DB) → `useMCPServersQuery` + filtro cliente por nombre/descripción.
   - **Incluir MCP del yaml** → mezclar config startup + DB (más lógica; puede requerir **`packages/api`** si no hay endpoint unificado “marketplace MCP” con ACL como agentes).

2. **Ruta** — Nueva **`/mcp`** o **`/mcp/marketplace`** + entrada en nav (similar `useSideNavLinks` / panel MCP si existe).

3. **UI**
   - Reutilizar **`ToolCard`** / `MarketplaceCatalog` desde `SidePanel/Agents/Tools/` **o** cards nuevas al estilo `SkillMarketplaceCard`.
   - Acción “Usar” → conectar servidor (flujo existente en `useMCPServerManager`) o abrir detalle/configuración OAuth.

4. **Búsqueda** — Si la lista es corta, búsqueda **en cliente** puede bastar; si crece, valorar endpoint paginado ( **backend** — sube complejidad).

5. **Permisos** — `MCP_SERVERS.USE`; crear/conectar según `CREATE` y políticas de instancia.

6. **Sidebar** — Si hay panel MCP en el futuro, botón marketplace encima del filtro (mismo patrón).

### 5.3 Complejidad estimada MCP

| Dimensión | vs Skills |
|-----------|-----------|
| UI cards | Media — **ya existen** componentes en tools marketplace |
| Ruta + nav | Media |
| Datos / ACL | **Alta si** se exige paridad exacta con marketplace de agentes (promoted, categorías, search server-side) |
| OAuth / conexión | **Alta** — “Usar” no es solo navegar a detalle; puede abrir flujos MCP |

**Esfuerzo orientativo:** 1,5–3 días según si se limita a listar + buscar en cliente o se exige marketplace completo con acciones de conexión.

---

## 6. Tabla comparativa — tres marketplaces

| | **Agentes** (upstream) | **Skills** (fork Q-Vision) | **Prompts** (hipotético) | **MCP** (hipotético) |
|--|------------------------|----------------------------|---------------------------|----------------------|
| Ruta | `/agents` | `/skills` | Falta `/prompts` | Falta `/mcp` |
| Query list | `useMarketplaceAgentsInfiniteQuery` | `useSkillsInfiniteQuery` | `usePromptGroupsInfiniteQuery` | `useMCPServersQuery` (+ tools?) |
| Permiso | `MARKETPLACE.USE` | `SKILLS.USE` | `PROMPTS.USE` | `MCP_SERVERS.USE` |
| Backend tocado | No (upstream) | No | Probablemente no | Posible si hace falta API marketplace |
| Componentes reutilizables | `SearchBar`, `SidePanelGroup`, infinite scroll | Idem + cards propias | Idem | `ToolCard`, `MarketplaceCatalog` |

---

## 7. Mantenimiento del fork (recordatorio)

- Cambios concentrados en **`SkillsView`**, **`Skills/marketplace/*`**, **`SearchBar`**, **i18n** → zonas calientes en merges de `dev` upstream.
- Tras cada pull de LibreChat: `docker compose build api` y smoke en `/skills`.
- Si upstream publica marketplace oficial de skills: **comparar y retirar** carpeta `marketplace/` del fork.

---

## 8. Validación Q-Vision (checklist entrega)

- [ ] Imagen local `librechat-qvision:local` desplegada.
- [ ] `/skills` muestra marketplace; búsqueda dice “Search skills…”.
- [ ] Sidebar: botón **Skill Marketplace** visible con `SKILLS.USE`.
- [ ] Consumidor ve skills compartidos; no ve botón crear sin `SKILLS.CREATE`.
- [ ] Evidencia en demo grabada / `CHANGELOG.md`.
