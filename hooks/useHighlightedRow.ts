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
 *  1) 모든 부모 스크롤 컨테이너를 찾아 해당 요소가 가운데 오도록 스크롤
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
      scrollAllAncestorsIntoView(target);
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
      if (focusRow()) {
        // 첫 번째 스크롤 후, 레이아웃 변동(이미지 로딩 등)에 대비해 한 번 더 정렬
        setTimeout(() => {
          if (cancelled) return;
          const container = containerRef.current;
          if (!container) return;
          const target = container.querySelector<HTMLElement>(
            `[data-highlight-id="${CSS.escape(highlightId)}"]`
          );
          if (target) scrollAllAncestorsIntoView(target);
        }, 300);
        return;
      }
      if (retryCount >= 12) return;
      retryCount += 1;
      retryTimer = setTimeout(tryFocus, 100);
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

/** 요소의 모든 스크롤 가능한 조상 컨테이너를 찾아 반환 */
function getScrollableAncestors(el: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];
  let parent: HTMLElement | null = el.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const canScrollY =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      parent.scrollHeight > parent.clientHeight + 1;
    const canScrollX =
      (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') &&
      parent.scrollWidth > parent.clientWidth + 1;
    if (canScrollY || canScrollX) {
      result.push(parent);
    }
    parent = parent.parentElement;
  }
  return result;
}

/**
 * 대상 요소가 모든 스크롤 가능한 조상 컨테이너의 가운데에 오도록 스크롤한다.
 * `Element.scrollIntoView`가 중첩 스크롤 컨테이너에서 신뢰성 있게 동작하지 않는
 * 케이스를 보완한다.
 */
function scrollAllAncestorsIntoView(el: HTMLElement): void {
  const containers = getScrollableAncestors(el);
  // 안쪽 컨테이너부터 바깥쪽 컨테이너 순서로 스크롤한다.
  for (const container of containers) {
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const deltaY =
      elRect.top - containerRect.top - container.clientHeight / 2 + el.clientHeight / 2;
    const deltaX =
      elRect.left - containerRect.left - container.clientWidth / 2 + el.clientWidth / 2;
    try {
      container.scrollBy({ top: deltaY, left: deltaX, behavior: 'smooth' });
    } catch {
      container.scrollTop += deltaY;
      container.scrollLeft += deltaX;
    }
  }
  // 마지막으로 window 스크롤도 보장
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  } catch {
    el.scrollIntoView();
  }
}
