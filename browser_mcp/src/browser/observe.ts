export const REF_ATTRIBUTE = 'data-bmcp-ref';

export interface ObservedElement {
  ref: string;
  role: string;
  name: string;
  text?: string;
  value?: string;
  disabled?: boolean;
}

export interface ElementDetail {
  role: string;
  name: string;
  tag: string;
  type?: string;
  visible: boolean;
  enabled: boolean;
  checked?: boolean;
  value?: string;
  text?: string;
}

export interface ObserveOptions {
  refAttribute: string;
  maxElements: number;
  maxTextLength: number;
}

/**
 * Serialized in the page context by Playwright. It both collects the interactive
 * elements and stamps each one with a ref attribute, so a later click/fill can
 * address exactly the element the model saw.
 */
export function collectInteractiveElements(options: ObserveOptions): ObservedElement[] {
  const { refAttribute, maxElements, maxTextLength } = options;

  const INTERACTIVE_SELECTOR = [
    'a[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    'summary',
    '[contenteditable="true"]',
    '[role]',
    '[onclick]',
  ].join(',');

  const INPUT_ROLES: Record<string, string> = {
    button: 'button',
    submit: 'button',
    reset: 'button',
    image: 'button',
    checkbox: 'checkbox',
    radio: 'radio',
    range: 'slider',
    number: 'spinbutton',
    search: 'searchbox',
    email: 'textbox',
    tel: 'textbox',
    text: 'textbox',
    url: 'textbox',
    password: 'textbox',
  };

  const TAG_ROLES: Record<string, string> = {
    A: 'link',
    BUTTON: 'button',
    TEXTAREA: 'textbox',
    SUMMARY: 'button',
    SELECT: 'combobox',
  };

  const SENSITIVE_TYPES = new Set(['password']);

  const truncate = (value: string): string =>
    value.length > maxTextLength ? `${value.slice(0, maxTextLength - 1)}…` : value;

  const clean = (value: string | null | undefined): string =>
    truncate((value ?? '').replace(/\s+/g, ' ').trim());

  const isVisible = (element: Element): boolean => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return false;
    }
    const style = window.getComputedStyle(element);
    return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
  };

  const roleOf = (element: Element): string => {
    const explicit = element.getAttribute('role');
    if (explicit) {
      return explicit.trim().split(/\s+/)[0] ?? 'generic';
    }
    if (element instanceof HTMLInputElement) {
      return INPUT_ROLES[element.type] ?? 'textbox';
    }
    if (element instanceof HTMLSelectElement && element.multiple) {
      return 'listbox';
    }
    return TAG_ROLES[element.tagName] ?? 'generic';
  };

  const labelText = (element: Element): string => {
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const parts = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ');
      if (parts.trim()) {
        return parts;
      }
    }
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      const labels = Array.from(element.labels ?? []);
      if (labels.length > 0) {
        return labels.map((label) => label.textContent ?? '').join(' ');
      }
    }
    return '';
  };

  const nameOf = (element: Element): string => {
    const candidates = [
      element.getAttribute('aria-label'),
      labelText(element),
      element.getAttribute('placeholder'),
      element instanceof HTMLInputElement && element.type === 'submit' ? element.value : '',
      element.getAttribute('alt'),
      element.getAttribute('title'),
      element instanceof HTMLElement ? element.innerText : element.textContent,
      element.getAttribute('name'),
    ];
    for (const candidate of candidates) {
      const value = clean(candidate);
      if (value) {
        return value;
      }
    }
    return '';
  };

  document
    .querySelectorAll(`[${refAttribute}]`)
    .forEach((stale) => stale.removeAttribute(refAttribute));

  const results: ObservedElement[] = [];
  const nodes = Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR));

  for (const node of nodes) {
    if (results.length >= maxElements) {
      break;
    }
    if (!isVisible(node)) {
      continue;
    }
    const role = roleOf(node);
    if (role === 'generic') {
      continue;
    }

    const ref = `e${results.length + 1}`;
    node.setAttribute(refAttribute, ref);

    const name = nameOf(node);
    const text = node instanceof HTMLElement ? clean(node.innerText) : '';
    const element: ObservedElement = { ref, role, name };
    if (text && text !== name) {
      element.text = text;
    }
    if (
      (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) &&
      node.value &&
      !SENSITIVE_TYPES.has((node as HTMLInputElement).type ?? '')
    ) {
      element.value = clean(node.value);
    }
    if (node instanceof HTMLElement && 'disabled' in node && (node as HTMLInputElement).disabled) {
      element.disabled = true;
    }
    results.push(element);
  }

  return results;
}

/**
 * Serialized in the page context to describe one element. Kept self-contained on purpose:
 * a function sent to `evaluate` cannot close over module scope.
 */
export function describeElement(element: Element, maxTextLength: number): ElementDetail {
  const INPUT_ROLES: Record<string, string> = {
    button: 'button',
    submit: 'button',
    reset: 'button',
    image: 'button',
    checkbox: 'checkbox',
    radio: 'radio',
    range: 'slider',
    number: 'spinbutton',
    search: 'searchbox',
    email: 'textbox',
    tel: 'textbox',
    text: 'textbox',
    url: 'textbox',
    password: 'textbox',
  };
  const TAG_ROLES: Record<string, string> = {
    A: 'link',
    BUTTON: 'button',
    TEXTAREA: 'textbox',
    SUMMARY: 'button',
    SELECT: 'combobox',
  };

  const clean = (value: string | null | undefined): string => {
    const collapsed = (value ?? '').replace(/\s+/g, ' ').trim();
    return collapsed.length > maxTextLength
      ? collapsed.slice(0, maxTextLength - 1) + '…'
      : collapsed;
  };

  const input = element instanceof HTMLInputElement ? element : undefined;
  const textarea = element instanceof HTMLTextAreaElement ? element : undefined;
  const select = element instanceof HTMLSelectElement ? element : undefined;

  const explicitRole = element.getAttribute('role');
  const role = explicitRole
    ? explicitRole.trim().split(/\s+/)[0]
    : input
      ? (INPUT_ROLES[input.type] ?? 'textbox')
      : (TAG_ROLES[element.tagName] ?? 'generic');

  const labels = input?.labels ?? textarea?.labels ?? select?.labels;
  const name =
    clean(element.getAttribute('aria-label')) ||
    clean(Array.from(labels ?? [], (label) => label.textContent).join(' ')) ||
    clean(element.getAttribute('placeholder')) ||
    clean(element.getAttribute('title')) ||
    clean(element instanceof HTMLElement ? element.innerText : element.textContent) ||
    clean(element.getAttribute('name'));

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const visible =
    (rect.width > 0 || rect.height > 0) &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    style.opacity !== '0';

  const disabled = 'disabled' in element ? Boolean((element as HTMLInputElement).disabled) : false;
  const detail: ElementDetail = {
    role: role ?? 'generic',
    name,
    tag: element.tagName.toLowerCase(),
    visible,
    enabled: !disabled,
  };

  if (input?.type) {
    detail.type = input.type;
  }
  if (input && (input.type === 'checkbox' || input.type === 'radio')) {
    detail.checked = input.checked;
  }
  if (input && input.type !== 'password') {
    detail.value = clean(input.value);
  }
  if (textarea) {
    detail.value = clean(textarea.value);
  }
  if (select) {
    detail.value = clean(select.value);
  }

  const text = clean(element instanceof HTMLElement ? element.innerText : element.textContent);
  if (text && text !== name) {
    detail.text = text;
  }

  return detail;
}
