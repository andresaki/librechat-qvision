import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import List from '../List';

const mockUseHasAccess = jest.fn((..._args: unknown[]) => true);

jest.mock('librechat-data-provider', () => ({
  PermissionTypes: { PROMPTS: 'prompts' },
  Permissions: { USE: 'use', CREATE: 'create' },
}));

jest.mock('@librechat/client', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useHasAccess: (...args: unknown[]) => mockUseHasAccess(...args),
}));

jest.mock('../ChatGroupItem', () => ({
  __esModule: true,
  default: ({ group }: { group: { _id: string; name: string } }) => (
    <div data-testid="prompt-group-item">{group.name}</div>
  ),
}));

describe('Prompts List empty state (Q-Vision)', () => {
  beforeEach(() => {
    mockUseHasAccess.mockReset();
    mockUseHasAccess.mockReturnValue(true);
  });

  it('invites creators to create their first prompt', () => {
    render(<List groups={[]} />);

    expect(screen.getByText('com_ui_add_first_prompt')).toBeInTheDocument();
  });

  it('shows a neutral hint to users without CREATE permission', () => {
    mockUseHasAccess.mockReturnValue(false);
    render(<List groups={[]} />);

    expect(screen.getByText('com_ui_no_prompts_shared_hint')).toBeInTheDocument();
    expect(screen.queryByText('com_ui_add_first_prompt')).not.toBeInTheDocument();
  });

  it('renders groups when present regardless of permission', () => {
    mockUseHasAccess.mockReturnValue(false);
    render(<List groups={[{ _id: '1', name: 'Shared prompt' } as never]} />);

    expect(screen.getByTestId('prompt-group-item')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });
});
