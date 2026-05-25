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

/** Cursor/Notion: A. ~ G. 로 시작하는 표 데이터 행 */
const LETTER_ROW_START = /^[A-Z]\.\s/;

const PG_COMPARE_HEADER =
  /^방안\s+국내\s*법인\s+사업자\s+BOXCYCLE\s*적합\s+비고\s*$/i;

function splitHeaderCells(headerLine: string): string[] | null {
  const t = headerLine.trim();
  if (tabCount(t) >= 1) {
    const parts = t.split('\t').map((c) => c.trim());
    if (parts.length >= 2) return parts;
  }
  const bySpaces = t.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (bySpaces.length >= 2) return bySpaces;
  if (PG_COMPARE_HEADER.test(t)) {
    return ['방안', '국내 법인', '사업자', 'BOXCYCLE 적합', '비고'];
  }
  return null;
}

function lineFollowedByLetterRow(lines: string[], idx: number): boolean {
  let j = idx + 1;
  while (j < lines.length && lines[j].trim() === '') j += 1;
  return j < lines.length && LETTER_ROW_START.test(lines[j].trim());
}

function firstLetterRowIndex(lines: string[], from: number): number {
  let j = from;
  while (j < lines.length && lines[j].trim() === '') j += 1;
  if (j < lines.length && LETTER_ROW_START.test(lines[j].trim())) return j;
  return -1;
}

/** 연속 A./B./C. 행 사이 간격 = 열 수 */
function inferColCountFromLetterRows(lines: string[], startIdx: number): number | null {
  const idxs: number[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    if (LETTER_ROW_START.test(lines[i].trim())) idxs.push(i);
    if (idxs.length >= 3) break;
  }
  if (idxs.length < 2) return null;
  const gap = idxs[1] - idxs[0];
  if (gap < 2) return null;
  for (let k = 2; k < idxs.length; k++) {
    if (idxs[k] - idxs[k - 1] !== gap) return null;
  }
  return gap;
}

function resolveHeaderCells(headerLine: string, colCount: number): string[] {
  const split = splitHeaderCells(headerLine);
  if (split && split.length === colCount) return split;
  if (tabCount(headerLine) >= 1) {
    const parts = headerLine.split('\t').map((c) => c.trim());
    if (parts.length === colCount) return parts;
  }
  const bySpaces = headerLine.trim().split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (bySpaces.length === colCount) return bySpaces;
  if (colCount === 5 && PG_COMPARE_HEADER.test(headerLine.trim())) {
    return ['방안', '국내 법인', '사업자', 'BOXCYCLE 적합', '비고'];
  }
  return Array.from({ length: colCount }, (_, i) =>
    i === 0 ? headerLine.trim() || '항목' : `열 ${i + 1}`
  );
}

function tryBuildLetteredMultilineTable(
  lines: string[],
  headerIdx: number
): { tableLines: string[]; endIdx: number } | null {
  if (LETTER_ROW_START.test(lines[headerIdx]?.trim() ?? '')) return null;

  const letterStart = firstLetterRowIndex(lines, headerIdx + 1);
  if (letterStart < 0) return null;

  const inferredCols = inferColCountFromLetterRows(lines, letterStart);
  const headerCells = splitHeaderCells(lines[headerIdx]);
  let colCount = headerCells?.length ?? 0;

  if (inferredCols && (colCount < 2 || colCount !== inferredCols)) {
    colCount = inferredCols;
  }
  if (colCount < 2 && inferredCols) colCount = inferredCols;
  if (colCount < 2) return null;

  const headers = resolveHeaderCells(lines[headerIdx], colCount);
  const rows: string[][] = [];
  let i = letterStart;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

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

  const pipeHeader = normalizePipeRow(headers.join(' | '));
  const sep = buildSeparatorRow(colCount);
  const pipeRows = rows.map((r) => normalizePipeRow(r.join(' | ')));

  return {
    tableLines: ['', pipeHeader, sep, ...pipeRows, ''],
    endIdx: i,
  };
}

/** 탭/공백 헤더 + A./B./… 다줄 표 → GFM pipe 표 */
function convertLetteredMultilineTables(source: string): string {
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lineFollowedByLetterRow(lines, i)) {
      const built = tryBuildLetteredMultilineTable(lines, i);
      if (built) {
        out.push(...built.tableLines);
        i = built.endIdx;
        continue;
      }
    }

    if (LETTER_ROW_START.test(lines[i].trim())) {
      let h = i - 1;
      while (h >= 0 && lines[h].trim() === '') h -= 1;
      if (h >= 0) {
        const built = tryBuildLetteredMultilineTable(lines, h);
        if (built && built.endIdx > i) {
          out.push(...built.tableLines);
          i = built.endIdx;
          continue;
        }
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

/** 표 블록 안의 빈 줄 제거 + 구분선 보강 */
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
  let text = source
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n');
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
