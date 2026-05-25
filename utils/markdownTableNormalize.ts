/**
 * 마크다운 렌더 전 최소 전처리.
 * - 이미 있는 GFM pipe 표: 행 사이 빈 줄만 제거
 * - 붙여넣기 비교표: 탭 헤더 + A./B./C.… 다줄 블록만 pipe 표로 변환 (← 주석·설명 글 제외)
 */

const LETTER_ROW = /^[A-Z]\.\s/;

function tabCount(line: string): number {
  return (line.match(/\t/g) || []).length;
}

function isPipeTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|') && t.length > 2;
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
  const inner = normalizePipeRow(line).replace(/^\|/, '').replace(/\|$/, '').trim();
  return inner.split('|').every((c) => /^:?-{3,}:?$/.test(c.replace(/\s/g, '')));
}

/** 기존 | col | col | 표 블록 정리 */
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
      if (lines[i].trim() === '' && i + 1 < lines.length && isPipeTableRow(lines[i + 1])) {
        i += 1;
        continue;
      }
      break;
    }

    if (block.length >= 2 && !isSeparatorRow(block[1])) {
      const cols = block[0].replace(/^\|/, '').replace(/\|$/, '').split('|').length;
      out.push('', block[0], buildSeparatorRow(cols), ...block.slice(1), '');
    } else {
      out.push(...block);
    }
  }

  return out.join('\n');
}

function blockContainsAnnotation(lines: string[], from: number, to: number): boolean {
  for (let i = from; i < to; i++) {
    if (/←/.test(lines[i])) return true;
  }
  return false;
}

function parseTabHeader(line: string): string[] | null {
  if (tabCount(line) < 1) return null;
  return line.split('\t').map((c) => c.trim().replace(/\s*←.*$/, ''));
}

/**
 * 탭 헤더 + A./B./C.… (각 행 colCount줄) 붙여넣기 표 → GFM pipe
 * 설명용 예시(←, A·B만 2행)는 변환하지 않음
 */
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

    if (
      rows.length >= minRows &&
      !blockContainsAnnotation(lines, blockStart, pos)
    ) {
      const pipeHeader = normalizePipeRow(headerCells.join(' | '));
      out.push('', pipeHeader, buildSeparatorRow(colCount), ...rows.map((r) => normalizePipeRow(r.join(' | '))), '');
      i = pos;
      continue;
    }

    out.push(lines[i]);
    i += 1;
  }

  return out.join('\n');
}

export function prepareMarkdownForRender(source: string): string {
  let text = source.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
  text = convertTabLetteredPasteTables(text);
  text = normalizeExistingPipeTables(text);
  return text;
}

export function normalizeMarkdownTables(source: string): string {
  return prepareMarkdownForRender(source);
}
