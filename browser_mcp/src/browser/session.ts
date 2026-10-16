import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { StepRecorder } from './recorder';
import { BrowserMcpError } from '../errors';
import { logError, logEvent } from '../logger';

import type { Browser, BrowserContext, Dialog, Download, Page } from 'playwright';

export type DialogPolicy = 'accept' | 'dismiss';

/**
 * creating → active → closing → closed is the normal path; a browser that dies underneath
 * the session moves it to error, and the manager cleans it up from there.
 */
export type SessionStatus = 'creating' | 'active' | 'closing' | 'closed' | 'error';

export interface TabInfo {
  id: string;
  url: string;
  title: string;
  active: boolean;
}

export interface DialogRecord {
  type: string;
  message: string;
  action: DialogPolicy;
}

export interface CookieInfo {
  name: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expires: number;
}

export interface DownloadRecord {
  suggested_filename: string;
  path: string;
  tab_id: string;
}

interface Observation {
  tabId: string;
  refs: Set<string>;
}

const DOWNLOAD_PREFIX = 'browser-mcp-';

/**
 * One session: one Browser, one BrowserContext (so cookies and storage never leak between
 * sessions) and one or more Pages addressed as tabs. All of it lives in this process only.
 */
export class Session {
  readonly createdAt = new Date().toISOString();
  readonly recorder = new StepRecorder();
  readonly downloads: DownloadRecord[] = [];

  private readonly tabs = new Map<string, Page>();
  private readonly tabIds = new WeakMap<Page, string>();
  private readonly downloadWaiters: Array<(record: DownloadRecord) => void> = [];
  private readonly timers = new Set<NodeJS.Timeout>();
  /**
   * Our own listeners, detached one by one on cleanup. `removeAllListeners()` is not an
   * option: Playwright registers internal listeners on the same emitters and dropping those
   * makes `close()` hang forever.
   */
  private readonly detachers: Array<() => void> = [];
  private tabCounter = 0;
  private activeTabId = '';
  private observation?: Observation;
  private downloadDir?: string;
  private lastActivity = Date.now();
  private state: SessionStatus = 'creating';

  lastDialog?: DialogRecord;

  constructor(
    readonly sessionId: string,
    private readonly browser: Browser,
    private readonly context: BrowserContext,
    readonly dialogPolicy: DialogPolicy,
  ) {
    const onDisconnected = (): void => this.markLost('browser_disconnected');
    const onContextClose = (): void => this.markLost('context_closed');
    const onPage = (page: Page): string => this.registerPage(page);
    const onDownload = (download: Download): void => {
      void this.captureDownload(download);
    };

    this.browser.on('disconnected', onDisconnected);
    this.context.on('close', onContextClose);
    this.context.on('page', onPage);
    this.context.on('download', onDownload);

    this.detachers.push(
      () => this.browser.off('disconnected', onDisconnected),
      () => this.context.off('close', onContextClose),
      () => this.context.off('page', onPage),
      () => this.context.off('download', onDownload),
    );
  }

  get status(): SessionStatus {
    return this.state;
  }

  get lastActivityAt(): string {
    return new Date(this.lastActivity).toISOString();
  }

  get idleMs(): number {
    return Date.now() - this.lastActivity;
  }

  get tabCount(): number {
    return this.tabs.size;
  }

  activate(): void {
    if (this.state === 'creating') {
      this.state = 'active';
    }
  }

  touch(): void {
    this.lastActivity = Date.now();
  }

  /**
   * The single guard every tool goes through: a session that is closing, closed or whose
   * browser died must never serve another operation.
   */
  assertUsable(): void {
    if (this.state === 'closing' || this.state === 'closed') {
      throw new BrowserMcpError('SESSION_NOT_FOUND', 'The browser session no longer exists.');
    }
    if (this.state === 'error' || !this.browser.isConnected()) {
      this.state = 'error';
      throw new BrowserMcpError(
        'BROWSER_CLOSED',
        'The browser associated with this session is no longer available.',
      );
    }
  }

  /** Assigns a stable `tab-N` id and wires the per-page handlers exactly once. */
  registerPage(page: Page): string {
    const existing = this.tabIds.get(page);
    if (existing) {
      return existing;
    }

    this.tabCounter += 1;
    const tabId = `tab-${this.tabCounter}`;
    this.tabIds.set(page, tabId);
    this.tabs.set(tabId, page);

    const onDialog = (dialog: Dialog): void => {
      void this.handleDialog(dialog);
    };
    const onClose = (): void => this.forgetTab(tabId);

    page.on('dialog', onDialog);
    page.on('close', onClose);
    this.detachers.push(
      () => page.off('dialog', onDialog),
      () => page.off('close', onClose),
    );

    if (!this.activeTabId) {
      this.activeTabId = tabId;
    }
    logEvent('info', 'tab_created', { session: this.sessionId, tab: tabId });
    return tabId;
  }

  async newTab(): Promise<string> {
    this.assertUsable();
    const page = await this.context.newPage();
    const tabId = this.registerPage(page);
    this.activeTabId = tabId;
    this.observation = undefined;
    return tabId;
  }

  selectTab(tabId: string): void {
    this.requireTab(tabId);
    this.activeTabId = tabId;
    this.observation = undefined;
  }

  async closeTab(tabId: string): Promise<string | undefined> {
    const page = this.requireTab(tabId);
    if (this.tabs.size === 1) {
      throw new BrowserMcpError(
        'INVALID_OPERATION',
        'Cannot close the last tab of a session. Use browser_session_close instead.',
      );
    }
    await page.close();
    this.forgetTab(tabId);
    logEvent('info', 'tab_closed', { session: this.sessionId, tab: tabId });
    return this.activeTabId || undefined;
  }

  /**
   * Resolves the tab every tool operates on. A closed active tab falls back to another live
   * page rather than failing, which is what a user closing a popup expects.
   */
  activeTab(): { tabId: string; page: Page } {
    this.assertUsable();
    this.syncPages();

    const current = this.activeTabId ? this.tabs.get(this.activeTabId) : undefined;
    if (current && !current.isClosed()) {
      return { tabId: this.activeTabId, page: current };
    }

    for (const [tabId, page] of this.tabs) {
      if (!page.isClosed()) {
        this.activeTabId = tabId;
        this.observation = undefined;
        return { tabId, page };
      }
    }

    throw new BrowserMcpError('PAGE_CLOSED', 'No active browser tab is available.');
  }

  /**
   * A popup opened by a click reaches us through an asynchronous `page` event, and a page
   * closed by the site is dropped by its own event; reconciling keeps the map honest.
   */
  syncPages(): void {
    if (this.state === 'closing' || this.state === 'closed') {
      return;
    }
    for (const page of this.context.pages()) {
      if (!page.isClosed()) {
        this.registerPage(page);
      }
    }
    for (const [tabId, page] of this.tabs) {
      if (page.isClosed()) {
        this.forgetTab(tabId);
      }
    }
  }

  async listTabs(): Promise<TabInfo[]> {
    this.syncPages();
    const entries = Array.from(this.tabs.entries());
    return Promise.all(
      entries.map(async ([id, page]) => ({
        id,
        url: page.url(),
        title: await page.title().catch(() => ''),
        active: id === this.activeTabId,
      })),
    );
  }

  rememberObservation(tabId: string, refs: string[]): void {
    this.observation = { tabId, refs: new Set(refs) };
  }

  forgetObservation(): void {
    this.observation = undefined;
  }

  /** Rejects a ref that predates the current page or tab before Playwright even looks. */
  assertRefUsable(ref: string, tabId: string): void {
    if (!this.observation) {
      throw new BrowserMcpError(
        'ELEMENT_REF_STALE',
        `No current observation for ref ${ref}. Call browser_observe first.`,
      );
    }
    if (this.observation.tabId !== tabId) {
      throw new BrowserMcpError(
        'ELEMENT_REF_STALE',
        `Ref ${ref} belongs to ${this.observation.tabId}, not the active ${tabId}. Call browser_observe again.`,
      );
    }
    if (!this.observation.refs.has(ref)) {
      throw new BrowserMcpError(
        'ELEMENT_REF_STALE',
        `Ref ${ref} is not part of the latest observation. Call browser_observe again.`,
      );
    }
  }

  /** Resolves immediately when a download already arrived and nobody has claimed it yet. */
  waitForDownload(timeout: number): Promise<DownloadRecord> {
    const latest = this.downloads[this.downloads.length - 1];
    if (this.unconsumedDownload && latest) {
      this.unconsumedDownload = false;
      return Promise.resolve(latest);
    }

    return new Promise<DownloadRecord>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        const index = this.downloadWaiters.indexOf(waiter);
        if (index >= 0) {
          this.downloadWaiters.splice(index, 1);
        }
        reject(new BrowserMcpError('TIMEOUT', `No download started within ${timeout}ms`));
      }, timeout);
      this.timers.add(timer);

      const waiter = (record: DownloadRecord): void => {
        clearTimeout(timer);
        this.timers.delete(timer);
        resolve(record);
      };
      this.downloadWaiters.push(waiter);
    });
  }

  /** Diagnostic only: cookie values are deliberately never returned to the model. */
  async cookies(): Promise<CookieInfo[]> {
    const cookies = await this.context.cookies();
    return cookies.map(({ name, domain, path, secure, httpOnly, expires }) => ({
      name,
      domain,
      path,
      secure,
      httpOnly,
      expires,
    }));
  }

  /**
   * Safe to call any number of times and tolerant of resources that are already gone:
   * every step is attempted and a failure never stops the following ones.
   */
  async cleanup(): Promise<void> {
    if (this.state === 'closing' || this.state === 'closed') {
      return;
    }
    this.state = 'closing';

    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.downloadWaiters.length = 0;
    this.recorder.clear();
    this.observation = undefined;

    for (const detach of this.detachers) {
      try {
        detach();
      } catch {
        continue;
      }
    }
    this.detachers.length = 0;

    for (const page of this.tabs.values()) {
      await this.attempt('page.close', () => page.close());
    }
    this.tabs.clear();
    this.activeTabId = '';

    await this.attempt('context.close', () => this.context.close());
    await this.attempt('browser.close', () => this.browser.close());

    this.state = 'closed';
  }

  private unconsumedDownload = false;

  private markLost(reason: string): void {
    if (this.state === 'closing' || this.state === 'closed') {
      return;
    }
    this.state = 'error';
    logEvent('error', reason, { session: this.sessionId });
  }

  private async attempt(step: string, operation: () => Promise<void>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      logError(
        `cleanup_step_failed session=${this.sessionId} step=${step} reason=${(error as Error).message}`,
      );
    }
  }

  private requireTab(tabId: string): Page {
    this.assertUsable();
    const page = this.tabs.get(tabId);
    if (!page) {
      throw new BrowserMcpError('TAB_NOT_FOUND', `No tab ${tabId} in this session`);
    }
    return page;
  }

  private forgetTab(tabId: string): void {
    this.tabs.delete(tabId);
    if (this.activeTabId !== tabId) {
      return;
    }
    const [next] = this.tabs.keys();
    this.activeTabId = next ?? '';
    this.observation = undefined;
  }

  private async handleDialog(dialog: Dialog): Promise<void> {
    this.lastDialog = {
      type: dialog.type(),
      message: dialog.message(),
      action: this.dialogPolicy,
    };
    try {
      await (this.dialogPolicy === 'accept' ? dialog.accept() : dialog.dismiss());
    } catch (error) {
      logError(`dialog session=${this.sessionId} reason=${(error as Error).message}`);
    }
  }

  private async captureDownload(download: Download): Promise<void> {
    try {
      this.downloadDir ??= await mkdtemp(join(tmpdir(), DOWNLOAD_PREFIX));
      const target = join(this.downloadDir, download.suggestedFilename());
      await download.saveAs(target);

      const record: DownloadRecord = {
        suggested_filename: download.suggestedFilename(),
        path: target,
        tab_id: this.tabIds.get(download.page()) ?? 'unknown',
      };
      this.downloads.push(record);

      const waiter = this.downloadWaiters.shift();
      if (waiter) {
        waiter(record);
        return;
      }
      this.unconsumedDownload = true;
    } catch (error) {
      logError(`download session=${this.sessionId} reason=${(error as Error).message}`);
    }
  }
}
