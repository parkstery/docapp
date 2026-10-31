import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 제목 없이 저장할 때 내용 첫 문장으로 채운 제목을 확인받는 상태.
 * resetKey(편집 중인 항목 id 등)가 바뀌면 확인 줄을 닫는다.
 */
export function useTitleSuggestion(resetKey: string | null | undefined) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [resetKey]);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  /** 아니오: 확인 줄을 닫고 제목 칸으로 커서를 옮긴다(제목 비우기는 호출하는 쪽에서). */
  const reject = useCallback(() => {
    setOpen(false);
    // 클릭 처리 안에서 바로 옮긴다(입력란은 그대로 남고 확인 줄만 사라짐).
    inputRef.current?.focus();
  }, []);

  return { open, show, hide, reject, inputRef };
}

type TitleSuggestionBarProps = {
  open: boolean;
  onYes: () => void;
  onNo: () => void;
  disabled?: boolean;
};

/** 제목 칸 바로 아래에 붙는 "이 제목으로 저장하시겠습니까? [예] [아니오]" 줄 */
export function TitleSuggestionBar({ open, onYes, onNo, disabled }: TitleSuggestionBarProps) {
  if (!open) return null;
  return (
    <div
      role="status"
      className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2"
    >
      <p className="flex-1 min-w-[12rem] text-sm text-slate-700">이 제목으로 저장하시겠습니까?</p>
      <div className="flex gap-2">
        <button
          type="button"
          autoFocus
          onClick={onYes}
          disabled={disabled}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
        >
          예
        </button>
        <button
          type="button"
          onClick={onNo}
          className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md text-xs font-medium transition-colors"
        >
          아니오
        </button>
      </div>
    </div>
  );
}
