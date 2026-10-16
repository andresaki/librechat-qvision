import { randomUUID } from 'node:crypto';

import { loadConfig } from '../src/config';
import { startFixtureServer } from './fixtures';
import { BrowserManager } from '../src/browser/manager';
import { StepRecorder, redactValue } from '../src/browser/recorder';
import { BrowserMcpError, toBrowserMcpError } from '../src/errors';

import type { BrowserMcpConfig } from '../src/config';
import type { FixtureServer } from './fixtures';

function configWith(overrides: Partial<BrowserMcpConfig>): BrowserMcpConfig {
  return { ...loadConfig(), ...overrides };
}

async function expectCode(operation: Promise<unknown>, code: string): Promise<void> {
  await expect(operation).rejects.toThrow(BrowserMcpError);
  await operation.catch((error: BrowserMcpError) => expect(error.code).toBe(code));
}

describe('BrowserManager', () => {
  let fixtures: FixtureServer;

  beforeAll(async () => {
    fixtures = await startFixtureServer();
  });

  afterAll(async () => {
    await fixtures.close();
  });

  it('tracks sessions in memory and drops them on close', async () => {
    const manager = new BrowserManager(loadConfig());
    const session = await manager.createSession();

    await expect(manager.listSessions()).resolves.toHaveLength(1);

    await manager.closeSession(session.sessionId);
    await expect(manager.listSessions()).resolves.toHaveLength(0);
    await expectCode(manager.closeSession(session.sessionId), 'SESSION_NOT_FOUND');
  });

  it('rejects a non-http protocol and an invalid URL', async () => {
    const manager = new BrowserManager(loadConfig());
    const session = await manager.createSession();

    try {
      await expectCode(
        manager.navigate(session.sessionId, 'file:///etc/passwd'),
        'NAVIGATION_ERROR',
      );
      await expectCode(manager.navigate(session.sessionId, 'not-a-url'), 'NAVIGATION_ERROR');
    } finally {
      await manager.closeAll();
    }
  });

  it('blocks a host outside ALLOWED_DOMAINS', async () => {
    const manager = new BrowserManager(configWith({ allowedDomains: ['example.com'] }));
    const session = await manager.createSession();

    try {
      await expectCode(
        manager.navigate(session.sessionId, `${fixtures.origin}/`),
        'DOMAIN_NOT_ALLOWED',
      );
    } finally {
      await manager.closeAll();
    }
  });

  it('allows a host inside ALLOWED_DOMAINS', async () => {
    const manager = new BrowserManager(configWith({ allowedDomains: ['127.0.0.1'] }));
    const session = await manager.createSession();

    try {
      const state = await manager.navigate(session.sessionId, `${fixtures.origin}/`);
      expect(state.title).toBe('Browser MCP Fixture');
    } finally {
      await manager.closeAll();
    }
  });

  it('gives each session its own BrowserContext storage', async () => {
    const manager = new BrowserManager(loadConfig());
    const a = await manager.createSession();
    const b = await manager.createSession();

    try {
      await manager.navigate(a.sessionId, `${fixtures.origin}/app.html`);
      await manager.navigate(b.sessionId, `${fixtures.origin}/app.html`);
      await manager.fill(a.sessionId, { label: 'Email' }, 'only-in-a@example.com');

      const inA = await manager.element(a.sessionId, { label: 'Email' });
      const inB = await manager.element(b.sessionId, { label: 'Email' });

      expect(inA.value).toBe('only-in-a@example.com');
      expect(inB.value).toBe('');
    } finally {
      await manager.closeAll();
    }
  });

  it('does not expose password values in the observed snapshot', async () => {
    const manager = new BrowserManager(loadConfig());
    const session = await manager.createSession();

    try {
      await manager.navigate(session.sessionId, `${fixtures.origin}/login.html`);
      await manager.fill(session.sessionId, { role: 'textbox', name: 'Password' }, 'sup3r-secret');

      const observed = await manager.observe(session.sessionId);
      const password = observed.elements.find((element) => element.name === 'Password');

      expect(password).toBeDefined();
      expect(password?.value).toBeUndefined();
      expect(JSON.stringify(observed)).not.toContain('sup3r-secret');
    } finally {
      await manager.closeAll();
    }
  });

  it('closeAll disposes every session', async () => {
    const manager = new BrowserManager(loadConfig());
    await manager.createSession();
    await manager.createSession();

    await manager.closeAll();
    await expect(manager.listSessions()).resolves.toHaveLength(0);
    await expectCode(manager.observe(randomUUID()), 'SESSION_NOT_FOUND');
  });
});

describe('error mapping', () => {
  it('classifies Playwright closed-browser and closed-page messages', () => {
    expect(toBrowserMcpError(new Error('Browser has been closed')).code).toBe('BROWSER_CLOSED');
    expect(
      toBrowserMcpError(new Error('Target page, context or browser has been closed')).code,
    ).toBe('PAGE_CLOSED');
    expect(toBrowserMcpError(new Error('Timeout 30000ms exceeded.')).code).toBe('TIMEOUT');
    expect(toBrowserMcpError(new Error('something odd')).code).toBe('INTERNAL_ERROR');
  });

  it('marks only transient failures as retryable', () => {
    expect(new BrowserMcpError('TIMEOUT', 'x').toToolError().retryable).toBe(true);
    expect(new BrowserMcpError('ELEMENT_NOT_FOUND', 'x').toToolError().retryable).toBe(false);
    expect(new BrowserMcpError('ELEMENT_REF_STALE', 'x').toToolError().retryable).toBe(false);
  });

  it('never leaks a stack trace into the tool error', () => {
    const error = toBrowserMcpError(new Error('first line\n  at deep/stack/frame.js:1:1'));
    expect(error.toToolError().message).toBe('first line');
  });
});

describe('StepRecorder', () => {
  it('numbers steps and clears them', () => {
    const recorder = new StepRecorder();
    recorder.record({ action: 'navigate', url: 'https://example.com' });
    recorder.record({ action: 'click', target: { ref: 'e1' } });

    expect(recorder.list().map((step) => step.sequence)).toEqual([1, 2]);
    expect(recorder.clear()).toBe(2);
    expect(recorder.list()).toEqual([]);
  });

  it('replaces sensitive values with a placeholder', () => {
    expect(redactValue('hunter2', { label: 'Password' }, false)).toBe('{{password}}');
    expect(redactValue('hunter2', { label: 'Email' }, true)).toBe('{{password}}');
    expect(redactValue('abc123', { css: '#api_key' }, false)).toBe('{{password}}');
    expect(redactValue('agent@example.com', { label: 'Email' }, false)).toBe('agent@example.com');
  });
});
