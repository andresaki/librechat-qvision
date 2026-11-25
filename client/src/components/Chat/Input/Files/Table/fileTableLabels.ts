import { FileContext } from 'librechat-data-provider';
import type { TranslationKeys } from '~/hooks';

/** Values stored on files — excludes column ids bundled into `FileContext`. */
export const FILE_CONTEXT_FILTER_VALUES: FileContext[] = [
  FileContext.avatar,
  FileContext.unknown,
  FileContext.agents,
  FileContext.assistants,
  FileContext.execute_code,
  FileContext.image_generation,
  FileContext.assistants_output,
  FileContext.message_attachment,
  FileContext.run_artifact,
  FileContext.skill_file,
];

export const fileContextLabelKeys: Record<FileContext, TranslationKeys> = {
  [FileContext.avatar]: 'com_ui_avatar',
  [FileContext.unknown]: 'com_ui_unknown',
  [FileContext.agents]: 'com_ui_agents',
  [FileContext.assistants]: 'com_ui_assistants',
  [FileContext.execute_code]: 'com_ui_file_context_execute_code',
  [FileContext.image_generation]: 'com_ui_image_gen',
  [FileContext.assistants_output]: 'com_ui_assistants_output',
  [FileContext.message_attachment]: 'com_ui_attachment',
  [FileContext.run_artifact]: 'com_ui_published_file',
  [FileContext.skill_file]: 'com_ui_file_context_skill_file',
  [FileContext.filename]: 'com_ui_name',
  [FileContext.updatedAt]: 'com_ui_date',
  [FileContext.source]: 'com_ui_storage',
  [FileContext.filterSource]: 'com_ui_storage',
  [FileContext.context]: 'com_ui_context',
  [FileContext.bytes]: 'com_ui_size',
};

/** Column visibility menu (TanStack column ids). */
export const fileTableColumnLabelKeys: Record<string, TranslationKeys> = {
  filename: 'com_ui_name',
  updatedAt: 'com_ui_date',
  filterSource: 'com_ui_storage',
  source: 'com_ui_storage',
  context: 'com_ui_context',
  bytes: 'com_ui_size',
};