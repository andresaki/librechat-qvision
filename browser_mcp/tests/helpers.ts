import { loadConfig } from '../src/config';
import { callTool } from '../src/tools';
import { BrowserManager } from '../src/browser/manager';

import type { ToolResponse } from '../src/tools';

export interface ObservedElement {
  ref: string;
  role: string;
  name: string;
  value?: string;
}

export interface ToolPayload {
  success: boolean;
  session_id?: string;
  status?: string;
  url?: string;
  title?: string;
  tab_id?: string;
  page?: { url: string; title: string; tab_id: string };
  elements?: ObservedElement[];
  element?: {
    role: string;
    name: string;
    visible: boolean;
    enabled: boolean;
    value?: string;
    checked?: boolean;
  };
  tabs?: Array<{ id: string; url: string; title: string; active: boolean }>;
  sessions?: Array<{ session_id: string; status: string; url: string }>;
  session?: { session_id: string; status: string; url: string; title: string; tabs: number };
  steps?: Array<{
    sequence: number;
    action: string;
    value?: string;
    target?: Record<string, string>;
  }>;
  cookies?: Array<{ name: string; domain: string }>;
  download?: { suggested_filename: string; path: string };
  closed_tab_id?: string;
  active_tab_id?: string;
  cleared?: number;
  mime_type?: string;
  active_sessions?: number;
  max_sessions?: number;
  total_sessions_created?: number;
  total_sessions_closed?: number;
  total_errors?: number;
  total_timeouts?: number;
  full_page?: boolean;
  error?: { code: string; message: string; retryable: boolean };
}

export function payloadOf(response: ToolResponse): ToolPayload {
  const [first] = response.content;
  if (!first || first.type !== 'text') {
    throw new Error('Tool response did not start with text content');
  }
  return JSON.parse(first.text) as ToolPayload;
}

export function newManager(): BrowserManager {
  return new BrowserManager(loadConfig());
}

/** Calls a tool and fails the test if it did not succeed. */
export async function ok(
  manager: BrowserManager,
  name: string,
  input: Record<string, unknown>,
): Promise<ToolPayload> {
  const payload = payloadOf(await callTool(manager, name, input));
  if (!payload.success) {
    throw new Error(`${name} failed: ${payload.error?.code} ${payload.error?.message}`);
  }
  return payload;
}

/** Calls a tool expecting a controlled failure, and returns the error payload. */
export async function fails(
  manager: BrowserManager,
  name: string,
  input: Record<string, unknown>,
): Promise<NonNullable<ToolPayload['error']>> {
  const payload = payloadOf(await callTool(manager, name, input));
  if (payload.success || !payload.error) {
    throw new Error(`${name} unexpectedly succeeded`);
  }
  return payload.error;
}
