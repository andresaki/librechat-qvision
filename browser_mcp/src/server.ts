import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { loadConfig } from './config';
import { tools, callTool } from './tools';
import { BrowserManager } from './browser/manager';
import { logEvent, logInfo, logError } from './logger';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { BrowserMcpConfig } from './config';

const SERVER_INFO = { name: 'browser-mcp', version: '0.1.0' } as const;
const MAX_BODY_BYTES = 4 * 1024 * 1024;

const INSTRUCTIONS =
  'Controls a Chromium browser through Playwright. Always call browser_session_create first, ' +
  'then browser_navigate, then browser_observe to see the page. Address elements by the ref ' +
  'returned by browser_observe. Call browser_session_close when the task is done.';

function createMcpServer(manager: BrowserManager): Server {
  const server = new Server(SERVER_INFO, {
    capabilities: { tools: {} },
    instructions: INSTRUCTIONS,
  });

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.map(({ name, title, description, inputSchema }) => ({
      name,
      title,
      description,
      inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { content, isError } = await callTool(
      manager,
      request.params.name,
      request.params.arguments,
    );
    return { content, isError };
  });

  return server;
}

async function startStdio(manager: BrowserManager): Promise<void> {
  const server = createMcpServer(manager);
  await server.connect(new StdioServerTransport());
  logInfo('listening transport=stdio');
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('error', reject);
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw.length === 0) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendJson(response: ServerResponse, status: number, payload: object): void {
  const body = JSON.stringify(payload);
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(body);
}

/**
 * The official MCP Streamable HTTP transport, used so LibreChat can reach this server
 * from another container. It is not a REST API: the only route is the MCP endpoint.
 */
async function startHttp(manager: BrowserManager, config: BrowserMcpConfig): Promise<void> {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const http = createServer((request, response) => {
    void handleRequest(request, response).catch((error: Error) => {
      logError(`http request failed reason=${error.message}`);
      if (!response.headersSent) {
        sendJson(response, 400, {
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Invalid request' },
          id: null,
        });
      }
    });
  });

  async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    if (url.pathname !== '/mcp') {
      sendJson(response, 404, { error: 'Not found' });
      return;
    }

    const sessionId = request.headers['mcp-session-id'];
    const existing = typeof sessionId === 'string' ? transports.get(sessionId) : undefined;
    if (existing) {
      const body = request.method === 'POST' ? await readBody(request) : undefined;
      await existing.handleRequest(request, response, body);
      return;
    }

    if (request.method !== 'POST') {
      sendJson(response, 400, { error: 'Missing or unknown mcp-session-id' });
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport);
        logInfo(`mcp http session opened id=${id}`);
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
        logInfo(`mcp http session closed id=${transport.sessionId}`);
      }
    };

    await createMcpServer(manager).connect(transport);
    await transport.handleRequest(request, response, await readBody(request));
  }

  await new Promise<void>((resolve) => {
    http.listen(config.httpPort, '0.0.0.0', resolve);
  });
  logInfo(`listening transport=http url=http://0.0.0.0:${config.httpPort}/mcp`);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const manager = new BrowserManager(config);

  logEvent('info', 'starting', {
    headless: String(config.headless),
    actionTimeout: config.actionTimeout,
    navigationTimeout: config.navigationTimeout,
    observationTimeout: config.observationTimeout,
    sessionIdleTimeout: `${config.sessionIdleTimeout / 1000}s`,
    maxSessions: config.maxSessions,
    allowedDomains: config.allowedDomains.join(',') || 'any',
  });

  /** Docker sends SIGTERM: every Chromium must be closed before the process exits. */
  let stopping = false;
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      if (stopping) {
        return;
      }
      stopping = true;
      logEvent('info', 'signal_received', { signal });
      void manager
        .shutdown()
        .catch((error: Error) => logError(`shutdown failed ${error.message}`))
        .finally(() => process.exit(0));
    });
  }

  if (config.transport === 'http') {
    await startHttp(manager, config);
    return;
  }
  await startStdio(manager);
}

main().catch((error: Error) => {
  logError(`fatal ${error.message}`);
  process.exit(1);
});
