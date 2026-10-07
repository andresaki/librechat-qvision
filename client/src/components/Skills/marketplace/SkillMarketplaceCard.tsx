import { useNavigate } from 'react-router-dom';
import { ScrollText, User } from 'lucide-react';
import type { TSkillSummary } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface SkillMarketplaceCardProps {
  skill: TSkillSummary;
  className?: string;
}

export default function SkillMarketplaceCard({ skill, className = '' }: SkillMarketplaceCardProps) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const title = skill.displayTitle?.trim() || skill.name;
  const description = skill.description?.trim() ?? '';

  const openDetail = () => {
    navigate(`/skills/${skill._id}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail();
        }
      }}
      className={cn(
        'group relative flex h-36 cursor-pointer flex-col gap-3 overflow-hidden rounded-xl',
        'select-none px-5 py-4',
        'bg-surface-tertiary transition-colors duration-150 hover:bg-surface-hover',
        '[&_*]:cursor-pointer',
        className,
      )}
      aria-label={localize('com_ui_skill_marketplace_card_label', {
        name: title,
        description: description || title,
      })}
    >
      {skill.category ? (
        <span className="absolute right-4 top-3 max-w-[40%] truncate rounded-md bg-surface-hover px-2 py-0.5 text-xs text-text-secondary">
          {skill.category}
        </span>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-4">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-hover text-text-secondary"
          aria-hidden="true"
        >
          <ScrollText className="size-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-text-primary">{title}</h3>
          {skill.authorName ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-text-tertiary">
              <User className="size-3 shrink-0" aria-hidden="true" />
              <span>{skill.authorName}</span>
            </p>
          ) : null}
          {description ? (
            <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
