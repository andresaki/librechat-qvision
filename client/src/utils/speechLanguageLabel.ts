const PIG_LATIN = 'xx-piglatin';

export const SPEECH_LANGUAGE_CODES = [
  'af',
  'eu',
  'bg',
  'ca',
  'ar-EG',
  'ar-JO',
  'ar-KW',
  'ar-LB',
  'ar-QA',
  'ar-AE',
  'ar-MA',
  'ar-IQ',
  'ar-DZ',
  'ar-BH',
  'ar-LY',
  'ar-OM',
  'ar-SA',
  'ar-TN',
  'ar-YE',
  'cs',
  'nl-NL',
  'en-AU',
  'en-CA',
  'en-IN',
  'en-NZ',
  'en-ZA',
  'en-GB',
  'en-US',
  'et-EE',
  'fi',
  'fr-FR',
  'gl',
  'de-DE',
  'el-GR',
  'he',
  'hu',
  'is',
  'it-IT',
  'id',
  'ja',
  'ko',
  'la',
  'lv-LV',
  'lt-LT',
  'zh-CN',
  'zh-TW',
  'zh-HK',
  'ms-MY',
  'no-NO',
  'pl',
  PIG_LATIN,
  'pt-PT',
  'pt-br',
  'ro-RO',
  'ru',
  'sr-SP',
  'sk',
  'es-AR',
  'es-BO',
  'es-CL',
  'es-CO',
  'es-CR',
  'es-DO',
  'es-EC',
  'es-SV',
  'es-GT',
  'es-HN',
  'es-MX',
  'es-NI',
  'es-PA',
  'es-PY',
  'es-PE',
  'es-PR',
  'es-ES',
  'es-US',
  'es-UY',
  'es-VE',
  'sv-SE',
  'tr',
  'zu',
] as const;

/**
 * Human-readable speech language label for STT/TTS dropdowns, localized to the UI locale.
 */
export function speechLanguageLabel(value: string, uiLocale: string): string {
  if (value === PIG_LATIN) {
    return 'Pig Latin';
  }

  const normalized = value.includes('-')
    ? value
        .split('-')
        .map((part, index) => (index === 0 ? part.toLowerCase() : part.toUpperCase()))
        .join('-')
    : value.toLowerCase();

  try {
    if (normalized.includes('-')) {
      const [lang, region] = normalized.split('-');
      const languageNames = new Intl.DisplayNames([uiLocale], { type: 'language' });
      const regionNames = new Intl.DisplayNames([uiLocale], { type: 'region' });
      const langName = languageNames.of(lang) ?? lang;
      const regionName = regionNames.of(region) ?? region;
      return `${langName} (${regionName})`;
    }
    const languageNames = new Intl.DisplayNames([uiLocale], { type: 'language' });
    return languageNames.of(normalized) ?? value;
  } catch {
    return value;
  }
}

export function shouldShowPigLatinSpeechOption(uiLocale: string): boolean {
  return uiLocale.toLowerCase().startsWith('en');
}
