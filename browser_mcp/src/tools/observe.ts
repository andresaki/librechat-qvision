import { defineTool, sessionIdSchema, targetSchema, toPageData } from './define';

import type { RegisteredTool } from './define';

const observe = defineTool({
  name: 'browser_observe',
  title: 'Observe page',
  description:
    'Returns a compact snapshot of the active tab: url, title, tab_id and the visible interactive elements with a ref, role and accessible name. Use the returned refs with the interaction tools. Refs are only valid until the page or the active tab changes.',
  schema: { session_id: sessionIdSchema },
  handler: async (manager, { session_id }) => {
    const { page, elements, truncated } = await manager.observe(session_id);
    return { data: { page: toPageData(page), elements, truncated } };
  },
});

const element = defineTool({
  name: 'browser_element',
  title: 'Inspect element',
  description:
    'Returns the state of one element: role, accessible name, tag, visibility, enabled, checked and current value. Password values are never returned.',
  schema: { session_id: sessionIdSchema, target: targetSchema },
  handler: async (manager, { session_id, target }) => ({
    data: { element: await manager.element(session_id, target) },
  }),
});

export const observeTools: RegisteredTool[] = [observe, element];
