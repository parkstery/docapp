import DOMPurify from 'dompurify';

/** 프롬프트 미리보기 등: 제한된 태그만 허용해 XSS 완화 */
export function sanitizePreviewHtml(dirty: string): string {
  if (typeof window === 'undefined') return dirty;
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['br', 'img'],
    ALLOWED_ATTR: ['src', 'alt', 'class'],
  });
}
