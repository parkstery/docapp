import React, { useRef, useCallback } from 'react';
import { tryBuildClipboardHtmlBlock } from '../utils/clipboardHtml';
import { buildChatPasteInsert } from '../utils/chatPasteStorage';
import { shouldNormalizeChatPaste } from '../utils/chatPasteParser';

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
 * 기획서 편집: 붙여넣기 시
 * 1) clipboard HTML(Notion 등) → :::docapp-html
 * 2) Cursor/채팅 평문 → Paste Normalizer(블록 AST) → :::docapp-chat
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
      const htmlBlock = tryBuildClipboardHtmlBlock(e.clipboardData);
      if (htmlBlock) {
        e.preventDefault();
        const ta = e.currentTarget;
        const { value: next, cursor } = insertAtSelection(ta, value, htmlBlock);
        onChange(next);
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(cursor, cursor);
        });
        return;
      }

      const plain = e.clipboardData?.getData('text/plain') ?? '';
      if (!plain.trim() || !shouldNormalizeChatPaste(plain)) return;

      e.preventDefault();
      const insert = buildChatPasteInsert(plain);
      const ta = e.currentTarget;
      const { value: next, cursor } = insertAtSelection(ta, value, insert);
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
