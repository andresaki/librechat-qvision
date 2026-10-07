import { isShareableNavLink, orderNavLinksShareableFirst } from '../navGroups';

describe('sidebar nav grouping (Q-Vision)', () => {
  it('classifies shareable modules', () => {
    expect(isShareableNavLink('skills')).toBe(true);
    expect(isShareableNavLink('prompts')).toBe(true);
    expect(isShareableNavLink('mcp-builder')).toBe(true);
    expect(isShareableNavLink('memories')).toBe(false);
    expect(isShareableNavLink('bookmarks')).toBe(false);
    expect(isShareableNavLink('files')).toBe(false);
    expect(isShareableNavLink('unknown-id')).toBe(false);
  });

  it('orders shareable links first, keeping relative order within groups', () => {
    const ids = (items: { id: string }[]) => items.map((item) => item.id);
    const input = [
      { id: 'memories' },
      { id: 'skills' },
      { id: 'bookmarks' },
      { id: 'mcp-builder' },
      { id: 'files' },
      { id: 'prompts' },
    ];

    expect(ids(orderNavLinksShareableFirst(input))).toEqual([
      'skills',
      'mcp-builder',
      'prompts',
      'memories',
      'bookmarks',
      'files',
    ]);
  });

  it('leaves already-grouped and single-group lists untouched', () => {
    expect(orderNavLinksShareableFirst([])).toEqual([]);
    expect(
      orderNavLinksShareableFirst([{ id: 'skills' }, { id: 'prompts' }]).map((l) => l.id),
    ).toEqual(['skills', 'prompts']);
  });
});
