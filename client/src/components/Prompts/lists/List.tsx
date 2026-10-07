import { FileText } from 'lucide-react';
import { EmptyState } from '@librechat/client';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import type { TPromptGroup } from 'librechat-data-provider';
import { useHasAccess, useLocalize } from '~/hooks';
import ChatGroupItem from './ChatGroupItem';

export default function List({
  groups = [],
  isChatRoute,
}: {
  groups?: TPromptGroup[];
  isChatRoute?: boolean;
}) {
  const localize = useLocalize();
  /** Q-Vision: consumers can't create, so don't invite them to create. */
  const hasCreateAccess = useHasAccess({
    permissionType: PermissionTypes.PROMPTS,
    permission: Permissions.CREATE,
  });

  const renderContent = () => {
    if (groups.length === 0) {
      return (
        <EmptyState
          icon={FileText}
          title={localize('com_ui_no_prompts_title')}
          description={localize(
            hasCreateAccess ? 'com_ui_add_first_prompt' : 'com_ui_no_prompts_shared_hint',
          )}
          className="my-2"
        />
      );
    }

    return groups.map((group) => (
      <ChatGroupItem key={group._id} group={group} isChatRoute={isChatRoute} />
    ));
  };

  return (
    <section className="flex-grow" aria-label={localize('com_ui_prompt_groups')}>
      <div>{renderContent()}</div>
    </section>
  );
}
