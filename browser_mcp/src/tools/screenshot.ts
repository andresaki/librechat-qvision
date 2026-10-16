import { z } from 'zod/v4';

import { defineTool, sessionIdSchema, targetSchema } from './define';

import type { RegisteredTool } from './define';

const screenshot = defineTool({
  name: 'browser_screenshot',
  title: 'Screenshot page',
  description:
    'Captures a PNG of the active tab and returns it as MCP image content. With full_page it captures the whole scrollable page; with a target it captures just that element.',
  schema: {
    session_id: sessionIdSchema,
    full_page: z
      .boolean()
      .optional()
      .describe('Capture the full scrollable page. Defaults to false.'),
    target: targetSchema.optional().describe('Capture only this element instead of the viewport.'),
  },
  handler: async (manager, { session_id, full_page, target }) => {
    const shot = await manager.screenshot(session_id, { fullPage: full_page ?? false, target });
    return {
      data: { mime_type: shot.mimeType, full_page: shot.fullPage, bytes: shot.base64.length },
      images: [{ type: 'image', data: shot.base64, mimeType: shot.mimeType }],
    };
  },
});

export const screenshotTools: RegisteredTool[] = [screenshot];
