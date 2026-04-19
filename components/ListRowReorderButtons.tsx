import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export type ListRowReorderButtonsProps = {
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableUp: boolean;
  disableDown: boolean;
  busy?: boolean;
  /** 테마별 버튼 색 (기본: slate) */
  variant?: 'slate' | 'violet';
};

const variantClass: Record<NonNullable<ListRowReorderButtonsProps['variant']>, string> = {
  slate: 'text-slate-600 hover:bg-slate-100',
  violet: 'text-violet-700 hover:bg-violet-100',
};

export function ListRowReorderButtons({
  onMoveUp,
  onMoveDown,
  disableUp,
  disableDown,
  busy,
  variant = 'slate',
}: ListRowReorderButtonsProps) {
  const vc = variantClass[variant];
  const btn = `p-0.5 rounded ${vc} disabled:opacity-30 disabled:pointer-events-none`;
  return (
    <div className="inline-flex flex-col items-center justify-center gap-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={btn}
        aria-label="위로 이동"
        disabled={busy || disableUp}
        onClick={onMoveUp}
      >
        <ChevronUp size={16} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className={btn}
        aria-label="아래로 이동"
        disabled={busy || disableDown}
        onClick={onMoveDown}
      >
        <ChevronDown size={16} strokeWidth={2.25} />
      </button>
    </div>
  );
}
