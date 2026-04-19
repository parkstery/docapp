/** Firestore/레거시 문서에서 시각을 밀리초 숫자로 통일 */
export function toMillis(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'object' && value !== null && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const s = (value as { seconds?: number }).seconds;
    return typeof s === 'number' ? s * 1000 : 0;
  }
  return 0;
}

/** 가장 최근 작성·수정 시각(밀리초) */
export function recencyMillis(item: Record<string, unknown>): number {
  const created = toMillis(item.createdAt);
  const updated = toMillis(item.updatedAt);
  return Math.max(created, updated);
}
