import { useRef } from 'react';
import { useMediaQuery } from '@librechat/client';
import { useSearchParams } from 'react-router-dom';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { useDocumentTitle, useHasAccess, useLocalize } from '~/hooks';
import OpenSidebar from '~/components/Chat/Menus/OpenSidebar';
import { CreateSkillMenu } from '~/components/Skills/buttons';
import { SidePanelGroup } from '~/components/SidePanel';
import SearchBar from '~/components/Agents/SearchBar';
import { useGetStartupConfig } from '~/data-provider';
import SkillGrid from './SkillGrid';
import { cn } from '~/utils';

export default function SkillsMarketplace() {
  const localize = useLocalize();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const { data: startupConfig } = useGetStartupConfig();

  const hasCreateAccess = useHasAccess({
    permissionType: PermissionTypes.SKILLS,
    permission: Permissions.CREATE,
  });

  useDocumentTitle(
    `${localize('com_ui_skill_marketplace')} | ${startupConfig?.appTitle ?? 'Quinn'}`,
  );

  const handleSearch = (query: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (query.trim()) {
      newParams.set('q', query.trim());
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams, { replace: true });
  };

  return (
    <div className="relative flex h-full w-full grow overflow-hidden bg-presentation">
      <SidePanelGroup>
        <main className="flex h-full flex-col overflow-hidden" role="main">
          <div
            ref={scrollContainerRef}
            className="scrollbar-gutter-stable relative flex h-full flex-col overflow-y-auto overflow-x-hidden"
          >
            {!isSmallScreen && (
              <div className="container mx-auto max-w-4xl">
                <div className={cn('mb-8 text-center', 'mt-12')}>
                  <h1 className="mb-3 text-3xl font-bold tracking-tight text-text-primary md:text-5xl">
                    {localize('com_ui_skill_marketplace')}
                  </h1>
                  <p className="mx-auto mb-6 max-w-2xl text-lg text-text-secondary">
                    {localize('com_ui_skill_marketplace_subtitle')}
                  </p>
                </div>
              </div>
            )}

            <div className="sticky top-0 z-10 mt-4 bg-presentation pb-4 md:mt-0">
              <div className="container mx-auto max-w-4xl px-4">
                {isSmallScreen ? (
                  <div className="mx-auto mb-3 flex max-w-2xl items-center gap-2">
                    <OpenSidebar />
                    {hasCreateAccess ? <CreateSkillMenu /> : null}
                  </div>
                ) : null}
                <div className="mx-auto flex max-w-2xl items-center gap-2 pb-6">
                  <SearchBar
                    value={searchQuery}
                    onSearch={handleSearch}
                    className="flex-1"
                    inputId="skill-marketplace-search"
                    placeholderKey="com_ui_skill_search_placeholder"
                    ariaLabelKey="com_ui_skill_search_aria"
                    instructionsKey="com_ui_skill_search_instructions"
                    clearSearchKey="com_ui_clear_search"
                  />
                  {!isSmallScreen && hasCreateAccess ? <CreateSkillMenu /> : null}
                </div>
              </div>
            </div>

            <div className="container mx-auto max-w-4xl px-4 pb-8">
              <SkillGrid searchQuery={searchQuery} scrollElementRef={scrollContainerRef} />
            </div>
          </div>
        </main>
      </SidePanelGroup>
    </div>
  );
}
