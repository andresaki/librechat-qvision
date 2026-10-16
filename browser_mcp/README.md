# Browser MCP

MCP server that lets an LLM agent drive a Chromium browser through Playwright.

```text
LibreChat → IZYBOT → MCP → Browser MCP → BrowserManager → Playwright → Chromium
```

It is an MCP server, not an HTTP API. Every capability is exposed as an MCP tool; there are no
`/browser/*` endpoints. LibreChat and IZYBOT never import Playwright — it is encapsulated here.
Everything runs in memory inside the MCP process: no database, no Redis, no persistence.

## Architecture

```text
MCP Server (src/server.ts)
    │
    └── BrowserManager (src/browser/manager.ts)      lifecycle, limits, idle sweep, metrics
          │
          ├── Session A (src/browser/session.ts)
          │     ├── Browser
          │     ├── BrowserContext        cookies / storage, isolated per session
          │     ├── Pages                 tab-1, tab-2, … one is active
          │     └── StepRecorder          in-memory action log
          │
          └── Session B
                ├── Browser
                ├── BrowserContext
                └── Pages
```

### Session lifecycle

```text
browser_session_create → creating → active → closing → closed
                                       │
                     browser/context lost → error → cleanup → closed
```

A session leaves `active` for one of four reasons: the agent closed it, it stayed idle past
`SESSION_IDLE_TIMEOUT`, its browser died, or the process received SIGINT/SIGTERM. All four go
through the same `cleanupSession`, which is idempotent and tolerant of resources that are already
gone. A closed session is never reusable: it answers `SESSION_NOT_FOUND`.

## Tools

### Session

| Tool | Input | Returns | Errors |
|---|---|---|---|
| `browser_session_create` | `dialog_policy?` (`accept` \| `dismiss`, default `accept`) | `session_id`, `status` | `BROWSER_NOT_AVAILABLE` |
| `browser_session_get` | `session_id` | `session` (`status`, `url`, `title`, `tabs`, `active_tab_id`, `last_dialog`) | `SESSION_NOT_FOUND` |
| `browser_session_list` | — | `sessions[]` | — |
| `browser_session_close` | `session_id` | `session_id`, `status: closed` | `SESSION_NOT_FOUND` |

```json
{ "session_id": "8e7c…", "status": "active", "url": "https://example.com/", "title": "Example Domain", "tabs": 1 }
```

### Navigation

| Tool | Input | Returns | Errors |
|---|---|---|---|
| `browser_navigate` | `session_id`, `url` | `url`, `title`, `tab_id` | `NAVIGATION_ERROR`, `DOMAIN_NOT_ALLOWED`, `TIMEOUT` |
| `browser_go_back` | `session_id` | `url`, `title`, `tab_id` | `NAVIGATION_ERROR` |
| `browser_go_forward` | `session_id` | `url`, `title`, `tab_id` | `NAVIGATION_ERROR` |
| `browser_reload` | `session_id` | `url`, `title`, `tab_id` | `NAVIGATION_ERROR` |

### Tabs

One session holds several tabs inside the **same** BrowserContext, so they share cookies and
storage. A popup opened by a click is picked up automatically as a new tab.

| Tool | Input | Returns | Errors |
|---|---|---|---|
| `browser_tabs` | `session_id` | `tabs[{id, url, title, active}]` | `SESSION_NOT_FOUND` |
| `browser_tab_new` | `session_id`, `url?` | `url`, `title`, `tab_id` | `NAVIGATION_ERROR` |
| `browser_tab_select` | `session_id`, `tab_id` | `url`, `title`, `tab_id` | `TAB_NOT_FOUND` |
| `browser_tab_close` | `session_id`, `tab_id` | `closed_tab_id`, `active_tab_id` | `TAB_NOT_FOUND`, `INVALID_OPERATION` |

Closing the active tab promotes another open tab. Closing the **last** tab is refused with
`INVALID_OPERATION` — use `browser_session_close`.

### Observation

| Tool | Input | Returns | Errors |
|---|---|---|---|
| `browser_observe` | `session_id` | `page{url,title,tab_id}`, `elements[{ref,role,name,…}]`, `truncated` | `SESSION_NOT_FOUND`, `PAGE_CLOSED` |
| `browser_element` | `session_id`, `target` | `element{role,name,tag,visible,enabled,checked,value}` | `ELEMENT_NOT_FOUND`, `ELEMENT_REF_STALE` |

```json
{
  "success": true,
  "page": { "url": "https://example.com/login", "title": "Login", "tab_id": "tab-1" },
  "elements": [
    { "ref": "e1", "role": "textbox", "name": "Email" },
    { "ref": "e2", "role": "textbox", "name": "Password" },
    { "ref": "e3", "role": "button", "name": "Login" }
  ],
  "truncated": false
}
```

### Interaction

| Tool | Input | Returns | Errors |
|---|---|---|---|
| `browser_click` | `session_id`, `target` | `url`, `title`, `tab_id` | `ELEMENT_NOT_FOUND`, `ELEMENT_NOT_VISIBLE`, `ELEMENT_NOT_ENABLED`, `ELEMENT_REF_STALE` |
| `browser_fill` | `session_id`, `target`, `value` | `url`, `title`, `tab_id` | same as click |
| `browser_type` | `session_id`, `target`, `text`, `delay?` | `url`, `title`, `tab_id` | same as click |
| `browser_press` | `session_id`, `key`, `target?` | `url`, `title`, `tab_id` | `ELEMENT_NOT_FOUND` |
| `browser_select` | `session_id`, `target`, `value?` \| `label?` \| `index?` | `url`, `title`, `tab_id` | `INVALID_OPERATION` |
| `browser_check` / `browser_uncheck` | `session_id`, `target` | `url`, `title`, `tab_id` | `INVALID_OPERATION` |
| `browser_hover` | `session_id`, `target` | `url`, `title`, `tab_id` | `ELEMENT_NOT_VISIBLE` |
| `browser_focus` | `session_id`, `target` | `url`, `title`, `tab_id` | `ELEMENT_NOT_FOUND` |

`browser_fill` sets the value in one step; `browser_type` sends one key event per character, which
is what autocompletes and validate-as-you-type fields need. `browser_press` accepts `Enter`, `Tab`,
`Escape`, `ArrowDown`, `Backspace`, `Control+A` and the rest of the Playwright key syntax.

### Waiting

| Tool | Input | Returns | Errors |
|---|---|---|---|
| `browser_wait` | `session_id`, `condition{type,value?,target?}`, `timeout?` | `url`, `title`, `tab_id` | `TIMEOUT`, `INVALID_TARGET` |
| `browser_wait_for_element` | `session_id`, `target`, `timeout?` | `url`, `title`, `tab_id` | `TIMEOUT`, `ELEMENT_NOT_VISIBLE` |
| `browser_wait_for_text` | `session_id`, `text`, `timeout?` | `url`, `title`, `tab_id` | `TIMEOUT` |
| `browser_wait_for_url` | `session_id`, `url` (glob), `timeout?` | `url`, `title`, `tab_id` | `TIMEOUT` |
| `browser_wait_for_download` | `session_id`, `timeout?` | `download{suggested_filename,path,tab_id}` | `TIMEOUT` |

`condition.type` is `timeout`, `element`, `text` or `url`. Prefer a real condition over a fixed
timeout.

### Screenshot

| Tool | Input | Returns | Errors |
|---|---|---|---|
| `browser_screenshot` | `session_id`, `full_page?`, `target?` | MCP image content + `mime_type`, `bytes` | `ELEMENT_NOT_VISIBLE` |

The image travels as MCP image content. No HTTP URL is ever created for it.

### Recording and diagnostics

| Tool | Input | Returns |
|---|---|---|
| `browser_steps_get` | `session_id` | `recording`, `steps[]` |
| `browser_steps_clear` | `session_id` | `cleared` |
| `browser_cookies` | `session_id` | `cookies[{name,domain,path,secure,httpOnly,expires}]` — **no values** |
| `browser_status` | — | `active_sessions`, `max_sessions`, lifetime counters, `uptime_seconds` |

```json
{ "status": "ok", "active_sessions": 2, "max_sessions": 10, "total_sessions_created": 5,
  "total_sessions_closed": 3, "total_errors": 1, "total_timeouts": 0, "uptime_seconds": 97 }
```

`browser_status` reports operational counters only — no page, session or user data.

Steps use a Playwright-independent shape, ready to become an IzyTesting case later:

```json
{ "sequence": 3, "action": "click", "target": { "role": "button", "name": "Login" } }
{ "sequence": 4, "action": "fill", "target": { "label": "Password" }, "value": "{{password}}" }
```

## Targets

```json
{ "ref": "e1" }
{ "role": "button", "name": "Login" }
{ "label": "Email" }
{ "text": "Login" }
{ "css": "#login" }
{ "xpath": "//button[@id='login']" }
```

Resolution order: **`ref` → `role` + `name` → `label` → `text` → `css` → `xpath`**. XPath is last on
purpose: it is the most brittle locator.

## Refs and staleness

`browser_observe` stamps each interactive element with `data-bmcp-ref` and returns `e1`, `e2`, … A
ref belongs to **that** observation, on **that** tab. It is invalidated by a navigation, a click, a
key press, a tab switch or a tab close. Using an invalidated ref answers:

```json
{
  "success": false,
  "error": {
    "code": "ELEMENT_REF_STALE",
    "message": "Ref e4 is not part of the latest observation. Call browser_observe again.",
    "retryable": false
  }
}
```

The fix is always the same: call `browser_observe` again and use the new refs.

## Errors

Every failure answers with the same shape and never carries a stack trace:

```json
{ "success": false, "error": { "code": "ELEMENT_NOT_FOUND", "message": "…", "retryable": false } }
```

| Code | Meaning | Retryable |
|---|---|---|
| `SESSION_NOT_FOUND` | Unknown, closed or swept session | no |
| `MAX_SESSIONS_REACHED` | `MAX_SESSIONS` concurrent sessions already exist | yes |
| `TAB_NOT_FOUND` | Unknown tab id | no |
| `BROWSER_NOT_AVAILABLE` | Chromium could not be launched | no |
| `BROWSER_CLOSED` | The browser died underneath the session | no |
| `PAGE_CLOSED` | The active tab was closed | no |
| `ELEMENT_NOT_FOUND` | No element matched the target | no |
| `ELEMENT_NOT_VISIBLE` | Element attached but not visible | yes |
| `ELEMENT_NOT_ENABLED` | Element visible but disabled | no |
| `ELEMENT_REF_STALE` | Ref predates the current page or tab | no (observe first) |
| `INVALID_TARGET` | Target has no usable locator | no |
| `INVALID_OPERATION` | Operation does not apply to that element | no |
| `NAVIGATION_ERROR` | Bad URL, protocol or failed navigation | yes |
| `NAVIGATION_TIMEOUT` | Navigation exceeded `NAVIGATION_TIMEOUT` | yes |
| `TIMEOUT` | The condition did not happen in time | yes |
| `DOMAIN_NOT_ALLOWED` | Blocked by `ALLOWED_DOMAINS` | no |
| `INTERNAL_ERROR` | Anything else | no |

## Dialogs, popups and downloads

- **Dialogs** — `alert`, `confirm` and `prompt` are answered automatically so they can never block
  the browser. The policy is chosen per session with `dialog_policy` (`accept` by default) and the
  last dialog seen is reported by `browser_session_get`.
- **Popups** — a click that opens a window becomes a new tab in the same session. The event is
  asynchronous, so a popup may appear on the following `browser_tabs` call rather than instantly.
- **Downloads** — files are saved to a temporary directory inside the MCP container
  (`os.tmpdir()/browser-mcp-*`) and `browser_wait_for_download` reports the path. Nothing is
  persisted outside that directory and it disappears with the container.

## Secrets

- `browser_fill` and `browser_type` never log the value.
- `browser_observe` and `browser_element` never return the value of a password input.
- The step recorder stores `{{password}}` instead of the real value whenever the field is a password
  input or the target mentions pass/pwd/secret/token/api key/otp/cvv/credential.
- `browser_cookies` returns names and domains only, never cookie values.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `BROWSER_HEADLESS` | `true` | Run Chromium headless |
| `ACTION_TIMEOUT` | `30000` | Timeout for element actions: click, fill, type, select (ms). `BROWSER_TIMEOUT` is accepted as its former name |
| `NAVIGATION_TIMEOUT` | `60000` | Timeout for page navigation (ms) |
| `OBSERVATION_TIMEOUT` | `10000` | Timeout for reading the page: observe, element (ms) |
| `SESSION_IDLE_TIMEOUT` | `1800` | Seconds without a successful operation before a session is closed. `0` disables it |
| `SESSION_IDLE_SWEEP` | `60` | Seconds between idle sweeps. `0` disables the sweeper |
| `MAX_SESSIONS` | `10` | Maximum concurrent sessions. Exceeding it answers `MAX_SESSIONS_REACHED` |
| `ALLOWED_DOMAINS` | *(empty)* | Empty allows every http(s) host. Otherwise a comma-separated allowlist |
| `MCP_TRANSPORT` | `stdio` | `stdio`, or `http` for the MCP Streamable HTTP transport |
| `MCP_PORT` | `8932` | Port for the `http` transport |
| `MAX_OBSERVE_ELEMENTS` | `100` | Cap on elements returned by `browser_observe` |
| `MAX_TEXT_LENGTH` | `120` | Cap on each name/text string |

## Run

```bash
npm install && npm run build
MCP_TRANSPORT=stdio node dist/server.js     # local, over stdio
docker compose up -d --build                # container, over MCP Streamable HTTP
```

Inside the LibreChat stack the service is declared in `../docker-compose.override.yml`, registered in
`../librechat.yaml` under `mcpServers.browser`, and its host must also be listed in
`mcpSettings.allowedAddresses` (`browser-mcp:8932`).

## Test

```bash
npm test          # jest, real Chromium against local fixtures
npm run smoke     # full flow over the real MCP protocol
```

`SMOKE_URL` picks the page; `SMOKE_MCP_URL=http://127.0.0.1:8932/mcp` runs the smoke client against a
running container instead of spawning a stdio server.

## Layout

```text
browser-mcp/
├── src/
│   ├── server.ts            MCP server + stdio/http transports
│   ├── config.ts            environment configuration
│   ├── errors.ts            error codes and classification
│   ├── logger.ts            stderr operation log
│   ├── browser/
│   │   ├── manager.ts       lifecycle, limits, idle sweep, metrics, every operation
│   │   ├── session.ts       one session: context, tabs, dialogs, downloads, refs
│   │   ├── observe.ts       page snapshot and element description
│   │   ├── locate.ts        ref → role+name → label → text → css → xpath
│   │   └── recorder.ts      in-memory step log with secret redaction
│   └── tools/
│       ├── define.ts        tool definition + JSON Schema
│       ├── index.ts         registry + shared execution wrapper
│       ├── session.ts navigation.ts tabs.ts observe.ts
│       └── interaction.ts wait.ts screenshot.ts steps.ts
├── tests/                   tools, flow, isolation, lifecycle, concurrency, manager
├── fixtures/                local pages: index, login, app
├── scripts/                 smoke.ts (MCP client), probe.js (in-container check)
├── Dockerfile
└── docker-compose.yml
```

## Isolation and concurrency

Each session owns its own Browser and BrowserContext, so cookies, localStorage, sessionStorage,
pages, refs and recorded steps are never shared. Two sessions on the same origin stay independent,
and sessions run in parallel without touching each other's state. A `tab_id` only ever resolves
inside its own session's tab map, so one session can never reach another session's page.

## Shutdown and resources

SIGINT and SIGTERM run `BrowserManager.shutdown()`, which closes every session before the process
exits — `docker stop` takes about a second and leaves no orphan Chromium. Idle sessions are swept
in the background; a browser that dies underneath a session marks it `error`, answers
`BROWSER_CLOSED` once, and the session is cleaned up rather than left behind.

`scripts/probe.js` is a dependency-free MCP client for checking a running container:

```bash
docker cp scripts/probe.js browser-mcp:/tmp/probe.js
docker exec browser-mcp sh -c 'node /tmp/probe.js'
```

## Known limitations

- Nothing survives a restart — steps, tabs, cookies and downloads are process memory only.
- A lost browser is reported and cleaned up, never rebuilt: there is no automatic recovery yet.
- Idle sweeping is based on the last *successful* tool call, so a session blocked in a very long
  operation is not swept while it runs.
- Refs are invalidated conservatively (any click or key press drops the observation), so a long
  interaction sequence needs `browser_observe` between steps.
- `browser_observe` returns at most `MAX_OBSERVE_ELEMENTS` elements and sets `truncated: true`; there
  is no pagination.
- A popup can need one extra `browser_tabs` call to show up.
- Downloads live in a container temp directory and are lost when the container stops.
- One Chromium process per session: memory grows linearly with concurrent sessions.
