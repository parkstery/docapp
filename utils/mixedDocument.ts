import {
  CHAT_PASTE_FENCE,
  extractChatPasteBlocksFromContent,
  stripChatPasteFences,
  tryParseChatPasteFence,
} from './chatPasteStorage';
import { CLIPBOARD_HTML_FENCE } from './clipboardHtml';
import type { DocumentBlock } from '../types/documentBlocks';

export type MixedDocumentSegment =
  | { type: 'markdown'; body: string }
  | { type: 'html'; body: string }
  | { type: 'chat'; blocks: DocumentBlock[] };

type FenceKind = 'html' | 'chat';

const FENCE_RE = /:::(docapp-html|docapp-chat)\r?\n([\s\S]*?)\r?\n:::/g;

export function hasStructuredPasteBlocks(content: string): boolean {
  return (
    /:::docapp-html\r?\n/.test(content) || /:::docapp-chat\r?\n/.test(content)
  );
}

export function hasClipboardHtmlBlocks(content: string): boolean {
  return /:::docapp-html\r?\n/.test(content);
}

export function splitMixedDocument(content: string): MixedDocumentSegment[] {
  const text = content ?? '';

  const chatBlocks = extractChatPasteBlocksFromContent(text);
  if (chatBlocks.length > 0) {
    const outside = stripChatPasteFences(text);
    const segments: MixedDocumentSegment[] = [{ type: 'chat', blocks: chatBlocks }];
    if (outside.trim()) segments.push({ type: 'markdown', body: outside });
    return segments;
  }

  if (!hasStructuredPasteBlocks(text)) {
    const trimmed = text.trim();
    return trimmed ? [{ type: 'markdown', body: trimmed }] : [];
  }

  const segments: MixedDocumentSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(FENCE_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      const md = text.slice(lastIndex, index).trim();
      if (md) segments.push({ type: 'markdown', body: md });
    }

    const kind = match[1] as FenceKind;
    const body = (match[2] || '').trim();

    if (kind === 'html' && body) {
      segments.push({ type: 'html', body });
    } else if (kind === 'chat' && body) {
      const blocks = tryParseChatPasteFence(body);
      if (blocks?.length) segments.push({ type: 'chat', blocks });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    const md = text.slice(lastIndex).trim();
    if (md) segments.push({ type: 'markdown', body: md });
  }

  return segments;
}
