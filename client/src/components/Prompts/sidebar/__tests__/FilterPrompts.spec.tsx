import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { RecoilRoot } from 'recoil';
import { render, screen } from '@testing-library/react';
import FilterPrompts from '../FilterPrompts';

const mockUseHasAccess = jest.fn((..._args: unknown[]) => true);

jest.mock('librechat-data-provider', () => ({
  PermissionTypes: { PROMPTS: 'prompts' },
  Permissions: { USE: 'use', CREATE: 'create' },
  SystemCategories: {
    ALL: 'sys__all__sys',
    MY_PROMPTS: 'sys__my__prompts__sys',
    NO_CATEGORY: 'sys__no__category__sys',
    SHARED_PROMPTS: 'sys__shared__prompts__sys',
  },
}));

jest.mock('@librechat/client', () => ({
  Dropdown: ({ options }: { options: { value?: string | null; label?: string }[] }) => (
    <div data-testid="filter-dropdown">
      {options
        .filter((option) => !('divider' in option))
        .map((option) => (
          <span key={option.value ?? 'divider'}>{option.label}</span>
        ))}
    </div>
  ),
  FilterInput: () => null,
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useHasAccess: (...args: unknown[]) => mockUseHasAccess(...args),
  useCategories: () => ({ categories: null }),
  useDebounce: (value: string) => value,
}));

jest.mock('~/Providers', () => ({
  usePromptGroupsContext: () => ({
    name: '',
    setName: jest.fn(),
    hasAccess: true,
    promptGroups: [],
  }),
}));

/** Bypass the ~/store barrel (it drags ~/utils/files, which needs the real data-provider). */
jest.mock('~/store', () => {
  const { atom: recoilAtom } = jest.requireActual('recoil');
  return {
    promptsCategory: recoilAtom({ key: 'test-promptsCategory', default: '' }),
  };
});

jest.mock('../../buttons/CreatePromptButton', () => ({
  __esModule: true,
  default: () => null,
}));

function renderFilter() {
  render(
    <RecoilRoot>
      <FilterPrompts />
    </RecoilRoot>,
  );
}

describe('FilterPrompts category options (Q-Vision)', () => {
  beforeEach(() => {
    mockUseHasAccess.mockReset();
    mockUseHasAccess.mockReturnValue(true);
  });

  it('shows "My Prompts" to users with CREATE permission', () => {
    renderFilter();

    expect(screen.getByText('com_ui_my_prompts')).toBeInTheDocument();
  });

  it('hides "My Prompts" from users without CREATE permission', () => {
    mockUseHasAccess.mockReturnValue(false);
    renderFilter();

    expect(screen.queryByText('com_ui_my_prompts')).not.toBeInTheDocument();
    expect(screen.getByText('com_ui_shared_prompts')).toBeInTheDocument();
  });
});
