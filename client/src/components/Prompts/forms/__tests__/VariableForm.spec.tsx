import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import type { TPromptGroup } from 'librechat-data-provider';
import VariableForm from '../VariableForm';

const mockSubmitPrompt = jest.fn();
const mockRecordUsage = jest.fn();

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useAuthContext: () => ({ user: undefined }),
  useSubmitMessage: () => ({ submitPrompt: mockSubmitPrompt }),
}));

jest.mock('~/data-provider', () => ({
  useRecordPromptUsage: () => ({ mutate: mockRecordUsage }),
}));

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../editor/Markdown', () => ({
  PromptVariableGfm: 'p',
}));

jest.mock('~/components/Chat/Messages/Content/MarkdownComponents', () => ({
  codeNoExecution: 'code',
}));

const promptGroup = {
  _id: 'group-1',
  name: 'Acta de entrega',
  productionPrompt: {
    prompt: 'Precio: {{Precio}}\nVigencia: {{Vigencia}}',
  },
} as TPromptGroup;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('VariableForm', () => {
  it('blocks submission and marks every empty variable as required', async () => {
    const user = userEvent.setup();

    render(<VariableForm group={promptGroup} onClose={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'com_ui_submit' }));

    expect(mockSubmitPrompt).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(screen.getAllByText('com_ui_field_required')).toHaveLength(2);
  });

  it('submits after all variables have a non-blank value', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<VariableForm group={promptGroup} onClose={onClose} />);

    await user.type(screen.getByLabelText('Precio'), '1000');
    await user.type(screen.getByLabelText('Vigencia'), '30 días');
    await user.click(screen.getByRole('button', { name: 'com_ui_submit' }));

    expect(mockSubmitPrompt).toHaveBeenCalledWith('Precio: 1000\nVigencia: 30 días');
    expect(onClose).toHaveBeenCalled();
  });
});
