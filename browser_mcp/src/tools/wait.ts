import { z } from 'zod/v4';

import { defineTool, sessionIdSchema, targetSchema, timeoutSchema, toPageData } from './define';

import type { RegisteredTool } from './define';

const wait = defineTool({
  name: 'browser_wait',
  title: 'Wait for condition',
  description:
    'Waits for a condition: a fixed timeout, an element, a text or a URL. Prefer a real condition over a fixed timeout.',
  schema: {
    session_id: sessionIdSchema,
    condition: z
      .object({
        type: z.enum(['timeout', 'element', 'text', 'url']),
        value: z
          .string()
          .optional()
          .describe('Milliseconds for timeout, text for text, glob for url.'),
        target: targetSchema.optional().describe('Required when type is "element".'),
      })
      .describe('What to wait for.'),
    timeout: timeoutSchema,
  },
  handler: async (manager, { session_id, condition, timeout }) => ({
    data: toPageData(await manager.wait(session_id, condition, timeout)),
  }),
});

const waitForElement = defineTool({
  name: 'browser_wait_for_element',
  title: 'Wait for element',
  description: 'Waits until an element is present and visible.',
  schema: { session_id: sessionIdSchema, target: targetSchema, timeout: timeoutSchema },
  handler: async (manager, { session_id, target, timeout }) => ({
    data: toPageData(await manager.waitForElement(session_id, target, timeout)),
  }),
});

const waitForText = defineTool({
  name: 'browser_wait_for_text',
  title: 'Wait for text',
  description: 'Waits until a text is visible anywhere on the active tab.',
  schema: {
    session_id: sessionIdSchema,
    text: z.string().min(1).describe('Text to wait for.'),
    timeout: timeoutSchema,
  },
  handler: async (manager, { session_id, text, timeout }) => ({
    data: toPageData(await manager.waitForText(session_id, text, timeout)),
  }),
});

const waitForUrl = defineTool({
  name: 'browser_wait_for_url',
  title: 'Wait for URL',
  description: 'Waits until the active tab URL matches a glob pattern, e.g. "**/dashboard".',
  schema: {
    session_id: sessionIdSchema,
    url: z.string().min(1).describe('URL or glob pattern, e.g. "**/dashboard".'),
    timeout: timeoutSchema,
  },
  handler: async (manager, { session_id, url, timeout }) => ({
    data: toPageData(await manager.waitForUrl(session_id, url, timeout)),
  }),
});

const waitForDownload = defineTool({
  name: 'browser_wait_for_download',
  title: 'Wait for download',
  description:
    'Waits until an action started a download and reports its filename and the temporary path inside the MCP container. The file is not persisted anywhere else.',
  schema: { session_id: sessionIdSchema, timeout: timeoutSchema },
  handler: async (manager, { session_id, timeout }) => ({
    data: { download: await manager.waitForDownload(session_id, timeout) },
  }),
});

export const waitTools: RegisteredTool[] = [
  wait,
  waitForElement,
  waitForText,
  waitForUrl,
  waitForDownload,
];
