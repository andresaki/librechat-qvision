# Quinn · Kit de marca para desarrollo

Quinn es el asistente de apoyo de Q-Vision: la puerta de entrada única al chat y a los agentes de la organización.
Este kit trae todo lo necesario para implementar la marca en la aplicación.

**Logo elegido:** Destello (B). Es una «Q» con un destello ámbar como cola, sobre navy.

---

## 1. Contenido

```
quinn-brand-kit/
├── svg/        Vectores maestros (usar siempre que se pueda)
├── png/        Exportes rasterizados (256–1200 px)
├── favicon/    favicon.ico, favicon.svg, PNG 16/32/48, apple-touch, PWA 192/512, maskable, site.webmanifest
├── tokens/     tokens.css (variables CSS), tokens.json, tailwind.config.snippet.js
└── README.md
```

| Archivo | Uso |
|---|---|
| `svg/quinn-logo-horizontal.svg` | Logo principal sobre fondo claro (login, encabezados, documentación) |
| `svg/quinn-logo-horizontal-negativo.svg` | Logo sobre navy u otros fondos oscuros (barra superior) |
| `svg/quinn-logo-horizontal-mono-navy.svg` | Impresión a una tinta, sellos y marcas de agua |
| `svg/quinn-simbolo.svg` | Solo el símbolo sobre fondo claro |
| `svg/quinn-simbolo-negativo.svg` | Solo el símbolo sobre fondo oscuro |
| `svg/quinn-simbolo-mono-*.svg` | Versiones a una tinta (navy o blanco) |
| `svg/quinn-logotipo*.svg` | Solo la palabra «quinn», cuando el símbolo ya está presente |
| `svg/quinn-avatar.svg` | Avatar de Quinn en las burbujas y la cabecera del chat (círculo navy) |
| `svg/quinn-avatar-claro.svg` | Avatar alternativo sobre fondos oscuros |
| `svg/quinn-app-icon.svg` | Ícono de la aplicación (cuadrado redondeado navy) |

Los SVG no dependen de fuentes: el logotipo está convertido a trazos (Lato Black) y el espacio alrededor del destello es una máscara, así que el fondo queda transparente.

## 2. Favicon y PWA

Copiar el contenido de `favicon/` a la raíz pública del sitio (`/public`) y agregar en el `<head>`:

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0B1F3A">
```

El favicon usa una versión reforzada del símbolo (trazo más grueso y destello más grande) para que se lea en 16 px.

## 3. Color

| Token | Hex | Uso |
|---|---|---|
| `--quinn-navy` | `#0B1F3A` | Base: barra superior, avatar, titulares |
| `--quinn-amber` | `#F5A524` | Acento: destello, botón principal, estado activo |
| `--quinn-blue` | `#2563C9` | Enlaces, botón secundario, foco |
| `--quinn-sky` | `#DCE8FA` | Burbuja del usuario |
| `--quinn-amber-soft` | `#FDEBC8` | Avisos suaves, chip «Quinn → Agente X» |
| `--quinn-ink` | `#1E2633` | Texto principal |
| `--quinn-slate` | `#5A6475` | Texto secundario |
| `--quinn-line` | `#DDE2EA` | Bordes |
| `--quinn-mist` | `#F3F5F9` | Fondo de la app |
| `--quinn-success` / `--quinn-error` | `#1A7F55` / `#C2372F` | Estados |

**Proporción:** 60 % neutros, 30 % navy, 10 % ámbar. El ámbar va en **una sola acción principal por pantalla**.

**Contraste (WCAG):**

- Blanco sobre navy: 16.5:1 (AAA).
- Navy sobre ámbar: 8.1:1 (AAA).
- Blanco sobre azul: 5.7:1 (AA).
- ⚠️ **Blanco sobre ámbar: 2.0:1. No usar.** El texto sobre ámbar siempre va en navy.

## 4. Tipografía

**Lato** (Google Fonts, licencia OFL).

| Peso | Uso |
|---|---|
| 900 Black | Logotipo, titulares, nombre «Quinn» en la cabecera |
| 700 Bold | Botones, etiquetas |
| 400 Regular | Mensajes del chat (17 px, interlineado 1.5) |
| 300 Light | Subtítulos («Tu apoyo en Q-Vision») |

## 5. Uso del logo

- **Área de protección:** deja libre alrededor del logo como mínimo la altura del destello.
- **Tamaño mínimo:** logo horizontal de 96 px de ancho; símbolo de 24 px (por debajo, usa `favicon.svg`).
- **Fondos:** sobre blanco o `mist`, la versión normal; sobre navy, la versión negativa. Sobre fotos, la versión negativa con un velo navy.
- **No hacer:** cambiar los colores del símbolo, rotarlo, separar el destello de la Q, añadirle sombras o degradados, deformarlo o escribir «Quinn» en otra fuente.

## 6. Componentes del chat (referencia)

- **Cabecera:** fondo navy, avatar blanco con el símbolo en color, «Quinn» en Lato 900 y debajo «Tu apoyo en Q-Vision · Asistente de IA» (300).
- **Burbuja de Quinn:** fondo blanco, borde `line` y radio `4px 18px 18px 18px`.
- **Burbuja del usuario:** fondo `sky`, texto navy y radio `18px 4px 18px 18px`.
- **Botón principal:** fondo ámbar, texto navy 900, forma de píldora y 44 px de alto.
- **Botón secundario:** contorno azul de 2 px, texto azul y forma de píldora.
- **Derivación a un agente:** chip `amber-soft` con el texto «Quinn → Nombre del agente».
- **Campo de entrada:** píldora con fondo `mist`, el texto de ejemplo «Pregúntale a Quinn…» y el botón de enviar en círculo navy con flecha ámbar.
- **Transparencia:** en la cabecera o en el primer mensaje siempre debe quedar claro que Quinn es una IA.

## 7. Voz

Quinn tutea con respeto, responde corto y ofrece profundizar. Dice «te conecto con el agente de…» y nunca finge saber lo que no sabe. Lema principal: **«Pregúntale a Quinn.»**

---

*Nota:* el navy y el ámbar están alineados con la marca Q-Vision, pero hay que confirmarlos con los códigos oficiales del manual corporativo antes de salir a producción.
