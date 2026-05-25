import type { DocumentBlock } from '../types/documentBlocks';

const LETTER_ROW = /^[A-Z]\.\s/;
const HEADING = /^(#{1,6})\s+(.+)$/;
const BULLET = /^(\s*)([-*+•]|\d+\.)\s+(.+)$/;
const FENCE_OPEN = /^```(\w*)?\s*$/;

function isPipeTableRow(line: string): boolean {
  const t = line.trim();
  return Boolean(t && t.startsWith('|') && t.includes('|', 1));
}

function isPipeSeparatorRow(line: string): boolean {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '').trim();
  if (!inner) return false;
  return inner.split('|').every((c) => /^:?-{3,}:?$/.test(c.replace(/\s/g, '')));
}

function parsePipeCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/** GFM | col | col | 표 */
function tryParsePipeMarkdownTable(
  lines: string[],
  start: number
): { end: number; block: DocumentBlock } | null {
  if (!isPipeTableRow(lines[start])) return null;

  const blockLines: string[] = [];
  let pos = start;
  while (pos < lines.length) {
    const t = lines[pos].trim();
    if (!t) break;
    if (!isPipeTableRow(lines[pos]) && !isPipeSeparatorRow(lines[pos])) break;
    blockLines.push(lines[pos]);
    pos += 1;
  }

  const dataRows = blockLines.filter((l) => !isPipeSeparatorRow(l));
  if (dataRows.length < 2) return null;

  const headers = parsePipeCells(dataRows[0]);
  const rows = dataRows.slice(1).map(parsePipeCells);
  if (headers.length < 2) return null;

  return {
    end: pos,
    block: { type: 'table', headers, rows },
  };
}

function splitColumns(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map((c) => c.trim().replace(/\s*←.*$/, ''));
  }
  const parts = line.split(/\s{2,}/).map((c) => c.trim().replace(/\s*←.*$/, ''));
  if (parts.length >= 2) return parts.filter(Boolean);
  return [];
}

function tabCount(line: string): number {
  return (line.match(/\t/g) || []).length;
}

function isAnnotationLine(line: string): boolean {
  return /←/.test(line);
}

/** 연속 탭 행 (Notion/Excel 한 줄 = 한 행) */
function tryParseTsvTable(lines: string[], start: number): { end: number; block: DocumentBlock } | null {
  const tc = tabCount(lines[start]);
  if (tc < 1 || isAnnotationLine(lines[start])) return null;

  let next = start + 1;
  while (next < lines.length && !lines[next].trim()) next += 1;
  if (next < lines.length && LETTER_ROW.test(lines[next].trim())) return null;

  const blockLines: string[] = [];
  let pos = start;
  while (pos < lines.length && tabCount(lines[pos]) === tc && !isAnnotationLine(lines[pos])) {
    if (pos > start && LETTER_ROW.test(lines[pos].trim())) break;
    blockLines.push(lines[pos]);
    pos += 1;
  }

  if (blockLines.length < 2) return null;

  const rows = blockLines.map((row) =>
    row.split('\t').map((c) => c.trim().replace(/\s*←.*$/, ''))
  );
  const headers = rows[0];
  const body = rows.slice(1);
  if (headers.length < 2) return null;

  return {
    end: pos,
    block: { type: 'table', headers, rows: body },
  };
}

/** 탭/공백 헤더 + A./B./… 각 행이 열 수만큼 줄을 차지 (PG·채팅 드래그 표) */
function tryParseStackedLetterTable(
  lines: string[],
  start: number
): { end: number; block: DocumentBlock } | null {
  const headers = splitColumns(lines[start].trim());
  if (headers.length < 2 || isAnnotationLine(lines[start])) return null;

  let i = start + 1;
  while (i < lines.length && !lines[i].trim()) i += 1;

  const rows: string[][] = [];
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) {
      if (rows.length > 0) {
        i += 1;
        break;
      }
      i += 1;
      continue;
    }
    if (!LETTER_ROW.test(t) && rows.length > 0) break;
    if (!LETTER_ROW.test(t)) return rows.length >= 2 ? finish(rows, i, headers) : null;

    const cells: string[] = [];
    for (let c = 0; c < headers.length; c++) {
      if (i + c >= lines.length) return rows.length >= 2 ? finish(rows, i, headers) : null;
      cells.push(lines[i + c].trim().replace(/\s*←.*$/, ''));
    }
    if (cells.length !== headers.length) break;
    rows.push(cells);
    i += headers.length;
  }

  const isPg = headers[0] === '방안' && headers.length >= 5;
  const minRows = isPg ? 2 : 2;
  if (rows.length >= minRows && !blockHasAnnotation(lines, start, i)) {
    return finish(rows, i, headers);
  }
  return null;
}

function finish(
  rows: string[][],
  end: number,
  headers: string[]
): { end: number; block: DocumentBlock } {
  return { end, block: { type: 'table', headers, rows } };
}

function blockHasAnnotation(lines: string[], from: number, to: number): boolean {
  for (let k = from; k < to; k++) {
    if (isAnnotationLine(lines[k])) return true;
  }
  return false;
}

/** 열 개수가 반복되는 짧은 줄 그리드 (헤더 없이 드래그된 표) */
function tryParseImplicitGridTable(
  lines: string[],
  start: number
): { end: number; block: DocumentBlock } | null {
  const firstCols = splitColumns(lines[start].trim());
  if (firstCols.length < 2 || firstCols.length > 8) return null;
  if (LETTER_ROW.test(lines[start].trim())) return null;

  const colCount = firstCols.length;
  const allLines: string[] = [lines[start].trim()];
  let i = start + 1;

  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) {
      if (allLines.length >= colCount * 2) break;
      i += 1;
      continue;
    }
    if (HEADING.test(t) || BULLET.test(t) || FENCE_OPEN.test(t)) break;
    if (t.length > 120) break;
    if (LETTER_ROW.test(t) && allLines.length > colCount) break;
    allLines.push(t);
    i += 1;
    if (allLines.length >= colCount * 12) break;
  }

  if (allLines.length < colCount + 2) return null;

  const headers = splitColumns(allLines[0]);
  if (headers.length !== colCount) return null;

  const dataLines = allLines.slice(1);
  const rows: string[][] = [];
  for (let p = 0; p + colCount <= dataLines.length; p += colCount) {
    rows.push(dataLines.slice(p, p + colCount).map((c) => c.replace(/\s*←.*$/, '').trim()));
  }

  if (rows.length < 2) return null;
  const avgLen =
    rows.flat().join('').length / Math.max(1, rows.length * colCount);
  if (avgLen > 200) return null;

  return {
    end: i,
    block: { type: 'table', headers, rows },
  };
}

function parseCodeBlock(lines: string[], start: number): { end: number; block: DocumentBlock } {
  const open = lines[start].trim().match(FENCE_OPEN);
  const lang = open?.[1] || undefined;
  const buf: string[] = [];
  let i = start + 1;
  while (i < lines.length) {
    if (lines[i].trim() === '```') {
      return { end: i + 1, block: { type: 'code', code: buf.join('\n'), lang } };
    }
    buf.push(lines[i]);
    i += 1;
  }
  return { end: lines.length, block: { type: 'code', code: buf.join('\n'), lang } };
}

function parseListBlock(lines: string[], start: number): { end: number; block: DocumentBlock } {
  const first = lines[start].trim().match(BULLET);
  const ordered = first ? /^\d+\.$/.test(first[2]) : false;
  const items: string[] = [];
  let i = start;
  while (i < lines.length) {
    const m = lines[i].trim().match(BULLET);
    if (!m) break;
    const isOrdered = /^\d+\.$/.test(m[2]);
    if (Boolean(items.length) && isOrdered !== ordered) break;
    items.push(m[3].trim());
    i += 1;
  }
  return { end: i, block: { type: 'list', ordered, items } };
}

function collectParagraph(lines: string[], start: number): { end: number; text: string } {
  const buf: string[] = [];
  let i = start;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) break;
    if (HEADING.test(t) || BULLET.test(t) || FENCE_OPEN.test(t)) break;
    if (isPipeTableRow(t)) break;
    if (tabCount(lines[i]) >= 1) break;
    if (LETTER_ROW.test(t)) break;
    const cols = splitColumns(t);
    if (cols.length >= 2 && t.length < 100) break;
    buf.push(t);
    i += 1;
  }
  return { end: i, text: buf.join('\n') };
}

/**
 * Cursor/ChatGPT 채팅 드래그·복사 평문 → 블록 AST.
 * 과도한 추측 없이: 표(TSV·다줄·그리드), 제목, 목록, 코드, 단락.
 */
export function parseChatPaste(source: string): DocumentBlock[] {
  const text = source.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const blocks: DocumentBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    if (!lines[i].trim()) {
      i += 1;
      continue;
    }

    if (FENCE_OPEN.test(lines[i].trim())) {
      const code = parseCodeBlock(lines, i);
      blocks.push(code.block);
      i = code.end;
      continue;
    }

    const heading = lines[i].trim().match(HEADING);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    if (BULLET.test(lines[i].trim())) {
      const list = parseListBlock(lines, i);
      blocks.push(list.block);
      i = list.end;
      continue;
    }

    const pipeTable = tryParsePipeMarkdownTable(lines, i);
    if (pipeTable) {
      blocks.push(pipeTable.block);
      i = pipeTable.end;
      continue;
    }

    const stacked = tryParseStackedLetterTable(lines, i);
    if (stacked) {
      blocks.push(stacked.block);
      i = stacked.end;
      continue;
    }

    const tsv = tryParseTsvTable(lines, i);
    if (tsv) {
      blocks.push(tsv.block);
      i = tsv.end;
      continue;
    }

    const grid = tryParseImplicitGridTable(lines, i);
    if (grid) {
      blocks.push(grid.block);
      i = grid.end;
      continue;
    }

    const para = collectParagraph(lines, i);
    if (para.text.trim()) {
      blocks.push({ type: 'paragraph', text: para.text });
    }
    i = Math.max(para.end, i + 1);
  }

  return blocks;
}

function plainHasTableSignals(text: string): boolean {
  const lines = text.split('\n');
  let tabRows = 0;
  let pipeRows = 0;
  for (const line of lines) {
    if (tabCount(line) >= 1) tabRows += 1;
    if (isPipeTableRow(line)) pipeRows += 1;
    if (LETTER_ROW.test(line.trim())) return true;
  }
  return tabRows >= 2 || pipeRows >= 2;
}

/** 붙여넣기/렌더 시 채팅 평문 정규화가 의미 있는지 */
export function shouldNormalizeChatPaste(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  if (/^:::docapp-(html|chat)\b/m.test(t)) return false;

  const nonEmptyLines = t.split('\n').filter((l) => l.trim()).length;
  if (nonEmptyLines >= 2 && plainHasTableSignals(t)) return true;

  const blocks = parseChatPaste(t);
  if (!blocks.length) return false;

  const hasTable = blocks.some((b) => b.type === 'table');
  const hasStructure = blocks.some(
    (b) => b.type === 'heading' || b.type === 'code' || b.type === 'list' || b.type === 'table'
  );
  const paraCount = blocks.filter((b) => b.type === 'paragraph').length;

  if (hasTable) return true;
  if (hasStructure && paraCount >= 1) return true;
  if (nonEmptyLines >= 2 && hasStructure) return true;
  if (paraCount >= 2) return true;

  return false;
}

/** Cursor 채팅 HTML보다 평문 블록 파서를 우선할지 */
export function shouldPreferChatPasteOverClipboardHtml(plain: string, html: string): boolean {
  if (!plain.trim()) return false;
  if (!html.trim()) return shouldNormalizeChatPaste(plain);
  const lines = plain.split('\n').filter((l) => l.trim()).length;
  if (lines < 2) return false;
  if (plainHasTableSignals(plain)) return true;
  return shouldNormalizeChatPaste(plain);
}

export function chatPasteHasRecoverableStructure(text: string): boolean {
  return shouldNormalizeChatPaste(text);
}
