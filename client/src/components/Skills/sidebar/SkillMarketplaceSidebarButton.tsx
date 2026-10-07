import { LayoutGrid } from 'lucide-react';
import { Button } from '@librechat/client';
import { Link, useLocation } from 'react-router-dom';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/** Opens the skill marketplace (`/skills`) from the skills side panel. */
export default function SkillMarketplaceSidebarButton() {
  const localize = useLocalize();
  const { pathname } = useLocation();
  const isMarketplace = pathname === '/skills';

  return (
    <Button
      asChild
      variant={isMarketplace ? 'secondary' : 'outline'}
      className={cn('h-9 w-full justify-start gap-2 px-3 text-sm font-medium')}
    >
      <Link
        to="/skills"
        data-testid="skills-sidebar-marketplace-button"
        aria-current={isMarketplace ? 'page' : undefined}
      >
        <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
        {localize('com_ui_skill_marketplace')}
      </Link>
    </Button>
  );
}
