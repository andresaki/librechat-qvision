import {
  formatQuinnAuthorName,
  getQuinnBrandedEndpoint,
  isQuinnBrandedEndpoint,
} from '../quinnBrand';

const localize = (key: string) =>
  key === 'com_ui_quinn_admin_author' ? 'Quinn Administrator' : key;

describe('quinnBrand', () => {
  describe('isQuinnBrandedEndpoint', () => {
    it('is true when the endpoint modelDisplayLabel is Quinn', () => {
      expect(
        isQuinnBrandedEndpoint({ openAI: { modelDisplayLabel: 'Quinn' } } as never, 'openAI'),
      ).toBe(true);
    });

    it('is false for other labels or missing config', () => {
      expect(
        isQuinnBrandedEndpoint({ openAI: { modelDisplayLabel: 'Other' } } as never, 'openAI'),
      ).toBe(false);
      expect(isQuinnBrandedEndpoint(undefined, 'openAI')).toBe(false);
    });
  });

  describe('getQuinnBrandedEndpoint', () => {
    it('finds the configured endpoint presented as Chat Quinn', () => {
      expect(
        getQuinnBrandedEndpoint({
          'AI-Gateway-QVision': { modelDisplayLabel: 'Quinn' },
          agents: { modelDisplayLabel: 'Agents' },
        } as never),
      ).toBe('AI-Gateway-QVision');
    });

    it('returns undefined when no Quinn endpoint is configured', () => {
      expect(getQuinnBrandedEndpoint({ openAI: { modelDisplayLabel: 'Other' } } as never)).toBe(
        undefined,
      );
    });
  });

  describe('formatQuinnAuthorName', () => {
    it('localizes the Quinn admin service account', () => {
      expect(formatQuinnAuthorName('Admin quinn', localize)).toBe('Quinn Administrator');
      expect(formatQuinnAuthorName('admin quinn', localize)).toBe('Quinn Administrator');
    });

    it('returns other authors unchanged', () => {
      expect(formatQuinnAuthorName('María López', localize)).toBe('María López');
    });
  });
});