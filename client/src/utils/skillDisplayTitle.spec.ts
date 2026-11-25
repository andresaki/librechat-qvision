import { getSkillDisplayTitle } from './skillDisplayTitle';

describe('getSkillDisplayTitle', () => {
  it('prefers displayTitle from API', () => {
    expect(getSkillDisplayTitle({ name: 'slug', displayTitle: ' Título ' })).toBe('Título');
  });

  it('maps known slugs with accents', () => {
    expect(getSkillDisplayTitle({ name: 'analisis-datos-tabulares' })).toBe(
      'Análisis de datos tabulares',
    );
  });

  it('humanizes unknown slugs', () => {
    expect(getSkillDisplayTitle({ name: 'mi-skill-nueva' })).toBe('Mi skill nueva');
  });
});