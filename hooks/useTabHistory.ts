import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * 프로젝트 상세 화면 안의 이동 기록(탭 + 열린 문서).
 * 상단 뒤로/앞으로 버튼이 이 기록을 따라 한 단계씩 이동한다.
 */
export type TabHistoryEntry = { tab: string; docId: string | null };

/** 각 탭 화면이 등록하는 조작 함수 */
export type TabNavController = {
  getCurrentId: () => string | null;
  open: (id: string) => void;
  /** 편집 화면을 나간 뒤(저장/버리기 확인 포함) after 실행 */
  requestExitThen: (after: () => void) => void;
};

type TabNavContextValue = {
  register: (tab: string, controller: TabNavController) => () => void;
  report: (tab: string, docId: string | null) => void;
  openFailed: (tab: string, docId: string) => void;
};

export const TabNavContext = createContext<TabNavContextValue | null>(null);

const MAX_ENTRIES = 100;

/** AppDetail 에서 사용: 기록 관리 + 뒤로/앞으로 */
export function useTabHistory<T extends string>(initialTab: T, onLeaveProject: () => void) {
  const [activeTab, setActiveTabState] = useState<T>(initialTab);
  const activeTabRef = useRef<string>(initialTab);
  const historyRef = useRef<{ entries: TabHistoryEntry[]; index: number }>({
    entries: [{ tab: initialTab, docId: null }],
    index: 0,
  });
  const [, setVersion] = useState(0);
  const controllersRef = useRef(new Map<string, TabNavController>());
  // 기록을 따라 이동 중일 때 열어야 할 문서 (도착 전 보고는 무시)
  const pendingOpenRef = useRef<TabHistoryEntry | null>(null);

  const rerender = () => setVersion((v) => v + 1);

  const setActiveTab = useCallback((tab: T) => {
    activeTabRef.current = tab;
    setActiveTabState(tab);
  }, []);

  const push = useCallback((entry: TabHistoryEntry) => {
    const h = historyRef.current;
    const entries = [...h.entries.slice(0, h.index + 1), entry].slice(-MAX_ENTRIES);
    historyRef.current = { entries, index: entries.length - 1 };
    rerender();
  }, []);

  /** 현재 탭 화면의 편집을 정리(확인 대화상자 포함)한 뒤 next 실행 */
  const leaveCurrent = useCallback((next: () => void) => {
    const controller = controllersRef.current.get(activeTabRef.current);
    if (controller && controller.getCurrentId()) controller.requestExitThen(next);
    else next();
  }, []);

  const applyEntry = useCallback((index: number) => {
    const target = historyRef.current.entries[index];
    historyRef.current = { ...historyRef.current, index };
    pendingOpenRef.current = target.docId ? target : null;
    if (target.tab !== activeTabRef.current) {
      // 새 탭 화면이 마운트되며 register 할 때 pending 문서를 연다
      setActiveTab(target.tab as T);
    } else if (target.docId) {
      controllersRef.current.get(target.tab)?.open(target.docId);
    }
    rerender();
  }, [setActiveTab]);

  const goBack = useCallback(() => {
    const { index } = historyRef.current;
    if (index === 0) {
      leaveCurrent(onLeaveProject);
      return;
    }
    leaveCurrent(() => applyEntry(index - 1));
  }, [applyEntry, leaveCurrent, onLeaveProject]);

  const goForward = useCallback(() => {
    const { index, entries } = historyRef.current;
    if (index >= entries.length - 1) return;
    leaveCurrent(() => applyEntry(index + 1));
  }, [applyEntry, leaveCurrent]);

  /** 사이드바·탭바·검색에서 탭 이동 (then: 이동이 끝난 뒤 실행) */
  const goTab = useCallback((tab: T, then?: () => void) => {
    if (tab === activeTabRef.current) {
      then?.();
      return;
    }
    leaveCurrent(() => {
      pendingOpenRef.current = null;
      setActiveTab(tab);
      push({ tab, docId: null });
      then?.();
    });
  }, [leaveCurrent, push, setActiveTab]);

  const contextValue = useMemo<TabNavContextValue>(() => ({
    register: (tab, controller) => {
      controllersRef.current.set(tab, controller);
      const pending = pendingOpenRef.current;
      if (pending && pending.tab === tab && pending.docId) controller.open(pending.docId);
      return () => {
        if (controllersRef.current.get(tab) === controller) controllersRef.current.delete(tab);
      };
    },
    report: (tab, docId) => {
      if (tab !== activeTabRef.current) return;
      const pending = pendingOpenRef.current;
      if (pending && pending.tab === tab) {
        if (pending.docId === docId) pendingOpenRef.current = null;
        return;
      }
      const h = historyRef.current;
      const current = h.entries[h.index];
      if (current.tab === tab && current.docId === docId) return;
      push({ tab, docId });
    },
    openFailed: (tab, docId) => {
      const pending = pendingOpenRef.current;
      if (!pending || pending.tab !== tab || pending.docId !== docId) return;
      // 삭제됐거나 저장되지 않은 새 글 → 목록으로 대체
      pendingOpenRef.current = null;
      const h = historyRef.current;
      const entries = [...h.entries];
      entries[h.index] = { tab, docId: null };
      historyRef.current = { entries, index: h.index };
      rerender();
    },
  }), [push]);

  const { index, entries } = historyRef.current;
  return {
    activeTab,
    goTab,
    goBack,
    goForward,
    canGoForward: index < entries.length - 1,
    contextValue,
  };
}

type UseTabNavigationParams<T extends { id: string }> = {
  tab: string;
  items: T[];
  loading: boolean;
  currentId: string | null;
  select: (item: T) => void;
  requestExitThen: (after: () => void) => void;
};

/** 각 탭 화면에서 사용: 열린 문서를 기록에 알리고, 기록 이동 시 문서를 연다 */
export function useTabNavigation<T extends { id: string }>(params: UseTabNavigationParams<T>) {
  const nav = useContext(TabNavContext);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const pendingIdRef = useRef<string | null>(null);
  const loadedRef = useRef(false);
  const wasLoadingRef = useRef(false);

  const resolvePending = useCallback(() => {
    const id = pendingIdRef.current;
    if (!id) return;
    const { items, select, tab } = paramsRef.current;
    const found = items.find((item) => item.id === id);
    if (found) {
      pendingIdRef.current = null;
      if (paramsRef.current.currentId !== id) select(found);
      return;
    }
    if (loadedRef.current) {
      pendingIdRef.current = null;
      nav?.openFailed(tab, id);
    }
  }, [nav]);

  useEffect(() => {
    if (!nav) return;
    return nav.register(params.tab, {
      getCurrentId: () => paramsRef.current.currentId,
      open: (id) => {
        pendingIdRef.current = id;
        resolvePending();
      },
      requestExitThen: (after) => paramsRef.current.requestExitThen(after),
    });
  }, [nav, params.tab, resolvePending]);

  // 목록 로딩이 한 번 끝난 뒤에야 "없는 문서"로 판단한다
  useEffect(() => {
    if (wasLoadingRef.current && !params.loading) loadedRef.current = true;
    wasLoadingRef.current = params.loading;
    resolvePending();
  }, [params.items, params.loading, resolvePending]);

  useEffect(() => {
    nav?.report(params.tab, params.currentId);
  }, [nav, params.tab, params.currentId]);
}
