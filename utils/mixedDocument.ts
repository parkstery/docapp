import { CLIPBOARD_HTML_FENCE } from './clipboardHtml';

export type MixedDocumentSegment =
  | { type: 'markdown'; body: string }
  | { type: 'html'; body: string };

const BLOCK_RE = new RegExp(
  `${CLIPBOARD_HTML_FENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n([\\s\\S]*?)\\n:::`,
  'g'
);

export function hasClipboardHtmlBlocks(content: string): boolean {
  return content.includes(`${CLIPBOARD_HTML_FENCE}\n`);
}

export function splitMixedDocument(content: string): MixedDocumentSegment[] {
  const text = content ?? '';
  if (!hasClipboardHtmlBlocks(text)) {
    const trimmed = text.trim();
    return trimmed ? [{ type: 'markdown', body: trimmed }] : [];
  }

  const segments: MixedDocumentSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(BLOCK_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      const md = text.slice(lastIndex, index).trim();
      if (md) segments.push({ type: 'markdown', body: md });
    }
    const html = (match[1] || '').trim();
    if (html) segments.push({ type: 'html', body: html });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    const md = text.slice(lastIndex).trim();
    if (md) segments.push({ type: 'markdown', body: md });
  }

  return segments;
}
