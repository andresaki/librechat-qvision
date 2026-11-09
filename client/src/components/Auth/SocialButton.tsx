import React from 'react';

const SocialButton = ({ id, enabled, serverDomain, oauthPath, Icon, label }) => {
  if (!enabled) {
    return null;
  }

  return (
    <div className="mt-3 flex gap-x-2">
      <a
        aria-label={`${label}`}
        className="border-border-medium !bg-surface-primary-alt text-text-primary hover:bg-surface-hover flex h-11 w-full items-center justify-center gap-3 rounded-xl border px-5 text-sm font-medium transition-colors duration-200 dark:!bg-surface-primary"
        href={`${serverDomain}/oauth/${oauthPath}`}
        data-testid={id}
      >
        <Icon />
        <p>{label}</p>
      </a>
    </div>
  );
};

export default SocialButton;
