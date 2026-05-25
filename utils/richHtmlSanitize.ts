import DOMPurify from 'dompurify';

const RICH_HTML_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'del', 'a', 'img',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'hr', 'div', 'span', 'input',
  'figure', 'figcaption', 'sup', 'sub',
] as const;

const RICH_HTML_ALLOWED_ATTR = [
  'href', 'target', 'rel', 'src', 'alt', 'title', 'class',
  'type', 'disabled', 'checked', 'colspan', 'rowspan', 'align', 'valign', 'width', 'height',
] as const;

/** TipTap·클립보드 HTML 등 읽기 전용 본문용 */
export function sanitizeRichHtml(dirty: string): string {
  if (!dirty?.trim()) return '';
  if (typeof window === 'undefined') return dirty;
  return DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['target', 'rel'],
    ALLOWED_TAGS: [...RICH_HTML_ALLOWED_TAGS],
    ALLOWED_ATTR: [...RICH_HTML_ALLOWED_ATTR],
  });
}
