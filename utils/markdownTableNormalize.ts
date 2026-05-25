/** 붙여넣기 예시·주석(←) 등은 표로 변환하지 않음 */
const ANNOTATION_MARK = /←|표가 아닙니다|이건 한 행|위 예시는|처리$/;

/** 실제 데이터 표로 볼 최소 A./B./C. 행 개수 */
const MIN_LETTER_DATA_ROWS = 3;

/** 파이프(|) 표 행 — 문장 속 | 단계 | 는 제외 */
function isPipeTableRow(line: string): boolean {
  const t = line.trim();
  if (!t || t.startsWith('```')) return false;
  if (ANNOTATION_MARK.test(t)) return false;
  if (!t.startsWith('|')) return false;
  if (!t.includes('|', 1)) return false;
  const inner = t.replace(/^\|/, '').replace(/\|$/, '').trim();
  if (/^:?-{3,}:?$/.test(inner.replace(/\s/g, ''))) return true;
  const cells = inner.split('|').map((c) => c.trim());
  if (cells.length < 2) return false;
  if (cells.some((c) => c.length > 120)) return false;
  return true;
}

function normalizePipeRow(line: string): string {
  let t = line.trim();
  if (!t.startsWith('|')) t = `| ${t}`;
  if (!t.endsWith('|')) t = `${t} |`;
  return t;
}

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

const LETTER_ROW_START = /^[A-Z]\.\s/;

const PG_COMPARE_HEADER =
  /^방안\s+국내\s*법인\s+사업자\s+BOXCYCLE\s*적합\s+비고\s*$/i;

const STAGE_COMPARE_HEADER =
  /^단계\s+수준\s+Cursor\/Notion\s+대비\s*$/i;

function isLikelyRealTableHeader(headerLine: string): boolean {
  const t = headerLine.trim();
  if (ANNOTATION_MARK.test(t)) return false;
  if (/\|/.test(t) && !t.startsWith('|')) return false;
  if (/GFM|파서|prepareMarkdown/i.test(t)) return false;
  if (tabCount(t) >= 1) return true;
  if (PG_COMPARE_HEADER.test(t) || STAGE_COMPARE_HEADER.test(t)) return true;
  return false;
}

function splitHeaderCells(headerLine: string): string[] | null {
  const t = headerLine.trim();
  if (!isLikelyRealTableHeader(t)) return null;
  if (tabCount(t) >= 1) {
    const parts = t.split('\t').map((c) => c.trim().replace(/\s*←.*$/, ''));
    if (parts.length >= 2) return parts;
  }
  if (PG_COMPARE_HEADER.test(t)) {
    return ['방안', '국내 법인', '사업자', 'BOXCYCLE 적합', '비고'];
  }
  if (STAGE_COMPARE_HEADER.test(t)) {
    return ['단계', '수준', 'Cursor/Notion 대비'];
  }
  const bySpaces = t.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (bySpaces.length >= 2 && !ANNOTATION_MARK.test(t)) return bySpaces;
  return null;
}

function lineFollowedByLetterRow(lines: string[], idx: number): boolean {
  if (!isLikelyRealTableHeader(lines[idx])) return false;
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

function inferColCountFromLetterRows(lines: string[], startIdx: number): number | null {
  const idxs: number[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    if (LETTER_ROW_START.test(lines[i].trim())) idxs.push(i);
    if (idxs.length >= 4) break;
  }
  if (idxs.length < MIN_LETTER_DATA_ROWS) return null;
  const gap = idxs[1] - idxs[0];
  if (gap < 2) return null;
  for (let k = 2; k < idxs.length; k++) {
    if (idxs[k] - idxs[k - 1] !== gap) return null;
  }
  return gap;
}

function resolveHeaderCells(headerLine: string, colCount: number): string[] | null {
  const split = splitHeaderCells(headerLine);
  if (split && split.length === colCount) return split;
  if (tabCount(headerLine) >= 1) {
    const parts = headerLine
      .split('\t')
      .map((c) => c.trim().replace(/\s*←.*$/, ''));
    if (parts.length === colCount) return parts;
  }
  if (colCount === 5 && PG_COMPARE_HEADER.test(headerLine.trim())) {
    return ['방안', '국내 법인', '사업자', 'BOXCYCLE 적합', '비고'];
  }
  if (colCount === 3 && STAGE_COMPARE_HEADER.test(headerLine.trim())) {
    return ['단계', '수준', 'Cursor/Notion 대비'];
  }
  return null;
}

function rowHasAnnotation(cells: string[]): boolean {
  return cells.some((c) => ANNOTATION_MARK.test(c) || /←/.test(c));
}

function tryBuildLetteredMultilineTable(
  lines: string[],
  headerIdx: number
): { tableLines: string[]; endIdx: number } | null {
  if (LETTER_ROW_START.test(lines[headerIdx]?.trim() ?? '')) return null;
  if (!isLikelyRealTableHeader(lines[headerIdx])) return null;

  const letterStart = firstLetterRowIndex(lines, headerIdx + 1);
  if (letterStart < 0) return null;

  const inferredCols = inferColCountFromLetterRows(lines, letterStart);
  if (!inferredCols) return null;

  const headerCells = splitHeaderCells(lines[headerIdx]);
  let colCount = headerCells?.length ?? 0;
  if (colCount >= 2 && colCount !== inferredCols) return null;
  colCount = inferredCols;

  const headers = resolveHeaderCells(lines[headerIdx], colCount);
  if (!headers) return null;

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
      const cellLine = lines[i + c].trim().replace(/\s*←.*$/, '');
      if (c > 0 && LETTER_ROW_START.test(cellLine)) break;
      cells.push(cellLine);
    }

    if (cells.length !== colCount) break;
    if (rowHasAnnotation(cells)) return null;
    rows.push(cells);
    i += colCount;
  }

  if (rows.length < MIN_LETTER_DATA_ROWS) return null;

  const pipeHeader = normalizePipeRow(headers.join(' | '));
  const sep = buildSeparatorRow(colCount);
  const pipeRows = rows.map((r) => normalizePipeRow(r.join(' | ')));

  return {
    tableLines: ['', pipeHeader, sep, ...pipeRows, ''],
    endIdx: i,
  };
}

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

    out.push(lines[i]);
    i += 1;
  }

  return out.join('\n');
}

function isValidTsvDataRow(line: string, expectedTabs: number): boolean {
  if (tabCount(line) !== expectedTabs) return false;
  if (ANNOTATION_MARK.test(line)) return false;
  const cells = line.split('\t').map((c) => c.trim());
  if (cells.some((c) => c === '`' || c === '|' || c.length === 0)) return false;
  if (cells.some((c) => /^`+$/.test(c))) return false;
  return true;
}

/** 연속 TSV — 실제 2열 이상 데이터 표만 (형식/처리 요약표 포함) */
function convertTsvBlocksToPipeTables(source: string): string {
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const tc = tabCount(lines[i]);
    if (tc < 1 || !isValidTsvDataRow(lines[i], tc)) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const block: string[] = [];

    while (i < lines.length) {
      const line = lines[i];
      if (isValidTsvDataRow(line, tc)) {
        block.push(line);
        i += 1;
        continue;
      }
      if (
        line.trim() === '' &&
        i + 1 < lines.length &&
        isValidTsvDataRow(lines[i + 1], tc)
      ) {
        i += 1;
        continue;
      }
      break;
    }

    if (block.length >= 2 && !block.some((l) => ANNOTATION_MARK.test(l))) {
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

function ensureBlankLineBeforeTables(source: string): string {
  const lines = source.split(/\r?\n/);
  const out: string[] = [];

  const isTableLine = (line: string) => isPipeTableRow(line);

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
 * 표가 아닌 본문: 줄바꿈 유지 (marked breaks용 — 단일 \n → <br>)
 * 코드블록·pipe 표 줄은 제외
 */
function preserveSingleLineBreaksInProse(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      out.push(line);
      continue;
    }

    if (!inFence && trimmed !== '' && i + 1 < lines.length) {
      const nextTrim = lines[i + 1].trim();
      const nextIsPipe = isPipeTableRow(lines[i + 1]);
      const curIsPipe = isPipeTableRow(line);
      if (
        nextTrim !== '' &&
        !inFence &&
        !curIsPipe &&
        !nextIsPipe &&
        tabCount(line) < 1 &&
        tabCount(lines[i + 1]) < 1 &&
        !line.endsWith('  ')
      ) {
        line = `${line}  `;
      }
    }

    out.push(line);
  }

  return out.join('\n');
}

export function prepareMarkdownForRender(source: string): string {
  let text = source.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
  text = convertLetteredMultilineTables(text);
  text = convertTsvBlocksToPipeTables(text);
  text = ensureBlankLineBeforeTables(text);
  text = normalizePipeTableBlocks(text);
  text = preserveSingleLineBreaksInProse(text);
  return text;
}

export function normalizeMarkdownTables(source: string): string {
  return prepareMarkdownForRender(source);
}
