import type { TEndpointsConfig } from 'librechat-data-provider';
import type { TranslationKeys } from '~/hooks';

const QUINN_ENDPOINT_LABEL = 'Quinn';
const QUINN_ADMIN_AUTHOR_PATTERN = /^admin\s+quinn$/i;

export function isQuinnBrandedEndpoint(
  endpointsConfig: TEndpointsConfig | undefined,
  endpoint: string | undefined | null,
): boolean {
  if (!endpoint) {
    return false;
  }
  return endpointsConfig?.[endpoint]?.modelDisplayLabel === QUINN_ENDPOINT_LABEL;
}

/** Maps internal owner labels (e.g. "Admin quinn") to localized marketplace copy. */
export function formatQuinnAuthorName(
  authorName: string | undefined | null,
  localize: (key: TranslationKeys) => string,
): string {
  const trimmed = authorName?.trim() ?? '';
  if (!trimmed) {
    return '';
  }
  if (QUINN_ADMIN_AUTHOR_PATTERN.test(trimmed)) {
    return localize('com_ui_quinn_admin_author');
  }
  return trimmed;
}