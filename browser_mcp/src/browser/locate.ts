import { BrowserMcpError } from '../errors';
import { REF_ATTRIBUTE } from './observe';

import type { Locator, Page } from 'playwright';

export interface ElementTarget {
  ref?: string;
  role?: string;
  name?: string;
  label?: string;
  text?: string;
  css?: string;
  xpath?: string;
}

export interface ResolveOptions {
  timeout: number;
  /** Actionable operations need a visible element; inspection only needs it attached. */
  requireVisible?: boolean;
  requireEnabled?: boolean;
}

type AriaRole = Parameters<Page['getByRole']>[0];

const ARIA_ROLES = new Set<string>([
  'alert',
  'alertdialog',
  'application',
  'article',
  'banner',
  'blockquote',
  'button',
  'caption',
  'cell',
  'checkbox',
  'code',
  'columnheader',
  'combobox',
  'complementary',
  'contentinfo',
  'definition',
  'deletion',
  'dialog',
  'directory',
  'document',
  'emphasis',
  'feed',
  'figure',
  'form',
  'generic',
  'grid',
  'gridcell',
  'group',
  'heading',
  'img',
  'insertion',
  'link',
  'list',
  'listbox',
  'listitem',
  'log',
  'main',
  'marquee',
  'math',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'meter',
  'navigation',
  'none',
  'note',
  'option',
  'paragraph',
  'presentation',
  'progressbar',
  'radio',
  'radiogroup',
  'region',
  'row',
  'rowgroup',
  'rowheader',
  'scrollbar',
  'search',
  'searchbox',
  'separator',
  'slider',
  'spinbutton',
  'status',
  'strong',
  'subscript',
  'superscript',
  'switch',
  'tab',
  'table',
  'tablist',
  'tabpanel',
  'term',
  'textbox',
  'time',
  'timer',
  'toolbar',
  'tooltip',
  'tree',
  'treegrid',
  'treeitem',
]);

const ATTACH_TIMEOUT = 2_000;

function escapeAttribute(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

export function refLocator(page: Page, ref: string): Locator {
  return page.locator(`[${REF_ATTRIBUTE}="${escapeAttribute(ref)}"]`).first();
}

/**
 * Resolution order: ref (exactly what `browser_observe` returned) → role + name → label →
 * visible text → CSS → XPath. XPath is last on purpose: it is the most brittle locator.
 */
export function buildCandidates(page: Page, target: ElementTarget): Locator[] {
  const candidates: Locator[] = [];

  if (target.ref) {
    candidates.push(refLocator(page, target.ref));
  }

  if (target.role && ARIA_ROLES.has(target.role)) {
    const role = target.role as AriaRole;
    candidates.push(
      target.name ? page.getByRole(role, { name: target.name }) : page.getByRole(role),
    );
  }

  const label = target.label ?? (target.role ? undefined : target.name);
  if (label) {
    candidates.push(page.getByLabel(label));
    candidates.push(page.getByPlaceholder(label));
  }

  const text = target.text ?? (target.role || target.label ? undefined : target.name);
  if (text) {
    candidates.push(page.getByText(text));
  }

  if (target.css) {
    candidates.push(page.locator(target.css));
  }

  if (target.xpath) {
    candidates.push(page.locator(`xpath=${target.xpath}`));
  }

  return candidates;
}

export function describeTarget(target: ElementTarget): string {
  const parts = Object.entries(target)
    .filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0,
    )
    .map(([key, value]) => `${key}=${value}`);
  return parts.length > 0 ? parts.join(' ') : 'empty target';
}

function locatorCount(target: ElementTarget): number {
  const locators = [
    target.ref,
    target.role,
    target.name,
    target.label,
    target.text,
    target.css,
    target.xpath,
  ];
  return locators.filter((value) => typeof value === 'string' && value.length > 0).length;
}

/** A ref that resolves to nothing is stale; a ref combined with other locators is not. */
function isRefOnly(target: ElementTarget): boolean {
  return Boolean(target.ref) && locatorCount(target) === 1;
}

async function firstAttached(candidates: Locator[], timeout: number): Promise<Locator | undefined> {
  const perCandidate = Math.max(
    500,
    Math.min(ATTACH_TIMEOUT, Math.floor(timeout / candidates.length)),
  );

  for (const candidate of candidates) {
    const locator = candidate.first();
    try {
      await locator.waitFor({ state: 'attached', timeout: perCandidate });
      return locator;
    } catch {
      continue;
    }
  }
  return undefined;
}

export async function resolveTarget(
  page: Page,
  target: ElementTarget,
  { timeout, requireVisible = false, requireEnabled = false }: ResolveOptions,
): Promise<Locator> {
  const candidates = buildCandidates(page, target);
  if (candidates.length === 0) {
    throw new BrowserMcpError(
      'INVALID_TARGET',
      'Target must provide at least one of: ref, role+name, label, text, css, xpath.',
    );
  }

  const locator = await firstAttached(candidates, timeout);
  if (!locator) {
    if (isRefOnly(target)) {
      throw new BrowserMcpError(
        'ELEMENT_REF_STALE',
        `Ref ${target.ref} no longer matches an element. Call browser_observe again to get fresh refs.`,
      );
    }
    throw new BrowserMcpError(
      'ELEMENT_NOT_FOUND',
      `Element not found for ${describeTarget(target)}`,
    );
  }

  if (requireVisible && !(await locator.isVisible())) {
    try {
      await locator.waitFor({ state: 'visible', timeout });
    } catch {
      throw new BrowserMcpError(
        'ELEMENT_NOT_VISIBLE',
        `Element for ${describeTarget(target)} is attached but not visible`,
      );
    }
  }

  if (requireEnabled && !(await locator.isEnabled())) {
    throw new BrowserMcpError(
      'ELEMENT_NOT_ENABLED',
      `Element for ${describeTarget(target)} is visible but disabled`,
    );
  }

  return locator;
}
