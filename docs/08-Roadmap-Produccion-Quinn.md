# Quinn a producción — roadmap checkeable

**Fecha:** 2026-10-07. Rama: `qvision/quinn-branding-prompts`.
Estados: `[x]` hecho (falta smoke donde se indica) · `[ ]` pendiente.
Detalle técnico de cada punto en `docs/07-*`, `CHANGELOG.md` y `BRECHAS.md`.

## 1. Listo para validar en local (sin bloqueos)

- [x] Branding A1: nombre Quinn, logo, favicon/PWA, footer, títulos `| Quinn` — falta smoke visual
- [x] Paleta Quinn A2 light + dark + Lato — falta auditoría visual (contraste ámbar/header en `docs/07`)
- [x] Sidebar: compartibles primero + divisor — falta smoke (2 roles)
- [x] Alto contraste fuera del selector (login + configuración)
- [x] Prompts consumidor: auto-refresh, sin "Mis prompts", empty state condicional — falta smoke (2 usuarios)
- [x] Ticket Infra Entra ID redactado (`docs/05`) — falta enviarlo y la respuesta de Infra
- [ ] Smoke completo del estado actual (guion section 4)

## 2. Configuración prod (requiere decisiones, sin código)

- [ ] Feature set on/off: `runCode`, `webSearch`, `fileSearch`, `fileCitations`, `temporaryChat`, `multiConvo`, `bookmarks`, `memories` (yaml + roles Creador/Consumidor)
- [x] `RUN_CODE.USE` en OFF por rol (hecho en panel) + `interface.runCode: false` en yaml
  (cubre USER/ADMIN; verificado en log del arranque)
- [x] `interface.multiConvo: false` en yaml (cubre USER/ADMIN; verificado en log) + apagar
  `MULTI_CONVO.USE` en Creador/Consumidor desde el panel (pendiente 30s en Admin Panel)
- [x] `interface.webSearch: false` en yaml (sin proveedor; verificado en log) + apagar
  `WEB_SEARCH.USE` en Creador/Consumidor desde el panel. Lo nativo de cada proveedor se gobierna
  con la lista de modelos del gateway, no con este toggle.
- [ ] `customWelcome` ("Pregúntale a Quinn…"), `HELP_AND_FAQ_URL`, `privacyPolicy`, `termsOfService` con URLs Q-Vision
- [ ] Lista de modelos curada para prod (cuando se conozcan los del gateway)

## 3. Bloqueado por SSO (ticket Infra, `docs/05`)

- [ ] App registration + admin consent en tenant prod
- [ ] `OPENID_*` en `.env` prod + Redirect URIs finales
- [ ] Promover admins iniciales + cuenta local de respaldo
- [ ] `ALLOW_REGISTRATION=false` (solo con SSO andando)
- [ ] Login 3 roles + sincronía de grupos + ACL por grupo

## 4. Bloqueado por AI Gateway (en desarrollo)

- [ ] `endpoints.custom` real + `agents.allowedProviders` + `ENDPOINTS=agents,custom`
- [ ] `titleModel` al gateway; validar tools/MCP y adjuntos vía gateway (no solo chat)
- [ ] Decidir dónde viven las cuotas → despausar o descartar `docs/06`
- [ ] Migrar agentes/chats viejos a modelos del gateway; retirar `qvision-sim`

## 5. Pendiente de decisión / ventana

- [ ] Rebase contra upstream como tarea propia (400+ commits; ver nota en rama)
- [ ] Crear repo GitLab y push de `qvision/*`
- [ ] Detalle visual fase 2 (píldoras, radios de burbuja, avatar Quinn, CTA ámbar)
- [ ] Infra prod: TLS, backups, límites, rotación de secretos

## 6. Contenido anticipado (crear ahora, recrear en prod)

Pedido: ir creando skills, agentes, prompts y MCPs desde ya para que prod arranque con
funciones utilizables. Estrategia acordada: **staging en local + recreación manual en prod**
(es lo seguro: dueños/ACLs locales no mapean al tenant real, y los saldos/usuarios del lab no
viajan — ver explicación completa en el hilo de trabajo).

- [ ] Skills por categoría (creador) + publicar a grupos cuando aplique
- [ ] Agentes por caso de uso (con modelo del gateway cuando esté; si no, marcar pendiente de re-point)
- [ ] Prompts por departamento/uso común
- [ ] MCPs necesarios (los de yaml viajan en `librechat.yaml`; los de UI se recrean)
- [ ] Roles Creador/Consumidor ya definidos (recrear matriz en prod + asignar miembros)
- [ ] Al recrear en prod: revisar secretos (a KeyVault/`.env`, nada del lab) y re-compartir a grupos reales
- [ ] Si el catálogo pasa ~15 items o hay skills con archivos, evaluar dump selectivo
  (`Role`, `Agent`, `Skill`+`SkillFile`, `MCPServer`, `PromptGroup`, `AgentCategory`) + volumen
  `uploads/` en vez de recreación manual

## 7. Guion de smoke (reusar en cada rebuild)

1. Login: logo Quinn, título Quinn, solo temas Sistema/Oscuro/Claro.
2. Creador: sidebar skills → prompts → MCPs arriba + divisor; `/agents`, `/skills`, prompts con crear.
3. Consumidor: sin "Mis prompts" ni botones crear; prompts vacío con hint neutro; publicar como Creador → aparece solo al reenfocar.
4. Paleta: light y dark (chat, cards, diálogos, hovers); favicon Quinn en pestaña nueva/incógnito.
