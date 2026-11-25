import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@librechat/client', () => {
  const mockReact = jest.requireActual('react');
  return {
    Button: ({
      children,
      variant: _variant,
      size: _size,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: string;
      size?: string;
    }) => mockReact.createElement('button', props, children),
    Input: mockReact.forwardRef(
      (props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.ForwardedRef<HTMLInputElement>) =>
        mockReact.createElement('input', { ...props, ref }),
    ),
  };
});

jest.mock('~/utils', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}));

import RenameForm from '../RenameForm';

const renderForm = (titleInput = 'Existing title') => {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();
  render(
    <RenameForm
      titleInput={titleInput}
      setTitleInput={jest.fn()}
      onSubmit={onSubmit}
      onCancel={onCancel}
      localize={(key: string) => key}
    />,
  );
  return { onSubmit, onCancel };
};

describe('RenameForm', () => {
  it('disables save and ignores Enter when the title is blank', () => {
    const { onSubmit } = renderForm('   ');
    const input = screen.getByLabelText('com_ui_new_conversation_title');

    expect(screen.getByRole('button', { name: 'com_ui_save' })).toBeDisabled();
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('cancels editing when the pointer goes outside the form', () => {
    const { onCancel } = renderForm();

    fireEvent.pointerDown(document.body);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('keeps editing when the pointer stays inside the form', () => {
    const { onCancel } = renderForm();

    fireEvent.pointerDown(screen.getByLabelText('com_ui_new_conversation_title'));

    expect(onCancel).not.toHaveBeenCalled();
  });
});
