# Marketplace de Skills — análisis e implementación (Q-Vision)

**Pedido (Jorge):** al entrar a **Skills**, mostrar una “tienda” comparable al **Marketplace de Agentes**: **lista en cards + búsqueda**. Sin tabs unificados Agentes/Skills/MCP ni flujos extra.

**Fecha:** 2026-09-25

---

## 1. Situación en LibreChat upstream (v0.8.x, este repo)

| Área | Agentes | Skills |
|------|---------|--------|
| Ruta principal | `/agents`, `/agents/:category` | `/skills`, `/skills/:skillId`, … |
| Vista “tienda” | `AgentMarketplace` — hero, búsqueda (`?q=`), tabs de categoría, grid infinito | **No existe.** `/skills` sin `skillId` muestra estado vacío (“selecciona un skill”) |
| Listado accesible | Marketplace + permiso `MARKETPLACE.USE` | Solo **sidebar** (`SkillsSidePanel`) con `FilterSkills` + lista colapsable “Mis skills” |
| API de listado | `useMarketplaceAgentsInfiniteQuery` | `useSkillsInfiniteQuery` → `GET /api/skills` (cursor, `search`, ACL en servidor) |
| Permiso de entrada | `MARKETPLACE.USE` | `SKILLS.USE` |

**Conclusión:** el backend y el data-provider **ya listan skills con búsqueda y paginación**; falta la **superficie de UI principal** tipo marketplace. No se puede lograr con `.env` / `librechat.yaml` (brecha de producto, no de configuración del laboratorio).

---

## 2. Alcance de la solución (mínimo viable)

1. Sustituir el empty state de `/skills` por **`SkillsMarketplace`**: título, subtítulo, barra de búsqueda (misma UX que agentes, parámetro `?q=`), grid de cards con scroll infinito.
2. **Permisos:** mismo gate que Skills hoy — `PermissionTypes.SKILLS` + `Permissions.USE`. Creación sigue en `SKILLS.CREATE` (botón crear en cabecera, como en el sidebar).
3. **Acción en card:** abrir detalle (`/skills/:id`) — equivalente funcional a “ver/usar” el skill en la sección Skills.
4. **No incluido** (explícitamente fuera del pedido): tabs Agentes/Skills/MCP; categorías de skills en marketplace; favoritos; reutilizar `MARKETPLACE.USE` en lugar de `SKILLS.USE`.

---

## 3. Complejidad estimada

| Dimensión | Nivel | Notas |
|-----------|-------|--------|
| Backend / API | **Bajo** | Sin cambios; reutilizar `listSkills` |
| Data-provider | **Nulo** | `useSkillsInfiniteQuery` ya existe |
| Frontend nuevo | **Medio-bajo** | ~3 componentes, patrón copiado de `AgentMarketplace` + `AgentGrid` |
| i18n | **Bajo** | 2–4 claves en `en/translation.json` |
| Tests | **Bajo** | Ajuste de `SkillsView.spec` + spec opcional del grid |
| Config / Docker | **Nulo** | Solo asegurar `interface.skills` y rol con `SKILLS.USE` |

**Esfuerzo orientativo:** 0,5–1 día dev + prueba manual con 2 roles (consumidor vs creador).

---

## 4. Archivos tocados (fork)

| Archivo | Cambio |
|---------|--------|
| `client/src/components/Skills/marketplace/SkillsMarketplace.tsx` | Vista principal (layout + búsqueda URL) |
| `client/src/components/Skills/marketplace/SkillGrid.tsx` | Grid + infinite scroll |
| `client/src/components/Skills/marketplace/SkillMarketplaceCard.tsx` | Card (nombre, descripción, autor) |
| `client/src/components/Skills/marketplace/index.ts` | Exports |
| `client/src/components/Skills/layouts/SkillsView.tsx` | Render marketplace cuando no hay `skillId` |
| `client/src/locales/en/translation.json` | Título/subtítulo marketplace skills |
| `client/src/components/Skills/layouts/__tests__/SkillsView.spec.tsx` | Expectativa marketplace |
| `docs/04-Marketplace-Skills-Analisis-Implementacion.md` | Este documento |
| `BRECHAS.md` | Cierre parcial requisito 4.1 solo para Skills |

**Reutilizado sin modificar:** `~/components/Agents/SearchBar`, `useSkillsInfiniteQuery`, `useInfiniteScroll`, `CreateSkillMenu`, ACL vía API.

**No se toca:** `/api`, `/packages` (salvo que upstream exija tipos nuevos — no aplica aquí).

---

## 5. Mantenimiento y riesgos al hacer fork

### 5.1 Conflictos probables con `dev` de LibreChat

- **`client/src/components/Skills/layouts/SkillsView.tsx`** — área activa de producto (skills); alta probabilidad de cambios upstream en rutas, permisos o layout.
- **`client/src/locales/en/translation.json`** — merges frecuentes; resolver claves nuevas al lado de las nuestras.
- **Paridad con Agent Marketplace** — si upstream refactoriza `SearchBar`, `SidePanelGroup` o infinite scroll, conviene **rebase periódico** y diff visual en `/agents` vs `/skills`.

### 5.2 Riesgo bajo

- Componentes nuevos bajo `Skills/marketplace/` — poco solapamiento con upstream hasta que LibreChat shippee un marketplace oficial de skills (podría hacer obsoleto nuestro módulo; entonces **eliminar fork** y adoptar upstream).

### 5.3 Estrategia de mantenimiento recomendada

1. Mantener el fork en **rama dedicada** (p. ej. `qvision/skills-marketplace`) con commits atómicos.
2. Documentar en PR/commit: “Q-Vision: Skills marketplace — paridad UX con `/agents`”.
3. En cada merge de LibreChat: ejecutar `SkillsView.spec`, smoke manual `/skills?q=test`.
4. Si upstream añade marketplace de skills: comparar feature flag / rutas; **preferir upstream** y retirar carpeta `marketplace/`.

### 5.4 Relación con requisitos Q-Vision (doc 01)

- **4.1–4.2 (parcial):** cumple para **Skills** (cards + búsqueda + autor vía `authorName`).
- **4.1 completo** (tabs Agentes/Skills/MCP/Tools en un solo marketplace): sigue siendo **brecha**; agentes ya tienen su vista; MCP/tools viven en el builder de agentes.
- **4.3 (“Usar” en un clic desde marketplace):** skills abren detalle; “usar en chat” sigue siendo vía `$` / agente — coherente con el producto actual.

---

## 6. Validación manual (checklist)

- [ ] Usuario con `SKILLS.USE` y **sin** `SKILLS.CREATE`: ve grid, busca, abre detalle; no ve botón crear.
- [ ] Usuario **sin** `SKILLS.USE`: redirige a `/c/new` (igual que antes).
- [ ] Creador: ve `CreateSkillMenu` en marketplace.
- [ ] Skill compartido por grupo / público: visible para consumidor del grupo; privado ajeno: no listado (ACL servidor).
- [ ] Mobile: toggle sidebar + marketplace usable.

---

## 7. Plan de implementación (orden)

1. Crear componentes `marketplace/*` siguiendo `AgentMarketplace` / `AgentGrid`.
2. Cablear en `SkillsView` para `/skills` y `/skills?q=…`.
3. Claves i18n + tests.
4. Actualizar `BRECHAS.md` y `CHANGELOG.md` del laboratorio.
