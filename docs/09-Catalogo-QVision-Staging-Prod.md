# Catálogo Q-Vision — staging local + recreación en prod

**Fecha:** 2026-10-08. **Carpeta:** `catalogo-qvision/` (35 fichas: 10 skills, 12 prompts, 8 agentes, 5 MCP).

## Alcance
Contenido funcional por área (RH, Marketing, Devs, Infra, datos, Comercial, liderazgo +
transversales) listo para registrar a mano desde la UI en local y recrear en prod.
Sin cambios de código; solo archivos `.md` + esta nota. Campos de cada ficha verificados
contra la UI actual (`AgentConfig`, `CreatePromptForm`/`CreateSkillForm`, `MCPServerForm`) y tipos
de `packages/data-provider`.

## Riesgo de merge
Nulo: carpeta nueva aislada, no toca `client/`, `api/` ni `packages/`. En rebase solo puede
colisionar si alguien crea otra carpeta con el mismo nombre.

## Validación
- [ ] Registrar 1 skill + 1 prompt + 1 agente en local (Creador) y probar con Consumidor.
- [ ] Compartir a grupo Entra y confirmar que aparece en el marketplace del miembro.
- [ ] En prod: recrear con modelos del gateway real (retirar `qvision-sim`) y secretos en KeyVault/`.env`.
- [ ] Si el catálogo pasa ~15 items o hay skills con archivos, evaluar dump selectivo
  (`Role`, `Agent`, `Skill`+`SkillFile`, `MCPServer`, `PromptGroup` + volumen `uploads/`) en vez de carga manual (ver `docs/08` §6).
