import { readFile } from 'node:fs/promises';

import { startFixtureServer } from './fixtures';
import { fails, newManager, ok } from './helpers';

import type { BrowserManager } from '../src/browser/manager';
import type { FixtureServer } from './fixtures';

describe('phase 2 end-to-end flow', () => {
  let fixtures: FixtureServer;
  let manager: BrowserManager;
  let sessionId: string;

  beforeAll(async () => {
    fixtures = await startFixtureServer();
    manager = newManager();
    sessionId = (await ok(manager, 'browser_session_create', {})).session_id as string;
    await ok(manager, 'browser_navigate', {
      session_id: sessionId,
      url: `${fixtures.origin}/app.html`,
    });
  });

  afterAll(async () => {
    await manager.closeAll();
    await fixtures.close();
  });

  it('runs create → navigate → observe → fill → type → select → check → press → wait → screenshot', async () => {
    const observed = await ok(manager, 'browser_observe', { session_id: sessionId });
    expect(observed.page?.title).toBe('Browser MCP App');
    expect(observed.elements?.some((element) => element.name === 'Email')).toBe(true);

    await ok(manager, 'browser_fill', {
      session_id: sessionId,
      target: { label: 'Email' },
      value: 'agent@example.com',
    });
    await ok(manager, 'browser_type', {
      session_id: sessionId,
      target: { label: 'Password' },
      text: 'sup3r-secret',
    });
    await ok(manager, 'browser_select', {
      session_id: sessionId,
      target: { label: 'Country' },
      value: 'CO',
    });
    await ok(manager, 'browser_check', {
      session_id: sessionId,
      target: { label: 'Accept terms' },
    });

    const email = await ok(manager, 'browser_element', {
      session_id: sessionId,
      target: { label: 'Email' },
    });
    expect(email.element?.value).toBe('agent@example.com');

    const terms = await ok(manager, 'browser_element', {
      session_id: sessionId,
      target: { label: 'Accept terms' },
    });
    expect(terms.element?.checked).toBe(true);

    await ok(manager, 'browser_focus', { session_id: sessionId, target: { label: 'Email' } });
    await ok(manager, 'browser_click', {
      session_id: sessionId,
      target: { role: 'button', name: 'Submit' },
    });

    await ok(manager, 'browser_wait_for_text', {
      session_id: sessionId,
      text: 'Operation completed',
      timeout: 5000,
    });

    const shot = await ok(manager, 'browser_screenshot', {
      session_id: sessionId,
      full_page: true,
    });
    expect(shot.mime_type ?? 'image/png').toBe('image/png');
  });

  it('never records the password value in the step log', async () => {
    const steps = await ok(manager, 'browser_steps_get', { session_id: sessionId });
    const actions = steps.steps?.map((step) => step.action) ?? [];

    expect(actions).toEqual(
      expect.arrayContaining(['navigate', 'fill', 'type', 'select', 'check', 'focus', 'click']),
    );

    const typed = steps.steps?.find((step) => step.action === 'type');
    expect(typed?.value).toBe('{{password}}');
    expect(JSON.stringify(steps.steps)).not.toContain('sup3r-secret');

    const filled = steps.steps?.find((step) => step.action === 'fill');
    expect(filled?.value).toBe('agent@example.com');
  });

  it('clears the recorded steps', async () => {
    const cleared = await ok(manager, 'browser_steps_clear', { session_id: sessionId });
    expect(cleared.cleared).toBeGreaterThan(0);

    const steps = await ok(manager, 'browser_steps_get', { session_id: sessionId });
    expect(steps.steps).toEqual([]);
  });

  it('opens a hover submenu and clicks inside it', async () => {
    await ok(manager, 'browser_reload', { session_id: sessionId });
    await ok(manager, 'browser_hover', { session_id: sessionId, target: { text: 'Menu' } });
    await ok(manager, 'browser_wait_for_element', {
      session_id: sessionId,
      target: { role: 'button', name: 'Submenu action' },
      timeout: 5000,
    });
    await ok(manager, 'browser_click', {
      session_id: sessionId,
      target: { role: 'button', name: 'Submenu action' },
    });
  });

  it('answers a JavaScript dialog instead of blocking', async () => {
    await ok(manager, 'browser_click', {
      session_id: sessionId,
      target: { role: 'button', name: 'Show alert' },
    });

    const session = await ok(manager, 'browser_session_get', { session_id: sessionId });
    expect(session.title).toBe(undefined);
    expect(session.session).toMatchObject({ title: 'Alert handled' });
  });

  it('captures a download to a temporary path inside the MCP', async () => {
    await ok(manager, 'browser_click', {
      session_id: sessionId,
      target: { text: 'Download report' },
    });
    const payload = await ok(manager, 'browser_wait_for_download', {
      session_id: sessionId,
      timeout: 10000,
    });

    expect(payload.download?.suggested_filename).toBe('report.csv');
    await expect(readFile(payload.download?.path as string, 'utf8')).resolves.toContain(
      'browser-mcp',
    );
  });

  it('lists cookies without exposing their values', async () => {
    const payload = await ok(manager, 'browser_cookies', { session_id: sessionId });
    expect(Array.isArray(payload.cookies)).toBe(true);
    expect(JSON.stringify(payload.cookies)).not.toContain('"value"');
  });

  it('waits for a URL with a glob pattern', async () => {
    await ok(manager, 'browser_navigate', {
      session_id: sessionId,
      url: `${fixtures.origin}/login.html`,
    });
    const payload = await ok(manager, 'browser_wait_for_url', {
      session_id: sessionId,
      url: '**/login.html',
      timeout: 5000,
    });
    expect(payload.url).toContain('/login.html');
  });

  it('waits on an explicit condition object', async () => {
    const payload = await ok(manager, 'browser_wait', {
      session_id: sessionId,
      condition: { type: 'element', target: { role: 'button', name: 'Login' } },
      timeout: 5000,
    });
    expect(payload.title).toBe('Login');
  });

  it('rejects a check on a non-checkable element', async () => {
    const error = await fails(manager, 'browser_check', {
      session_id: sessionId,
      target: { role: 'button', name: 'Login' },
    });
    expect(error.code).toBe('INVALID_OPERATION');
  });
});
