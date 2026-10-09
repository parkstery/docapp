/**
 * 마크다운 렌더 전처리 (읽기 전용 · Notion 붙여넣기 대응)
 * 1) 한 줄 = 탭 구분 표 (Notion/Excel 복사)
 * 2) 탭 헤더 + A./B./… 다줄 표 (PG 비교표)
 * 3) 기존 | pipe | GFM 표 정리
 */

import {
  alignRowToColumns,
  escapePipeCell,
  isPipeSeparatorCells,
  isPipeSeparatorRow,
  peelPipeRow,
  splitPipeRow,
} from './markdownPipeSplit';

const LETTER_ROW = /^[A-Z]\.\s/;

function tabCount(line: string): number {
  return (line.match(/\t/g) || []).length;
}

function isPipeTableRow(line: string): boolean {
  const t = line.trim();
  if (!t || t.startsWith('```')) return false;
  if (t.startsWith('|') && t.includes('|', 1)) return true;
  return false;
}

function normalizePipeRow(line: string): string {
  let t = line.trim();
  if (!t.startsWith('|')) t = `| ${t}`;
  if (!t.endsWith('|')) t = `${t} |`;
  return t;
}

function buildSeparatorRow(n: number): string {
  return `|${Array.from({ length: n }, () => ' --- ').join('|')}|`;
}

function isSeparatorRow(line: string): boolean {
  return isPipeSeparatorRow(normalizePipeRow(line));
}

function cellsToPipeRow(cells: string[]): string {
  // trim 하면 끝의 빈 칸이 사라져 열 수가 줄고, 메모가 앞 칸에 `|`와 함께 붙는다.
  return `| ${cells.map((c) => escapePipeCell(c)).join(' | ')} |`;
}

function pipeRowsFromTsvBlock(block: string[]): string[] {
  const rows = block.map((row) =>
    row.split('\t').map((c) => c.trim().replace(/\s*←.*$/, ''))
  );
  const pipeRows = rows.map((cells) => cellsToPipeRow(cells));
  if (pipeRows.length >= 2 && !isSeparatorRow(pipeRows[1])) {
    return ['', pipeRows[0], buildSeparatorRow(rows[0].length), ...pipeRows.slice(1), ''];
  }
  return ['', ...pipeRows, ''];
}

/** Notion 붙여넣기: 매 행이 한 줄 + 탭 (처리\t내용 형태) */
function convertSingleLineTsvTables(source: string): string {
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const tc = tabCount(lines[i]);
    if (tc < 1 || /←/.test(lines[i])) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    let next = i + 1;
    while (next < lines.length && lines[next].trim() === '') next += 1;
    if (next < lines.length && LETTER_ROW.test(lines[next].trim())) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const block: string[] = [];
    let pos = i;
    while (pos < lines.length && tabCount(lines[pos]) === tc && !/←/.test(lines[pos])) {
      if (peelPipeRow(lines[pos])) break;
      if (pos > i && LETTER_ROW.test(lines[pos].trim())) break;
      block.push(lines[pos]);
      pos += 1;
    }

    if (block.length >= 2) {
      out.push(...pipeRowsFromTsvBlock(block));
      i = pos;
      continue;
    }

    out.push(lines[i]);
    i += 1;
  }

  return out.join('\n');
}

function blockHasAnnotation(lines: string[], from: number, to: number): boolean {
  for (let k = from; k < to; k++) {
    if (/←/.test(lines[k])) return true;
  }
  return false;
}

function parseTabHeader(line: string): string[] | null {
  if (tabCount(line) < 1) return null;
  return line.split('\t').map((c) => c.trim().replace(/\s*←.*$/, ''));
}

/** PG 비교: 탭 헤더 + A.~G. 각 행이 N줄 */
function convertTabLetteredPasteTables(source: string): string {
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const headerCells = parseTabHeader(lines[i]);
    if (!headerCells || headerCells.length < 2) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j += 1;
    if (j >= lines.length || !LETTER_ROW.test(lines[j].trim())) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const colCount = headerCells.length;
    const rows: string[][] = [];
    let pos = j;
    const blockStart = i;

    while (pos < lines.length) {
      const t = lines[pos].trim();
      if (t === '') {
        if (rows.length > 0) {
          pos += 1;
          break;
        }
        pos += 1;
        continue;
      }
      if (!LETTER_ROW.test(t) && rows.length > 0) break;
      if (!LETTER_ROW.test(t)) {
        pos += 1;
        continue;
      }

      const cells: string[] = [];
      for (let c = 0; c < colCount; c++) {
        if (pos + c >= lines.length) break;
        const cell = lines[pos + c].trim().replace(/\s*←.*$/, '');
        if (c > 0 && LETTER_ROW.test(cell)) break;
        cells.push(cell);
      }
      if (cells.length !== colCount) break;
      rows.push(cells);
      pos += colCount;
    }

    const isPgHeader = headerCells[0] === '방안' && colCount >= 5;
    const minRows = isPgHeader ? 2 : 3;

    if (rows.length >= minRows && !blockHasAnnotation(lines, blockStart, pos)) {
      const pipeHeader = cellsToPipeRow(headerCells);
      out.push(
        '',
        pipeHeader,
        buildSeparatorRow(colCount),
        ...rows.map((r) => cellsToPipeRow(r)),
        ''
      );
      i = pos;
      continue;
    }

    out.push(lines[i]);
    i += 1;
  }

  return out.join('\n');
}

function normalizeExistingPipeTables(source: string): string {
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (!isPipeTableRow(lines[i])) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const block: string[] = [];
    while (i < lines.length) {
      if (isPipeTableRow(lines[i])) {
        block.push(normalizePipeRow(lines[i]));
        i += 1;
        continue;
      }
      break;
    }

    const parsed = block.map((line) => splitPipeRow(line));
    const data = parsed.filter((cells, idx) => idx === 0 || !isPipeSeparatorCells(cells));
    const cols = data.reduce((max, cells) => Math.max(max, cells.length), 0);
    if (data.length >= 2 && cols >= 2) {
      const aligned = data.map((cells) => cellsToPipeRow(alignRowToColumns(cells, cols)));
      out.push('', aligned[0], buildSeparatorRow(cols), ...aligned.slice(1), '');
    } else {
      out.push('', ...block, '');
    }
  }

  return out.join('\n');
}

/** 표·제목·목록 앞뒤 빈 줄 — marked가 블록을 나누도록 */
function ensureBlockSpacing(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];

  const isBlockStarter = (line: string) => {
    const t = line.trim();
    if (!t) return false;
    return (
      isPipeTableRow(line) ||
      /^#{1,6}\s/.test(t) ||
      /^[-*+]\s/.test(t) ||
      /^\d+\.\s/.test(t) ||
      /^>\s/.test(t)
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = out.length > 0 ? out[out.length - 1] : undefined;
    if (
      line.trim() !== '' &&
      prev !== undefined &&
      prev.trim() !== '' &&
      isBlockStarter(line) &&
      !isBlockStarter(prev) &&
      !isPipeTableRow(prev)
    ) {
      out.push('');
    }
    out.push(line);
  }

  return out.join('\n');
}

/** `| 행 |\t메모` 를 파이프 표의 마지막 칸으로 옮긴다. 탭 표가 이 행을 삼키지 않게 한다. */
function detachTabNotesOnPipeLines(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  let i = 0;
  let inFence = false;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      out.push(lines[i]);
      i += 1;
      continue;
    }
    if (inFence || !peelPipeRow(lines[i])) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const block: { pipe: string; note: string; sep: boolean }[] = [];
    while (i < lines.length && !lines[i].trim().startsWith('```')) {
      const peeled = peelPipeRow(lines[i]);
      if (!peeled) break;
      block.push({
        pipe: peeled.pipe,
        note: peeled.note,
        sep: isPipeSeparatorRow(peeled.pipe),
      });
      i += 1;
    }

    const hasNote = block.some((row) => row.note);
    for (const row of block) {
      if (!hasNote) {
        out.push(row.pipe);
        continue;
      }
      const cells = splitPipeRow(row.pipe);
      cells.push(row.sep ? '---' : row.note);
      out.push(cellsToPipeRow(cells));
    }
  }

  return out.join('\n');
}

export function prepareMarkdownForRender(source: string): string {
  let text = source.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
  text = detachTabNotesOnPipeLines(text);
  text = convertSingleLineTsvTables(text);
  text = convertTabLetteredPasteTables(text);
  text = normalizeExistingPipeTables(text);
  text = ensureBlockSpacing(text);
  return text;
}

export function normalizeMarkdownTables(source: string): string {
  return prepareMarkdownForRender(source);
}
