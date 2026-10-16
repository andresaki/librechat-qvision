# Code Interpreter — qué promete el README, qué pasó en el laboratorio Windows, y qué cambia en producción

**Fecha:** 2026-10-13  
**Contexto:** laboratorio Q-Vision (LibreChat v0.8.8-rc3 + Code Interpreter v1.10.4).  
**Estado actual:** Run Code funciona en local (bash y Python, adjuntos CSV/Excel). Este documento explica *por qué* no bastó clonar el repo y hacer `docker compose up`.

Repos:

| Pieza | Ruta en el laboratorio |
|---|---|
| LibreChat (fork Q-Vision) | `C:\Users\AndresDanielHerrera\Documents\Laboratorio\librechat\LibreChat` |
| Code Interpreter | `C:\Users\AndresDanielHerrera\Documents\Laboratorio\code-interpreter` |

---

## 1. Qué dice la documentación oficial (y qué se malinterpreta)

LibreChat no ejecuta código *dentro* del contenedor del chat. Run Code / `execute_code` llama a un **servicio aparte** ([LibreChat-AI/code-interpreter](https://github.com/LibreChat-AI/code-interpreter), internamente `codeapi`).

El mensaje típico de onboarding es:

1. Clonar el repo del Code Interpreter.
2. Seguir el README / Compose.
3. Apuntar LibreChat con una URL (`LIBRECHAT_CODE_BASEURL`) y autenticación (API key o JWT).
4. Levantar con Docker y listo.

Eso es **cierto en el camino feliz**: Linux (o WSL2 con KVM), imagen sandbox **microVM**, paquetes de runtime **ya horneados** en el block-root, MinIO/quay accesible, healthchecks de la imagen, y archivos de paquete escritos en Unix (LF, sin BOM).

El laboratorio corre en **Windows + Docker Desktop**, sin `/dev/kvm`. El README del propio Code Interpreter distingue dos modos:

| Modo | Flag | Aislamiento | Uso que el upstream considera |
|---|---|---|---|
| **MicroVM** (libkrun) | `KVM_ENABLED=true` (default) | Kernel invitado + NsJail dentro | Camino “duro” / más cercano a prod |
| **NsJail directo** | `KVM_ENABLED=false` | Comparte el kernel del contenedor | **Desarrollo local**, no código no confiable |

En Windows no hay passthrough de KVM al stack de Compose. El laboratorio **tuvo** que usar NsJail directo. En ese modo los runtimes **no vienen dentro de la imagen**: hay que poblar `data/pkgs` (`build-packages.sh`). El README lo menciona como “package-init PVC / direct NsJail development”; no es un `compose up` único.

Además hay **dos stacks** (LibreChat y Code Interpreter). “Asociar por API” es necesario pero insuficiente: hay que alinear JWT, manifiesto hardened, permisos de rol, capabilities del agente y un modelo que acepte tools.

---

## 2. Cómo es realmente la cadena (por qué el chat mentía)

```
Usuario (Quinn) → LibreChat API → Code API :3112 (JWT)
  → Redis → service-worker → sandbox-runner :2000 (NsJail + runtime)
  → file_server / MinIO → adjunto en el chat
```

Si **cualquier** eslabón falla, el modelo ve textos genéricos:

- “Code execution is temporarily unavailable”
- 502 / “sandbox caído”
- “error del intérprete de bash”

Eso **no** significa que Claude/GPT esté roto. Significa que Code API respondió 4xx/5xx o que NsJail devolvió exit 127/137.

La UI a veces muestra **“Created usuarios.csv”** aunque el archivo no exista: registra el *intento* de `bash_tool` / `create_file`. El adjunto descargable solo aparece cuando el sandbox escribe en `/mnt/data` y el file server lo publica.

---

## 3. Problemas que sí ocurrieron (y por qué)

Orden aproximado de aparición. Varios conviven: arreglar uno destapa el siguiente.

### 3.1 Windows no es el target de Compose “tal cual”

**Síntoma:** Compose desde WSL fallaba el mount; `/dev/kvm` no existe; cgroup v2 rompe NsJail.

**Por qué:** `docker-compose.yaml` asume Linux con KVM (`devices: /dev/kvm`) y healthcheck `/usr/local/bin/sandbox-runner-healthcheck.sh`. La imagen **direct** (NsJail) no trae ese script.

**Qué se hizo:** override `docker-compose.windows-nokvm.override.yml`:

- `devices: !reset null`
- caps `SYS_ADMIN`, `SYS_CHROOT`, `SETUID`, `SETGID`
- `SANDBOX_USE_CGROUPV2=false`
- `SANDBOX_PIPE_ADDON=/usr/local/lib/anonymous-pipes.node` (sin esto NsJail no arranca jobs)
- healthcheck `GET /api/v2/runtimes` vía `bun`
- `service-worker` con `depends_on: service_started` (no `service_healthy` del script inexistente)
- MinIO `elestio/minio:latest` (quay.io devolvía 401)

**No copiar este override a producción Linux.**

### 3.2 MinIO / quay.io 401

**Síntoma:** el servicio `minio` no baja la imagen oficial.

**Por qué:** restricción de registry en este entorno, no un bug de LibreChat.

**Prod:** usar el registry que Infra autorice (ECR, Harbor, MinIO oficial, o S3 real). No depende de `elestio/minio`.

### 3.3 Manifiesto hardened (`X-CodeAPI-Execution-Manifest`)

**Síntoma:** sandbox 401 → UI 502. Logs: *Execution-Manifest is required*.

**Por qué:** con `CODEAPI_HARDENED_SANDBOX_MODE=true` (default) cada job lleva un manifiesto firmado (worker ↔ sandbox ↔ egress). Poner `HARDENED=false` “para probar” **rompe** el sandbox, que sigue exigiendo el header.

**Lección:** no desactivar hardened para debug; alinear claves worker/sandbox.

### 3.4 `data/pkgs` vacío → runtimes `[]`

**Síntoma:** `python-3.14.4 runtime is unknown` / `bash-5.2.0 runtime is unknown`. Chat: sandbox no disponible.

**Por qué:** en NsJail directo el sandbox **solo** conoce lenguajes con `.package-installed` bajo `data/pkgs`. `docker compose up` **no** construye Python/Node/Bash. `build-packages.sh` es un paso extra (compila CPython ~15–30 min, pip, etc.).

**Fricción Windows extra:**

| Intento | Resultado |
|---|---|
| `./build-packages.sh` en Ubuntu WSL | No hay `docker` (faltaba WSL integration) |
| Git Bash + Docker Desktop | MSYS convierte rutas (`.../pkgs;C` en `docker cp`) |
| pip masivo en el builder | OOM, exit **137** (poca RAM de Docker Desktop) |
| Escribir `pkg-info.json` / `run` desde el editor en Windows | **BOM UTF-8** y **CRLF** (ver 3.6) |

**Qué quedó:** Python 3.14.4 + pip (`openpyxl`, `pandas`, …) y bash 5.2.0 con marcadores `.package-installed`.

### 3.5 Healthcheck roto → `service-worker` en Created

**Síntoma:** `dependency failed to start: sandbox-runner is unhealthy`. Worker no consume la cola. API health 200, pero ninguna ejecución real.

**Por qué:** Compose espera `service_healthy`; el healthcheck por defecto apunta a un script **ausente** en la imagen direct. El proceso NsJail podía estar bien (`smoke test passed`) y Docker lo marcaba unhealthy.

### 3.6 Wrapper bash con BOM + CRLF → exit 127 (el fallo del CSV)

**Síntoma (chat):** “error del intérprete de bash”; “Created usuarios.csv” repetido; no hay descarga.

**Stderr real:**

```
/pkgs/bash/5.2.0/run: line 1: ﻿#!/bin/bash: No such file or directory
bash: script.sh\r: No such file or directory
```

**Por qué:** el archivo `data/pkgs/bash/5.2.0/run` se generó en Windows:

1. BOM (`EF BB BF`) → el kernel busca un binario llamado `﻿#!/bin/bash`.
2. CRLF → bash busca `script.sh\r`.

Python no usaba ese wrapper; el modelo, para un `.csv`, llama **`bash_tool`**. Por eso el Excel/CSV “no funcionaba” aunque el API ya respondiera 200 en smokes de Python.

**Fix:** `run` y `.env` en UTF-8 **LF, sin BOM**:

```bash
#!/bin/bash
exec /bin/bash "$@"
```

Smoke posterior: bash CSV en `/mnt/data` y Python `print` → **code 0**.

### 3.7 Modelo / agente (no es el sandbox)

| Síntoma | Causa |
|---|---|
| 400 `Function tools with reasoning_effort are not supported` | gpt-5.6 + tools + reasoning; OpenAI, no Code API |
| El agente no llama código | Falta `execute_code` en el agente y/o `RUN_CODE.USE` en el rol |
| JWT OK pero 409 profile | `X-CodeAPI-Expected-Profile` vs perfil del deployment |

Mitigación de laboratorio: Claude Opus / gpt-4o; si gpt-5.6, **Reasoning effort = None**.

---

## 4. Por qué “clonar + README + API + Docker” no bastó aquí

Resumen en una frase: **el README describe el camino Linux/microVM; el laboratorio es Windows/NsJail directo, y encima hay que cablear LibreChat (JWT, yaml, roles, agente).**

Checklist de lo que *sí* hace falta además del clone:

1. Pin de tag (`v1.10.4`), no `main`.
2. Override Windows (solo lab) o KVM en Linux.
3. `build-packages.sh` (o imagen microVM con runtimes horneados).
4. Archivos de `pkgs` en Unix (LF, sin BOM) — nunca editar `run`/`pkg-info.json` con Notepad.
5. JWT emparejado (`scripts/setup-local-auth-env.js` o equivalente) — no hardcodear secretos en yaml.
6. LibreChat: `LIBRECHAT_CODE_BASEURL`, `CODEAPI_AUTH_PROVIDER=librechat-jwt`, `interface.runCode`, `execute_code`, `RUN_CODE.USE`.
7. Worker **Up** (no solo API healthy).
8. Agente Quinn con la tool guardada y modelo compatible.

---

## 5. Qué hacer en producción (no repetir el laboratorio)

El laboratorio **demuestra** Run Code. **No** es la receta de prod. NsJail directo comparte kernel; el README lo dice: solo para desarrollo.

### 5.1 Plataforma

| Laboratorio | Producción (recomendado) |
|---|---|
| Windows + Docker Desktop | Linux (VM o Kubernetes) con **KVM** |
| `KVM_ENABLED=false`, override nokvm | **MicroVM** (`KVM_ENABLED=true`) |
| Caps SYS_ADMIN en el runner | Aislamiento por kernel invitado; menos confianza en el host |
| `data/pkgs` montado desde NTFS | Runtimes en imagen/PVC Linux; build en CI Linux |
| MinIO `elestio` | S3 (o MinIO interno) con credenciales de Infra |
| Redis/MinIO en el mismo compose de laptop | Redis/S3 gestionados, backups, red interna |

### 5.2 Seguridad y secretos

- Mantener **`CODEAPI_HARDENED_SANDBOX_MODE=true`**.
- Rotar `CODEAPI_JWT_*`, manifiesto Ed25519, `CODEAPI_INTERNAL_SERVICE_TOKEN`, `CODEAPI_EGRESS_GRANT_SECRET` — **solo en secretos** (no en git, no en `librechat.yaml`).
- LibreChat habla con Code API por red **interna** (no publicar `:3112` / `:2000` a Internet).
- Egress gateway + ledger: no abrir salida libre desde el sandbox hacia la LAN corporativa.
- No ejecutar código de usuarios no confiables en NsJail-only.

### 5.3 Empaquetado y CI

- Construir `pkgs` (o la imagen block-root) en **Linux CI**, artefactos con LF.
- No usar Git Bash/MSYS para `docker cp` hacia volúmenes de runtime.
- RAM del builder pip: el laboratorio vio OOM (137); en CI, máquina con ≥8 GB para el job de paquetes.
- Pin de versiones Python/Node/Bun alineado con lo que LibreChat pide (`python-3.14.4`, `bash-5.2.0` en este tag).

### 5.4 Healthchecks y operación

- En microVM, usar el healthcheck **oficial** de la imagen (`sandbox-runner-healthcheck.sh`).
- El healthcheck de laboratorio (`bun` → `/runtimes`) es un parche de la imagen *direct*.
- Alertar si `service-worker` no está Ready: API 200 con worker caído = chat “sandbox caído”.
- Reloj: manifests con TTL corto; drift de reloj del guest mata jobs (`not_yet_valid`). NTP en nodos.

### 5.5 LibreChat (Quinn)

- `LIBRECHAT_CODE_BASEURL` al Service interno (no `host.docker.internal`).
- Roles: `RUN_CODE.USE` solo a quien deba ejecutar código (el roadmap de prod llegó a dejarlo OFF; si se activa Run Code en prod, es **decisión de gobierno**, no un default).
- Agentes con `execute_code` guardado; lista de modelos que soporten tools.
- Rebuild de imagen frontend si cambia UI; restart de `api` basta para `.env`/yaml.

### 5.6 Qué no llevar a prod desde este lab

- `docker-compose.windows-nokvm.override.yml` (caps, nokvm, minio elestio, healthcheck bun).
- Rutas `host.docker.internal`.
- Paquetes editados a mano en NTFS.
- `CODEAPI_HARDENED_SANDBOX_MODE=false`.
- WSL integration como dependencia de arranque (en prod no hay Docker Desktop).

### 5.7 Alternativa: Remote Code Bridge

Si Infra no quiere KVM en el nodo de LibreChat: worker outbound a una VM Linux dedicada (`remote-bridge`). Sigue haciendo falta Linux+NsJail/microVM **en esa VM**, no en Windows.

---

## 6. Cómo verificar (lab y prod)

1. `GET {CODE_BASE}/health` → 200 desde el contenedor de LibreChat.
2. `GET sandbox:2000/api/v2/runtimes` → lista no vacía (`python`, `bash`, …).
3. `POST {CODE_BASE}/exec` con JWT de LibreChat: Python `print("ok")` y bash `echo ok` → **code 0**.
4. En Quinn: “Genera usuarios.csv / un xlsx y adjúntalo” → **descarga**, no solo “Created …”.
5. Logs `service-worker`: no `runtime is unknown`, no exit 127 por `\r`, no missing manifest.

---

## 7. Referencias internas

- `BRECHAS.md` — sección Code Interpreter (estado).
- `CHANGELOG.md` — 2026-10-09 (stack JWT) y 2026-10-13 (BOM/CRLF bash).
- `docs/08-Roadmap-Produccion-Quinn.md` — toggle `runCode` / `RUN_CODE.USE` como decisión de producto.
- Code Interpreter: `README.md` (modos KVM vs NsJail), `build-packages.sh`, `docker-compose.windows-nokvm.override.yml` (solo lab).
