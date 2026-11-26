import userEvent from '@testing-library/user-event';
import { Constants } from 'librechat-data-provider';
import { render, screen } from '@testing-library/react';
import About from './About';

const mockCopy = jest.fn().mockReturnValue(true);
jest.mock('copy-to-clipboard', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockCopy(...args),
}));

jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({
    data: {
      buildInfo: {
        commit: 'abcdef1234567890abcdef1234567890abcdef12',
        branch: 'dev',
        buildDate: '2026-04-20T12:00:00Z',
      },
    },
  }),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

describe('About', () => {
  it('renders only the version row and keeps the diagnostics copy block', async () => {
    render(<About />);

    expect(screen.getByText(Constants.VERSION as string)).toBeInTheDocument();
    expect(screen.getByText('com_nav_about_version')).toBeInTheDocument();
    expect(screen.queryByText('com_nav_about_commit')).not.toBeInTheDocument();
    expect(screen.queryByText('com_nav_about_branch')).not.toBeInTheDocument();
    expect(screen.queryByText('com_nav_about_build_date')).not.toBeInTheDocument();
    expect(screen.getByText('com_nav_about_diagnostics_description')).toBeInTheDocument();
    const copyButton = screen.getByRole('button', {
      name: 'com_nav_about_diagnostics_copy',
    });
    expect(copyButton).toBeInTheDocument();

    await userEvent.click(copyButton);
    expect(mockCopy).toHaveBeenCalledWith(
      expect.stringContaining(`LibreChat version: ${Constants.VERSION}`),
      { format: 'text/plain' },
    );
  });
});
