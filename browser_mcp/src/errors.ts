export const ERROR_CODES = [
  'SESSION_NOT_FOUND',
  'MAX_SESSIONS_REACHED',
  'TAB_NOT_FOUND',
  'BROWSER_NOT_AVAILABLE',
  'BROWSER_CLOSED',
  'PAGE_CLOSED',
  'ELEMENT_NOT_FOUND',
  'ELEMENT_NOT_VISIBLE',
  'ELEMENT_NOT_ENABLED',
  'ELEMENT_REF_STALE',
  'INVALID_TARGET',
  'INVALID_OPERATION',
  'NAVIGATION_ERROR',
  'NAVIGATION_TIMEOUT',
  'TIMEOUT',
  'DOMAIN_NOT_ALLOWED',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ToolError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
}

/**
 * Retryable means "the same call may succeed later without the agent changing anything":
 * a slow page or a not-yet-rendered element. A stale ref is retryable only after a fresh
 * `browser_observe`, which is what the message tells the agent to do.
 */
const RETRYABLE_CODES = new Set<ErrorCode>([
  'TIMEOUT',
  'NAVIGATION_TIMEOUT',
  'ELEMENT_NOT_VISIBLE',
  'NAVIGATION_ERROR',
  'MAX_SESSIONS_REACHED',
]);

export const TIMEOUT_CODES = new Set<ErrorCode>(['TIMEOUT', 'NAVIGATION_TIMEOUT']);

export class BrowserMcpError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'BrowserMcpError';
    this.code = code;
  }

  get retryable(): boolean {
    return RETRYABLE_CODES.has(this.code);
  }

  toToolError(): ToolError {
    return { code: this.code, message: this.message, retryable: this.retryable };
  }
}

const TIMEOUT_PATTERN = /timeout|timed out/i;
const CLOSED_PAGE_PATTERN =
  /target page, context or browser has been closed|page has been closed|target closed/i;
const CLOSED_BROWSER_PATTERN = /browser has been closed|browser has been disconnected/i;

/** Maps any thrown value onto a stable, LLM-safe error without leaking stack traces. */
export function toBrowserMcpError(
  error: unknown,
  fallback: ErrorCode = 'INTERNAL_ERROR',
  timeoutCode: ErrorCode = 'TIMEOUT',
): BrowserMcpError {
  if (error instanceof BrowserMcpError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  return new BrowserMcpError(classify(message, fallback, timeoutCode), firstLine(message), {
    cause: error,
  });
}

/** Navigation failures report NAVIGATION_TIMEOUT instead of the generic TIMEOUT. */
export function toNavigationError(error: unknown): BrowserMcpError {
  return toBrowserMcpError(error, 'NAVIGATION_ERROR', 'NAVIGATION_TIMEOUT');
}

function classify(message: string, fallback: ErrorCode, timeoutCode: ErrorCode): ErrorCode {
  if (CLOSED_PAGE_PATTERN.test(message)) {
    return 'PAGE_CLOSED';
  }
  if (CLOSED_BROWSER_PATTERN.test(message)) {
    return 'BROWSER_CLOSED';
  }
  if (TIMEOUT_PATTERN.test(message)) {
    return timeoutCode;
  }
  return fallback;
}

function firstLine(message: string): string {
  const [line] = message.split('\n');
  return (line ?? 'Unexpected error').trim() || 'Unexpected error';
}
