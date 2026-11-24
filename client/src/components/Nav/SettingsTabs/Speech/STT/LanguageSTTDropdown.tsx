import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@librechat/client';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useLocalize } from '~/hooks';
import {
  SPEECH_LANGUAGE_CODES,
  shouldShowPigLatinSpeechOption,
  speechLanguageLabel,
} from '~/utils/speechLanguageLabel';
import store from '~/store';

export default function LanguageSTTDropdown() {
  const localize = useLocalize();
  const { i18n } = useTranslation();
  const [languageSTT, setLanguageSTT] = useRecoilState<string>(store.languageSTT);
  const speechToText = useRecoilValue(store.speechToText);

  const languageOptions = useMemo(() => {
    const locale = i18n.language ?? 'en';
    const codes = shouldShowPigLatinSpeechOption(locale)
      ? SPEECH_LANGUAGE_CODES
      : SPEECH_LANGUAGE_CODES.filter((code) => code !== 'xx-piglatin');
    return codes.map((value) => ({
      value,
      label: speechLanguageLabel(value, locale),
    }));
  }, [i18n.language]);

  const handleSelect = (value: string) => {
    setLanguageSTT(value);
  };

  const labelId = 'language-stt-dropdown-label';

  return (
    <div className="flex items-center justify-between">
      <div id={labelId}>{localize('com_nav_language')}</div>
      <Dropdown
        value={languageSTT}
        onChange={handleSelect}
        options={languageOptions}
        testId="LanguageSTTDropdown"
        className="z-50"
        aria-labelledby={labelId}
        disabled={!speechToText}
      />
    </div>
  );
}
