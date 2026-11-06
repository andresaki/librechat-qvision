import { FileText } from 'lucide-react';
import { EmptyState } from '@librechat/client';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { ResourceType } from 'librechat-data-provider';
import { useGetAllEffectivePermissionsQuery } from 'librechat-data-provider/react-query';
import type { TPromptGroup } from 'librechat-data-provider';
import ChatGroupItem from './ChatGroupItem';
import { useHasAccess, useLocalize } from '~/hooks';

export default function List({
  groups = [],
  isChatRoute,
}: {
  groups?: TPromptGroup[];
  isChatRoute?: boolean;
}) {
  const localize = useLocalize();
  const { data: permissionsMap } = useGetAllEffectivePermissionsQuery(ResourceType.PROMPTGROUP, {
    enabled: groups.length > 0,
  });
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
      <ChatGroupItem
        key={group._id}
        group={group}
        isChatRoute={isChatRoute}
        permissionBits={group._id ? permissionsMap?.[group._id] : 0}
      />
    ));
  };

  return (
    <section className="grow" aria-label={localize('com_ui_prompt_groups')}>
      <div>{renderContent()}</div>
    </section>
  );
}
