import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

interface ToolPayload {
  success: boolean;
  session_id?: string;
  url?: string;
  title?: string;
  page?: { url: string; title: string; tab_id: string };
  elements?: Array<{ ref: string; role: string; name: string }>;
  tabs?: Array<{ id: string; url: string; title: string; active: boolean }>;
  steps?: Array<{ sequence: number; action: string }>;
  error?: { code: string; message: string };
}

const TARGET_URL = process.env.SMOKE_URL ?? 'https://example.com';
const HTTP_URL = process.env.SMOKE_MCP_URL;

function buildTransport(): Transport {
  if (HTTP_URL) {
    return new StreamableHTTPClientTransport(new URL(HTTP_URL));
  }
  return new StdioClientTransport({
    command: process.execPath,
    args: [join(__dirname, '..', 'dist', 'server.js')],
    env: { ...process.env, MCP_TRANSPORT: 'stdio' },
  });
}

async function main(): Promise<void> {
  const client = new Client({ name: 'browser-mcp-smoke', version: '0.1.0' });
  await client.connect(buildTransport());

  const listed = await client.listTools();
  console.log('tools:', listed.tools.map((tool) => tool.name).join(', '));

  const call = async (name: string, args: Record<string, unknown>): Promise<ToolPayload> => {
    const result = await client.callTool({ name, arguments: args });
    const content = Array.isArray(result.content) ? result.content : [];
    const [first] = content;
    if (!first || first.type !== 'text') {
      throw new Error(`${name} returned no text content`);
    }
    const payload = JSON.parse(first.text) as ToolPayload;
    console.log(`${name}:`, JSON.stringify(payload).slice(0, 300));
    if (!payload.success) {
      throw new Error(`${name} failed: ${payload.error?.code}`);
    }
    return payload;
  };

  const created = await call('browser_session_create', {});
  const session_id = created.session_id as string;

  try {
    await call('browser_navigate', { session_id, url: TARGET_URL });
    const observed = await call('browser_observe', { session_id });

    const clickable = observed.elements?.find(
      (element) => element.role === 'link' || element.role === 'button',
    );
    if (clickable) {
      await call('browser_click', { session_id, target: { ref: clickable.ref } });
      await call('browser_observe', { session_id });
    } else {
      console.log('browser_click: skipped, no link or button on the page');
    }

    await call('browser_screenshot', { session_id });
    await call('browser_tabs', { session_id });
    await call('browser_steps_get', { session_id });
  } finally {
    await call('browser_session_close', { session_id });
    await client.close();
  }

  console.log('smoke flow completed');
}

main().catch((error: Error) => {
  console.error(`smoke failed: ${error.message}`);
  process.exit(1);
});
