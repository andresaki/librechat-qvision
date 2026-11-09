import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { ThemeSelector } from '@librechat/client';
import { TStartupConfig } from 'librechat-data-provider';
import { ShieldCheck } from 'lucide-react';
import { ErrorMessage } from '~/components/Auth/ErrorMessage';
import { hasPublishedPolicies } from '~/utils/policies';
import { TranslationKeys, useLocalize } from '~/hooks';
import SocialLoginRender from './SocialLoginRender';
import { BlinkAnimation } from './BlinkAnimation';
import { Banner } from '../Banners';
import Footer from './Footer';
import { cn } from '~/utils';
import { adminLoginVisibleAtom } from '~/store/adminLogin';

function AuthLayout({
  children,
  header,
  isFetching,
  startupConfig,
  startupConfigError,
  pathname,
  error,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  isFetching: boolean;
  startupConfig: TStartupConfig | null | undefined;
  startupConfigError: unknown | null | undefined;
  pathname: string;
  error: TranslationKeys | null;
}) {
  const localize = useLocalize();
  const [adminLoginVisible, setAdminLoginVisible] = useAtom(adminLoginVisibleAtom);

  const hasStartupConfigError = startupConfigError !== null && startupConfigError !== undefined;
  const isRegister = pathname.includes('register');
  const isLogin = !pathname.includes('2fa') && pathname.includes('login');
  const showsSocialLogin = isLogin || isRegister;
  const hasPolicies = hasPublishedPolicies(startupConfig);
  const hasModalAcceptance =
    startupConfig?.interface?.termsOfService?.modalAcceptance === true;
  const shouldShowFooter =
    isLogin ||
    !isRegister ||
    hasStartupConfigError ||
    isFetching ||
    !hasPolicies ||
    hasModalAcceptance;
  const isTwoFactorSetup = pathname === '/login/2fa/setup';

  useEffect(() => {
    if (!isLogin) {
      setAdminLoginVisible(false);
      return;
    }

    const handleAdminLoginShortcut = (event: KeyboardEvent) => {
      const isLoginShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'l';

      if (!isLoginShortcut) {
        return;
      }

      event.preventDefault();
      setAdminLoginVisible((visible) => !visible);
    };

    window.addEventListener('keydown', handleAdminLoginShortcut);
    return () => window.removeEventListener('keydown', handleAdminLoginShortcut);
  }, [isLogin, setAdminLoginVisible]);
  const DisplayError = () => {
    if (hasStartupConfigError) {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>{localize('com_auth_error_login_server')}</ErrorMessage>
        </div>
      );
    } else if (error === 'com_auth_error_invalid_reset_token') {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>
            {localize('com_auth_error_invalid_reset_token')}{' '}
            <a
              className="text-accent-primary font-semibold hover:underline"
              href="/forgot-password"
            >
              {localize('com_auth_click_here')}
            </a>{' '}
            {localize('com_auth_to_try_again')}
          </ErrorMessage>
        </div>
      );
    } else if (error != null && error) {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>{localize(error)}</ErrorMessage>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-surface-secondary relative flex h-dvh flex-col overflow-hidden">
      <Banner />
      <DisplayError />

      <div className="flex h-full min-h-0 flex-1 flex-col md:flex-row">
        <section
          className="bg-header-primary text-text-on-media relative hidden min-h-[18rem] flex-col justify-between overflow-hidden px-8 py-8 md:flex md:w-[43%] md:px-12 md:py-10 lg:px-16"
          aria-label={localize('com_auth_brand_panel')}
        >
          <div className="relative z-10 flex items-center gap-3">
            <img src="assets/quinn-simbolo-negativo.svg" className="size-9" alt="" />
            <span className="text-text-on-media text-2xl font-semibold tracking-tight">
              {localize('com_auth_brand_name')}
            </span>
            <span className="border-surface-primary-contrast/40 text-text-on-media/75 border-s ps-3 text-xs">
              {localize('com_auth_brand_byline')}
            </span>
          </div>

          <div className="relative z-10 max-w-md pb-8">
            <h2 className="text-5xl leading-[1.05] font-semibold tracking-tight lg:text-6xl">
              {localize('com_auth_brand_title_prefix')}{' '}
              <span className="text-accent-primary">
                {localize('com_auth_brand_title_highlight')}
              </span>
            </h2>
            <p className="text-text-on-media/80 mt-5 max-w-sm text-lg leading-relaxed">
              {localize('com_auth_brand_description')}
            </p>
            <div className="mt-6 flex max-w-sm flex-wrap gap-2">
              {[
                'com_auth_brand_chip_question',
                'com_auth_brand_chip_summary',
                'com_auth_brand_chip_email',
                'com_auth_brand_chip_meeting',
              ].map((key) => (
                <span
                  key={key}
                  className="border-border-medium/80 text-text-on-media rounded-full border px-3.5 py-2 text-sm"
                >
                  {localize(key as TranslationKeys)}
                </span>
              ))}
            </div>
          </div>

          <p className="text-text-on-media/75 relative z-10 flex items-center gap-1.5 text-xs">
            <ShieldCheck className="text-accent-primary size-4" aria-hidden="true" />
            {localize('com_auth_brand_footer')}
          </p>
          <div className="border-surface-primary-contrast/10 pointer-events-none absolute -end-24 -bottom-36 size-[28rem] rounded-full border-[3.5rem]" />
        </section>

        <section className="bg-surface-primary-alt relative flex h-full min-h-0 flex-1 flex-col">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-6 md:hidden">
            <img
              src="assets/logo-quinn.svg"
              className="h-8 w-auto"
              alt={localize('com_ui_logo', { 0: startupConfig?.appTitle ?? 'Quinn' })}
            />
          </div>
          <div className="absolute end-0 top-0 z-20 m-4">
            <ThemeSelector returnThemeOnly />
          </div>

          <main className="flex min-h-0 grow items-center justify-center px-5 py-24 md:px-8 md:py-10">
            <div
              className={cn(
                'bg-surface-primary-alt w-full overflow-hidden px-7 py-8 sm:px-9',
                isTwoFactorSetup ? 'max-w-lg' : 'max-w-[25rem]',
              )}
            >
              {!hasStartupConfigError && !isFetching && header && (
                <h1 className="text-text-primary mb-2 text-2xl font-semibold tracking-tight select-none">
                  {isLogin ? localize('com_auth_brand_login_title') : header}
                </h1>
              )}
              {isLogin && !hasStartupConfigError && !isFetching && (
                <p className="text-text-secondary mb-6 text-sm">
                  {localize('com_auth_brand_login_subtitle')}
                </p>
              )}
              <BlinkAnimation active={isFetching}>{children}</BlinkAnimation>
              {showsSocialLogin && (
                <SocialLoginRender
                  startupConfig={startupConfig}
                  showPasskey={isLogin}
                  showEmailLogin={isLogin ? adminLoginVisible : true}
                />
              )}
            </div>
          </main>
          {shouldShowFooter && <Footer startupConfig={startupConfig} />}
        </section>
      </div>
    </div>
  );
}

export default AuthLayout;
