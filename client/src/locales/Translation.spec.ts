import { changeLanguageSafely, initializeI18n, normalizeLocale } from './i18n';
import English from './en/translation.json';
import Spanish from './es/translation.json';
import { TranslationKeys } from '~/hooks';
import i18n from './i18n';

describe('i18next translation tests', () => {
  // Ensure i18next is initialized before any tests run
  beforeAll(async () => {
    await initializeI18n();
  });

  afterEach(async () => {
    await changeLanguageSafely('en');
  });

  it('should return the correct translation for a valid key in English', async () => {
    await changeLanguageSafely('en');
    expect(i18n.t('com_ui_examples')).toBe(English.com_ui_examples);
  });

  it('should return the correct translation for a valid key in Spanish', async () => {
    await changeLanguageSafely('es');
    expect(i18n.t('com_ui_examples')).toBe(Spanish.com_ui_examples);
  });

  it('should fallback to English for an invalid language code', async () => {
    // When an invalid language is provided, i18next should fallback to English
    await changeLanguageSafely('invalid-code');
    expect(i18n.t('com_ui_examples')).toBe(English.com_ui_examples);
  });

  it('should return the key itself for an invalid key', async () => {
    await changeLanguageSafely('en');
    expect(i18n.t('invalid-key' as TranslationKeys)).toBe('invalid-key'); // Returns the key itself
  });

  it('should correctly format placeholders in the translation', async () => {
    await changeLanguageSafely('en');
    expect(i18n.t('com_endpoint_default_with_num', { 0: 'John' })).toBe('default: John');

    await changeLanguageSafely('es');
    expect(i18n.t('com_endpoint_default_with_num', { 0: 'María' })).toBe('predeterminado: María');
  });

  it('should normalize language selector values to locale files', () => {
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('es-ES')).toBe('es');
    expect(normalizeLocale('de-DE')).toBe('en');
    expect(normalizeLocale('fr-FR')).toBe('en');
    expect(normalizeLocale('auto')).toBe('en');
  });

  it('keeps English and Spanish translation keys in sync', () => {
    const requiredKeys = [
      'com_ui_sources_unavailable',
      'com_ui_previous_source',
      'com_ui_next_source',
      'com_ui_source_number',
      'com_ui_previous_page',
      'com_ui_next_page',
      'com_ui_resize_sidebar',
      'com_ui_agent_avatar',
      'com_ui_agent_configuration',
      'com_ui_artifacts_panel',
      'com_ui_manage_backup_codes',
      'com_ui_example_input',
      'com_ui_example_output',
      'com_ui_cancel',
      'com_ui_spinner',
      'com_ui_close_added_conversation',
      'com_ui_dismiss_banner',
      'com_ui_conversations',
      'com_ui_filter_prompts',
      'com_ui_bookmark_form',
      'com_ui_add_bookmark',
      'com_ui_settings',
      'com_ui_all_projects',
      'com_ui_chats',
      'com_ui_filter_and_sort_chats',
      'com_ui_mark_unread',
      'com_ui_more_options',
      'com_ui_new_chat_in_project',
      'com_ui_new_project',
      'com_ui_pinned',
      'com_ui_projects',
      'com_ui_open_project',
      'com_ui_edit_project',
      'com_ui_no_project_chats',
      'com_ui_chats_load_error',
      'com_ui_retry',
      'com_ui_search_filters',
      'com_ui_sort_updated',
      'com_ui_sort_created',
      'com_ui_attachments',
      'com_ui_has_attachments',
      'com_ui_sharing',
      'com_ui_shared_only',
      'com_ui_no_results_found',
      'com_ui_clear_filters',
      'com_ui_selected_count',
      'com_ui_sort_a_z',
      'com_ui_sort_z_a',
      'com_ui_sort_newest',
      'com_ui_sort_oldest',
      'com_ui_active_count',
      'com_ui_filters_active',
      'com_ui_chat_list',
      'com_ui_reset',
      'com_ui_sort',
      'com_ui_sort_chats_by',
      'com_ui_sort_order',
      'com_ui_show_project_chats',
      'com_ui_add_first_project',
      'com_ui_no_matching_projects',
      'com_ui_no_projects',
      'com_ui_search_projects',
      'com_ui_your_projects',
      'com_ui_latest_activity',
      'com_ui_sort_projects_by',
      'com_ui_project',
      'com_ui_project_chat_count',
      'com_ui_project_chat_count_single',
      'com_ui_project_options',
      'com_ui_project_not_found',
      'com_ui_project_name',
      'com_ui_project_name_placeholder',
      'com_ui_projects_load_error',
      'com_ui_create_project',
      'com_ui_delete_project',
      'com_ui_delete_project_action',
      'com_ui_delete_project_confirm',
      'com_ui_add_description',
      'com_ui_project_files',
      'com_ui_project_files_info',
      'com_ui_project_add_files',
      'com_ui_project_upload_file',
      'com_ui_project_choose_file',
      'com_ui_project_no_files',
      'com_ui_project_files_help',
      'com_ui_project_files_retrieval_only',
      'com_ui_project_instructions_label',
      'com_ui_project_instructions_info',
      'com_ui_project_instructions_help',
      'com_ui_project_instructions_future_turns',
      'com_ui_project_instructions_error',
      'com_ui_project_no_eligible_files',
      'com_ui_project_file_processing',
      'com_ui_project_file_ready',
      'com_ui_project_file_unavailable',
      'com_ui_project_files_error',
      'com_agents_description_empty',
      'com_agents_details_hint',
      'com_agents_my_agents',
      'com_agents_sort_label',
      'com_agents_sort_author',
      'com_agents_sort_newest',
      'com_agents_sort_oldest',
      'com_agents_sort_popular',
      'com_agents_view_details',
      'com_ui_skills',
      'com_ui_skill_marketplace',
      'com_ui_skill_marketplace_subtitle',
      'com_ui_filter_skills_name',
      'com_ui_my_skills',
      'com_ui_create_skill',
      'com_auth_password_reset_form',
      'com_auth_registration_form',
    ] as const;

    for (const key of requiredKeys) {
      expect(English[key]).toBeDefined();
      expect(Spanish[key]).toBeDefined();
    }
  });
});

/**
 * Locize groups keys by their plural suffix and generates every form the target
 * language needs. A family without both English `_one` and `_other`, or with a
 * bare base key beside them, leaves translators blank-source rows.
 */
describe('English plural key families', () => {
  const keys = new Set(Object.keys(English));
  const pluralSuffix = /_(zero|one|two|few|many|other)$/;
  const bases = [...keys].flatMap((key) => {
    const match = key.match(pluralSuffix);
    return match ? [key.slice(0, -match[0].length)] : [];
  });

  it.each([...new Set(bases)])('%s has _one and _other forms and no bare base key', (base) => {
    expect(keys.has(`${base}_one`)).toBe(true);
    expect(keys.has(`${base}_other`)).toBe(true);
    expect(keys.has(base)).toBe(false);
  });

  it('resolves the form from the base key and count, keeping older base translations', async () => {
    await initializeI18n();
    await changeLanguageSafely('en');
    expect(i18n.t('com_ui_tools_count', { count: 1 })).toBe('1 tool');
    expect(i18n.t('com_ui_tools_count', { count: 2 })).toBe('2 tools');
    expect(i18n.t('com_ui_duration_announced_seconds', { count: 1, value: '1' })).toBe(
      'took 1 second',
    );
    expect(i18n.t('com_ui_duration_announced_seconds', { count: 1.4, value: '1.4' })).toBe(
      'took 1.4 seconds',
    );

    await changeLanguageSafely('es');
    expect(i18n.t('com_ui_tools_count', { count: 2 })).toBe('2 tools');
    await changeLanguageSafely('en');
  });
});
