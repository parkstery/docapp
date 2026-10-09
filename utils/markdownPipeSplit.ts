const SEPARATOR_CELL = /^:?-{3,}:?$/;
const LETTER_ROW = /^[A-Z]\.\s/;

/**
 * GFM 표 행을 셀로 나눈다.
 * 인라인 코드 안의 `|`와 이스케이프된 `\|`는 열 경계로 세지 않는다.
 */
export function splitPipeRow(line: string): string[] {
  const s = line.trim();
  if (!s.includes('|')) return s ? [s] : [];

  const cells: string[] = [];
  let buf = '';
  let i = s.startsWith('|') ? 1 : 0;
  let codeTicks = 0;

  while (i < s.length) {
    const ch = s[i];
    if (codeTicks === 0 && ch === '\\' && s[i + 1] === '|') {
      buf += '|';
      i += 2;
      continue;
    }
    if (ch === '`') {
      let n = 0;
      while (i + n < s.length && s[i + n] === '`') n += 1;
      if (codeTicks === 0) codeTicks = n;
      else if (n === codeTicks) codeTicks = 0;
      buf += '`'.repeat(n);
      i += n;
      continue;
    }
    if (ch === '|' && codeTicks === 0) {
      cells.push(buf.trim());
      buf = '';
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }

  const endedWithPipe = s.endsWith('|') && codeTicks === 0;
  if (!(endedWithPipe && buf.trim() === '')) {
    cells.push(buf.trim());
  }
  return cells;
}

export function isPipeSeparatorCells(cells: string[]): boolean {
  return cells.length >= 2 && cells.every((c) => SEPARATOR_CELL.test(c.replace(/\s/g, '')));
}

export function isPipeSeparatorRow(line: string): boolean {
  return isPipeSeparatorCells(splitPipeRow(line));
}

/** 짧은 행은 빈 칸으로 맞추고, 넘친 칸은 마지막 셀에 다시 붙인다. */
export function alignRowToColumns(cells: string[], colCount: number): string[] {
  if (colCount < 1) return cells;
  if (cells.length === colCount) return cells;
  if (cells.length < colCount) {
    return [...cells, ...Array.from({ length: colCount - cells.length }, () => '')];
  }
  const head = cells.slice(0, colCount - 1);
  const tail = cells.slice(colCount - 1).join(' | ');
  return [...head, tail];
}

/** 코드 스팬 밖의 `|`만 이스케이프한다. */
export function escapePipeCell(cell: string): string {
  let out = '';
  let i = 0;
  let codeTicks = 0;
  while (i < cell.length) {
    if (cell[i] === '`') {
      let n = 0;
      while (i + n < cell.length && cell[i + n] === '`') n += 1;
      if (codeTicks === 0) codeTicks = n;
      else if (n === codeTicks) codeTicks = 0;
      out += '`'.repeat(n);
      i += n;
      continue;
    }
    if (cell[i] === '|' && codeTicks === 0) {
      out += '\\|';
      i += 1;
      continue;
    }
    out += cell[i];
    i += 1;
  }
  return out;
}

/**
 * `| a | b |\t메모` 처럼 오른쪽에 탭 메모가 붙은 파이프 행을 분리한다.
 * 탭이 없으면 note 는 빈 문자열이다.
 */
export function peelPipeRow(line: string): { pipe: string; note: string } | null {
  const tab = line.indexOf('\t');
  const pipe = (tab >= 0 ? line.slice(0, tab) : line).trim();
  if (!pipe.startsWith('|') || !pipe.includes('|', 1)) return null;
  const note =
    tab >= 0
      ? line
          .slice(tab + 1)
          .split('\t')
          .map((s) => s.trim().replace(/\s*←.*$/, ''))
          .filter(Boolean)
          .join(' ')
      : '';
  return { pipe, note };
}

function fenceState(line: string, inFence: boolean): boolean {
  return line.trim().startsWith('```') ? !inFence : inFence;
}

/** 헤더 바로 다음 줄이 구분선인 GFM 표가 있는지 */
export function hasGfmPipeTable(source: string): boolean {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length - 1; i++) {
    const t = lines[i].trim();
    const nextFence = fenceState(t, inFence);
    if (t.startsWith('```')) {
      inFence = nextFence;
      continue;
    }
    if (inFence) continue;
    const header = peelPipeRow(t);
    const separator = peelPipeRow(lines[i + 1] ?? '');
    if (!header || isPipeSeparatorRow(header.pipe)) continue;
    if (separator && isPipeSeparatorRow(separator.pipe)) return true;
  }
  return false;
}

/** marked가 그대로 읽지 못하는 탭 표, 또는 A./B. 여러 줄 표 */
export function hasPasteOnlyTable(source: string): boolean {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let inFence = false;
  let tabLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    if (t.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if ((raw.match(/\t/g) || []).length >= 1) tabLines += 1;
    if (!LETTER_ROW.test(t)) continue;

    for (let k = i - 1; k >= 0 && k >= i - 6; k--) {
      const prev = lines[k];
      if (!prev.trim()) continue;
      if ((prev.match(/\t/g) || []).length >= 1) return true;
      if (prev.trim().split(/\s{2,}/).filter(Boolean).length >= 2) return true;
      break;
    }
  }

  return tabLines >= 2;
}
