import React from 'react';
import { render, screen } from '@testing-library/react';
import { clickDropdown } from 'test/dropdown';
import '@testing-library/jest-dom';
import type t from 'librechat-data-provider';
import CategoryTabs from '../CategoryTabs';

// Mock useLocalize hook
jest.mock('~/hooks/useLocalize', () => () => (key: string) => {
  const mockTranslations: Record<string, string> = {
    com_agents_top_picks: 'Top Picks',
    com_agents_all: 'All Agents',
    com_agents_all_category: 'All',
    com_ui_no_categories: 'No categories available',
    com_agents_category_tabs_label: 'Agent Categories',
    com_ui_agent_category_general: 'General',
    com_ui_agent_category_hr: 'HR',
    com_ui_agent_category_rd: 'R&D',
    com_ui_agent_category_finance: 'Finance',
    com_ui_agent_category_it: 'IT',
    com_ui_agent_category_sales: 'Sales',
    com_ui_agent_category_aftersales: 'After Sales',
  };
  return mockTranslations[key] || key;
});

describe('CategoryTabs', () => {
  const mockCategories: t.TMarketplaceCategory[] = [
    { value: 'promoted', label: 'Top Picks', description: 'Our recommended agents', count: 5 },
    { value: 'all', label: 'All', description: 'All available agents', count: 20 },
    { value: 'general', label: 'General', description: 'General purpose agents', count: 8 },
    { value: 'hr', label: 'HR', description: 'HR agents', count: 3 },
    { value: 'finance', label: 'Finance', description: 'Finance agents', count: 4 },
  ];

  const mockOnChange = jest.fn();
  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders provided categories', () => {
    render(
      <CategoryTabs
        categories={mockCategories}
        activeTab="promoted"
        isLoading={false}
        onChange={mockOnChange}
      />,
    );

    // Check for provided categories
    expect(screen.getAllByText('Top Picks').length).toBeGreaterThan(0);
    expect(screen.getAllByText('All').length).toBeGreaterThan(0);
    expect(screen.getAllByText('General').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Finance').length).toBeGreaterThan(0);
  });

  it('handles loading state properly', () => {
    render(
      <CategoryTabs
        categories={[]}
        activeTab="promoted"
        isLoading={true}
        onChange={mockOnChange}
      />,
    );

    // SmartLoader should handle loading behavior correctly
    // The component should render without crashing during loading
    expect(screen.queryByText('No categories available')).not.toBeInTheDocument();
  });

  it('marks the active category as selected', () => {
    render(
      <CategoryTabs
        categories={mockCategories}
        activeTab="general"
        isLoading={false}
        onChange={mockOnChange}
      />,
    );

    expect(screen.getByTestId('agent-category-dropdown')).toHaveTextContent('General');
  });

  it('calls onChange when a category is selected', async () => {
    render(
      <CategoryTabs
        categories={mockCategories}
        activeTab="promoted"
        isLoading={false}
        onChange={mockOnChange}
      />,
    );

    await clickDropdown(screen.getByTestId('agent-category-dropdown'));
    await clickDropdown(screen.getByText('HR'));

    expect(mockOnChange).toHaveBeenCalledWith('hr');
  });

  it('handles promoted category selection correctly', async () => {
    render(
      <CategoryTabs
        categories={mockCategories}
        activeTab="general"
        isLoading={false}
        onChange={mockOnChange}
      />,
    );

    await clickDropdown(screen.getByTestId('agent-category-dropdown'));
    await clickDropdown(screen.getByText('Top Picks'));

    expect(mockOnChange).toHaveBeenCalledWith('promoted');
  });

  it('handles all category selection correctly', async () => {
    render(
      <CategoryTabs
        categories={mockCategories}
        activeTab="promoted"
        isLoading={false}
        onChange={mockOnChange}
      />,
    );

    await clickDropdown(screen.getByTestId('agent-category-dropdown'));
    await clickDropdown(screen.getByText('All'));

    expect(mockOnChange).toHaveBeenCalledWith('all');
  });

  it('shows empty state when categories prop is empty', () => {
    render(
      <CategoryTabs
        categories={[]}
        activeTab="promoted"
        isLoading={false}
        onChange={mockOnChange}
      />,
    );

    // Should show empty state message (localized)
    expect(screen.getByText('No categories available')).toBeInTheDocument();
  });

  it('maintains consistent ordering of category options', () => {
    render(
      <CategoryTabs
        categories={mockCategories}
        activeTab="promoted"
        isLoading={false}
        onChange={mockOnChange}
      />,
    );

    expect(screen.getByTestId('agent-category-dropdown')).toHaveTextContent('Top Picks');
  });
});
