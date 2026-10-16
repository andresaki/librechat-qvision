import { z } from 'zod/v4';

import { defineTool, sessionIdSchema } from './define';

import type { SessionSummary } from '../browser/manager';
import type { RegisteredTool } from './define';

function toSessionData(summary: SessionSummary): object {
  return {
    session_id: summary.sessionId,
    status: summary.status,
    url: summary.url,
    title: summary.title,
    tabs: summary.tabs,
    active_tab_id: summary.activeTabId,
    created_at: summary.createdAt,
    last_dialog: summary.lastDialog,
  };
}

const create = defineTool({
  name: 'browser_session_create',
  title: 'Create browser session',
  description:
    'Launches a Chromium browser session with its own BrowserContext and one tab, and returns its session_id. Every other browser tool requires that id.',
  schema: {
    dialog_policy: z
      .enum(['accept', 'dismiss'])
      .optional()
      .describe('How JavaScript dialogs (alert/confirm/prompt) are answered. Defaults to accept.'),
  },
  handler: async (manager, { dialog_policy }) => {
    const session = await manager.createSession(dialog_policy ?? 'accept');
    return { data: { session_id: session.sessionId, status: session.status } };
  },
});

const get = defineTool({
  name: 'browser_session_get',
  title: 'Get browser session',
  description:
    'Returns the current state of one session: status, active tab url and title, tab count.',
  schema: { session_id: sessionIdSchema },
  handler: async (manager, { session_id }) => {
    const summary = await manager.getSession(session_id);
    return { data: { session: toSessionData(summary) } };
  },
});

const list = defineTool({
  name: 'browser_session_list',
  title: 'List browser sessions',
  description: 'Lists the browser sessions currently held in memory by this MCP server.',
  schema: {},
  handler: async (manager) => {
    const summaries = await manager.listSessions();
    return { data: { sessions: summaries.map(toSessionData) } };
  },
});

const close = defineTool({
  name: 'browser_session_close',
  title: 'Close browser session',
  description:
    'Closes every tab, the context and the browser of a session and forgets the session id.',
  schema: { session_id: sessionIdSchema },
  handler: async (manager, { session_id }) => {
    const closed = await manager.closeSession(session_id);
    return { data: { session_id: closed.sessionId, status: closed.status } };
  },
});

export const sessionTools: RegisteredTool[] = [create, get, list, close];
