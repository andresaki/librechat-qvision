# Requisitos Funcionales – LibreChat como Plataforma de IA Organizacional (Q-Vision)

**Contexto:** Laboratorio comparativo LibreChat vs. Microsoft Copilot. Este documento cubre únicamente el bloque de **LibreChat**: qué se necesita que la plataforma haga, a nivel de configuración (sin modificar código fuente), para que sirva de base al caso de uso de "Agentes propios con skills/MCP" y "Control de acceso por rol" del laboratorio.

**Objetivo estratégico de fondo (según la llamada con Jorge Rubio):** el laboratorio no es el fin en sí mismo — es un paso previo para decidir el modelo de **Gobierno de IA para toda la organización** (políticas, buenas prácticas, pautas de uso). Este documento valida si LibreChat puede sostener ese gobierno, o si haría falta Copilot, o un modelo híbrido.

**Alcance del entregable:** Configuración de una instancia local de LibreChat (Docker) que refleje un despliegue organizacional realista de Q-Vision, para poder evaluarla frente a Microsoft Copilot / Copilot Studio en la matriz de capacidades.

**Requisito de forma del entregable (no solo de fondo):** el día de la revisión hay que iniciar sesión en vivo con al menos 3 usuarios distintos (uno admin/creador, uno "consumidor" de un departamento, y opcionalmente un tercer perfil) y navegar mostrando en pantalla que cada uno tiene una vista y capacidades distintas según su rol — no basta con documentarlo por escrito. Los agentes/skills de prueba usados para esta demo pueden ser básicos (tipo demo), no requieren sofisticación.

---

## 1. Despliegue base

| Requisito | Descripción |
|---|---|
| 1.1 | LibreChat debe correr localmente (Docker Compose), con MongoDB, y opcionalmente Meilisearch (búsqueda) y RAG API (conocimiento propio). |
| 1.2 | El despliegue debe quedar documentado como si fuera para toda la organización (multi-usuario), no como instancia personal. |
| 1.3 | Debe existir al menos un usuario `ADMIN` (la primera cuenta registrada) y varios usuarios `USER` de prueba, uno por departamento. |
| 1.4 | El nombre/branding de la instancia (`APP_TITLE`, logo, footer) debe reflejar que es la plataforma de IA de Q-Vision. |

## 2. Autenticación empresarial (Microsoft 365 / Entra ID)

| Requisito | Descripción |
|---|---|
| 2.1 | Los usuarios deben autenticarse con su cuenta corporativa Microsoft 365 (`@qvision.us` / `@qvision.com`), vía **SSO OIDC contra Azure Entra ID**. No se requiere registro local con correo/contraseña para usuarios finales. |
| 2.2 | El login local (email/password) puede quedar deshabilitado o solo disponible para el `ADMIN` de respaldo. |
| 2.3 | El acceso debe poder restringirse a usuarios/grupos específicos del tenant (evitar que cualquier cuenta Microsoft externa entre), usando el claim de rol/grupo de Entra ID. |
| 2.4 | Los **grupos de Microsoft 365 / Entra ID** (Devs, Infra, Marketing, People, RH) deben sincronizarse a LibreChat automáticamente al iniciar sesión (vía Microsoft Graph + reutilización de tokens), de forma que no haya que mantener membresías manualmente en dos sitios. |
| 2.5 | (Opcional/avanzado) Integración con SharePoint/OneDrive de la organización para que los usuarios puedan adjuntar archivos corporativos directamente desde el chat, respetando los permisos que ya tienen en SharePoint. |

## 3. Estructura organizacional: Departamentos / Grupos

| Requisito | Descripción |
|---|---|
| 3.1 | Deben existir (mínimo) los grupos: **Devs, Infra, Marketing, People, RH**, reflejando la estructura real de Q-Vision. |
| 3.2 | Cada usuario de prueba debe pertenecer a su grupo correspondiente (sincronizado desde Entra ID o creado localmente como alternativa si no se dispone de un tenant real para el laboratorio). |
| 3.3 | Debe ser posible compartir un recurso (agente, MCP, skill, tool, prompt) con **un grupo completo** en una sola acción, sin tener que añadir usuario por usuario. |
| 3.4 | Debe ser posible dar a un grupo/departamento una configuración diferenciada (por ejemplo, que "Devs" tenga acceso a MCP de código/GitHub y que "RH" no los vea), sin que esto implique instancias separadas de LibreChat. |
| 3.5 | (Deseable) Cada departamento puede tener límites o comportamientos propios (modelos disponibles, límite de recursión de agentes, etc.) distintos del resto de la organización. |

> **Nota de alcance:** LibreChat no tiene un concepto de "Workspace" nombrado como pantalla propia (tipo Slack/Notion). El equivalente funcional se logra combinando **Grupos** + **Roles personalizados** + **Proyecto Global** + **anulaciones de configuración por grupo/rol** + el **ACL** de cada recurso. Este documento usa "Workspace de departamento" para referirse a esa combinación lógica. El documento 2 explica cómo se configura cada pieza.

## 4. Marketplace interno de Agentes, Skills, MCP y Tools

| Requisito | Descripción |
|---|---|
| 4.1 | Debe existir una vista tipo **Marketplace** dentro de LibreChat donde los usuarios vean, en pestañas (tabs), los distintos tipos de elementos: **Agentes**, **Skills**, **Servidores MCP**, **Tools/Prompts**. |
| 4.2 | Cada elemento del marketplace debe mostrarse como una **card** con, como mínimo: nombre, descripción, autor/creador, y un botón de acción ("Usar" / "Implementar" / "Agregar a mis herramientas"). |
| 4.3 | Al pulsar el botón de acción, el usuario debe poder empezar a usar el elemento inmediatamente (nuevo chat con el agente, herramienta añadida a su agente, servidor MCP conectado, etc.), sin pasos manuales de configuración adicionales cuando el creador ya lo dejó listo. |
| 4.4 | El marketplace debe respetar la visibilidad de cada elemento (ver punto 6): un usuario solo debe ver ahí lo que es público, lo de su(s) grupo(s), o lo que es suyo. |
| 4.5 | Los administradores deben poder ver/moderar/retirar cualquier elemento publicado globalmente en el marketplace, incluso si no son sus dueños (gobierno de contenido). |

## 5. Creación de elementos: solo usuarios con permiso

| Requisito | Descripción |
|---|---|
| 5.1 | No todos los usuarios pueden **crear** Agentes / Skills / servidores MCP / Tools — solo quienes tengan el permiso correspondiente. |
| 5.2 | Debe poder definirse, por ejemplo, que el grupo/rol **Devs** sí pueda crear MCP y Skills, mientras que **Marketing** o **RH** solo puedan *usar* lo que ya existe (consumo, no creación). |
| 5.3 | El permiso de **crear** debe ser independiente del permiso de **usar**: un usuario puede tener acceso a usar el marketplace sin tener permiso de publicar nada nuevo. |
| 5.4 | El permiso de **compartir públicamente** (visible para toda la organización) debe ser distinguible del permiso de **compartir** (a usuarios/grupos puntuales): un creador puede tener permiso de compartir con su equipo, pero no de publicarlo para toda Q-Vision, salvo que un admin lo autorice. |
| 5.5 | Los administradores conservan control total sobre cualquier recurso de la instancia, independientemente de quién lo creó. |

> **Hallazgo de validación (2026-09-24) — corrige el supuesto de este documento:** se asumió que un usuario podía tener varios roles y que sus permisos se combinarían (unión). La implementación real del Admin Panel de LibreChat (v0.8.x) **no funciona así**: el campo `user.role` es único, y asignar un rol nuevo desde el panel (pestaña *Members* de un rol) **reemplaza** el rol anterior, no lo suma. En la práctica esto significa:
> - No es posible que una misma cuenta sea `ADMIN` y `Creador` al mismo tiempo desde el panel — es uno u otro.
> - El requisito 5.5 ("los admins conservan control total") sigue cumpliéndose porque el rol `ADMIN` de sistema ya trae sus propios permisos elevados, no porque se "sume" al rol de creador.
> - La tabla de "Concesiones del sistema" (delegación puntual de capacidades administrativas, ver documento 02) es el mecanismo a validar si se necesita dar un permiso administrativo puntual a alguien sin cambiarle su rol de creador/consumidor — queda pendiente de confirmar si ese mecanismo sí acumula independientemente del rol asignado.
> - Implicación para el diseño de la demo: se necesita una cuenta por cada rol a mostrar (no se puede mostrar "un mismo usuario con permisos combinados"), y el guion de la actividad 1 del laboratorio debe describir este comportamiento como una característica real de la plataforma, no como una limitación de la configuración del laboratorio.

## 6. Visibilidad de cada elemento: Privado / Grupo / Público

| Requisito | Descripción |
|---|---|
| 6.1 | Cuando un usuario con permiso crea un Agente, Skill, MCP o Tool, debe poder elegir su visibilidad: **Privado** (solo él), **Grupo(s) específico(s)** (uno o varios departamentos), o **Público** (toda la organización). |
| 6.2 | Debe poder otorgarse, por cada elemento compartido, un nivel de acceso: **Ver/usar (Viewer)**, **Ver y editar (Editor)**, o **Control total (Owner, puede volver a compartir o eliminar)**. |
| 6.3 | Un elemento compartido con un grupo debe llegar automáticamente a los miembros actuales y futuros de ese grupo (si el grupo viene sincronizado de Entra ID, sin trabajo manual adicional). |
| 6.4 | El creador original de un elemento debe conservar siempre el control total sobre él, sin importar a quién se lo haya compartido. |

## 7. Gobierno de consumo: presupuesto y cuotas de tokens

| Requisito | Descripción |
|---|---|
| 7.1 | Debe existir un presupuesto/cuota de tokens asignable **por usuario**, y validar si es posible además asignarlo **por grupo/departamento** (ej. I+D: 10.000 tokens, Infra/IT: 5.000, Marketing: 2.000), reflejando el nivel de consumo esperado de cada área. |
| 7.2 | Se debe entender y documentar cómo se comporta el consumo cuando un usuario tiene habilitados **varios proveedores de modelo a la vez** (Q-Vision ya cuenta con credenciales de Anthropic y OpenAI habilitadas): ¿el presupuesto se descuenta de una sola bolsa total, o de forma independiente por proveedor? |
| 7.3 | Debe quedar claro qué usuarios pueden solicitar credenciales/API keys adicionales (por ejemplo, de otro proveedor de modelo) y cómo se gestiona ese alta, para evitar consumos o gastos no controlados. |

## 8. Otras capacidades a validar (mencionadas explícitamente por el sponsor)

| Requisito | Descripción |
|---|---|
| 8.1 | **Integración con un AI Gateway**: que todo el tráfico y consumo de modelo que genera LibreChat pueda centralizarse/enrutarse a través de un gateway de IA corporativo (en lugar de ir directo a cada proveedor). |
| 8.2 | **Dimensionamiento de infraestructura**: no interesa el costo de licenciamiento (LibreChat es open source), sino estimar qué especificaciones de servidor (RAM, CPU, disco) se necesitan para soportar una carga de 100 a 200 usuarios, como insumo directo para el análisis de costos de la actividad 3 del laboratorio. |
| 8.3 | **Ejecución de código (Code Interpreter)**: validar el alcance real de esta capacidad dentro de LibreChat. |
| 8.4 | **Búsqueda documental interna** (más allá del RAG básico): validar qué tan robusta es la función de ayuda/búsqueda sobre documentación propia. |
| 8.5 | **Automatización tipo "Cowork"**: validar si LibreChat ofrece algo equivalente a flujos de trabajo agénticos tipo "Claude Cowork" / "ChatGPT" (automatización de tareas más allá del chat conversacional simple), como punto de comparación adicional frente a Copilot. |
| 8.6 | **Reutilización de MCP/Skills ya existentes en el mercado**: además de crear MCPs y Skills propios desde cero, debe demostrarse el flujo de **conectar/traer un MCP o skill que ya existe** en el ecosistema (ej. vía Smithery u otro catálogo) y consumirlo directamente en LibreChat, sin tener que construirlo. |

## 9. Casos de uso a validar en el laboratorio

1. Un dev crea un servidor **MCP** interno (p. ej. conexión a un repositorio o base de datos) y lo deja **privado** → solo él lo ve en el marketplace.
2. El mismo dev decide compartir ese MCP con el grupo **Devs** → todo el equipo de desarrollo lo ve y puede usarlo desde el marketplace, con nivel "Viewer".
3. Un usuario de **Marketing**, sin permiso de creación, entra al marketplace, ve un **Agente** publicado públicamente por People, y lo usa con un clic ("Implementar").
4. Un usuario de **RH**, sin permiso, intenta crear un Agente desde el builder → el sistema no le muestra la opción / la bloquea.
5. Un `ADMIN` revisa el marketplace completo, encuentra un agente publicado públicamente que no cumple una política interna, y lo despublica o elimina sin ser el dueño.
6. Verificar que el login solo es posible con cuentas `@qvision.us`/`@qvision.com` vía Microsoft 365, y que el usuario aparece automáticamente en su grupo/departamento correcto según Entra ID.
7. Consulta de conocimiento organizacional vía RAG (subir un documento interno y preguntar sobre su contenido), para alimentar el caso de uso de la actividad 1 del laboratorio.
8. Un usuario del área **Innovación** entra al marketplace y **no ve** agentes de "generación de leads" (exclusivos del equipo Comercial) ni skills de "análisis de código" — valida que la segmentación por grupo realmente oculta lo irrelevante para cada área, no solo restringe la creación.
9. Se demuestra el flujo de **traer un MCP ya existente en el mercado** (no creado por Q-Vision) y conectarlo/consumirlo en LibreChat, como alternativa al flujo de creación desde cero.
10. Sesión en vivo el día de revisión: login como 3 usuarios distintos (ej. Andrés=creador/admin, un usuario de Marketing=consumidor, un tercer perfil) navegando y mostrando las diferencias de vista/permisos entre ellos.

## 10. Requisitos no funcionales / gobierno

- **Autoalojado (self-hosted):** todos los datos, conversaciones y configuraciones quedan en infraestructura de Q-Vision (a diferencia del ecosistema Microsoft, que corre en el tenant/nube de Microsoft) — este es un punto clave del comparativo de gobernanza.
- **Multi-modelo:** debe quedar demostrado que se puede elegir/mezclar proveedores de modelos (OpenAI, Anthropic, Azure OpenAI, etc.) sin depender de un solo proveedor — insumo para el punto de "flexibilidad de modelos" del comparativo.
- **Trazabilidad:** los permisos otorgados y el uso deben quedar auditable (quién comparte qué, con quién).
- **No modificación de código:** todo lo anterior debe lograrse mediante `librechat.yaml`, variables de entorno (`.env`) y el Panel de Administración/UI — no mediante cambios al código fuente de LibreChat.

## 11. Fuera de alcance de este laboratorio

- Desarrollo de conectores o servidores MCP personalizados desde cero (se usarán ejemplos/plantillas existentes, además del flujo de "traer" un MCP ya existente).
- Migración de datos productivos reales de Q-Vision.
- Alta disponibilidad / balanceo de carga (se evalúa en un entorno controlado, no productivo).
- Comparación de costos de infraestructura detallada (se documenta en el análisis de costos, actividad 3 del laboratorio, no en este documento; aquí solo se estima el dimensionamiento de servidor necesario).
- Modificar código fuente de LibreChat: cualquier funcionalidad que no exista por configuración se documenta como "brecha"/backlog para una fase posterior, no se implementa en este laboratorio.

## 12. Nota de gestión del laboratorio

- Tiempo estipulado: **máximo 2 días** de exploración (miércoles y jueves), con entrega/revisión el **viernes**.
- Cualquier bloqueo (por ejemplo, falta de una credencial o permiso de infraestructura) debe reportarse de inmediato a Jorge Rubio o Verónica Bravo, sin esperar a la reunión de cierre.
- Al final de cada punto evaluado, debe quedar explícito si **sí se logra por configuración**, o si **requeriría desarrollo/código** (en cuyo caso se anota como propuesta futura, fuera del alcance actual).
