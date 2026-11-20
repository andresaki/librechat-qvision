import React, { useId } from 'react';
import { Dropdown } from '@librechat/client';
import type t from 'librechat-data-provider';
import { useLocalize, TranslationKeys } from '~/hooks';
import { SmartLoader } from './SmartLoader';

/**
 * Props for the CategoryTabs component
 */
interface CategoryTabsProps {
  /** Array of agent categories to display as tabs */
  categories: t.TMarketplaceCategory[];
  /** Currently selected tab value */
  activeTab: string;
  /** Whether categories are currently loading */
  isLoading: boolean;
  /** Callback fired when a tab is selected */
  onChange: (value: string) => void;
}

/** Compact category selector that stays usable as the marketplace grows. */
const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeTab,
  isLoading,
  onChange,
}) => {
  const localize = useLocalize();
  const labelId = useId();

  /** Helper function to get category display name from database data */
  const getCategoryDisplayName = (category: t.TCategory) => {
    // Special cases for system categories
    if (category.value === 'promoted') {
      return localize('com_agents_top_picks');
    }
    if (category.value === 'all') {
      return localize('com_agents_all_category');
    }
    if (category.label && category.label.startsWith('com_')) {
      return localize(category.label as TranslationKeys);
    }
    // Use database label or fallback to capitalized value
    return category.label || category.value.charAt(0).toUpperCase() + category.value.slice(1);
  };

  // Early return if no categories available
  if (!isLoading && (!categories || categories.length === 0)) {
    return (
      <div className="text-text-secondary text-center">{localize('com_ui_no_categories')}</div>
    );
  }

  const options = categories.map((category) => ({
    value: category.value,
    label: getCategoryDisplayName(category),
  }));

  // Use SmartLoader to prevent category loading flashes
  return (
    <SmartLoader
      isLoading={isLoading}
      hasData={categories?.length > 0}
      delay={100} // Very short delay since categories should load quickly
      loadingComponent={<div className="bg-surface-tertiary h-8 w-48 animate-pulse rounded-lg" />}
    >
      <div className="flex w-full items-center">
        <span id={labelId} className="sr-only">
          {localize('com_agents_category_tabs_label')}
        </span>
        <Dropdown
          value={activeTab}
          onChange={onChange}
          options={options}
          sizeClasses="w-48"
          shape="default"
          variant="compact"
          triggerClassName="w-48"
          testId="agent-category-dropdown"
          aria-labelledby={labelId}
        />
      </div>
    </SmartLoader>
  );
};

export default CategoryTabs;
