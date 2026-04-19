import { recencyMillis } from './itemRecency';

/** 목록 수동 순서(오름차순 = 위에서 아래). 미설정이면 작성·수정 시각으로만 정렬 */
export type ListOrderItem = {
  listSortRank?: number;
  createdAt?: number;
  updatedAt?: number;
};

function hasListSortRank(item: ListOrderItem): boolean {
  return item.listSortRank != null && !Number.isNaN(item.listSortRank as number);
}

/**
 * 탭 목록 정렬: 수동 순서가 있는 항목을 먼저(listSortRank 오름차순),
 * 순서가 없는 항목은 그 뒤에서 최근 수정·작성 순.
 */
export function compareListRows(a: ListOrderItem, b: ListOrderItem): number {
  const aHas = hasListSortRank(a);
  const bHas = hasListSortRank(b);
  if (aHas && bHas) return (a.listSortRank as number) - (b.listSortRank as number);
  if (aHas && !bHas) return -1;
  if (!aHas && bHas) return 1;
  return recencyMillis(b as Record<string, unknown>) - recencyMillis(a as Record<string, unknown>);
}

export function sortTabListItems<T extends ListOrderItem>(items: T[]): T[] {
  return [...items].sort(compareListRows);
}

/**
 * 이미 수동 순서가 한 건이라도 있으면 새 레코드를 그보다 위(더 작은 rank)로 넣는다.
 */
export function withListSortRankForCreate<T extends ListOrderItem>(existing: T[], newItem: T): T {
  const ranks = existing
    .map((i) => i.listSortRank)
    .filter((r): r is number => r != null && !Number.isNaN(r));
  if (ranks.length === 0) return newItem;
  const min = Math.min(...ranks);
  return { ...newItem, listSortRank: min - 1 };
}

/**
 * 현재 표시 순에서 한 칸 위/아래로 옮기고, 전 행에 listSortRank를 0..n-1로 재부여 후 저장한다.
 */
export async function persistListRowMove<T extends ListOrderItem & { id: string }>(
  items: T[],
  id: string,
  direction: 'up' | 'down',
  save: (row: T) => Promise<unknown>
): Promise<T[] | null> {
  try {
    const sorted = sortTabListItems([...items]);
    const i = sorted.findIndex((x) => x.id === id);
    if (i < 0) return null;
    const j = direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= sorted.length) return null;
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    const withRanks = sorted.map((row, idx) => ({ ...row, listSortRank: idx }));
    await Promise.all(withRanks.map((row) => save(row)));
    return sortTabListItems(withRanks);
  } catch (e) {
    console.error('[persistListRowMove]', e);
    alert('순서 저장에 실패했습니다.');
    return null;
  }
}

/**
 * 드래그로 한 행을 다른 행 위치로 옮긴 뒤 listSortRank를 0..n-1로 재부여하고 저장한다.
 * dropTargetId는 원본 정렬 기준에서의 목표 인덱스(toIdx)로 취급한다.
 */
export async function persistListOrderAfterDrag<T extends ListOrderItem & { id: string }>(
  items: T[],
  draggedId: string,
  dropTargetId: string,
  save: (row: T) => Promise<unknown>
): Promise<T[] | null> {
  if (draggedId === dropTargetId) return null;
  try {
    const sorted = sortTabListItems([...items]);
    const fromIdx = sorted.findIndex((x) => x.id === draggedId);
    const toIdx = sorted.findIndex((x) => x.id === dropTargetId);
    if (fromIdx < 0 || toIdx < 0) return null;
    const next = [...sorted];
    const [removed] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, removed);
    const withRanks = next.map((row, idx) => ({ ...row, listSortRank: idx }));
    await Promise.all(withRanks.map((row) => save(row)));
    return sortTabListItems(withRanks);
  } catch (e) {
    console.error('[persistListOrderAfterDrag]', e);
    alert('순서 저장에 실패했습니다.');
    return null;
  }
}
