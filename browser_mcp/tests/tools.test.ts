import { randomUUID } from 'node:crypto';

import { callTool, tools } from '../src/tools';
import { startFixtureServer } from './fixtures';
import { fails, newManager, ok, payloadOf } from './helpers';

import type { BrowserManager } from '../src/browser/manager';
import type { FixtureServer } from './fixtures';

const EXPECTED_TOOLS = [
  'browser_check',
  'browser_click',
  'browser_cookies',
  'browser_element',
  'browser_fill',
  'browser_focus',
  'browser_go_back',
  'browser_go_forward',
  'browser_hover',
  'browser_navigate',
  'browser_observe',
  'browser_press',
  'browser_reload',
  'browser_screenshot',
  'browser_select',
  'browser_session_close',
  'browser_session_create',
  'browser_session_get',
  'browser_session_list',
  'browser_status',
  'browser_steps_clear',
  'browser_steps_get',
  'browser_tab_close',
  'browser_tab_new',
  'browser_tab_select',
  'browser_tabs',
  'browser_type',
  'browser_uncheck',
  'browser_wait',
  'browser_wait_for_download',
  'browser_wait_for_element',
  'browser_wait_for_text',
  'browser_wait_for_url',
];

describe('browser MCP tools', () => {
  let fixtures: FixtureServer;
  let manager: BrowserManager;
  let sessionId: string;

  beforeAll(async () => {
    fixtures = await startFixtureServer();
    manager = newManager();
    sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
  });

  afterAll(async () => {
    await manager.closeAll();
    await fixtures.close();
  });

  it('exposes the full tool set', () => {
    expect(tools.map((tool) => tool.name).sort()).toEqual(EXPECTED_TOOLS);
  });

  it('Test 1: creates a session', async () => {
    const payload = await ok(manager, 'browser_session_create', {});
    expect(payload.status).toBe('active');
    expect(payload.session_id).toMatch(/^[0-9a-f-]{36}$/);
    await ok(manager, 'browser_session_close', { session_id: payload.session_id });
  });

  it('Test 2: navigates and reports url and title', async () => {
    const payload = await ok(manager, 'browser_navigate', {
      session_id: sessionId,
      url: `${fixtures.origin}/`,
    });

    expect(payload.url).toBe(`${fixtures.origin}/`);
    expect(payload.title).toBe('Browser MCP Fixture');
    expect(payload.tab_id).toBe('tab-1');
  });

  it('Test 3: observes page and interactive elements', async () => {
    const payload = await ok(manager, 'browser_observe', { session_id: sessionId });

    expect(payload.page).toEqual({
      url: `${fixtures.origin}/`,
      title: 'Browser MCP Fixture',
      tab_id: 'tab-1',
    });
    expect(payload.elements).toEqual([{ ref: 'e1', role: 'link', name: 'Go to login' }]);
  });

  it('reports session state through browser_session_get and browser_session_list', async () => {
    const got = await ok(manager, 'browser_session_get', { session_id: sessionId });
    expect(got.session).toMatchObject({ session_id: sessionId, status: 'active', tabs: 1 });

    const listed = await ok(manager, 'browser_session_list', {});
    expect(listed.sessions?.some((session) => session.session_id === sessionId)).toBe(true);
  });

  it('navigates back, forward and reloads', async () => {
    await ok(manager, 'browser_navigate', {
      session_id: sessionId,
      url: `${fixtures.origin}/login.html`,
    });

    const back = await ok(manager, 'browser_go_back', { session_id: sessionId });
    expect(back.title).toBe('Browser MCP Fixture');

    const forward = await ok(manager, 'browser_go_forward', { session_id: sessionId });
    expect(forward.title).toBe('Login');

    const reloaded = await ok(manager, 'browser_reload', { session_id: sessionId });
    expect(reloaded.title).toBe('Login');
  });

  it('clicks by ref and observes the next page', async () => {
    await ok(manager, 'browser_navigate', { session_id: sessionId, url: `${fixtures.origin}/` });
    await ok(manager, 'browser_observe', { session_id: sessionId });

    const clicked = await ok(manager, 'browser_click', {
      session_id: sessionId,
      target: { ref: 'e1' },
    });
    expect(clicked.title).toBe('Login');

    const observed = await ok(manager, 'browser_observe', { session_id: sessionId });
    expect(observed.elements?.map((element) => [element.role, element.name])).toEqual([
      ['textbox', 'Email'],
      ['textbox', 'Password'],
      ['button', 'Login'],
    ]);
  });

  it('inspects a single element with browser_element', async () => {
    const payload = await ok(manager, 'browser_element', {
      session_id: sessionId,
      target: { role: 'textbox', name: 'Email' },
    });

    expect(payload.element).toMatchObject({
      role: 'textbox',
      name: 'Email',
      visible: true,
      enabled: true,
    });
  });

  it('Test 4: reports ELEMENT_NOT_FOUND for a missing element', async () => {
    const error = await fails(manager, 'browser_click', {
      session_id: sessionId,
      target: { role: 'button', name: 'Nope Does Not Exist' },
    });

    expect(error.code).toBe('ELEMENT_NOT_FOUND');
    expect(error.retryable).toBe(false);
  });

  it('reports INVALID_TARGET when no locator is provided', async () => {
    const error = await fails(manager, 'browser_click', { session_id: sessionId, target: {} });
    expect(error.code).toBe('INVALID_TARGET');
  });

  it('Test 5: closes the session', async () => {
    const payload = await ok(manager, 'browser_session_close', { session_id: sessionId });
    expect(payload.status).toBe('closed');
  });

  it('Test 6: reports SESSION_NOT_FOUND for a closed session', async () => {
    const error = await fails(manager, 'browser_observe', { session_id: sessionId });
    expect(error.code).toBe('SESSION_NOT_FOUND');
  });

  it('reports SESSION_NOT_FOUND for an unknown session id', async () => {
    const error = await fails(manager, 'browser_navigate', {
      session_id: randomUUID(),
      url: fixtures.origin,
    });
    expect(error.code).toBe('SESSION_NOT_FOUND');
  });

  it('rejects an unknown tool name without throwing', async () => {
    const payload = payloadOf(await callTool(manager, 'browser_teleport', {}));
    expect(payload.error?.code).toBe('INTERNAL_ERROR');
  });
});
