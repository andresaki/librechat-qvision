const DEFAULT_ACTION_TIMEOUT = 30_000;
const DEFAULT_NAVIGATION_TIMEOUT = 60_000;
const DEFAULT_OBSERVATION_TIMEOUT = 10_000;
const DEFAULT_IDLE_TIMEOUT_SECONDS = 1_800;
const DEFAULT_IDLE_SWEEP_SECONDS = 60;
const DEFAULT_MAX_SESSIONS = 10;
const DEFAULT_HTTP_PORT = 8932;
const MAX_OBSERVE_ELEMENTS = 100;
const MAX_TEXT_LENGTH = 120;

export type TransportKind = 'stdio' | 'http';

/** Single source of truth for every timeout and limit; nothing else hardcodes them. */
export interface BrowserMcpConfig {
  headless: boolean;
  actionTimeout: number;
  navigationTimeout: number;
  observationTimeout: number;
  /** Milliseconds of inactivity before a session is swept. 0 disables the sweep. */
  sessionIdleTimeout: number;
  /** Milliseconds between idle sweeps. 0 disables the timer. */
  idleSweepInterval: number;
  maxSessions: number;
  allowedDomains: string[];
  transport: TransportKind;
  httpPort: number;
  maxObserveElements: number;
  maxTextLength: number;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === '') {
    return fallback;
  }
  return !['false', '0', 'no', 'off'].includes(raw.trim().toLowerCase());
}

function readInteger(name: string, fallback: number, { allowZero = false } = {}): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 0 || (parsed === 0 && !allowZero)) {
    return fallback;
  }
  return parsed;
}

function readList(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function loadConfig(): BrowserMcpConfig {
  /** BROWSER_TIMEOUT is the phase 1 name for ACTION_TIMEOUT and still works. */
  const legacyActionTimeout = readInteger('BROWSER_TIMEOUT', DEFAULT_ACTION_TIMEOUT);

  return {
    headless: readBoolean('BROWSER_HEADLESS', true),
    actionTimeout: readInteger('ACTION_TIMEOUT', legacyActionTimeout),
    navigationTimeout: readInteger('NAVIGATION_TIMEOUT', DEFAULT_NAVIGATION_TIMEOUT),
    observationTimeout: readInteger('OBSERVATION_TIMEOUT', DEFAULT_OBSERVATION_TIMEOUT),
    sessionIdleTimeout:
      readInteger('SESSION_IDLE_TIMEOUT', DEFAULT_IDLE_TIMEOUT_SECONDS, {
        allowZero: true,
      }) * 1_000,
    idleSweepInterval:
      readInteger('SESSION_IDLE_SWEEP', DEFAULT_IDLE_SWEEP_SECONDS, {
        allowZero: true,
      }) * 1_000,
    maxSessions: readInteger('MAX_SESSIONS', DEFAULT_MAX_SESSIONS),
    allowedDomains: readList('ALLOWED_DOMAINS'),
    transport: process.env.MCP_TRANSPORT === 'http' ? 'http' : 'stdio',
    httpPort: readInteger('MCP_PORT', DEFAULT_HTTP_PORT),
    maxObserveElements: readInteger('MAX_OBSERVE_ELEMENTS', MAX_OBSERVE_ELEMENTS),
    maxTextLength: readInteger('MAX_TEXT_LENGTH', MAX_TEXT_LENGTH),
  };
}
