import { htmlToPlainTextWithBreaks } from './promptReadability';

/** 저장값이 TipTap HTML이면 편집용 Markdown 평문으로, 이미 MD면 그대로 */
export function toEditableDocumentMarkdown(raw: string): string {
  const t = raw?.trim() ?? '';
  if (!t) return '';
  if (/<\/?[a-z][\s>]/i.test(t)) return htmlToPlainTextWithBreaks(t);
  return raw;
}

/** 목록·제목용 한 줄 미리보기 */
export function documentListPreview(raw: string, maxLen = 80): string {
  const t = toEditableDocumentMarkdown(raw)
    .replace(/:::docapp-(chat|html)\r?\n[\s\S]*?\r?\n:::/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  return t.length > maxLen ? `${t.slice(0, maxLen)}...` : t;
}

export function promptTitleFromMarkdown(md: string): string {
  const plain = documentListPreview(md, 200);
  if (!plain) return '프롬프트';
  return plain.substring(0, 30) + (plain.length > 30 ? '...' : '');
}
