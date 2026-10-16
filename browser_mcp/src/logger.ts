export type LogStatus = 'success' | 'error';
export type LogLevel = 'info' | 'warn' | 'error';

export interface OperationLog {
  operation: string;
  sessionId?: string;
  durationMs: number;
  status: LogStatus;
  error?: string;
}

/**
 * Logs to stderr only: stdout is the MCP stdio transport and must stay clean.
 * Values supplied by callers (form input, credentials, cookies) are never logged.
 */
function write(level: LogLevel, message: string): void {
  process.stderr.write(`[${level.toUpperCase()}] ${message}\n`);
}

function fields(values: Record<string, string | number | undefined>): string {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');
}

/** Structured lifecycle event, e.g. `[INFO] session_created session=abc123`. */
export function logEvent(
  level: LogLevel,
  event: string,
  values: Record<string, string | number | undefined> = {},
): void {
  write(level, `${event} ${fields(values)}`.trimEnd());
}

export function logOperation({
  operation,
  sessionId,
  durationMs,
  status,
  error,
}: OperationLog): void {
  logEvent(status === 'error' ? 'error' : 'info', operation, {
    session: sessionId,
    duration: `${durationMs}ms`,
    status,
    error,
  });
}

export function logInfo(message: string): void {
  write('info', message);
}

export function logError(message: string): void {
  write('error', message);
}
