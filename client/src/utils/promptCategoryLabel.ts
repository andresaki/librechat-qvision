import type { TranslationKeys } from '~/hooks';

/** Maps API prompt category slugs to i18n keys (`com_ui_*`). */
const PROMPT_CATEGORY_LABEL_KEYS: Record<string, TranslationKeys> = {
  write: 'com_ui_write',
  code: 'com_ui_code',
  idea: 'com_ui_idea',
  misc: 'com_ui_misc',
  roleplay: 'com_ui_roleplay',
  shop: 'com_ui_shop',
  finance: 'com_ui_finance',
  travel: 'com_ui_travel',
  teach_or_explain: 'com_ui_teach_or_explain',
  general: 'com_ui_general',
  hr: 'com_ui_hr',
  rd: 'com_ui_rd',
  it: 'com_ui_it',
  sales: 'com_ui_sales',
  aftersales: 'com_ui_aftersales',
};

export function getPromptCategoryLabelKey(
  category: string | undefined | null,
): TranslationKeys | undefined {
  const value = category?.trim();
  if (!value) {
    return undefined;
  }
  return PROMPT_CATEGORY_LABEL_KEYS[value];
}