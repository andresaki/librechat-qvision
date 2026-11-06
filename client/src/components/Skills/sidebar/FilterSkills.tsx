import React from 'react';
import { FilterInput } from '@librechat/client';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import SkillMarketplaceSidebarButton from './SkillMarketplaceSidebarButton';
import { CreateSkillMenu } from '~/components/Skills/buttons';
import { useHasAccess, useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { PanelHeader } from '~/components/ui';

/**
 * The skills panel head. Built on the shared `PanelHeader` so the title, the create
 * action and the filter sit where every other panel puts them.
 */
export default function FilterSkills({
  searchTerm,
  onSearchChange,
  className = '',
}: {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  const localize = useLocalize();
  const hasCreateAccess = useHasAccess({
    permissionType: PermissionTypes.SKILLS,
    permission: Permissions.CREATE,
  });

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <SkillMarketplaceSidebarButton />
      <PanelHeader
        title={localize('com_ui_skills')}
        action={hasCreateAccess && <CreateSkillMenu />}
        search={
          <div role="search">
            <FilterInput
              inputId="skills-filter"
              label={localize('com_ui_filter_skills_name')}
              value={searchTerm}
              onChange={onSearchChange}
            />
          </div>
        }
      />
    </div>
  );
}
