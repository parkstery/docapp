import { parseInline } from 'marked';
import type { DocumentBlock } from '../types/documentBlocks';
import { isPipeSeparatorRow, peelPipeRow, splitPipeRow } from './markdownPipeSplit';
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
    const out = parseInline(t, { async: false });
    if (typeof out === 'string' && out.trim()) return out;
  } catch {
    /* fall through */
  }
  return escapeText(t);
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

function padCells(cells: string[], width: number): string[] {
  if (cells.length >= width) return cells.slice(0, width);
  return [...cells, ...Array.from({ length: width - cells.length }, () => '')];
}

/** 탭 표에 삼켜진 `| 행 |` 칸을 다시 표로 꺼낸다. */
function expandEmbeddedPipeTable(headers: string[], rows: string[][]): DocumentBlock[] {
  const all = [headers, ...rows];
  const pipeCount = all.filter((row) => peelPipeRow(row[0] || '')).length;
  if (pipeCount < 2) return [{ type: 'table', headers, rows }];

  const blocks: DocumentBlock[] = [];
  let i = 0;

  const pushPlain = (slice: string[][]) => {
    if (slice.length === 0) return;
    if (slice.length === 1) {
      blocks.push({ type: 'table', headers: slice[0], rows: [] });
      return;
    }
    blocks.push({ type: 'table', headers: slice[0], rows: slice.slice(1) });
  };

  while (i < all.length) {
    if (!peelPipeRow(all[i][0] || '')) {
      const plain: string[][] = [];
      while (i < all.length && !peelPipeRow(all[i][0] || '')) {
        plain.push(all[i]);
        i += 1;
      }
      pushPlain(plain);
      continue;
    }

    const pipeRows: string[][] = [];
    while (i < all.length && peelPipeRow(all[i][0] || '')) {
      const peeled = peelPipeRow(all[i][0] || '');
      if (peeled && !isPipeSeparatorRow(peeled.pipe)) {
        const cells = splitPipeRow(peeled.pipe);
        const note = peeled.note || (all[i][1] || '').trim();
        if (note) cells.push(note);
        pipeRows.push(cells);
      }
      i += 1;
    }
    if (pipeRows.length >= 2) {
      const width = Math.max(...pipeRows.map((row) => row.length));
      const rect = pipeRows.map((row) => padCells(row, width));
      blocks.push({ type: 'table', headers: rect[0], rows: rect.slice(1) });
    } else if (pipeRows.length === 1) {
      blocks.push({ type: 'paragraph', text: pipeRows[0].join(' | ') });
    }
  }

  return blocks.length > 0 ? blocks : [{ type: 'table', headers, rows }];
}

/** 블록 AST → 읽기 전용 HTML (Notion-ish typography는 markdown-docapp.css) */
export function renderDocumentBlocksToHtml(blocks: DocumentBlock[]): string {
  const parts: string[] = [];
  const flat: DocumentBlock[] = [];
  for (const block of blocks) {
    if (block.type === 'table') flat.push(...expandEmbeddedPipeTable(block.headers, block.rows));
    else flat.push(block);
  }

  for (const block of flat) {
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

  const raw = parts.join('\n');
  if (!raw.trim()) return '';

  const safe = sanitizeRichHtml(raw);
  return safe.trim() ? safe : raw;
}
