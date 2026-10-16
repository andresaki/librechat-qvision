import { z } from 'zod/v4';

import { defineTool, sessionIdSchema, targetSchema, toPageData } from './define';

import type { RegisteredTool } from './define';

const click = defineTool({
  name: 'browser_click',
  title: 'Click element',
  description:
    'Clicks an element. Prefer the ref returned by browser_observe; role + name, label, text, CSS and XPath are the fallbacks.',
  schema: { session_id: sessionIdSchema, target: targetSchema },
  handler: async (manager, { session_id, target }) => ({
    data: toPageData(await manager.click(session_id, target)),
  }),
});

const fill = defineTool({
  name: 'browser_fill',
  title: 'Fill field',
  description:
    'Sets the value of a text field, textarea or contenteditable in one step. Use browser_type when the page reacts to each keystroke. The value is never logged.',
  schema: {
    session_id: sessionIdSchema,
    target: targetSchema,
    value: z.string().describe('Value to set in the field.'),
  },
  handler: async (manager, { session_id, target, value }) => ({
    data: toPageData(await manager.fill(session_id, target, value)),
  }),
});

const type = defineTool({
  name: 'browser_type',
  title: 'Type text',
  description:
    'Types text character by character, firing a key event for each one. Use it for autocompletes and fields that react while typing. The text is never logged.',
  schema: {
    session_id: sessionIdSchema,
    target: targetSchema,
    text: z.string().describe('Text to type.'),
    delay: z.number().int().min(0).optional().describe('Delay in ms between keystrokes.'),
  },
  handler: async (manager, { session_id, target, text, delay }) => ({
    data: toPageData(await manager.type(session_id, target, text, delay)),
  }),
});

const press = defineTool({
  name: 'browser_press',
  title: 'Press key',
  description:
    'Presses a key such as Enter, Tab, Escape, ArrowDown or Control+A. Without a target the key goes to the page, with a target it goes to that element.',
  schema: {
    session_id: sessionIdSchema,
    key: z.string().min(1).describe('Key or combination, e.g. "Enter", "Tab", "Control+A".'),
    target: targetSchema.optional(),
  },
  handler: async (manager, { session_id, key, target }) => ({
    data: toPageData(await manager.press(session_id, key, target)),
  }),
});

const select = defineTool({
  name: 'browser_select',
  title: 'Select option',
  description: 'Selects an option of a <select> element by value, label or index.',
  schema: {
    session_id: sessionIdSchema,
    target: targetSchema,
    value: z.string().optional().describe('Option value attribute.'),
    label: z.string().optional().describe('Visible option text.'),
    index: z.number().int().min(0).optional().describe('Zero-based option index.'),
  },
  handler: async (manager, { session_id, target, value, label, index }) => ({
    data: toPageData(await manager.select(session_id, target, { value, label, index })),
  }),
});

const check = defineTool({
  name: 'browser_check',
  title: 'Check element',
  description:
    'Checks a checkbox, radio or switch. Fails with INVALID_OPERATION on any other element.',
  schema: { session_id: sessionIdSchema, target: targetSchema },
  handler: async (manager, { session_id, target }) => ({
    data: toPageData(await manager.setChecked(session_id, target, true)),
  }),
});

const uncheck = defineTool({
  name: 'browser_uncheck',
  title: 'Uncheck element',
  description: 'Unchecks a checkbox or switch. Fails with INVALID_OPERATION on any other element.',
  schema: { session_id: sessionIdSchema, target: targetSchema },
  handler: async (manager, { session_id, target }) => ({
    data: toPageData(await manager.setChecked(session_id, target, false)),
  }),
});

const hover = defineTool({
  name: 'browser_hover',
  title: 'Hover element',
  description:
    'Moves the mouse over an element, which is how hover menus and tooltips are opened before observing again.',
  schema: { session_id: sessionIdSchema, target: targetSchema },
  handler: async (manager, { session_id, target }) => ({
    data: toPageData(await manager.hover(session_id, target)),
  }),
});

const focus = defineTool({
  name: 'browser_focus',
  title: 'Focus element',
  description: 'Gives keyboard focus to an element, usually before browser_press.',
  schema: { session_id: sessionIdSchema, target: targetSchema },
  handler: async (manager, { session_id, target }) => ({
    data: toPageData(await manager.focus(session_id, target)),
  }),
});

export const interactionTools: RegisteredTool[] = [
  click,
  fill,
  type,
  press,
  select,
  check,
  uncheck,
  hover,
  focus,
];
