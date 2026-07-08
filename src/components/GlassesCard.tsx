import type { ScoredGlassesItem } from '../types';
import { GlassesIcon } from './GlassesIcon';

interface GlassesCardProps {
  item: ScoredGlassesItem;
  highlighted?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export function GlassesCard({ item, highlighted, selected, onSelect }: GlassesCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative text-left w-full rounded-xl border p-4 flex flex-col items-center gap-3 transition-colors ${
        highlighted
          ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-600'
          : 'border-neutral-200 bg-white dark:bg-neutral-900 dark:border-neutral-800'
      } ${selected ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-neutral-50 dark:ring-offset-neutral-950' : ''}`}
    >
      {selected && (
        <span className="absolute top-2 right-2 text-[10px] font-medium bg-violet-600 text-white rounded-full px-2 py-0.5">
          Đang thử
        </span>
      )}
      <div className="w-full aspect-[5/3] flex items-center justify-center">
        <GlassesIcon
          style={item.style}
          color={item.color}
          accentColor={item.accentColor}
          className="w-full h-full"
        />
      </div>
      <div className="text-center">
        <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100">{item.name}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{item.description}</p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
          Rộng ~{item.frameWidthMm}mm · Cầu {item.bridgeMm}mm
        </p>
      </div>
      {item.reasons.length > 0 && (
        <ul className="w-full flex flex-col gap-1">
          {item.reasons.map((reason) => (
            <li
              key={reason}
              className="text-[11px] leading-snug text-violet-700 dark:text-violet-300 bg-violet-100/70 dark:bg-violet-900/30 rounded px-2 py-1"
            >
              {reason}
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}
