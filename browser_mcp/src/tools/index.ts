import { tabTools } from './tabs';
import { waitTools } from './wait';
import { stepTools } from './steps';
import { statusTools } from './status';
import { logOperation } from '../logger';
import { sessionTools } from './session';
import { observeTools } from './observe';
import { screenshotTools } from './screenshot';
import { navigationTools } from './navigation';
import { interactionTools } from './interaction';
import { toBrowserMcpError } from '../errors';

import type { BrowserManager } from '../browser/manager';
import type { RegisteredTool, ToolContent, ToolResponse } from './define';

export { defineTool } from './define';
export type { RegisteredTool, ToolResponse } from './define';

export const tools: RegisteredTool[] = [
  ...sessionTools,
  ...navigationTools,
  ...tabTools,
  ...observeTools,
  ...interactionTools,
  ...waitTools,
  ...screenshotTools,
  ...stepTools,
  ...statusTools,
];

const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

function jsonContent(payload: object): ToolContent {
  return { type: 'text', text: JSON.stringify(payload, null, 2) };
}

function readSessionId(input: unknown): string | undefined {
  if (input && typeof input === 'object' && 'session_id' in input) {
    const value = (input as { session_id?: unknown }).session_id;
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}

/**
 * The single execution path for every tool: it parses input, times the call, logs the
 * outcome and turns any failure into a stable `{ success: false, error: { code, message } }`.
 */
export async function callTool(
  manager: BrowserManager,
  name: string,
  input: unknown,
): Promise<ToolResponse> {
  const startedAt = Date.now();
  const tool = toolsByName.get(name);

  if (!tool) {
    return {
      content: [
        jsonContent({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: `Unknown tool ${name}` },
        }),
      ],
      isError: true,
    };
  }

  try {
    const outcome = await tool.handler(manager, input);
    const sessionId = readSessionId(input) ?? readSessionId(outcome.data);
    if (sessionId) {
      manager.touch(sessionId);
    }
    logOperation({
      operation: name,
      sessionId,
      durationMs: Date.now() - startedAt,
      status: 'success',
    });
    return {
      content: [jsonContent({ success: true, ...outcome.data }), ...(outcome.images ?? [])],
    };
  } catch (error) {
    const mapped = toBrowserMcpError(
      error,
      name === 'browser_navigate' ? 'NAVIGATION_ERROR' : 'INTERNAL_ERROR',
    );
    manager.recordFailure(mapped.code);
    logOperation({
      operation: name,
      sessionId: readSessionId(input),
      durationMs: Date.now() - startedAt,
      status: 'error',
      error: mapped.code,
    });
    return {
      content: [jsonContent({ success: false, error: mapped.toToolError() })],
      isError: true,
    };
  }
}
