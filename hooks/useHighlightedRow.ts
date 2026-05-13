import { useEffect, useRef, useState } from 'react';

/**
 * 통합 검색 등에서 특정 항목(행)으로 포커스를 이동시키기 위한 공용 훅.
 *
 * 사용법:
 *  - 컴포넌트 내부에서 `const { containerRef, isHighlighted } = useHighlightedRow(highlightId, highlightSeq);`
 *  - 목록 wrapper(스크롤 컨테이너)에 `ref={containerRef}`를 부여
 *  - 각 행에 `data-highlight-id={item.id}`와 `tabIndex={-1}`을 부여
 *  - 강조 표시는 `isHighlighted(id)` 가 true인 동안 행에 추가 클래스를 적용
 *
 * highlightId 가 바뀌면:
 *  1) 해당 data-highlight-id 요소를 컨테이너에서 찾아 scrollIntoView
 *  2) 해당 요소에 keyboard focus 부여 (가능한 경우)
 *  3) 일정 시간(기본 5초) 동안 강조 표시 활성화
 */
export function useHighlightedRow(
  highlightId?: string | null,
  highlightSeq: number = 0,
  durationMs: number = 5000
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;

    const focusRow = (): boolean => {
      const container = containerRef.current;
      if (!container || cancelled) return false;
      const target = container.querySelector<HTMLElement>(
        `[data-highlight-id="${CSS.escape(highlightId)}"]`
      );
      if (!target) return false;
      try {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        target.scrollIntoView();
      }
      try {
        const focusable = target as HTMLElement & { focus?: (opts?: FocusOptions) => void };
        focusable.focus?.({ preventScroll: true });
      } catch {
        /* focus 실패는 무시 */
      }
      return true;
    };

    setActiveId(highlightId);

    const tryFocus = () => {
      if (focusRow()) return;
      if (retryCount >= 8) return;
      retryCount += 1;
      retryTimer = setTimeout(tryFocus, 120);
    };

    tryFocus();

    timer = setTimeout(() => {
      if (!cancelled) setActiveId(null);
    }, durationMs);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [highlightId, highlightSeq, durationMs]);

  const isHighlighted = (id: string) => activeId === id;

  return { containerRef, isHighlighted };
}
