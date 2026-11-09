import { TStartupConfig } from 'librechat-data-provider';
import { policyUrls } from '~/utils/policies';
import { useLocalize } from '~/hooks';

function Footer({ startupConfig }: { startupConfig: TStartupConfig | null | undefined }) {
  const localize = useLocalize();
  if (!startupConfig) {
    return null;
  }
  /** Read the way the consent reads them, so a blank url is not a policy on one
   *  screen and a link back to this page on another. */
  const { privacyPolicyUrl, termsOfServiceUrl } = policyUrls(startupConfig);

  const linkClassName =
    'text-text-secondary hover:text-accent-primary focus:text-accent-primary underline-offset-2 transition-colors hover:underline focus:underline';
  const renderLink = (label: string, href?: string) =>
    href ? (
      <a className={linkClassName} href={href} rel="noreferrer">
        {label}
      </a>
    ) : (
      <span className="text-text-secondary">{label}</span>
    );

  return (
    <div
      className="text-text-secondary mt-auto px-6 pb-6 pt-2 text-center text-[11px]"
      role="contentinfo"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {renderLink(localize('com_auth_footer_privacy'), privacyPolicyUrl)}
        <span className="text-accent-primary" aria-hidden="true">
          ·
        </span>
        {renderLink(localize('com_auth_footer_terms'), termsOfServiceUrl)}
        <span className="text-accent-primary" aria-hidden="true">
          ·
        </span>
        {renderLink(localize('com_auth_footer_responsible_ai'))}
        <span className="text-accent-primary" aria-hidden="true">
          ·
        </span>
        {renderLink(localize('com_auth_footer_help'), startupConfig.helpAndFaqURL)}
      </div>
      <p className="mt-1">{localize('com_auth_footer_disclaimer')}</p>
    </div>
  );
}

export default Footer;
