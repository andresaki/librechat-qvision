/**
 * Minimal MCP Streamable HTTP client used to exercise the server from inside its own
 * container, where no dev dependencies are installed. Not part of the server itself.
 */
const URL_MCP = process.env.PROBE_URL || 'http://127.0.0.1:8932/mcp';
const HEADERS = {
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream',
};

let sessionHeader = '';

async function rpc(method, params, id) {
  const response = await fetch(URL_MCP, {
    method: 'POST',
    headers: sessionHeader ? { ...HEADERS, 'mcp-session-id': sessionHeader } : HEADERS,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  if (!sessionHeader) {
    sessionHeader = response.headers.get('mcp-session-id') || '';
  }
  const text = await response.text();
  const line = text.split('\n').find((entry) => entry.startsWith('data: '));
  return line ? JSON.parse(line.slice(6)) : undefined;
}

async function call(name, args) {
  const result = await rpc(
    'tools/call',
    { name, arguments: args },
    Math.floor(Math.random() * 1e6),
  );
  const payload = JSON.parse(result.result.content[0].text);
  console.log(name, JSON.stringify(payload).slice(0, 220));
  return payload;
}

async function main() {
  await rpc(
    'initialize',
    {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'probe', version: '1' },
    },
    1,
  );
  await fetch(URL_MCP, {
    method: 'POST',
    headers: { ...HEADERS, 'mcp-session-id': sessionHeader },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  });

  const count = Number(process.env.PROBE_SESSIONS || 2);
  const ids = [];
  for (let index = 0; index < count; index += 1) {
    const created = await call('browser_session_create', {});
    ids.push(created.session_id);
    await call('browser_navigate', { session_id: created.session_id, url: 'https://example.com' });
  }

  await call('browser_status', {});

  if (process.env.PROBE_KEEP_OPEN !== 'true') {
    for (const id of ids) {
      await call('browser_session_close', { session_id: id });
    }
    await call('browser_status', {});
  }
}

main().catch((error) => {
  console.error('probe failed:', error.message);
  process.exit(1);
});
