import React, { useCallback } from 'react';
import { readClipboardHtml, tryBuildClipboardHtmlBlock } from '../utils/clipboardHtml';
import { buildChatPasteInsert } from '../utils/chatPasteStorage';
import {
  shouldNormalizeChatPaste,
  shouldPreferChatPasteOverClipboardHtml,
} from '../utils/chatPasteParser';

export interface PlanningContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  onStructuredPaste?: () => void;
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
 * 기획서 편집: Cursor 채팅 평문 우선 → :::docapp-chat, Notion 등 진짜 HTML → :::docapp-html
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
      const plain = e.clipboardData?.getData('text/plain') ?? '';
      const htmlRaw = readClipboardHtml(e.clipboardData);

      if (
        plain.trim() &&
        shouldPreferChatPasteOverClipboardHtml(plain, htmlRaw)
      ) {
        e.preventDefault();
        const insert = buildChatPasteInsert(plain);
        const ta = e.currentTarget;
        const { value: next, cursor } = insertAtSelection(ta, value, insert);
        onChange(next);
        onStructuredPaste?.();
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(cursor, cursor);
        });
        return;
      }

      const htmlBlock = tryBuildClipboardHtmlBlock(e.clipboardData);
      if (htmlBlock) {
        e.preventDefault();
        const ta = e.currentTarget;
        const { value: next, cursor } = insertAtSelection(ta, value, htmlBlock);
        onChange(next);
        onStructuredPaste?.();
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(cursor, cursor);
        });
        return;
      }

      const lines = plain.split('\n').filter((l) => l.trim()).length;
      if (plain.trim() && lines >= 2 && shouldNormalizeChatPaste(plain)) {
        e.preventDefault();
        const insert = buildChatPasteInsert(plain);
        const ta = e.currentTarget;
        const { value: next, cursor } = insertAtSelection(ta, value, insert);
        onChange(next);
        onStructuredPaste?.();
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(cursor, cursor);
        });
      }
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
