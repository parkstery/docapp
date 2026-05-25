import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import githubMarkdownCss from 'github-markdown-css/github-markdown.css?raw';
import markdownDocappCss from '../styles/markdown-docapp.css?raw';

/** 미리보기·새 탭 보기 공통 루트 클래스 */
export const MARKDOWN_PREVIEW_CLASS = 'markdown-body markdown-docapp';

export type DocumentPreviewFormat = 'markdown' | 'html' | 'auto';

marked.setOptions({
  gfm: true,
  breaks: true,
});

const MARKDOWN_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'del', 'a', 'img',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'div', 'span', 'input',
] as const;

const MARKDOWN_ALLOWED_ATTR = [
  'href', 'target', 'rel', 'src', 'alt', 'title', 'class',
  'type', 'disabled', 'checked', 'colspan', 'rowspan', 'align',
] as const;

const RICH_HTML_ALLOWED_TAGS = [
  ...MARKDOWN_ALLOWED_TAGS,
  'figure', 'figcaption', 'sup', 'sub',
] as const;

function sanitizeMarkdownHtml(dirty: string): string {
  if (typeof window === 'undefined') return dirty;
  return DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['target', 'rel'],
    ALLOWED_TAGS: [...MARKDOWN_ALLOWED_TAGS],
    ALLOWED_ATTR: [...MARKDOWN_ALLOWED_ATTR],
  });
}

function sanitizeRichDocumentHtml(dirty: string): string {
  if (typeof window === 'undefined') return dirty;
  return DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['target', 'rel'],
    ALLOWED_TAGS: [...RICH_HTML_ALLOWED_TAGS],
    ALLOWED_ATTR: [...MARKDOWN_ALLOWED_ATTR],
  });
}

/** GFM 마크다운 → 정화된 HTML (코드 하이라이트 전) */
export function renderMarkdownToSafeHtml(source: string): string {
  if (!source?.trim()) return '';
  const raw = marked.parse(source, { async: false }) as string;
  return sanitizeMarkdownHtml(raw);
}

/** 코드 하이라이트 적용 (브라우저 환경) */
export function applyCodeHighlightToHtml(html: string): string {
  if (!html || typeof document === 'undefined') return html;
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  wrap.querySelectorAll('pre code').forEach((el) => {
    hljs.highlightElement(el as HTMLElement);
  });
  return wrap.innerHTML;
}

/** 마크다운 → 표시용 HTML (GFM + sanitize + highlight) */
export function renderMarkdownForDisplay(source: string): string {
  const safe = renderMarkdownToSafeHtml(source);
  return applyCodeHighlightToHtml(safe);
}

/** 본문이 마크다운 문법을 쓰는지 (HTML 예시 문자열이 섞여 있어도 MD 우선) */
function looksLikeMarkdown(content: string): boolean {
  const t = content.trim();
  if (!t) return false;
  if (/^#{1,6}\s/m.test(t)) return true;
  if (/^\s*\|.+\|/m.test(t)) return true;
  if (/^```/m.test(t)) return true;
  if (/^\s*[-*+]\s+/m.test(t)) return true;
  if (/^\s*\d+\.\s+/m.test(t)) return true;
  if (/^>\s/m.test(t)) return true;
  return false;
}

/** TipTap 등으로 저장된 HTML 본문인지 */
function isLikelyHtmlDocument(content: string): boolean {
  const t = content.trim();
  if (!t) return false;

  if (/^<!DOCTYPE\s+html/i.test(t) || /^<html[\s>]/i.test(t)) return true;

  // 마크다운 신호가 있으면, 문서 전체가 HTML이라고 보지 않음 (코드블록·설명용 <div> 등 무시)
  if (looksLikeMarkdown(t)) return false;

  return /^(<p[\s>]|<div[\s>]|<h[1-6][\s>]|<ul[\s>]|<ol[\s>]|<table[\s>]|<blockquote[\s>])/i.test(t);
}

function resolvePreviewFormat(
  content: string,
  format: DocumentPreviewFormat
): 'markdown' | 'html' {
  if (format === 'markdown') return 'markdown';
  if (format === 'html') return 'html';
  return isLikelyHtmlDocument(content) ? 'html' : 'markdown';
}

function escapeHtmlText(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildStandalonePreviewPage(title: string, bodyHtml: string): string {
  const safeTitle = escapeHtmlText(title || '문서');
  const hljsCss =
    'pre code.hljs{display:block;overflow-x:auto;padding:1em}.hljs{background:#f6f8fa;color:#24292f}';
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>${githubMarkdownCss}\n${markdownDocappCss}\n${hljsCss}</style>
    <style>
      body { margin: 0; background: #fff; color-scheme: light; }
      .markdown-body {
        box-sizing: border-box;
        min-width: 200px;
        max-width: 900px;
        margin: 0 auto;
        padding: 32px 24px 48px;
        font-size: 15px;
      }
      @media (max-width: 767px) {
        .markdown-body { padding: 24px 16px 40px; }
      }
    </style>
  </head>
  <body>
    <article class="${MARKDOWN_PREVIEW_CLASS}">${bodyHtml}</article>
  </body>
</html>`;
}

export function renderDocumentForDisplay(
  content: string,
  format: DocumentPreviewFormat = 'auto'
): string {
  const trimmed = content?.trim() ?? '';
  if (!trimmed) return '';
  const resolved = resolvePreviewFormat(trimmed, format);
  if (resolved === 'html') {
    return sanitizeRichDocumentHtml(trimmed);
  }
  return renderMarkdownForDisplay(trimmed);
}

/**
 * 마크다운 또는 TipTap HTML 본문을 새 탭에서 미리보기.
 * 기획서는 format: 'markdown', 보고서 요약은 format: 'html' 권장.
 */
export function openDocumentPreviewInBrowser(
  content: string,
  title: string,
  options?: { format?: DocumentPreviewFormat }
): void {
  const trimmed = content?.trim() ?? '';
  if (!trimmed) {
    alert('내용이 없습니다.');
    return;
  }

  const format = options?.format ?? 'auto';
  const bodyHtml = renderDocumentForDisplay(trimmed, format);

  const page = buildStandalonePreviewPage(title || '문서', bodyHtml);
  const url = URL.createObjectURL(new Blob([page], { type: 'text/html;charset=utf-8' }));
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** @deprecated openDocumentPreviewInBrowser 사용 */
export function openMarkdownInBrowser(markdownText: string, title: string): void {
  openDocumentPreviewInBrowser(markdownText, title, { format: 'markdown' });
}
