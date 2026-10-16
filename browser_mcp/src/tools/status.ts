import { defineTool } from './define';

import type { RegisteredTool } from './define';

const status = defineTool({
  name: 'browser_status',
  title: 'Browser MCP status',
  description:
    'Operational counters of this MCP server: active sessions, the configured maximum and lifetime totals. Contains no page or user data.',
  schema: {},
  handler: async (manager) => {
    const metrics = manager.metrics();
    return {
      data: {
        status: 'ok',
        active_sessions: metrics.activeSessions,
        max_sessions: metrics.maxSessions,
        total_sessions_created: metrics.totalSessionsCreated,
        total_sessions_closed: metrics.totalSessionsClosed,
        total_errors: metrics.totalErrors,
        total_timeouts: metrics.totalTimeouts,
        uptime_seconds: metrics.uptimeSeconds,
      },
    };
  },
});

export const statusTools: RegisteredTool[] = [status];
