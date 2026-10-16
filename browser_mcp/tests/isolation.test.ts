import { startFixtureServer } from './fixtures';
import { fails, newManager, ok } from './helpers';

import type { BrowserManager } from '../src/browser/manager';
import type { FixtureServer } from './fixtures';

describe('sessions, tabs and refs', () => {
  let fixtures: FixtureServer;
  let manager: BrowserManager;

  beforeAll(async () => {
    fixtures = await startFixtureServer();
    manager = newManager();
  });

  afterAll(async () => {
    await manager.closeAll();
    await fixtures.close();
  });

  it('keeps two sessions isolated from each other', async () => {
    const a = (await ok(manager, 'browser_session_create', {})).session_id as string;
    const b = (await ok(manager, 'browser_session_create', {})).session_id as string;

    await ok(manager, 'browser_navigate', { session_id: a, url: `${fixtures.origin}/app.html` });
    await ok(manager, 'browser_navigate', { session_id: b, url: `${fixtures.origin}/login.html` });

    await ok(manager, 'browser_fill', {
      session_id: a,
      target: { label: 'Email' },
      value: 'a@example.com',
    });

    const stateA = await ok(manager, 'browser_session_get', { session_id: a });
    const stateB = await ok(manager, 'browser_session_get', { session_id: b });
    expect(stateA.session?.title).toBe('Browser MCP App');
    expect(stateB.session?.title).toBe('Login');

    const emailB = await ok(manager, 'browser_element', {
      session_id: b,
      target: { label: 'Email' },
    });
    expect(emailB.element?.value).toBe('');

    await ok(manager, 'browser_session_close', { session_id: a });
    const stillOpen = await ok(manager, 'browser_session_get', { session_id: b });
    expect(stillOpen.session?.status).toBe('active');
    await ok(manager, 'browser_session_close', { session_id: b });
  });

  it('works with several tabs inside one session', async () => {
    const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
    await ok(manager, 'browser_navigate', { session_id: sessionId, url: `${fixtures.origin}/` });

    const created = await ok(manager, 'browser_tab_new', {
      session_id: sessionId,
      url: `${fixtures.origin}/login.html`,
    });
    expect(created.tab_id).toBe('tab-2');
    expect(created.title).toBe('Login');

    const tabs = await ok(manager, 'browser_tabs', { session_id: sessionId });
    expect(tabs.tabs?.map((tab) => tab.id)).toEqual(['tab-1', 'tab-2']);
    expect(tabs.tabs?.find((tab) => tab.active)?.id).toBe('tab-2');

    const selected = await ok(manager, 'browser_tab_select', {
      session_id: sessionId,
      tab_id: 'tab-1',
    });
    expect(selected.title).toBe('Browser MCP Fixture');

    const closed = await ok(manager, 'browser_tab_close', {
      session_id: sessionId,
      tab_id: 'tab-2',
    });
    expect(closed.closed_tab_id).toBe('tab-2');
    expect(closed.active_tab_id).toBe('tab-1');

    const remaining = await ok(manager, 'browser_tabs', { session_id: sessionId });
    expect(remaining.tabs?.map((tab) => tab.id)).toEqual(['tab-1']);

    await ok(manager, 'browser_session_close', { session_id: sessionId });
  });

  it('registers a popup opened by a click as a new tab', async () => {
    const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
    await ok(manager, 'browser_navigate', {
      session_id: sessionId,
      url: `${fixtures.origin}/app.html`,
    });
    await ok(manager, 'browser_click', {
      session_id: sessionId,
      target: { text: 'Open in new tab' },
    });
    await ok(manager, 'browser_wait', {
      session_id: sessionId,
      condition: { type: 'timeout', value: '500' },
    });

    const tabs = await ok(manager, 'browser_tabs', { session_id: sessionId });
    expect(tabs.tabs?.length).toBe(2);

    await ok(manager, 'browser_session_close', { session_id: sessionId });
  });

  it('makes another tab active when the active one is closed', async () => {
    const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
    await ok(manager, 'browser_navigate', { session_id: sessionId, url: `${fixtures.origin}/` });
    await ok(manager, 'browser_tab_new', {
      session_id: sessionId,
      url: `${fixtures.origin}/login.html`,
    });

    const closed = await ok(manager, 'browser_tab_close', {
      session_id: sessionId,
      tab_id: 'tab-2',
    });
    expect(closed.active_tab_id).toBe('tab-1');

    const state = await ok(manager, 'browser_session_get', { session_id: sessionId });
    expect(state.session?.title).toBe('Browser MCP Fixture');

    await ok(manager, 'browser_session_close', { session_id: sessionId });
  });

  it('refuses to close the last tab of a session', async () => {
    const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
    const error = await fails(manager, 'browser_tab_close', {
      session_id: sessionId,
      tab_id: 'tab-1',
    });

    expect(error.code).toBe('INVALID_OPERATION');
    await ok(manager, 'browser_session_close', { session_id: sessionId });
  });

  it('reports TAB_NOT_FOUND for an unknown tab', async () => {
    const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
    const error = await fails(manager, 'browser_tab_select', {
      session_id: sessionId,
      tab_id: 'tab-99',
    });

    expect(error.code).toBe('TAB_NOT_FOUND');
    await ok(manager, 'browser_session_close', { session_id: sessionId });
  });

  it('reports ELEMENT_REF_STALE after the DOM changed', async () => {
    const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
    await ok(manager, 'browser_navigate', {
      session_id: sessionId,
      url: `${fixtures.origin}/app.html`,
    });

    const observed = await ok(manager, 'browser_observe', { session_id: sessionId });
    const oldButton = observed.elements?.find((element) => element.name === 'Old button');
    expect(oldButton).toBeDefined();

    await ok(manager, 'browser_click', {
      session_id: sessionId,
      target: { role: 'button', name: 'Replace content' },
    });

    const error = await fails(manager, 'browser_click', {
      session_id: sessionId,
      target: { ref: oldButton?.ref as string },
    });
    expect(error.code).toBe('ELEMENT_REF_STALE');
    expect(error.message).toContain('browser_observe');

    const refreshed = await ok(manager, 'browser_observe', { session_id: sessionId });
    const newButton = refreshed.elements?.find((element) => element.name === 'New button');
    expect(newButton).toBeDefined();
    await ok(manager, 'browser_click', {
      session_id: sessionId,
      target: { ref: newButton?.ref as string },
    });

    await ok(manager, 'browser_session_close', { session_id: sessionId });
  });

  it('reports ELEMENT_REF_STALE when the ref belongs to another tab', async () => {
    const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
    await ok(manager, 'browser_navigate', { session_id: sessionId, url: `${fixtures.origin}/` });
    await ok(manager, 'browser_observe', { session_id: sessionId });

    await ok(manager, 'browser_tab_new', {
      session_id: sessionId,
      url: `${fixtures.origin}/login.html`,
    });
    const error = await fails(manager, 'browser_click', {
      session_id: sessionId,
      target: { ref: 'e1' },
    });

    expect(error.code).toBe('ELEMENT_REF_STALE');
    await ok(manager, 'browser_session_close', { session_id: sessionId });
  });

  it('reports ELEMENT_NOT_ENABLED for a disabled control', async () => {
    const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
    await ok(manager, 'browser_navigate', {
      session_id: sessionId,
      url: `${fixtures.origin}/app.html`,
    });

    const error = await fails(manager, 'browser_click', {
      session_id: sessionId,
      target: { role: 'button', name: 'Disabled action' },
    });
    expect(error.code).toBe('ELEMENT_NOT_ENABLED');

    await ok(manager, 'browser_session_close', { session_id: sessionId });
  });

  it('reports TIMEOUT when a text never appears', async () => {
    const sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
    await ok(manager, 'browser_navigate', {
      session_id: sessionId,
      url: `${fixtures.origin}/app.html`,
    });

    const error = await fails(manager, 'browser_wait_for_text', {
      session_id: sessionId,
      text: 'this text never shows up',
      timeout: 1000,
    });
    expect(error.code).toBe('TIMEOUT');
    expect(error.retryable).toBe(true);

    await ok(manager, 'browser_session_close', { session_id: sessionId });
  });
});
