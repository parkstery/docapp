import React, { useCallback } from 'react';
import { structuredPasteInsert } from '../utils/structuredPaste';

export interface PlanningContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  onStructuredPaste?: () => void;
}

/**
 * 기획서·보고서 본문의 단순 입력칸.
 * CodeMirror 편집기를 불러오는 동안 대신 보여 주며, 붙여넣기 구조화 규칙은 같다.
 */
export const PlanningContentEditor: React.FC<PlanningContentEditorProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Markdown 작성...',
  onStructuredPaste,
}) => {
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const insert = structuredPasteInsert(e.clipboardData);
      if (insert == null) return;
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart ?? value.length;
      const end = ta.selectionEnd ?? start;
      const cursor = start + insert.length;
      onChange(value.slice(0, start) + insert + value.slice(end));
      onStructuredPaste?.();
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(cursor, cursor);
      });
    },
    [value, onChange, onStructuredPaste]
  );

  return (
    <textarea
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPaste={handlePaste}
    />
  );
};
