import { defineTool, sessionIdSchema } from './define';

import type { RegisteredTool } from './define';

const get = defineTool({
  name: 'browser_steps_get',
  title: 'Get recorded steps',
  description:
    'Returns the actions recorded in this session, in a browser-engine independent shape. Secret values are recorded as {{password}}, never the real value.',
  schema: { session_id: sessionIdSchema },
  handler: async (manager, { session_id }) => {
    const steps = manager.steps(session_id);
    return { data: { recording: true, steps } };
  },
});

const clear = defineTool({
  name: 'browser_steps_clear',
  title: 'Clear recorded steps',
  description: 'Discards the recorded steps of a session and restarts the sequence at 1.',
  schema: { session_id: sessionIdSchema },
  handler: async (manager, { session_id }) => ({
    data: { cleared: manager.clearSteps(session_id) },
  }),
});

const cookies = defineTool({
  name: 'browser_cookies',
  title: 'List cookies',
  description:
    'Diagnostic only: lists the cookie names and domains of the session context. Cookie values are never returned.',
  schema: { session_id: sessionIdSchema },
  handler: async (manager, { session_id }) => ({
    data: { cookies: await manager.cookies(session_id) },
  }),
});

export const stepTools: RegisteredTool[] = [get, clear, cookies];
