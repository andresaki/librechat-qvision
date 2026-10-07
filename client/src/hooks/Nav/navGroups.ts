/**
 * Q-Vision sidebar grouping: shareable modules render above the divider,
 * personal modules below. IDs must match the NavLink `id`s built in
 * `useSideNavLinks`. Kept dependency-free so the grouping stays trivially
 * testable and rebases touch one small file.
 */
export const SHAREABLE_NAV_IDS: ReadonlySet<string> = new Set(['skills', 'prompts', 'mcp-builder']);

export function isShareableNavLink(id: string): boolean {
  return SHAREABLE_NAV_IDS.has(id);
}

/** Stable shareable-first ordering; preserves relative order within each group. */
export function orderNavLinksShareableFirst<T extends { id: string }>(items: readonly T[]): T[] {
  return [...items].sort(
    (a, b) => Number(!isShareableNavLink(a.id)) - Number(!isShareableNavLink(b.id)),
  );
}
