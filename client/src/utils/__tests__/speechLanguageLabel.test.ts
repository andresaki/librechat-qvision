import { speechLanguageLabel, shouldShowPigLatinSpeechOption } from '../speechLanguageLabel';

describe('speechLanguageLabel', () => {
  it('localizes regional Spanish for UI locale es', () => {
    const label = speechLanguageLabel('es-CO', 'es');
    expect(label).toMatch(/colombia/i);
    expect(label).not.toMatch(/Spanish/);
  });

  it('hides pig latin outside English UI', () => {
    expect(shouldShowPigLatinSpeechOption('es')).toBe(false);
    expect(shouldShowPigLatinSpeechOption('en')).toBe(true);
  });
});