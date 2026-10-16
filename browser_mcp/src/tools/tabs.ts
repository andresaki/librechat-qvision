import { z } from 'zod/v4';

import { defineTool, sessionIdSchema, toPageData } from './define';

import type { RegisteredTool } from './define';

const tabIdSchema = z.string().min(1).describe('Tab id from browser_tabs, e.g. "tab-2".');

const list = defineTool({
  name: 'browser_tabs',
  title: 'List tabs',
  description:
    'Lists every tab of the session with its id, url, title and whether it is the active one.',
  schema: { session_id: sessionIdSchema },
  handler: async (manager, { session_id }) => ({
    data: { tabs: await manager.listTabs(session_id) },
  }),
});

const create = defineTool({
  name: 'browser_tab_new',
  title: 'Open new tab',
  description:
    'Opens a new tab in the same BrowserContext (so it shares cookies and storage) and makes it active. The url is optional.',
  schema: {
    session_id: sessionIdSchema,
    url: z.string().min(1).optional().describe('Optional http(s) URL to open in the new tab.'),
  },
  handler: async (manager, { session_id, url }) => ({
    data: toPageData(await manager.newTab(session_id, url)),
  }),
});

const select = defineTool({
  name: 'browser_tab_select',
  title: 'Select tab',
  description:
    'Makes a tab the active one. Every later observe, click, fill and screenshot runs on it. Refs from a previous tab become stale.',
  schema: { session_id: sessionIdSchema, tab_id: tabIdSchema },
  handler: async (manager, { session_id, tab_id }) => ({
    data: toPageData(await manager.selectTab(session_id, tab_id)),
  }),
});

const close = defineTool({
  name: 'browser_tab_close',
  title: 'Close tab',
  description:
    'Closes one tab without closing the session. If it was the active tab, another open tab becomes active.',
  schema: { session_id: sessionIdSchema, tab_id: tabIdSchema },
  handler: async (manager, { session_id, tab_id }) => {
    const { closed, active } = await manager.closeTab(session_id, tab_id);
    return { data: { closed_tab_id: closed, active_tab_id: active } };
  },
});

export const tabTools: RegisteredTool[] = [list, create, select, close];
