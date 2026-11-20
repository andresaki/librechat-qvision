import { useLocalize } from '~/hooks';

/** Static stand-in for the model selector when the gateway is the only model. */
export default function QuinnBrandChip() {
  const localize = useLocalize();
  const label = localize('com_ui_quinn');

  return (
    <div
      data-testid="quinn-brand-chip"
      className="text-text-primary my-1 flex h-9 items-center gap-2 px-1 text-sm"
      aria-label={label}
    >
      <span className="bg-accent-primary size-2 shrink-0 rounded-full" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </div>
  );
}
