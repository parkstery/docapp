/** 파이프(|) 표 행 — 앞뒤 | 없이 중간만 있는 경우 포함 */
function isPipeTableRow(line: string): boolean {
  const t = line.trim();
  if (!t || t.startsWith('```')) return false;
  if (t.startsWith('|') && t.includes('|', 1)) return true;
  const pipes = (t.match(/\|/g) || []).length;
  return pipes >= 2;
}

function normalizePipeRow(line: string): string {
  let t = line.trim();
  if (!t.startsWith('|')) t = `| ${t}`;
  if (!t.endsWith('|')) t = `${t} |`;
  return t;
}

/** GFM 구분선 행 */
function isTableSeparatorRow(line: string): boolean {
  const t = normalizePipeRow(line);
  const inner = t.replace(/^\|/, '').replace(/\|$/, '').trim();
  return inner.split('|').every((cell) => /^:?-{3,}:?$/.test(cell.trim().replace(/\s/g, '')));
}

function countTableColumns(headerRow: string): number {
  return normalizePipeRow(headerRow)
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .length;
}

function buildSeparatorRow(columnCount: number): string {
  const cells = Array.from({ length: columnCount }, () => ' --- ');
  return `|${cells.join('|')}|`;
}

function ensureSeparatorAfterHeader(rows: string[]): string[] {
  const normalized = rows.map(normalizePipeRow);
  if (normalized.length < 2) return normalized;
  if (isTableSeparatorRow(normalized[1])) return normalized;
  const cols = countTableColumns(normalized[0]);
  if (cols < 1) return normalized;
  return [normalized[0], buildSeparatorRow(cols), ...normalized.slice(1)];
}

function tabCount(line: string): number {
  return (line.match(/\t/g) || []).length;
}

/** Cursor/Notion 붙여넣기: 탭 헤더 + A./B./C. 각 행이 N줄(열 수)인 표 */
const LETTER_ROW_START = /^[A-Z]\.\s/;

function splitHeaderCells(headerLine: string): string[] | null {
  if (tabCount(headerLine) >= 1) {
    return headerLine.split('\t').map((c) => c.trim());
  }
  const bySpaces = headerLine.trim().split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (bySpaces.length >= 2) return bySpaces;
  return null;
}

function tryBuildLetteredMultilineTable(
  lines: string[],
  headerIdx: number
): { tableLines: string[]; endIdx: number } | null {
  const headerCells = splitHeaderCells(lines[headerIdx]);
  if (!headerCells) return null;

  const colCount = headerCells.length;
  if (colCount < 2) return null;

  const rows: string[][] = [];
  let i = headerIdx + 1;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      if (rows.length > 0) {
        i += 1;
        break;
      }
      i += 1;
      continue;
    }

    if (!LETTER_ROW_START.test(trimmed) && rows.length > 0) break;
    if (!LETTER_ROW_START.test(trimmed)) {
      i += 1;
      continue;
    }

    const cells: string[] = [];
    for (let c = 0; c < colCount; c++) {
      if (i + c >= lines.length) break;
      const cellLine = lines[i + c].trim();
      if (c > 0 && LETTER_ROW_START.test(cellLine)) break;
      cells.push(cellLine);
    }

    if (cells.length !== colCount) break;
    rows.push(cells);
    i += colCount;
  }

  if (rows.length < 1) return null;

  const pipeHeader = normalizePipeRow(headerCells.join(' | '));
  const sep = buildSeparatorRow(colCount);
  const pipeRows = rows.map((r) => normalizePipeRow(r.join(' | ')));

  return {
    tableLines: ['', pipeHeader, sep, ...pipeRows, ''],
    endIdx: i,
  };
}

/** 문서 전체에서 탭 헤더 + A./B./C. 다줄 표 블록을 GFM pipe 표로 치환 */
function convertLetteredMultilineTables(source: string): string {
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const nextIsLetter =
      i + 1 < lines.length && LETTER_ROW_START.test(lines[i + 1].trim());

    if (splitHeaderCells(lines[i]) && nextIsLetter) {
      const built = tryBuildLetteredMultilineTable(lines, i);
      if (built) {
        out.push(...built.tableLines);
        i = built.endIdx;
        continue;
      }
    }
    out.push(lines[i]);
    i += 1;
  }

  return out.join('\n');
}

/** 연속 TSV 행(탭 1개 이상, 열 수 동일) → pipe 표 */
function convertTsvBlocksToPipeTables(source: string): string {
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const tc = tabCount(lines[i]);
    if (tc < 1) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const colCount = tc + 1;
    const block: string[] = [];

    while (i < lines.length) {
      const line = lines[i];
      if (tabCount(line) === tc) {
        block.push(line);
        i += 1;
        continue;
      }
      if (line.trim() === '' && i + 1 < lines.length && tabCount(lines[i + 1]) === tc) {
        i += 1;
        continue;
      }
      break;
    }

    if (block.length >= 2) {
      const pipeRows = block.map((row) =>
        normalizePipeRow(row.split('\t').map((c) => c.trim()).join(' | '))
      );
      out.push(...ensureSeparatorAfterHeader(pipeRows));
      out.push('');
    } else {
      out.push(...block);
    }
  }

  return out.join('\n');
}

/** 표 블록 앞에 빈 줄 — 이전 문단과 붙지 않게 */
function ensureBlankLineBeforeTables(source: string): string {
  const lines = source.split(/\r?\n/);
  const out: string[] = [];

  const isTableLine = (line: string) =>
    isPipeTableRow(line) || tabCount(line) >= 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      isTableLine(line) &&
      out.length > 0 &&
      out[out.length - 1].trim() !== '' &&
      !isTableLine(out[out.length - 1])
    ) {
      out.push('');
    }
    out.push(line);
  }

  return out.join('\n');
}

/**
 * 표 블록 안의 빈 줄 제거 + 구분선 보강 + pipe 행 정규화
 */
function normalizePipeTableBlocks(source: string): string {
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (!isPipeTableRow(lines[i])) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const tableLines: string[] = [];
    while (i < lines.length) {
      const line = lines[i];
      if (isPipeTableRow(line)) {
        tableLines.push(line.trimEnd());
        i += 1;
        continue;
      }
      if (line.trim() === '' && i + 1 < lines.length && isPipeTableRow(lines[i + 1])) {
        i += 1;
        continue;
      }
      break;
    }

    out.push(...ensureSeparatorAfterHeader(tableLines));
  }

  return out.join('\n');
}

/**
 * marked 파싱 전 마크다운 표 정규화 (붙여넣기 형식 통합)
 */
export function prepareMarkdownForRender(source: string): string {
  let text = source.replace(/\r\n/g, '\n');
  text = convertLetteredMultilineTables(text);
  text = convertTsvBlocksToPipeTables(text);
  text = ensureBlankLineBeforeTables(text);
  text = normalizePipeTableBlocks(text);
  return text;
}

/** @deprecated prepareMarkdownForRender 사용 */
export function normalizeMarkdownTables(source: string): string {
  return prepareMarkdownForRender(source);
}
