import { z } from 'zod/v4';

import { defineTool, sessionIdSchema, toPageData } from './define';

import type { RegisteredTool } from './define';

const navigate = defineTool({
  name: 'browser_navigate',
  title: 'Navigate to URL',
  description:
    'Navigates the active tab to an http(s) URL and returns the resulting url and title.',
  schema: {
    session_id: sessionIdSchema,
    url: z.string().min(1).describe('Absolute http(s) URL, e.g. https://example.com'),
  },
  handler: async (manager, { session_id, url }) => ({
    data: toPageData(await manager.navigate(session_id, url)),
  }),
});

const goBack = defineTool({
  name: 'browser_go_back',
  title: 'Go back',
  description: 'Goes back one entry in the history of the active tab.',
  schema: { session_id: sessionIdSchema },
  handler: async (manager, { session_id }) => ({
    data: toPageData(await manager.goBack(session_id)),
  }),
});

const goForward = defineTool({
  name: 'browser_go_forward',
  title: 'Go forward',
  description: 'Goes forward one entry in the history of the active tab.',
  schema: { session_id: sessionIdSchema },
  handler: async (manager, { session_id }) => ({
    data: toPageData(await manager.goForward(session_id)),
  }),
});

const reload = defineTool({
  name: 'browser_reload',
  title: 'Reload page',
  description: 'Reloads the active tab.',
  schema: { session_id: sessionIdSchema },
  handler: async (manager, { session_id }) => ({
    data: toPageData(await manager.reload(session_id)),
  }),
});

export const navigationTools: RegisteredTool[] = [navigate, goBack, goForward, reload];
