import clsx from 'clsx';
import { CircleCheck, Clock, Hourglass, Ban, Sparkles } from 'lucide-react';
import { STATUS } from '../lib/constants';

const tones = {
  lime: 'bg-lime text-on-lime',
  amber: 'bg-amber-soft text-amber',
  leaf: 'bg-leaf text-on-leaf',
  muted: 'bg-surface-2 text-ink-soft',
};

const icons = { available: Sparkles, claimed: Clock, completed: CircleCheck, expired: Hourglass, cancelled: Ban };

export function StatusStamp({ status, className }) {
  const meta = STATUS[status] ?? STATUS.available;
  const Icon = icons[status] ?? Sparkles;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap',
        tones[meta.tone],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden strokeWidth={2.5} />
      {meta.label}
    </span>
  );
}
