import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';

import { Session } from './session';
import { resolveTarget } from './locate';
import { redactValue } from './recorder';
import { logEvent } from '../logger';
import { REF_ATTRIBUTE, collectInteractiveElements, describeElement } from './observe';
import { BrowserMcpError, TIMEOUT_CODES, toBrowserMcpError, toNavigationError } from '../errors';

import type { Browser, Locator, Page } from 'playwright';
import type { BrowserMcpConfig } from '../config';
import type { RecordedStep } from './recorder';
import type { ElementTarget } from './locate';
import type { ElementDetail, ObservedElement } from './observe';
import type { ErrorCode } from '../errors';
import type {
  CookieInfo,
  DialogPolicy,
  DialogRecord,
  DownloadRecord,
  SessionStatus,
  TabInfo,
} from './session';

export interface SessionInfo {
  sessionId: string;
  status: SessionStatus;
  createdAt: string;
  lastActivityAt: string;
}

export interface SessionSummary extends SessionInfo {
  url: string;
  title: string;
  tabs: number;
  activeTabId: string;
  lastDialog?: DialogRecord;
}

export interface ManagerMetrics {
  activeSessions: number;
  maxSessions: number;
  totalSessionsCreated: number;
  totalSessionsClosed: number;
  totalErrors: number;
  totalTimeouts: number;
  uptimeSeconds: number;
}

export interface PageState {
  url: string;
  title: string;
  tabId: string;
}

export interface ObserveResult {
  page: PageState;
  elements: ObservedElement[];
  truncated: boolean;
}

export interface ScreenshotResult {
  base64: string;
  mimeType: 'image/png';
  fullPage: boolean;
}

export type { CookieInfo } from './session';

export type WaitConditionType = 'timeout' | 'element' | 'text' | 'url';

export interface WaitCondition {
  type: WaitConditionType;
  value?: string;
  target?: ElementTarget;
}

export interface SelectValue {
  value?: string;
  label?: string;
  index?: number;
}

const CHROMIUM_ARGS = ['--no-sandbox', '--disable-dev-shm-usage'];

/**
 * Owns every Playwright object. Sessions live only in this map, for the lifetime of the
 * MCP process: no Playwright handle is ever serialized or persisted.
 */
export class BrowserManager {
  private readonly sessions = new Map<string, Session>();
  private readonly startedAt = Date.now();
  private pendingCreations = 0;
  private totalCreated = 0;
  private totalClosed = 0;
  private totalErrors = 0;
  private totalTimeouts = 0;
  private idleSweep?: NodeJS.Timeout;
  private shuttingDown = false;

  constructor(private readonly config: BrowserMcpConfig) {
    this.startIdleSweep();
  }

  metrics(): ManagerMetrics {
    return {
      activeSessions: this.sessions.size,
      maxSessions: this.config.maxSessions,
      totalSessionsCreated: this.totalCreated,
      totalSessionsClosed: this.totalClosed,
      totalErrors: this.totalErrors,
      totalTimeouts: this.totalTimeouts,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }

  /** Called by the tool wrapper so metrics reflect what the agent actually saw. */
  recordFailure(code: ErrorCode): void {
    this.totalErrors += 1;
    if (TIMEOUT_CODES.has(code)) {
      this.totalTimeouts += 1;
    }
  }

  /** Refreshes last_activity_at after a successful tool call, keeping the session alive. */
  touch(sessionId: string): void {
    this.sessions.get(sessionId)?.touch();
  }

  async createSession(dialogPolicy: DialogPolicy = 'accept'): Promise<SessionInfo> {
    if (this.shuttingDown) {
      throw new BrowserMcpError('SESSION_NOT_FOUND', 'The server is shutting down.');
    }
    /** Counting in-flight launches too, so concurrent creates cannot overshoot the limit. */
    if (this.sessions.size + this.pendingCreations >= this.config.maxSessions) {
      throw new BrowserMcpError(
        'MAX_SESSIONS_REACHED',
        `The maximum number of browser sessions has been reached (${this.config.maxSessions}).`,
      );
    }

    this.pendingCreations += 1;
    try {
      const session = await this.launchSession(dialogPolicy);
      this.sessions.set(session.sessionId, session);
      this.totalCreated += 1;
      logEvent('info', 'session_created', { session: session.sessionId });
      return toSessionInfo(session);
    } finally {
      this.pendingCreations -= 1;
    }
  }

  private async launchSession(dialogPolicy: DialogPolicy): Promise<Session> {
    let browser: Browser;
    try {
      browser = await chromium.launch({
        headless: this.config.headless,
        args: CHROMIUM_ARGS,
        timeout: this.config.actionTimeout,
      });
    } catch (error) {
      throw new BrowserMcpError(
        'BROWSER_NOT_AVAILABLE',
        'Chromium could not be launched. Verify the Playwright browser installation.',
        { cause: error },
      );
    }

    try {
      const context = await browser.newContext({ acceptDownloads: true });
      context.setDefaultTimeout(this.config.actionTimeout);
      context.setDefaultNavigationTimeout(this.config.navigationTimeout);

      const session = new Session(randomUUID(), browser, context, dialogPolicy);
      session.registerPage(await context.newPage());
      session.activate();
      return session;
    } catch (error) {
      await browser.close().catch(() => undefined);
      throw toBrowserMcpError(error, 'BROWSER_NOT_AVAILABLE');
    }
  }

  async getSession(sessionId: string): Promise<SessionSummary> {
    const session = this.requireSession(sessionId);
    const { tabId, page } = session.activeTab();

    return {
      ...toSessionInfo(session),
      url: page.url(),
      title: await page.title().catch(() => ''),
      tabs: session.tabCount,
      activeTabId: tabId,
      lastDialog: session.lastDialog,
    };
  }

  /** A session whose browser died is reported rather than hidden, then swept. */
  async listSessions(): Promise<SessionSummary[]> {
    const summaries: SessionSummary[] = [];
    for (const session of Array.from(this.sessions.values())) {
      try {
        summaries.push(await this.getSession(session.sessionId));
      } catch {
        summaries.push({
          ...toSessionInfo(session),
          url: '',
          title: '',
          tabs: session.tabCount,
          activeTabId: '',
        });
      }
    }
    return summaries;
  }

  async closeSession(sessionId: string): Promise<{ sessionId: string; status: 'closed' }> {
    this.requireSession(sessionId);
    await this.cleanupSession(sessionId, 'closed_by_agent');
    return { sessionId, status: 'closed' };
  }

  /**
   * The one place a session is torn down: idle sweep, explicit close, lost browser and
   * shutdown all go through it, and running it twice is harmless.
   */
  async cleanupSession(sessionId: string, reason: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    this.sessions.delete(sessionId);
    await session.cleanup();
    this.totalClosed += 1;
    logEvent('info', 'session_cleanup', { session: sessionId, reason });
  }

  /** Closes sessions whose last successful operation is older than SESSION_IDLE_TIMEOUT. */
  async cleanupIdleSessions(): Promise<string[]> {
    const { sessionIdleTimeout } = this.config;
    if (sessionIdleTimeout <= 0) {
      return [];
    }

    const expired = Array.from(this.sessions.values()).filter(
      (session) => session.idleMs >= sessionIdleTimeout,
    );
    for (const session of expired) {
      logEvent('warn', 'session_idle_timeout', {
        session: session.sessionId,
        idle: `${Math.round(session.idleMs / 1000)}s`,
      });
      await this.cleanupSession(session.sessionId, 'idle_timeout');
    }
    return expired.map((session) => session.sessionId);
  }

  /** Closes every session and stops the sweeper. Used by SIGINT/SIGTERM. */
  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    if (this.idleSweep) {
      clearInterval(this.idleSweep);
      this.idleSweep = undefined;
    }

    const ids = Array.from(this.sessions.keys());
    await Promise.all(ids.map((id) => this.cleanupSession(id, 'shutdown')));
    logEvent('info', 'shutdown_complete', { sessions: ids.length });
  }

  /** Kept as the phase 1/2 name for shutdown. */
  async closeAll(): Promise<void> {
    await this.shutdown();
  }

  private startIdleSweep(): void {
    const { idleSweepInterval, sessionIdleTimeout } = this.config;
    if (idleSweepInterval <= 0 || sessionIdleTimeout <= 0) {
      return;
    }
    this.idleSweep = setInterval(() => {
      void this.cleanupIdleSessions();
    }, idleSweepInterval);
    this.idleSweep.unref();
  }

  async navigate(sessionId: string, url: string): Promise<PageState> {
    const session = this.requireSession(sessionId);
    const { page } = session.activeTab();
    const target = this.assertNavigable(url);

    try {
      await page.goto(target, {
        waitUntil: 'domcontentloaded',
        timeout: this.config.navigationTimeout,
      });
      await this.settle(page);
    } catch (error) {
      throw toNavigationError(error);
    }

    session.forgetObservation();
    session.recorder.record({ action: 'navigate', url: target });
    logEvent('info', 'navigation', { session: sessionId, url: target });
    return this.state(sessionId);
  }

  async goBack(sessionId: string): Promise<PageState> {
    return this.history(sessionId, 'go_back');
  }

  async goForward(sessionId: string): Promise<PageState> {
    return this.history(sessionId, 'go_forward');
  }

  async reload(sessionId: string): Promise<PageState> {
    return this.history(sessionId, 'reload');
  }

  async listTabs(sessionId: string): Promise<TabInfo[]> {
    return this.requireSession(sessionId).listTabs();
  }

  async newTab(sessionId: string, url?: string): Promise<PageState> {
    const session = this.requireSession(sessionId);
    await session.newTab();
    if (url) {
      return this.navigate(sessionId, url);
    }
    return this.state(sessionId);
  }

  async selectTab(sessionId: string, tabId: string): Promise<PageState> {
    this.requireSession(sessionId).selectTab(tabId);
    return this.state(sessionId);
  }

  async closeTab(sessionId: string, tabId: string): Promise<{ closed: string; active?: string }> {
    const session = this.requireSession(sessionId);
    const active = await session.closeTab(tabId);
    return { closed: tabId, active };
  }

  async observe(sessionId: string): Promise<ObserveResult> {
    const session = this.requireSession(sessionId);
    const { tabId, page } = session.activeTab();
    const { maxObserveElements, maxTextLength } = this.config;

    try {
      page.setDefaultTimeout(this.config.observationTimeout);
      const elements = await page.evaluate(collectInteractiveElements, {
        refAttribute: REF_ATTRIBUTE,
        maxElements: maxObserveElements,
        maxTextLength,
      });
      page.setDefaultTimeout(this.config.actionTimeout);
      session.rememberObservation(
        tabId,
        elements.map((element) => element.ref),
      );

      return {
        page: await this.state(sessionId),
        elements,
        truncated: elements.length >= maxObserveElements,
      };
    } catch (error) {
      throw toBrowserMcpError(error);
    }
  }

  async element(sessionId: string, target: ElementTarget): Promise<ElementDetail> {
    const { locator } = await this.locate(sessionId, target, {});
    try {
      return await locator.evaluate(describeElement, this.config.maxTextLength);
    } catch (error) {
      throw toBrowserMcpError(error);
    }
  }

  async click(sessionId: string, target: ElementTarget): Promise<PageState> {
    const session = this.requireSession(sessionId);
    const { locator, page } = await this.locate(sessionId, target, {
      requireVisible: true,
      requireEnabled: true,
    });

    await this.run(() => locator.click({ timeout: this.config.actionTimeout }));
    await this.settle(page);
    session.forgetObservation();
    session.recorder.record({ action: 'click', target });
    return this.state(sessionId);
  }

  async fill(sessionId: string, target: ElementTarget, value: string): Promise<PageState> {
    const session = this.requireSession(sessionId);
    const { locator } = await this.locate(sessionId, target, {
      requireVisible: true,
      requireEnabled: true,
    });

    await this.run(() => locator.fill(value, { timeout: this.config.actionTimeout }));
    session.recorder.record({
      action: 'fill',
      target,
      value: redactValue(value, target, await isPasswordField(locator)),
    });
    return this.state(sessionId);
  }

  async type(
    sessionId: string,
    target: ElementTarget,
    text: string,
    delay?: number,
  ): Promise<PageState> {
    const session = this.requireSession(sessionId);
    const { locator } = await this.locate(sessionId, target, {
      requireVisible: true,
      requireEnabled: true,
    });

    await this.run(() =>
      locator.pressSequentially(text, { delay, timeout: this.config.actionTimeout }),
    );
    session.recorder.record({
      action: 'type',
      target,
      value: redactValue(text, target, await isPasswordField(locator)),
    });
    return this.state(sessionId);
  }

  async press(sessionId: string, key: string, target?: ElementTarget): Promise<PageState> {
    const session = this.requireSession(sessionId);
    const { page } = session.activeTab();

    if (target) {
      const { locator } = await this.locate(sessionId, target, { requireVisible: true });
      await this.run(() => locator.press(key, { timeout: this.config.actionTimeout }));
    } else {
      await this.run(() => page.keyboard.press(key));
    }

    await this.settle(page);
    session.forgetObservation();
    session.recorder.record({ action: 'press', target, key });
    return this.state(sessionId);
  }

  async select(
    sessionId: string,
    target: ElementTarget,
    selection: SelectValue,
  ): Promise<PageState> {
    const session = this.requireSession(sessionId);
    const { locator } = await this.locate(sessionId, target, {
      requireVisible: true,
      requireEnabled: true,
    });

    await this.assertTag(locator, 'select', 'browser_select requires a <select> element');
    const option = toSelectOption(selection);
    await this.run(() => locator.selectOption(option, { timeout: this.config.actionTimeout }));

    session.recorder.record({
      action: 'select',
      target,
      value: selection.value ?? selection.label ?? String(selection.index),
    });
    return this.state(sessionId);
  }

  async setChecked(sessionId: string, target: ElementTarget, checked: boolean): Promise<PageState> {
    const session = this.requireSession(sessionId);
    const { locator } = await this.locate(sessionId, target, {
      requireVisible: true,
      requireEnabled: true,
    });

    const type = await locator.getAttribute('type');
    const role = await locator.getAttribute('role');
    const checkable =
      type === 'checkbox' || type === 'radio' || role === 'checkbox' || role === 'switch';
    if (!checkable) {
      throw new BrowserMcpError(
        'INVALID_OPERATION',
        'browser_check and browser_uncheck require a checkbox, radio or switch',
      );
    }

    await this.run(() =>
      checked
        ? locator.check({ timeout: this.config.actionTimeout })
        : locator.uncheck({ timeout: this.config.actionTimeout }),
    );
    session.recorder.record({ action: checked ? 'check' : 'uncheck', target });
    return this.state(sessionId);
  }

  async hover(sessionId: string, target: ElementTarget): Promise<PageState> {
    const session = this.requireSession(sessionId);
    const { locator } = await this.locate(sessionId, target, { requireVisible: true });

    await this.run(() => locator.hover({ timeout: this.config.actionTimeout }));
    session.recorder.record({ action: 'hover', target });
    return this.state(sessionId);
  }

  async focus(sessionId: string, target: ElementTarget): Promise<PageState> {
    const session = this.requireSession(sessionId);
    const { locator } = await this.locate(sessionId, target, { requireVisible: true });

    await this.run(() => locator.focus({ timeout: this.config.actionTimeout }));
    session.recorder.record({ action: 'focus', target });
    return this.state(sessionId);
  }

  async wait(sessionId: string, condition: WaitCondition, timeout?: number): Promise<PageState> {
    const session = this.requireSession(sessionId);
    const { page } = session.activeTab();
    const effective = timeout ?? this.config.actionTimeout;

    switch (condition.type) {
      case 'timeout':
        await page.waitForTimeout(Number(condition.value ?? effective));
        break;
      case 'element':
        if (!condition.target) {
          throw new BrowserMcpError('INVALID_TARGET', 'A wait on an element requires a target');
        }
        await this.waitForElement(sessionId, condition.target, effective);
        break;
      case 'text':
        await this.waitForText(sessionId, requireValue(condition, 'text'), effective);
        break;
      case 'url':
        await this.waitForUrl(sessionId, requireValue(condition, 'url'), effective);
        break;
    }

    session.recorder.record({ action: 'wait', condition: condition.type, value: condition.value });
    return this.state(sessionId);
  }

  async waitForElement(
    sessionId: string,
    target: ElementTarget,
    timeout?: number,
  ): Promise<PageState> {
    await this.locate(sessionId, target, {
      requireVisible: true,
      timeout: timeout ?? this.config.actionTimeout,
    });
    return this.state(sessionId);
  }

  async waitForText(sessionId: string, text: string, timeout?: number): Promise<PageState> {
    const { page } = this.requireSession(sessionId).activeTab();
    await this.run(() =>
      page
        .getByText(text)
        .first()
        .waitFor({
          state: 'visible',
          timeout: timeout ?? this.config.actionTimeout,
        }),
    );
    return this.state(sessionId);
  }

  async waitForUrl(sessionId: string, url: string, timeout?: number): Promise<PageState> {
    const session = this.requireSession(sessionId);
    const { page } = session.activeTab();

    await this.runNavigation(() =>
      page.waitForURL(url, { timeout: timeout ?? this.config.navigationTimeout }),
    );
    session.forgetObservation();
    return this.state(sessionId);
  }

  async waitForDownload(sessionId: string, timeout?: number): Promise<DownloadRecord> {
    const session = this.requireSession(sessionId);
    return session.waitForDownload(timeout ?? this.config.actionTimeout);
  }

  async screenshot(
    sessionId: string,
    { fullPage = false, target }: { fullPage?: boolean; target?: ElementTarget },
  ): Promise<ScreenshotResult> {
    const { page } = this.requireSession(sessionId).activeTab();

    const buffer = await this.run(async () => {
      if (target) {
        const { locator } = await this.locate(sessionId, target, { requireVisible: true });
        return locator.screenshot({ type: 'png', timeout: this.config.actionTimeout });
      }
      return page.screenshot({ fullPage, type: 'png', timeout: this.config.actionTimeout });
    });

    return { base64: buffer.toString('base64'), mimeType: 'image/png', fullPage };
  }

  async cookies(sessionId: string): Promise<CookieInfo[]> {
    return this.requireSession(sessionId).cookies();
  }

  steps(sessionId: string): RecordedStep[] {
    return this.requireSession(sessionId).recorder.list();
  }

  clearSteps(sessionId: string): number {
    return this.requireSession(sessionId).recorder.clear();
  }

  private async history(
    sessionId: string,
    action: 'go_back' | 'go_forward' | 'reload',
  ): Promise<PageState> {
    const session = this.requireSession(sessionId);
    const { page } = session.activeTab();
    const options = {
      waitUntil: 'domcontentloaded' as const,
      timeout: this.config.navigationTimeout,
    };

    try {
      if (action === 'reload') {
        await page.reload(options);
      } else if (action === 'go_back') {
        await page.goBack(options);
      } else {
        await page.goForward(options);
      }
      await this.settle(page);
    } catch (error) {
      throw toNavigationError(error);
    }

    session.forgetObservation();
    session.recorder.record({ action });
    return this.state(sessionId);
  }

  private async locate(
    sessionId: string,
    target: ElementTarget,
    {
      requireVisible,
      requireEnabled,
      timeout,
    }: {
      requireVisible?: boolean;
      requireEnabled?: boolean;
      timeout?: number;
    },
  ): Promise<{ locator: Locator; page: Page; tabId: string }> {
    const session = this.requireSession(sessionId);
    const { tabId, page } = session.activeTab();

    if (target.ref) {
      session.assertRefUsable(target.ref, tabId);
    }

    const locator = await resolveTarget(page, target, {
      timeout: timeout ?? this.config.actionTimeout,
      requireVisible,
      requireEnabled,
    });
    return { locator, page, tabId };
  }

  private async assertTag(locator: Locator, tag: string, message: string): Promise<void> {
    const actual = await locator.evaluate((element) => element.tagName.toLowerCase());
    if (actual !== tag) {
      throw new BrowserMcpError('INVALID_OPERATION', `${message} (found <${actual}>)`);
    }
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw toBrowserMcpError(error);
    }
  }

  private async runNavigation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw toNavigationError(error);
    }
  }

  private async settle(page: Page): Promise<void> {
    await page
      .waitForLoadState('load', { timeout: this.config.navigationTimeout })
      .catch(() => undefined);
  }

  private async state(sessionId: string): Promise<PageState> {
    const { tabId, page } = this.requireSession(sessionId).activeTab();
    try {
      return { url: page.url(), title: await page.title(), tabId };
    } catch (error) {
      throw toBrowserMcpError(error);
    }
  }

  private assertNavigable(url: string): string {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BrowserMcpError('NAVIGATION_ERROR', `Invalid URL: ${url}`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BrowserMcpError('NAVIGATION_ERROR', `Unsupported protocol: ${parsed.protocol}`);
    }

    const { allowedDomains } = this.config;
    if (allowedDomains.length === 0) {
      return parsed.toString();
    }

    const hostname = parsed.hostname.toLowerCase();
    const allowed = allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
    if (!allowed) {
      throw new BrowserMcpError('DOMAIN_NOT_ALLOWED', `Navigation to ${hostname} is not allowed.`);
    }

    return parsed.toString();
  }

  /**
   * Every tool resolves its session through here: unknown ids, closed sessions and sessions
   * whose browser died are all rejected before a single Playwright call is made.
   */
  private requireSession(sessionId: string): Session {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new BrowserMcpError('SESSION_NOT_FOUND', 'The browser session no longer exists.');
    }

    try {
      session.assertUsable();
    } catch (error) {
      if (error instanceof BrowserMcpError && error.code === 'BROWSER_CLOSED') {
        void this.cleanupSession(sessionId, 'browser_closed');
      }
      throw error;
    }
    return session;
  }
}

function toSessionInfo(session: Session): SessionInfo {
  return {
    sessionId: session.sessionId,
    status: session.status,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
  };
}

function toSelectOption(selection: SelectValue): {
  value?: string;
  label?: string;
  index?: number;
} {
  if (selection.value == null && selection.label == null && selection.index == null) {
    throw new BrowserMcpError('INVALID_OPERATION', 'browser_select needs a value, label or index');
  }
  return selection;
}

function requireValue(condition: WaitCondition, kind: string): string {
  if (!condition.value) {
    throw new BrowserMcpError('INVALID_TARGET', `A wait on ${kind} requires a value`);
  }
  return condition.value;
}

async function isPasswordField(locator: Locator): Promise<boolean> {
  return (await locator.getAttribute('type').catch(() => null)) === 'password';
}
