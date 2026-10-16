import { loadConfig } from '../src/config';
import { startFixtureServer } from './fixtures';
import { BrowserManager } from '../src/browser/manager';
import { fails, ok } from './helpers';

import type { FixtureServer } from './fixtures';

describe('concurrency and isolation', () => {
  let fixtures: FixtureServer;
  let manager: BrowserManager;

  beforeAll(async () => {
    fixtures = await startFixtureServer();
    manager = new BrowserManager({ ...loadConfig(), maxSessions: 5 });
  });

  afterAll(async () => {
    await manager.shutdown();
    await fixtures.close();
  });

  it('runs three sessions in parallel without mixing their state', async () => {
    const pages = ['/app.html', '/login.html', '/'];
    const titles = ['Browser MCP App', 'Login', 'Browser MCP Fixture'];

    const ids = await Promise.all(
      pages.map(async () => (await ok(manager, 'browser_session_create', {})).session_id as string),
    );

    await Promise.all(
      ids.map((id, index) =>
        ok(manager, 'browser_navigate', {
          session_id: id,
          url: `${fixtures.origin}${pages[index]}`,
        }),
      ),
    );

    const observed = await Promise.all(
      ids.map((id) => ok(manager, 'browser_observe', { session_id: id })),
    );
    expect(observed.map((payload) => payload.page?.title)).toEqual(titles);
    expect(observed.every((payload) => payload.page?.tab_id === 'tab-1')).toBe(true);

    const states = await Promise.all(
      ids.map((id) => ok(manager, 'browser_session_get', { session_id: id })),
    );
    expect(states.map((payload) => payload.session?.title)).toEqual(titles);

    await Promise.all(ids.map((id) => ok(manager, 'browser_session_close', { session_id: id })));
    expect(manager.metrics().activeSessions).toBe(0);
  });

  it('keeps interleaved operations on their own session', async () => {
    const a = (await ok(manager, 'browser_session_create', {})).session_id as string;
    const b = (await ok(manager, 'browser_session_create', {})).session_id as string;

    await Promise.all([
      ok(manager, 'browser_navigate', { session_id: a, url: `${fixtures.origin}/app.html` }),
      ok(manager, 'browser_navigate', { session_id: b, url: `${fixtures.origin}/app.html` }),
    ]);

    await Promise.all([
      ok(manager, 'browser_fill', {
        session_id: a,
        target: { label: 'Email' },
        value: 'a@example.com',
      }),
      ok(manager, 'browser_fill', {
        session_id: b,
        target: { label: 'Email' },
        value: 'b@example.com',
      }),
      ok(manager, 'browser_tab_new', { session_id: a, url: `${fixtures.origin}/login.html` }),
    ]);

    const [emailA, emailB] = await Promise.all([
      ok(manager, 'browser_element', { session_id: a, target: { label: 'Email' } }),
      ok(manager, 'browser_element', { session_id: b, target: { label: 'Email' } }),
    ]);

    expect(emailB.element?.value).toBe('b@example.com');
    expect(emailA.element?.value).toBe('');

    const tabsA = await ok(manager, 'browser_tabs', { session_id: a });
    const tabsB = await ok(manager, 'browser_tabs', { session_id: b });
    expect(tabsA.tabs).toHaveLength(2);
    expect(tabsB.tabs).toHaveLength(1);

    await ok(manager, 'browser_session_close', { session_id: a });
    await ok(manager, 'browser_session_close', { session_id: b });
  });

  it('never shares cookies between two sessions on the same origin', async () => {
    const a = (await ok(manager, 'browser_session_create', {})).session_id as string;
    const b = (await ok(manager, 'browser_session_create', {})).session_id as string;

    await ok(manager, 'browser_navigate', { session_id: a, url: `${fixtures.origin}/set-cookie` });
    await ok(manager, 'browser_navigate', { session_id: b, url: `${fixtures.origin}/` });

    const cookiesA = await ok(manager, 'browser_cookies', { session_id: a });
    const cookiesB = await ok(manager, 'browser_cookies', { session_id: b });

    expect(cookiesA.cookies?.map((cookie) => cookie.name)).toContain('bmcp_session');
    expect(cookiesB.cookies ?? []).toHaveLength(0);

    await ok(manager, 'browser_session_close', { session_id: a });
    await ok(manager, 'browser_session_close', { session_id: b });
  });

  it('keeps recorded steps and their counters per session', async () => {
    const a = (await ok(manager, 'browser_session_create', {})).session_id as string;
    const b = (await ok(manager, 'browser_session_create', {})).session_id as string;

    await ok(manager, 'browser_navigate', { session_id: a, url: `${fixtures.origin}/app.html` });
    await ok(manager, 'browser_fill', {
      session_id: a,
      target: { label: 'Email' },
      value: 'a@example.com',
    });
    await ok(manager, 'browser_check', { session_id: a, target: { label: 'Accept terms' } });

    await ok(manager, 'browser_navigate', { session_id: b, url: `${fixtures.origin}/login.html` });
    await ok(manager, 'browser_fill', {
      session_id: b,
      target: { label: 'Email' },
      value: 'b@example.com',
    });

    const stepsA = await ok(manager, 'browser_steps_get', { session_id: a });
    const stepsB = await ok(manager, 'browser_steps_get', { session_id: b });

    expect(stepsA.steps?.map((step) => step.sequence)).toEqual([1, 2, 3]);
    expect(stepsB.steps?.map((step) => step.sequence)).toEqual([1, 2]);
    expect(JSON.stringify(stepsB.steps)).not.toContain('a@example.com');

    await ok(manager, 'browser_steps_clear', { session_id: a });
    const clearedA = await ok(manager, 'browser_steps_get', { session_id: a });
    const untouchedB = await ok(manager, 'browser_steps_get', { session_id: b });
    expect(clearedA.steps).toEqual([]);
    expect(untouchedB.steps).toHaveLength(2);

    await ok(manager, 'browser_session_close', { session_id: a });
    await ok(manager, 'browser_session_close', { session_id: b });
  });

  it('destroys the recorded steps together with the session', async () => {
    const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
    await ok(manager, 'browser_navigate', { session_id: sessionId, url: `${fixtures.origin}/` });

    await ok(manager, 'browser_session_close', { session_id: sessionId });
    const error = await fails(manager, 'browser_steps_get', { session_id: sessionId });
    expect(error.code).toBe('SESSION_NOT_FOUND');
  });

  it('refuses a tab id that belongs to another session', async () => {
    const a = (await ok(manager, 'browser_session_create', {})).session_id as string;
    const b = (await ok(manager, 'browser_session_create', {})).session_id as string;

    await ok(manager, 'browser_navigate', { session_id: a, url: `${fixtures.origin}/` });
    await ok(manager, 'browser_tab_new', { session_id: b, url: `${fixtures.origin}/login.html` });

    const error = await fails(manager, 'browser_tab_select', { session_id: a, tab_id: 'tab-2' });
    expect(error.code).toBe('TAB_NOT_FOUND');

    const stillA = await ok(manager, 'browser_session_get', { session_id: a });
    expect(stillA.session?.title).toBe('Browser MCP Fixture');

    await ok(manager, 'browser_session_close', { session_id: a });
    await ok(manager, 'browser_session_close', { session_id: b });
  });
});
