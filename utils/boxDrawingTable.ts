import type { DocumentBlock } from '../types/documentBlocks';

const BOX_CHAR = /[┌┐└┘├┤┬┴┼│─]/;
const BORDER_ONLY = /^[\s┌┐└┘├┤┬┴┼│─]+$/;
const SEPARATOR_LINE = /^[\s┌┐└┘├┤┬┴┼─│]*[├┤┼┴┬┌└┘]/;

function pieces(line: string): string[] {
  const out: string[] = [];
  for (const bit of line.split('│')) {
    out.push(bit.replace(/[┌┐└┘├┤┬┴┼─]/g, ' ').replace(/\s+/g, ' ').trim());
  }
  if (out.length && out[0] === '') out.shift();
  if (out.length && out[out.length - 1] === '') out.pop();
  return out;
}

function isFragment(cell: string): boolean {
  return cell.length > 0 && cell.length <= 8 && /^[A-Za-z0-9.]+$/.test(cell);
}

function cutPathIndex(cells: string[]): number {
  for (let i = cells.length - 1; i >= 0; i--) {
    const cell = cells[i];
    if (!cell) continue;
    if ((cell.includes('/') || cell.endsWith('.')) && /[A-Za-z0-9.]$/.test(cell)) return i;
  }
  return -1;
}

/** 줄 끝에 잘린 경로 조각(`RiderLig` + `ht`)만 경로 칸에 붙인다. */
function absorbFragments(cells: string[]): string[] {
  const row = cells.slice();
  const pathAt = cutPathIndex(row);
  if (pathAt < 0) return row.filter((cell) => cell && !isFragment(cell));
  for (let i = 0; i < row.length; i++) {
    if (i !== pathAt && row[i] && isFragment(row[i])) {
      row[pathAt] += row[i];
      row[i] = '';
    }
  }
  return row.filter(Boolean);
}

function joinPiece(prev: string, next: string): string {
  if (!prev) return next;
  if (!next) return prev;
  if (/[가-힣」]$/.test(prev) && /^[가-힣「]/.test(next)) return `${prev} ${next}`;
  if (prev.endsWith('.') && /^[A-Za-z]/.test(next)) return prev + next;
  if (prev.includes('/') && next.includes('/')) return `${prev}, ${next}`;
  return prev + next;
}

function attachNote(row: string[], note: string) {
  if (isFragment(note)) {
    const at = cutPathIndex(row);
    if (at >= 0) row[at] = joinPiece(row[at], note);
    return;
  }
  if (row.length < 3) row.push(note);
  else row[row.length - 1] = joinPiece(row[row.length - 1], note);
}

/** 박스 문자로 그려진 줄들을 표와 문단으로 되돌린다. */
export function parseBoxDrawingLines(lines: string[]): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  let rows: string[][] = [];

  const flush = () => {
    if (!rows.length) return;
    const width = Math.max(...rows.map((row) => row.length));
    const norm = rows.map((row) => {
      const copy = row.slice();
      while (copy.length < width) copy.push('');
      return copy;
    });
    blocks.push({ type: 'table', headers: norm[0], rows: norm.slice(1) });
    rows = [];
  };

  for (const line of lines) {
    if (!BOX_CHAR.test(line)) {
      flush();
      if (line.trim()) blocks.push({ type: 'paragraph', text: line.trim() });
      continue;
    }
    if (BORDER_ONLY.test(line)) {
      const note = line.replace(/[┌┐└┘├┤┬┴┼│─]/g, ' ').replace(/\s+/g, ' ').trim();
      if (note && rows.length) attachNote(rows[rows.length - 1], note);
      continue;
    }

    let cells = absorbFragments(pieces(line)).filter(Boolean);
    if (!cells.length) continue;

    const separator = SEPARATOR_LINE.test(line);
    if (separator && rows.length && cells.length === 1 && !cells[0].includes('/')) {
      attachNote(rows[rows.length - 1], cells[0]);
      continue;
    }

    if (rows.length) {
      const prev = rows[rows.length - 1];
      if (
        cells[0].startsWith('」') ||
        (cells.length === 1 && /」/.test(cells[0]) && prev.some((cell) => cell.includes('「')))
      ) {
        const at = prev.findIndex((cell) => cell.includes('「'));
        if (at >= 0) prev[at] = joinPiece(prev[at], cells[0]);
        cells = cells.slice(1);
      } else if (
        cells.length === 1 &&
        cells[0].includes('/') &&
        !/[가-힣]/.test(cells[0]) &&
        cutPathIndex(prev) >= 0
      ) {
        const at = cutPathIndex(prev);
        prev[at] = joinPiece(prev[at], cells[0]);
        cells = [];
      }
    }
    if (cells.length) rows.push(cells);
  }
  flush();
  return blocks;
}

/**
 * 이미 저장된 표 칸 안의 박스 표(채팅 폭에서 잘린 것)를 다시 표로 읽는다.
 * 박스 문자가 없으면 null.
 */
export function expandBoxDrawingTable(headers: string[], rows: string[][]): DocumentBlock[] | null {
  const all = [headers, ...rows];
  if (!all.some((row) => row.some((cell) => BOX_CHAR.test(cell)))) return null;

  const blocks: DocumentBlock[] = [];
  const lines: string[] = [];

  if (headers.some((cell) => BOX_CHAR.test(cell))) {
    lines.push(...headers);
  } else {
    const cells = headers.map((cell) => cell.trim()).filter(Boolean);
    if (cells.length === 1) blocks.push({ type: 'paragraph', text: cells[0] });
    else if (cells.length >= 2 && /[,、]$/.test(cells[0])) {
      blocks.push({ type: 'paragraph', text: cells.join(' ') });
    } else if (cells.length >= 2) {
      blocks.push({ type: 'table', headers: cells, rows: [] });
    }
  }

  for (const row of rows) lines.push(...row);
  blocks.push(...parseBoxDrawingLines(lines));
  return blocks.length > 0 ? blocks : null;
}
