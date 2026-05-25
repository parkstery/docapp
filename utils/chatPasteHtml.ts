import { marked } from 'marked';
import type { DocumentBlock } from '../types/documentBlocks';
import { sanitizeRichHtml } from './richHtmlSanitize';

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdownToHtml(text: string): string {
  const t = text.trim();
  if (!t) return '';
  try {
    return marked.parseInline(t, { async: false }) as string;
  } catch {
    return escapeText(t);
  }
}

function renderTable(headers: string[], rows: string[][]): string {
  const ths = headers.map((h) => `<th>${inlineMarkdownToHtml(h)}</th>`).join('');
  const trs = rows
    .map(
      (row) =>
        `<tr>${row.map((c) => `<td>${inlineMarkdownToHtml(c)}</td>`).join('')}</tr>`
    )
    .join('');
  return `<div class="md-table-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
}

/** 블록 AST → 읽기 전용 HTML (Notion-ish typography는 markdown-docapp.css) */
export function renderDocumentBlocksToHtml(blocks: DocumentBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const lvl = Math.min(6, Math.max(1, block.level));
        parts.push(`<h${lvl}>${inlineMarkdownToHtml(block.text)}</h${lvl}>`);
        break;
      }
      case 'paragraph':
        parts.push(`<p>${inlineMarkdownToHtml(block.text)}</p>`);
        break;
      case 'code': {
        const lang = block.lang ? ` class="language-${escapeText(block.lang)}"` : '';
        parts.push(
          `<pre><code${lang}>${escapeText(block.code)}</code></pre>`
        );
        break;
      }
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        const items = block.items
          .map((it) => `<li>${inlineMarkdownToHtml(it)}</li>`)
          .join('');
        parts.push(`<${tag}>${items}</${tag}>`);
        break;
      }
      case 'table':
        parts.push(renderTable(block.headers, block.rows));
        break;
      default:
        break;
    }
  }

  return sanitizeRichHtml(parts.join('\n'));
}
