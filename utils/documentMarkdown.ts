import { htmlToPlainTextWithBreaks } from './promptReadability';

/** 저장값이 HTML이면 편집용 Markdown으로, 이미 MD면 그대로 */
export function legacyContentToEditableMarkdown(raw: string): string {
  const t = raw?.trim() ?? '';
  if (!t) return '';
  if (/<\/?[a-z][\s>]/i.test(t)) return htmlToPlainTextWithBreaks(t);
  return raw;
}

/** 목록 한 줄 미리보기 */
export function markdownListPreview(raw: string, maxLen = 80): string {
  const t = legacyContentToEditableMarkdown(raw)
    .replace(/:::docapp-(chat|html)\r?\n[\s\S]*?\r?\n:::/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  return t.length > maxLen ? `${t.slice(0, maxLen)}...` : t;
}
