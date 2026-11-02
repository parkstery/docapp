import { readClipboardHtml, tryBuildClipboardHtmlBlock } from './clipboardHtml';
import { buildChatPasteInsert } from './chatPasteStorage';
import {
  shouldNormalizeChatPaste,
  shouldPreferChatPasteOverClipboardHtml,
} from './chatPasteParser';

/**
 * 기획서·보고서 본문 붙여넣기 규칙.
 * Cursor 채팅 평문 우선 → :::docapp-chat, Notion 등 진짜 HTML → :::docapp-html.
 * 구조화할 필요가 없으면 null(기본 붙여넣기 사용).
 */
export function structuredPasteInsert(data: DataTransfer | null | undefined): string | null {
  if (!data) return null;
  const plain = data.getData('text/plain') ?? '';
  const htmlRaw = readClipboardHtml(data);

  if (plain.trim() && shouldPreferChatPasteOverClipboardHtml(plain, htmlRaw)) {
    return buildChatPasteInsert(plain);
  }

  const htmlBlock = tryBuildClipboardHtmlBlock(data);
  if (htmlBlock) return htmlBlock;

  const lines = plain.split('\n').filter((l) => l.trim()).length;
  if (plain.trim() && lines >= 2 && shouldNormalizeChatPaste(plain)) {
    return buildChatPasteInsert(plain);
  }
  return null;
}
