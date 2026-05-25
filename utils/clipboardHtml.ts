import { sanitizeRichHtml } from './richHtmlSanitize';

/** 기획서 본문에 저장되는 클립보드 HTML 블록 (미리보기·.md 보기에서 HTML 그대로 렌더) */
export const CLIPBOARD_HTML_FENCE = ':::docapp-html';

const FENCE_END = ':::';

/** 클립보드 fragment / MS Office 래퍼 제거 */
export function extractClipboardFragment(html: string): string {
  if (!html?.trim()) return '';
  const frag = html.match(/<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/i);
  if (frag) return frag[1];
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (body) return body[1];
  return html;
}

/** style/script 등 제거 후 본문 HTML만 */
export function cleanClipboardHtmlMarkup(html: string): string {
  if (typeof document === 'undefined') return html;
  const raw = extractClipboardFragment(html);
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  doc.querySelectorAll('style, script, meta, link, title, xml, head').forEach((el) => el.remove());
  let inner = doc.body?.innerHTML?.trim() || raw.trim();
  inner = inner
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\sclass="Mso[^"]*"/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/<o:p>\s*<\/o:p>/gi, '')
    .trim();
  return inner;
}

/** Cursor/채팅 복사: <p>만 여러 개인 약한 HTML (표 없음) → chat normalizer 사용 */
export function isWeakChatClipboardHtml(html: string): boolean {
  const cleaned = cleanClipboardHtmlMarkup(html).toLowerCase();
  if (!cleaned.trim()) return true;
  if (/<table[\s>]/i.test(cleaned)) return false;
  if (/<(ul|ol)[\s>]/i.test(cleaned)) return false;
  if (/<h[1-6][\s>]/i.test(cleaned)) return false;
  if ((cleaned.match(/<t[dh][\s>]/gi) || []).length >= 2) return false;
  if (/data-block-id|notion-|docs-internal-guid/i.test(cleaned)) return false;
  return true;
}

/** 표·목록·제목 등 구조가 있을 때만 HTML 경로 사용 (단순 한 줄 텍스트는 plain 유지) */
export function shouldPreserveClipboardAsHtml(html: string): boolean {
  const t = html.toLowerCase();
  if (!t.trim()) return false;
  if (isWeakChatClipboardHtml(html)) return false;
  if (/<table[\s>]/i.test(t)) return true;
  if (/<(ul|ol)[\s>]/i.test(t)) return true;
  if (/<h[1-6][\s>]/i.test(t)) return true;
  if (/<blockquote[\s>]/i.test(t)) return true;
  if (/data-block-id|notion-|docs-internal-guid/i.test(t)) return true;
  if ((t.match(/<tr[\s>]/gi) || []).length >= 1) return true;
  const paragraphs = t.match(/<p[\s>]/gi) || [];
  if (paragraphs.length >= 2) return true;
  const cells = t.match(/<t[dh][\s>]/gi) || [];
  if (cells.length >= 2) return true;
  return false;
}

export function sanitizeClipboardHtmlForStorage(html: string): string {
  const cleaned = cleanClipboardHtmlMarkup(html);
  if (!cleaned) return '';
  return sanitizeRichHtml(cleaned);
}

export function readClipboardHtml(data: DataTransfer | null | undefined): string {
  if (!data) return '';
  const direct = data.getData('text/html');
  if (direct?.trim()) return direct;
  for (let i = 0; i < data.items.length; i++) {
    if (data.items[i].type === 'text/html') {
      return data.getData('text/html') || '';
    }
  }
  return '';
}

export function tryBuildClipboardHtmlBlock(data: DataTransfer | null | undefined): string | null {
  const raw = readClipboardHtml(data);
  if (!raw.trim()) return null;
  const cleaned = cleanClipboardHtmlMarkup(raw);
  if (!shouldPreserveClipboardAsHtml(cleaned)) return null;
  const safe = sanitizeClipboardHtmlForStorage(cleaned);
  if (!safe.trim()) return null;
  return wrapClipboardHtmlBlock(safe);
}

export function wrapClipboardHtmlBlock(safeHtml: string): string {
  const body = safeHtml.trim();
  return `\n\n${CLIPBOARD_HTML_FENCE}\n${body}\n${FENCE_END}\n\n`;
}
