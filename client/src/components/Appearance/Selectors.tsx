import { useRecoilValue } from 'recoil';
import { Dropdown, Spinner } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

type PortalElement = ((element: HTMLElement) => HTMLElement | null) | HTMLElement | null;

export const ThemeSelector = ({
  theme,
  onChange,
  portal = true,
  portalElement,
  popoverClassName,
}: {
  theme: string;
  onChange: (value: string) => void;
  portal?: boolean;
  portalElement?: PortalElement;
  popoverClassName?: string;
}) => {
  const localize = useLocalize();

  /** Q-Vision: only System/Dark/Light. The high-contrast themes still exist in the
   * theme engine (and OS-level contrast keeps working), but Quinn does not offer them. */
  const themeOptions = [
    { value: 'system', label: localize('com_nav_theme_system') },
    { value: 'dark', label: localize('com_nav_theme_dark') },
    { value: 'light', label: localize('com_nav_theme_light') },
  ];

  const labelId = 'theme-selector-label';

  return (
    <div className="flex items-center justify-between">
      <div id={labelId}>{localize('com_nav_theme')}</div>

      <Dropdown
        value={theme}
        onChange={onChange}
        options={themeOptions}
        sizeClasses={cn('z-50 w-[180px]', popoverClassName)}
        testId="theme-selector"
        aria-labelledby={labelId}
        portal={portal}
        portalElement={portalElement}
      />
    </div>
  );
};

export const LangSelector = ({
  langcode,
  onChange,
  portal = true,
  portalElement,
  popoverClassName,
}: {
  langcode: string;
  onChange: (value: string) => void;
  portal?: boolean;
  portalElement?: PortalElement;
  popoverClassName?: string;
}) => {
  const localize = useLocalize();
  const isLanguageLoading = useRecoilValue(store.languageLoading);

  /** Q-Vision: only Auto/English/Spanish. The other locale files still exist in the
   * bundle (and `auto` follows the browser), but Quinn only offers en/es. */
  const languageOptions = [
    { value: 'auto', label: localize('com_nav_lang_auto') },
    { value: 'en-US', label: localize('com_nav_lang_english') },
    { value: 'es-ES', label: localize('com_nav_lang_spanish') },
  ];

  const labelId = 'language-selector-label';

  return (
    <div className="flex items-center justify-between">
      <div id={labelId}>{localize('com_nav_language')}</div>

      <div className="flex items-center gap-2">
        {isLanguageLoading && (
          <span
            role="status"
            aria-label={localize('com_ui_loading')}
            className="flex size-5 items-center justify-center text-text-secondary"
          >
            <Spinner className="size-4" />
          </span>
        )}
        <Dropdown
          value={langcode}
          onChange={onChange}
          sizeClasses={cn('z-50 w-[220px]', popoverClassName)}
          options={languageOptions}
          aria-labelledby={labelId}
          portal={portal}
          portalElement={portalElement}
          searchable
          searchPlaceholder={localize('com_ui_search_language')}
          searchEmptyText={localize('com_ui_no_results_found')}
        />
      </div>
    </div>
  );
};
