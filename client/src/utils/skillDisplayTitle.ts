/** Known Q-Vision / marketplace skill slugs → readable Spanish titles (accents). */
const SKILL_SLUG_LABELS: Record<string, string> = {
  'analisis-datos-tabulares': 'Análisis de datos tabulares',
  'descripcion-puesto': 'Descripción de puesto',
  'redaccion-corporativa': 'Redacción corporativa',
  'minutas-y-acuerdos': 'Minutas y acuerdos',
};

function humanizeSlug(slug: string): string {
  const words = slug.split(/[-_]+/).filter(Boolean);
  if (words.length === 0) {
    return slug;
  }
  const [first, ...rest] = words;
  const head = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  return [head, ...rest.map((w) => w.toLowerCase())].join(' ');
}

export function getSkillDisplayTitle(skill: {
  name?: string | null;
  displayTitle?: string | null;
}): string {
  const fromApi = skill.displayTitle?.trim();
  if (fromApi) {
    return fromApi;
  }
  const slug = skill.name?.trim() ?? '';
  if (!slug) {
    return '';
  }
  return SKILL_SLUG_LABELS[slug] ?? humanizeSlug(slug);
}