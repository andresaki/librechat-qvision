import { z } from 'zod/v4';

import { BrowserMcpError } from '../errors';

import type { ZodObject, ZodRawShape } from 'zod/v4';
import type { BrowserManager } from '../browser/manager';

export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface TextContent {
  type: 'text';
  text: string;
}

export type ToolContent = TextContent | ImageContent;

export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
}

/** `data` is merged into the `{ success: true, ... }` JSON payload returned to the model. */
export interface ToolOutcome {
  data: object;
  images?: ImageContent[];
}

export interface JsonSchema {
  type: 'object';
  properties?: object;
  required?: string[];
}

export interface RegisteredTool {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  handler: (manager: BrowserManager, input: unknown) => Promise<ToolOutcome>;
}

export const sessionIdSchema = z
  .string()
  .uuid()
  .describe('Session id returned by browser_session_create.');

export const targetSchema = z
  .object({
    ref: z.string().optional().describe('Element ref from browser_observe, e.g. "e3". Preferred.'),
    role: z.string().optional().describe('ARIA role, e.g. "button", "textbox", "link".'),
    name: z.string().optional().describe('Accessible name of the element, e.g. "Login".'),
    label: z.string().optional().describe('Form label or placeholder of the field.'),
    text: z.string().optional().describe('Visible text, used when role and name are unknown.'),
    css: z.string().optional().describe('CSS selector.'),
    xpath: z.string().optional().describe('XPath expression. Last resort, most brittle.'),
  })
  .describe('Element locator. Resolution order: ref, role+name, label, text, css, xpath.');

export const timeoutSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .describe('Timeout in milliseconds. Defaults to BROWSER_TIMEOUT.');

export interface PageData {
  url: string;
  title: string;
  tab_id: string;
}

/** Every page-changing tool answers with the same three fields. */
export function toPageData({
  url,
  title,
  tabId,
}: {
  url: string;
  title: string;
  tabId: string;
}): PageData {
  return { url, title, tab_id: tabId };
}

function toJsonSchema(shape: ZodRawShape): JsonSchema {
  const { $schema, ...jsonSchema } = z.toJSONSchema(z.object(shape));
  return jsonSchema as JsonSchema;
}

/**
 * Turns a zod shape into an MCP tool: a JSON Schema for `tools/list` plus a handler that
 * validates its own input. The JSON Schema is computed once, at module load.
 */
export function defineTool<S extends ZodRawShape>(definition: {
  name: string;
  title: string;
  description: string;
  schema: S;
  handler: (manager: BrowserManager, input: z.infer<ZodObject<S>>) => Promise<ToolOutcome>;
}): RegisteredTool {
  const parser = z.object(definition.schema);

  return {
    name: definition.name,
    title: definition.title,
    description: definition.description,
    inputSchema: toJsonSchema(definition.schema),
    handler: (manager, input) => {
      const parsed = parser.safeParse(input ?? {});
      if (!parsed.success) {
        const [issue] = parsed.error.issues;
        const path = issue?.path.join('.') ?? 'input';
        throw new BrowserMcpError(
          'INVALID_TARGET',
          `Invalid ${path}: ${issue?.message ?? 'unexpected value'}`,
        );
      }
      return definition.handler(manager, parsed.data);
    },
  };
}
