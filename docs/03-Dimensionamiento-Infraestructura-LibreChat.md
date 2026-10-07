# Dimensionamiento de infraestructura — LibreChat (Q-Vision)

**Alcance:** solo LibreChat autoalojado. Este documento responde al punto de modelación de la actividad 3 del laboratorio: qué equipo y qué alojamiento hacen falta para operar la plataforma, más el esfuerzo de operación. No es una lista de precios de licencias ni de tokens.

**Fecha de la medición de laboratorio:** 2026-09-24. Los contenedores llevaban entre 18 y 26 horas en marcha, sin carga de usuarios (instancia de prueba, no de producción).

**Modelos:** en este diseño el cómputo del modelo no ocurre en el servidor de LibreChat. La API de LibreChat habla con proveedores externos (OpenAI, Anthropic u otro, vía el AI Gateway del laboratorio). Por eso el servidor **no necesita GPU**. La GPU solo entra si más adelante se decide correr el modelo o los embeddings dentro de la propia infraestructura; ese caso está al final, como variante, no como línea base.

---

## 1. Qué hay que mantener encendido

`docker compose` levanta el stack completo. En este laboratorio son siete servicios:

| Servicio | Contenedor | Función | Crece con usuarios | Crece con documentos |
|---|---|---|---|---|
| `api` | LibreChat | Aplicación (chat, agentes, SSO, archivos) | Sí (sesiones simultáneas) | Poco |
| `admin-panel` | admin-panel | Panel de roles, permisos y gobierno | No (pocos administradores) | No |
| `ai-gateway` | ai-gateway-qvision | Puerta de salida hacia los proveedores de modelo | Sí, pero es casi solo red | No |
| `mongodb` | chat-mongodb | Usuarios, conversaciones, agentes, roles, ACL | Sí (historial de chat) | Poco |
| `meilisearch` | chat-meilisearch | Búsqueda de conversaciones | Sí (índice de mensajes) | Poco |
| `vectordb` | vectordb | PostgreSQL + pgvector, índice del RAG | Poco | Sí |
| `rag_api` | rag_api | Trocea documentos, pide embeddings y consulta el índice | Poco en consulta | Sí al indexar |

Imagen de RAG en uso: `librechat-rag-api-dev-lite`. En reposo usa ~176 MB, coherente con embeddings por API del proveedor y no con un modelo de embeddings cargado en local.

Fuera de este compose, y por tanto **no** incluidos en los números de abajo:

- Intérprete de código (stack de ClickHouse). En el laboratorio no está levantado.
- Redis (haría falta si se activan tareas programadas de agentes con `USE_REDIS_STREAMS`).
- Proxy inverso (Caddy o Nginx) para HTTPS y el dominio corporativo. Es un servicio pequeño adicional en producción; no cambia el orden de magnitud de la máquina.

---

## 2. Línea base medida en el laboratorio

Host de la medición: Docker Desktop, **7,6 GB** de RAM visibles para los contenedores. Esa máquina alcanza para la demo. No es el tamaño recomendado para 100 usuarios.

Uso en reposo (`docker stats`, sin usuarios chateando):

| Contenedor | RAM | CPU |
|---|---|---|
| LibreChat (`api`) | 295 MB | 0,2 % |
| admin-panel | 135 MB | 1,4 % |
| rag_api | 176 MB | 0,3 % |
| chat-mongodb | 111 MB | 1,1 % |
| chat-meilisearch | 100 MB | 0,4 % |
| vectordb | 34 MB | ~0 % |
| ai-gateway-qvision | 12 MB | ~0 % |
| **Suma** | **~0,85 GB** | **< 4 %** |

El piso que publica LibreChat para un despliegue mínimo es 1 GB de RAM y 1 vCPU, con 2 GB si se activan todas las funciones ([documentación de despliegue remoto](https://www.librechat.ai/docs/remote)). Ese piso es una instalación personal. A partir de aquí el tamaño lo marcan tres cosas distintas: sesiones simultáneas, historial, y corpus de RAG.

---

## 3. Supuestos de los tres escenarios

Los 100 / 200 / 300 son **usuarios registrados** (cuentas que pueden entrar), no personas pegadas al chat al mismo tiempo.

| | 100 usuarios | 200 usuarios | 300 usuarios |
|---|---|---|---|
| Lectura organizativa | Un área intensa (p. ej. I+D) o varias áreas livianas | Varias áreas usando la plataforma a diario | Compañía pequeña-mediana, uso habitual |
| Sesiones abiertas en hora pico (≈ 20 %) | ~20 | ~40 | ~60 |
| Generaciones simultáneas (alguien esperando una respuesta) | ~8 | ~15 | ~25 |
| Corpus RAG de partida | Miles de páginas / unos miles de archivos | Decenas de miles de fragmentos | El mismo orden, con más margen de disco |

Esos porcentajes son de planificación, no una prueba de carga. Un 20 % concurrente en hora laboral es conservador para una herramienta interna de chat. Si la adopción real se queda en un 5–10 % concurrente, la misma máquina sobra.

Otras premisas:

- Un solo servidor (o una sola VM). Alta disponibilidad queda fuera del laboratorio y duplicaría el equipo.
- Modelos y embeddings por API. El servidor espera red; no calcula el modelo.
- Indexación masiva de documentos en horario no laboral. Indexar todo el corpus a mediodía compite por CPU con el chat.
- MongoDB, Meilisearch y pgvector con límite de memoria explícito. Sin límite, MongoDB calcula su caché sobre la RAM del host y se come el margen del resto.

---

## 4. Máquina recomendada

| Recurso | 100 usuarios | 200 usuarios | 300 usuarios |
|---|---|---|---|
| vCPU | 4 | 8 | 8 |
| RAM | 16 GB | 24 GB | 32 GB |
| Disco SSD | 100 GB | 200 GB | 300 GB |
| GPU | Ninguna | Ninguna | Ninguna |
| Red | Salida HTTPS hacia Entra ID, Graph y el proveedor de modelos. Unos pocos Mbps cubren 25 respuestas en streaming a la vez | Igual | Igual |

Reparto orientativo de RAM dentro de esa máquina (límites de contenedor, no el uso en reposo):

| Servicio | 100 | 200 | 300 |
|---|---|---|---|
| `api` | 2 GB | 3 GB | 4 GB |
| `mongodb` | 4 GB | 6 GB | 8 GB |
| `meilisearch` | 2 GB | 3 GB | 4 GB |
| `vectordb` | 2 GB | 3 GB | 4 GB |
| `rag_api` | 1 GB | 1,5 GB | 2 GB |
| `admin-panel` | 0,5 GB | 0,5 GB | 0,5 GB |
| `ai-gateway` | 0,25 GB | 0,5 GB | 0,5 GB |
| Sistema + Docker + margen | ~4 GB | ~6 GB | ~9 GB |

CPU en el escenario de 300: 2 núcleos para la API, 2 para MongoDB, 1 para Meilisearch, 1 para pgvector, 1 para RAG en picos de indexación, 1 de margen. Con 8 generaciones simultáneas la API casi no usa CPU, porque está esperando al proveedor. El cuello aparece en MongoDB y en el índice si todo el mundo busca y escribe a la vez, o si alguien reindexa el corpus en horario laboral.

---

## 5. Disco: qué ocupa cada cosa

| Qué | Orden de magnitud | Depende de |
|---|---|---|
| Sistema operativo + imágenes Docker del stack | 20–30 GB | Versiones de imagen, no de usuarios |
| Historial de chat en MongoDB (texto + índices) | ~1–3 GB por cada 100 usuarios al año | Mensajes guardados, no del tamaño del modelo |
| Índice de Meilisearch | Similar al texto indexado, a menudo 1–2× | Historial que se deja buscable |
| Archivos subidos (`uploads`) | Planificar 20–50 GB por cada 100 usuarios | Cuántos PDF, PPTX e imágenes se adjuntan |
| Vectores del RAG (pgvector) | ~10–30 GB para unos 10 000 documentos; ~50–150 GB si el corpus pasa de ~100 000 | Tamaño del conocimiento, no del número de cuentas |
| Logs y respaldos locales | Reservar 20–40 GB | Política de retención |

El disco de 300 GB del escenario mayor aguanta un año de chat de 300 personas más un corpus mediano. El crecimiento que hay que vigilar es el de **archivos subidos** y el de **vectores**, no el de la aplicación.

Los tokens no engordan el disco de forma relevante: lo que se guarda es el texto de la conversación. El consumo de tokens lo factura el proveedor de la API y escala con el uso (cuántas preguntas, qué modelo, si hay RAG o agentes), no con el número de contenedores. Subir de 100 a 300 usuarios no obliga a cambiar de arquitectura; obliga a más RAM, más disco y, si el pico concurrente se acerca a ~50 generaciones a la vez, más CPU o un segundo nodo de API.

---

## 6. Punto de equilibrio de capacidad

Con modelos por API, **una sola VM de 8 vCPU, 32 GB de RAM y 300 GB SSD cubre los tres escenarios** si el pico se mantiene cerca del 20 % de sesiones abiertas (unas 25 generaciones a la vez en el caso de 300).

Conviene separar servicios, o subir la máquina, cuando ocurra cualquiera de estas tres cosas:

1. **Pico de chat.** Más de ~40–50 generaciones sostenidas a la vez. Ahí el primer paso es dar más CPU y RAM a `api` y a MongoDB, no añadir GPU.
2. **Corpus grande.** Meilisearch + pgvector piden más de ~8 GB entre los dos, o el disco de vectores y adjuntos pasa de ~200 GB. El paso siguiente es disco y RAM de esos dos servicios, o moverlos a su propia VM.
3. **Modelo propio.** Si Q-Vision deja de llamar a una API y corre un modelo local (Ollama, vLLM u otro), el equilibrio cambia de sitio: el stack de esta tabla sigue siendo la parte pequeña, y la GPU pasa a ser el requisito dominante. Orden de magnitud, no una cotización: un modelo de 7–8B en 4-bit cabe en una GPU de 8–12 GB de VRAM y sirve pocas sesiones a la vez; un modelo de clase 70B pide una o más GPU de 48–80 GB y deja de ser "el mismo servidor del chat". Los embeddings locales sin GPU también valen, pero alargan la indexación y piden varios núcleos y 2–4 GB extra de RAM en `rag_api`.

Por debajo de 100 usuarios registrados la máquina de 4 vCPU y 16 GB ya tiene margen. El laboratorio actual (≈ 8 GB compartidos con el escritorio) sirve para configurar y demostrar, no para esa carga.

---

## 7. Operación y mantenimiento

A este tamaño no hace falta un equipo dedicado. Hace falta una persona de infraestructura con una fracción de su tiempo, y un administrador funcional de la plataforma.

| Tarea | Cada cuánto | Quién | Qué implica |
|---|---|---|---|
| Parches de imágenes (`api`, MongoDB, Meilisearch, pgvector, RAG) y reinicio del contenedor afectado | Mensual, o cuando haya un aviso de seguridad | Infra | Ventana corta. No hace falta bajar volúmenes |
| Copia de MongoDB, volumen de pgvector, `uploads` y datos de Meilisearch | Diaria | Infra | Probar una restauración al menos una vez por trimestre |
| Disco, RAM y reinicios | Semanal, mirando alertas | Infra | Lo que crece son adjuntos y vectores |
| Certificado TLS, DNS, proxy inverso | Al vencer el certificado | Infra | Un servicio delante de los puertos 3080 (chat) y 3000 (panel) |
| Rotación del secreto de la app de Entra ID y de las claves del gateway | Según política de Q-Vision | Infra + quien administra Entra | Las claves viven en `.env`, no en `librechat.yaml` |
| Roles, grupos, marketplace, cuotas por usuario, `librechat.yaml` | Cuando cambia la organización | Admin funcional de LibreChat | Es configuración, no un redespliegue |
| Reindexar conocimiento | Cuando entra un lote grande de documentos | Admin funcional, en horario bajo | Compite por CPU con el chat si se hace de día |

Estimación de dedicación para los tres escenarios, con un solo servidor y sin modelo local: **unas pocas horas al mes de infra** (más el día de una actualización grande) y **administración funcional según el ritmo de altas, agentes y documentos**. No escala de forma lineal de 100 a 300 usuarios: el mismo procedimiento opera los tres tamaños. Lo que sí crece es el volumen de respaldo y el tiempo de restaurarlo.

Alta disponibilidad (dos nodos, MongoDB en réplica, balanceador) no está en estos números. Si se pidiera, el equipo de aplicación se duplica y la operación deja de ser "unas horas al mes".

---

## 8. Beneficios de este modelo de despliegue

Estos puntos son cualitativos. No dependen del escenario de 100, 200 o 300; el tamaño de la máquina no los cambia.

| Tema | Cómo se materializa en este stack |
|---|---|
| Control de datos | Conversaciones, adjuntos, roles y vectores quedan en el disco de Q-Vision (`mongodb`, `uploads`, `vectordb`). El proveedor del modelo ve el texto que se le envía en cada pregunta; no aloja la base de usuarios ni el histórico. |
| Flexibilidad | Cambiar o mezclar proveedores (OpenAI, Anthropic, Azure OpenAI, otro detrás del AI Gateway) no cambia los contenedores ni la máquina. El gateway ya está en el compose del laboratorio. |
| Velocidad de adopción | Un usuario nuevo es una cuenta de Entra ID que ya puede entrar. No hay una licencia que aprovisionar por persona. El límite práctico es la máquina de la sección 4 y la cuota de tokens que se asigne en LibreChat, no un puesto de software. |
| Curva de aprendizaje | Quien solo chatea reconoce la interfaz. Quien crea agentes aprende el marketplace, los permisos y el RAG. Quien opera aprende Compose, `.env`, `librechat.yaml` y el panel de administración. Esa curva es de unas pocas personas, no de los 300. |
| Gobierno | Roles, grupos sincronizados desde Entra ID, visibilidad privado/grupo/público y saldo de tokens por usuario se administran en la propia instancia. El panel (`admin-panel`) es parte del stack medido. |

---

## 9. Qué no cubre esta estimación

- No hubo prueba de carga. Los tres escenarios salen del reposo medido el 2026-09-24, del piso publicado por LibreChat y del reparto habitual de estos servicios bajo concurrencia de chat con modelo remoto.
- No incluye el gasto variable de tokens del proveedor. Ese gasto sigue al uso (modelo, longitud, RAG, agentes), no al tamaño de la VM.
- No incluye intérprete de código, Redis ni un segundo sitio para continuidad. Sumarlos añade contenedores y RAM en el orden de 1–4 GB, no una GPU.
- El escenario con GPU de la sección 6 es una frontera de arquitectura. No es el despliegue que está corriendo en el laboratorio.
