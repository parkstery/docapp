/** 파이프(|)로 시작하는 마크다운 표 행 */
function isPipeTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && t.includes('|', 1);
}

/** GFM 구분선 행 | --- | --- | */
function isTableSeparatorRow(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith('|')) return false;
  return /^\|[\s|:\-]+\|$/.test(t.replace(/\s/g, ''));
}

function countTableColumns(headerRow: string): number {
  return headerRow.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').length;
}

function buildSeparatorRow(columnCount: number): string {
  const cells = Array.from({ length: columnCount }, () => ' --- ');
  return `|${cells.join('|')}|`;
}

/** 헤더 다음에 구분선이 없으면 삽입 */
function ensureSeparatorAfterHeader(rows: string[]): string[] {
  if (rows.length < 2) return rows;
  if (isTableSeparatorRow(rows[1])) return rows;
  const cols = countTableColumns(rows[0]);
  if (cols < 1) return rows;
  return [rows[0], buildSeparatorRow(cols), ...rows.slice(1)];
}

/**
 * 표 블록 안의 빈 줄 제거 + 구분선 보강.
 * (Notion/Cursor 붙여넣기 시 행 사이 빈 줄이 있으면 marked가 표를 끊어 <p>|...|</p>로 렌더함)
 */
export function normalizeMarkdownTables(source: string): string {
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
