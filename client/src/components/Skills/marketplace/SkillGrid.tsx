import { useEffect, useMemo, type RefObject } from 'react';
import { Search } from 'lucide-react';
import { Spinner } from '@librechat/client';
import type { TSkillSummary } from 'librechat-data-provider';
import SkillMarketplaceCard from './SkillMarketplaceCard';
import { useSkillsInfiniteQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';

interface SkillGridProps {
  searchQuery: string;
  scrollElementRef?: RefObject<HTMLElement>;
}

export default function SkillGrid({ searchQuery, scrollElementRef }: SkillGridProps) {
  const localize = useLocalize();

  const listQuery = useSkillsInfiniteQuery({
    search: searchQuery.trim() || undefined,
    limit: 12,
  });
  const { fetchNextPage, hasNextPage, isFetching } = listQuery;

  const skills = useMemo((): TSkillSummary[] => {
    if (!listQuery.data?.pages) {
      return [];
    }
    return listQuery.data.pages.flatMap((page) => page.skills);
  }, [listQuery.data?.pages]);

  useEffect(() => {
    const scrollElement = scrollElementRef?.current;
    if (!scrollElement) {
      return;
    }

    const handleScroll = () => {
      const nearBottom =
        scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight * 0.85;
      if (nearBottom && hasNextPage && !isFetching) {
        void fetchNextPage();
      }
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [
    fetchNextPage,
    hasNextPage,
    isFetching,
    scrollElementRef,
  ]);

  if (listQuery.isLoading && skills.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={32} tone="primary" aria-label={localize('com_ui_loading')} />
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="py-12 text-center text-text-secondary" role="alert">
        <p>{localize('com_ui_error')}</p>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search className="size-8 text-text-tertiary opacity-40" aria-hidden="true" />
        <p className="mt-3 text-sm text-text-secondary">
          {searchQuery.trim()
            ? localize('com_ui_skill_marketplace_search_empty')
            : localize('com_ui_skills_empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-live="polite">
      <ul
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        aria-label={localize('com_ui_skill_marketplace')}
      >
        {skills.map((skill) => (
          <li key={skill._id}>
            <SkillMarketplaceCard skill={skill} />
          </li>
        ))}
      </ul>
      {listQuery.isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <Spinner size={24} tone="secondary" aria-label={localize('com_ui_loading')} />
        </div>
      ) : null}
    </div>
  );
}
