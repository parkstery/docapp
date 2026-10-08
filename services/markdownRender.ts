import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import githubMarkdownCss from 'github-markdown-css/github-markdown.css?raw';
import markdownDocappCss from '../styles/markdown-docapp.css?raw';
import { prepareMarkdownForRender } from '../utils/markdownTableNormalize';
import {
  hasStructuredPasteBlocks,
  splitMixedDocument,
} from '../utils/mixedDocument';
import { extractChatPasteBlocksFromContent } from '../utils/chatPasteStorage';
import { sanitizeRichHtml } from '../utils/richHtmlSanitize';
import { renderDocumentBlocksToHtml } from '../utils/chatPasteHtml';
import { parseChatPaste } from '../utils/chatPasteParser';
import {
  alignRowToColumns,
  hasGfmPipeTable,
  hasPasteOnlyTable,
  isPipeSeparatorCells,
  splitPipeRow,
} from '../utils/markdownPipeSplit';

/** 미리보기·새 탭 보기 공통 루트 클래스 */
export const MARKDOWN_PREVIEW_CLASS = 'markdown-body markdown-docapp';

export type DocumentPreviewFormat = 'markdown' | 'html' | 'auto' | 'planning';

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

function sanitizeMarkdownHtml(dirty: string): string {
  if (typeof window === 'undefined') return dirty;
  return DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['target', 'rel'],
    ALLOWED_TAGS: [...MARKDOWN_ALLOWED_TAGS],
    ALLOWED_ATTR: [...MARKDOWN_ALLOWED_ATTR],
  });
}

function sanitizeRichDocumentHtml(dirty: string): string {
  return sanitizeRichHtml(dirty);
}

function wrapTablesInHtml(html: string): string {
  return html
    .replace(/<table(\s[^>]*)?>/gi, '<div class="md-table-wrap"><table$1>')
    .replace(/<\/table>/gi, '</table></div>');
}

function paragraphPipeLines(el: HTMLElement): string[] {
  const lines: string[] = [];
  let buf = '';
  const flush = () => {
    const t = buf.replace(/\u00a0/g, ' ').trim();
    buf = '';
    if (t) lines.push(t);
  };
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = (node.textContent || '').split('\n');
      parts.forEach((part, idx) => {
        if (idx > 0) flush();
        buf += part;
      });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    if (element.tagName === 'BR') {
      flush();
      return;
    }
    element.childNodes.forEach(walk);
  };
  el.childNodes.forEach(walk);
  flush();
  return lines;
}

function isPipeLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && splitPipeRow(t).length >= 2;
}

function tableFromPipeRows(rows: string[][]): HTMLTableElement {
  let header = rows[0];
  let body = rows.slice(1);
  if (body.length > 0 && isPipeSeparatorCells(body[0])) body = body.slice(1);
  const colCount = header.length;
  header = alignRowToColumns(header, colCount);
  body = body.map((row) => alignRowToColumns(row, colCount));

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const trH = document.createElement('tr');
  for (const cell of header) {
    const th = document.createElement('th');
    th.textContent = cell;
    trH.appendChild(th);
  }
  thead.appendChild(trH);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of body) {
    const tr = document.createElement('tr');
    for (const cell of row) {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

/** marked가 문단으로 남긴 파이프 행(여러 p, 또는 br로 이어진 한 p)을 HTML table로 복구 */
function repairPipeParagraphTables(html: string): string {
  if (typeof document === 'undefined' || !html.includes('|')) return html;
  const root = document.createElement('div');
  root.innerHTML = html;
  let i = 0;

  while (i < root.children.length) {
    const first = root.children[i] as HTMLElement | undefined;
    if (!first || first.tagName !== 'P') {
      i += 1;
      continue;
    }

    const ownLines = paragraphPipeLines(first);
    if (ownLines.length >= 2 && ownLines.every(isPipeLine)) {
      const table = tableFromPipeRows(ownLines.map((line) => splitPipeRow(line)));
      root.insertBefore(table, first);
      first.remove();
      i += 1;
      continue;
    }

    if (ownLines.length !== 1 || !isPipeLine(ownLines[0])) {
      i += 1;
      continue;
    }

    const rowLines = [ownLines[0]];
    let j = i + 1;
    while (j < root.children.length) {
      const next = root.children[j] as HTMLElement;
      if (next.tagName !== 'P') break;
      const nextLines = paragraphPipeLines(next);
      if (nextLines.length === 0 || !nextLines.every(isPipeLine)) break;
      rowLines.push(...nextLines);
      j += 1;
    }

    if (rowLines.length < 2) {
      i += 1;
      continue;
    }

    const table = tableFromPipeRows(rowLines.map((line) => splitPipeRow(line)));
    root.insertBefore(table, first);
    for (let k = j; k >= i + 1; k--) root.children[k].remove();
    i += 1;
  }

  return root.innerHTML;
}

/** 구분선이 있는 GFM 표는 marked로, 탭·여러 줄 표만 채팅 파서로 */
function shouldRenderWithPasteParser(source: string): boolean {
  if (hasGfmPipeTable(source)) return false;
  return hasPasteOnlyTable(source);
}

/** GFM 마크다운 → 정화된 HTML (코드 하이라이트 전) */
export function renderMarkdownToSafeHtml(source: string): string {
  if (!source?.trim()) return '';
  const normalized = prepareMarkdownForRender(source);
  const raw = marked.parse(normalized, { async: false }) as string;
  const safe = sanitizeMarkdownHtml(raw);
  return wrapTablesInHtml(repairPipeParagraphTables(safe));
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

/** 기획서 미리보기: GFM 표는 marked, 탭·여러 줄 표만 블록 파서 */
export function renderPlanningContentForDisplay(source: string): string {
  const trimmed = source?.trim() ?? '';
  if (!trimmed) return '';

  const fencedBlocks = extractChatPasteBlocksFromContent(trimmed);
  if (fencedBlocks.length > 0) {
    return renderMixedDocumentForDisplay(trimmed);
  }

  if (hasStructuredPasteBlocks(trimmed)) {
    const mixed = renderMixedDocumentForDisplay(trimmed);
    if (mixed.trim()) return mixed;
  }

  const stripped = trimmed.replace(/<!--\s*docapp:[\s\S]*?-->\s*/gi, '').trim();
  if (shouldRenderWithPasteParser(stripped)) {
    const blocks = parseChatPaste(stripped);
    if (blocks.some((b) => b.type === 'table')) {
      return applyCodeHighlightToHtml(renderDocumentBlocksToHtml(blocks));
    }
  }

  return renderMarkdownForDisplay(stripped);
}

function renderMarkdownSegment(md: string): string {
  const trimmed = md.replace(/<!--\s*docapp:[\s\S]*?-->\s*/gi, '').trim();
  if (!trimmed) return '';
  if (shouldRenderWithPasteParser(trimmed)) {
    const blocks = parseChatPaste(trimmed);
    if (blocks.some((b) => b.type === 'table')) {
      return renderDocumentBlocksToHtml(blocks);
    }
  }
  return renderMarkdownToSafeHtml(trimmed);
}

/** :::docapp-html / :::docapp-chat 블록 + Markdown 혼합 본문 */
export function renderMixedDocumentForDisplay(source: string): string {
  const segments = splitMixedDocument(source);

  const parts = segments.map((seg) => {
    if (seg.type === 'html') {
      return wrapTablesInHtml(sanitizeRichDocumentHtml(seg.body));
    }
    if (seg.type === 'chat') {
      return renderDocumentBlocksToHtml(seg.blocks);
    }
    return renderMarkdownSegment(seg.body);
  });

  const html = parts.filter((p) => p?.trim()).join('\n');
  if (html.trim()) return applyCodeHighlightToHtml(html);

  const fallbackBlocks = extractChatPasteBlocksFromContent(source);
  if (fallbackBlocks.length > 0) {
    return applyCodeHighlightToHtml(renderDocumentBlocksToHtml(fallbackBlocks));
  }

  return renderMarkdownForDisplay(
    source.replace(/<!--\s*docapp:[\s\S]*?-->\s*/gi, '').trim()
  );
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
        max-width: min(100%, 1200px);
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

  if (format === 'planning') {
    return renderPlanningContentForDisplay(trimmed);
  }

  if (hasStructuredPasteBlocks(trimmed)) {
    return renderMixedDocumentForDisplay(trimmed);
  }

  if (shouldRenderWithPasteParser(trimmed)) {
    const blocks = parseChatPaste(trimmed);
    if (blocks.some((b) => b.type === 'table')) {
      return applyCodeHighlightToHtml(renderDocumentBlocksToHtml(blocks));
    }
  }

  const resolved = resolvePreviewFormat(trimmed, format);
  if (resolved === 'html') {
    return wrapTablesInHtml(sanitizeRichDocumentHtml(trimmed));
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
