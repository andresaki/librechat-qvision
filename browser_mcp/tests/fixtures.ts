import { extname, join, normalize } from 'node:path';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

import type { Server } from 'node:http';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures');
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

export interface FixtureServer {
  origin: string;
  close: () => Promise<void>;
}

/** Serves `fixtures/` over loopback so the tests never depend on an external site. */
export async function startFixtureServer(): Promise<FixtureServer> {
  const server: Server = createServer((request, response) => {
    const requested = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;

    if (requested === '/hang') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.write('<html><head><title>Hanging</title></head><body>');
      return;
    }

    if (requested === '/set-cookie') {
      response.writeHead(200, {
        'content-type': 'text/html',
        'set-cookie': 'bmcp_session=marker-a; Path=/',
      });
      response.end('<html><head><title>Cookie set</title></head><body>ok</body></html>');
      return;
    }

    if (requested === '/report.csv') {
      response.writeHead(200, {
        'content-type': 'text/csv',
        'content-disposition': 'attachment; filename="report.csv"',
      });
      response.end('id,name\n1,browser-mcp\n');
      return;
    }

    const relative = normalize(requested === '/' ? 'index.html' : requested).replace(
      /^([/\\]|\.\.)+/,
      '',
    );
    const filePath = join(FIXTURES_DIR, relative);

    readFile(filePath)
      .then((body) => {
        response.writeHead(200, {
          'content-type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
        });
        response.end(body);
      })
      .catch(() => {
        response.writeHead(404, { 'content-type': 'text/plain' });
        response.end('not found');
      });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Fixture server did not bind a TCP port');
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve) => {
        /** `/hang` deliberately never ends its response, so sockets must be dropped. */
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
