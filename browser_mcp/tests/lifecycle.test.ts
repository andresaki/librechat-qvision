import { loadConfig } from '../src/config';
import { startFixtureServer } from './fixtures';
import { BrowserManager } from '../src/browser/manager';
import { fails, ok, payloadOf } from './helpers';
import { callTool } from '../src/tools';

import type { Browser, Page } from 'playwright';
import type { BrowserMcpConfig } from '../src/config';
import type { Session } from '../src/browser/session';
import type { FixtureServer } from './fixtures';

function managerWith(overrides: Partial<BrowserMcpConfig> = {}): BrowserManager {
  return new BrowserManager({ ...loadConfig(), ...overrides });
}

/**
 * Tests reach into private state to simulate a browser or page dying underneath the
 * session. Production code has no such backdoor.
 */
function sessionOf(manager: BrowserManager, sessionId: string): Session {
  const sessions = manager['sessions'] as Map<string, Session>;
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`session ${sessionId} is not held by the manager`);
  }
  return session;
}

function browserOf(session: Session): Browser {
  return session['browser'] as Browser;
}

function pagesOf(session: Session): Page[] {
  return Array.from((session['tabs'] as Map<string, Page>).values());
}

describe('session lifecycle', () => {
  let fixtures: FixtureServer;

  beforeAll(async () => {
    fixtures = await startFixtureServer();
  });

  afterAll(async () => {
    await fixtures.close();
  });

  it('walks create → active → closed and refuses reuse', async () => {
    const manager = managerWith();
    try {
      const created = await ok(manager, 'browser_session_create', {});
      const sessionId = created.session_id as string;
      expect(created.status).toBe('active');

      const got = await ok(manager, 'browser_session_get', { session_id: sessionId });
      expect(got.session?.status).toBe('active');

      await ok(manager, 'browser_session_close', { session_id: sessionId });

      const afterClose = await fails(manager, 'browser_session_get', { session_id: sessionId });
      expect(afterClose.code).toBe('SESSION_NOT_FOUND');
      const reuse = await fails(manager, 'browser_navigate', {
        session_id: sessionId,
        url: fixtures.origin,
      });
      expect(reuse.code).toBe('SESSION_NOT_FOUND');
    } finally {
      await manager.shutdown();
    }
  });

  it('refreshes last_activity_at on every successful tool call', async () => {
    const manager = managerWith();
    try {
      const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
      const session = sessionOf(manager, sessionId);

      session['lastActivity'] = Date.now() - 60_000;
      expect(session.idleMs).toBeGreaterThanOrEqual(60_000);

      await ok(manager, 'browser_navigate', { session_id: sessionId, url: `${fixtures.origin}/` });
      expect(session.idleMs).toBeLessThan(5_000);
    } finally {
      await manager.shutdown();
    }
  });

  it('sweeps a session that stayed idle past SESSION_IDLE_TIMEOUT', async () => {
    const manager = managerWith({ sessionIdleTimeout: 50, idleSweepInterval: 0 });
    try {
      const idle = (await ok(manager, 'browser_session_create', {})).session_id as string;
      const active = (await ok(manager, 'browser_session_create', {})).session_id as string;

      sessionOf(manager, idle)['lastActivity'] = Date.now() - 10_000;

      const swept = await manager.cleanupIdleSessions();
      expect(swept).toEqual([idle]);

      const gone = await fails(manager, 'browser_observe', { session_id: idle });
      expect(gone.code).toBe('SESSION_NOT_FOUND');

      const alive = await ok(manager, 'browser_session_get', { session_id: active });
      expect(alive.session?.status).toBe('active');
    } finally {
      await manager.shutdown();
    }
  });

  it('enforces MAX_SESSIONS for sequential creates', async () => {
    const manager = managerWith({ maxSessions: 2 });
    try {
      await ok(manager, 'browser_session_create', {});
      await ok(manager, 'browser_session_create', {});

      const rejected = await fails(manager, 'browser_session_create', {});
      expect(rejected.code).toBe('MAX_SESSIONS_REACHED');
      expect(manager.metrics().activeSessions).toBe(2);
    } finally {
      await manager.shutdown();
    }
  });

  it('enforces MAX_SESSIONS when creates race each other', async () => {
    const manager = managerWith({ maxSessions: 2 });
    try {
      const burst = await Promise.all(
        Array.from({ length: 5 }, () => callTool(manager, 'browser_session_create', {})),
      );
      const payloads = burst.map(payloadOf);

      expect(payloads.filter((payload) => payload.success)).toHaveLength(2);
      expect(
        payloads.filter((payload) => payload.error?.code === 'MAX_SESSIONS_REACHED'),
      ).toHaveLength(3);
      expect(manager.metrics().activeSessions).toBe(2);
    } finally {
      await manager.shutdown();
    }
  });

  it('reports BROWSER_CLOSED once the browser died, then cleans the session up', async () => {
    const manager = managerWith();
    try {
      const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
      await ok(manager, 'browser_navigate', { session_id: sessionId, url: `${fixtures.origin}/` });

      await browserOf(sessionOf(manager, sessionId)).close();

      const error = await fails(manager, 'browser_observe', { session_id: sessionId });
      expect(error.code).toBe('BROWSER_CLOSED');
      expect(error.message).not.toContain('at ');

      await new Promise((resolve) => setTimeout(resolve, 200));
      const swept = await fails(manager, 'browser_observe', { session_id: sessionId });
      expect(swept.code).toBe('SESSION_NOT_FOUND');
      expect(manager.metrics().activeSessions).toBe(0);
    } finally {
      await manager.shutdown();
    }
  });

  it('reports PAGE_CLOSED when every tab of the session is gone', async () => {
    const manager = managerWith();
    try {
      const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
      await ok(manager, 'browser_navigate', { session_id: sessionId, url: `${fixtures.origin}/` });

      for (const page of pagesOf(sessionOf(manager, sessionId))) {
        await page.close();
      }

      const error = await fails(manager, 'browser_observe', { session_id: sessionId });
      expect(error.code).toBe('PAGE_CLOSED');
    } finally {
      await manager.shutdown();
    }
  });

  it('falls back to a surviving tab when the active one is closed externally', async () => {
    const manager = managerWith();
    try {
      const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
      await ok(manager, 'browser_navigate', { session_id: sessionId, url: `${fixtures.origin}/` });
      await ok(manager, 'browser_tab_new', {
        session_id: sessionId,
        url: `${fixtures.origin}/login.html`,
      });

      const session = sessionOf(manager, sessionId);
      const [, second] = pagesOf(session);
      await second?.close();

      const state = await ok(manager, 'browser_session_get', { session_id: sessionId });
      expect(state.session?.title).toBe('Browser MCP Fixture');
    } finally {
      await manager.shutdown();
    }
  });

  it('turns a slow navigation into NAVIGATION_TIMEOUT', async () => {
    const manager = managerWith({ navigationTimeout: 1_000 });
    try {
      const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
      const error = await fails(manager, 'browser_navigate', {
        session_id: sessionId,
        url: `${fixtures.origin}/hang`,
      });

      expect(error.code).toBe('NAVIGATION_TIMEOUT');
      expect(error.retryable).toBe(true);
      expect(error.message).not.toContain(__dirname);
    } finally {
      await manager.shutdown();
    }
  });

  it('cleanup closes browser, context and pages, and is safe to repeat', async () => {
    const manager = managerWith();
    try {
      const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
      await ok(manager, 'browser_tab_new', { session_id: sessionId });

      const session = sessionOf(manager, sessionId);
      const browser = browserOf(session);
      const pages = pagesOf(session);

      await manager.cleanupSession(sessionId, 'test');
      await manager.cleanupSession(sessionId, 'test-again');

      expect(session.status).toBe('closed');
      expect(browser.isConnected()).toBe(false);
      expect(pages.every((page) => page.isClosed())).toBe(true);
      expect(session['timers'].size).toBe(0);
      expect(session['detachers']).toHaveLength(0);
      expect(session.tabCount).toBe(0);
      expect(manager.metrics().activeSessions).toBe(0);
    } finally {
      await manager.shutdown();
    }
  });

  it('shutdown closes every live session', async () => {
    const manager = managerWith();
    const first = (await ok(manager, 'browser_session_create', {})).session_id as string;
    const second = (await ok(manager, 'browser_session_create', {})).session_id as string;
    const browsers = [first, second].map((id) => browserOf(sessionOf(manager, id)));

    await manager.shutdown();

    expect(manager.metrics().activeSessions).toBe(0);
    expect(browsers.every((browser) => !browser.isConnected())).toBe(true);
    await expect(manager.shutdown()).resolves.toBeUndefined();
  });

  it('reports operational counters through browser_status', async () => {
    const manager = managerWith({ maxSessions: 4 });
    try {
      const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
      await fails(manager, 'browser_observe', {
        session_id: '00000000-0000-4000-8000-000000000000',
      });

      const status = await ok(manager, 'browser_status', {});
      expect(status.status).toBe('ok');
      expect(status.active_sessions).toBe(1);
      expect(status.max_sessions).toBe(4);
      expect(status.total_sessions_created).toBe(1);
      expect(status.total_errors).toBeGreaterThanOrEqual(1);

      await ok(manager, 'browser_session_close', { session_id: sessionId });
      const after = await ok(manager, 'browser_status', {});
      expect(after.active_sessions).toBe(0);
      expect(after.total_sessions_closed).toBe(1);
    } finally {
      await manager.shutdown();
    }
  });
});
