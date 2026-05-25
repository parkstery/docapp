import React, { useRef, useCallback } from 'react';
import { tryBuildClipboardHtmlBlock } from '../utils/clipboardHtml';

export interface PlanningContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

function insertAtSelection(
  textarea: HTMLTextAreaElement,
  current: string,
  insert: string
): { value: string; cursor: number } {
  const start = textarea.selectionStart ?? current.length;
  const end = textarea.selectionEnd ?? start;
  const next = current.slice(0, start) + insert + current.slice(end);
  const cursor = start + insert.length;
  return { value: next, cursor };
}

/**
 * 기획서 Markdown 편집: 붙여넣기 시 clipboard text/html 이 있으면
 * :::docapp-html 블록으로 저장해 미리보기에서 Notion에 가깝게 표시.
 */
export const PlanningContentEditor: React.FC<PlanningContentEditorProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Markdown 작성...',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const block = tryBuildClipboardHtmlBlock(e.clipboardData);
      if (!block) return;

      e.preventDefault();
      const ta = e.currentTarget;
      const { value: next, cursor } = insertAtSelection(ta, value, block);
      onChange(next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(cursor, cursor);
      });
    },
    [value, onChange]
  );

  return (
    <textarea
      ref={textareaRef}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPaste={handlePaste}
    />
  );
};
