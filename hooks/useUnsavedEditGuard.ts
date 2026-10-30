import { useCallback, useEffect, useRef, useState } from 'react';

export type UseUnsavedEditGuardParams = {
  active: boolean;
  editKey: string;
  buildSnapshot: () => string;
  exit: () => void;
  save: () => Promise<boolean>;
};

export function useUnsavedEditGuard({ active, editKey, buildSnapshot, exit, save }: UseUnsavedEditGuardParams) {
  const baselineRef = useRef('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savingDialog, setSavingDialog] = useState(false);
  const buildRef = useRef(buildSnapshot);
  buildRef.current = buildSnapshot;

  useEffect(() => {
    if (!active) return;

    // 부모의 이 훅은 자식(TipTap 등) 마운트·정규화보다 먼저 실행될 수 있다.
    // paint 이후와 다음 프레임들에서 기준을 다시 잡아, 무편집인데 dirty로 오인하지 않게 한다.
    let alive = true;
    const sync = () => {
      if (alive) baselineRef.current = buildRef.current();
    };

    sync();
    queueMicrotask(sync);

    const runRafChain = () => {
      requestAnimationFrame(() => {
        if (!alive) return;
        sync();
        requestAnimationFrame(() => {
          if (!alive) return;
          sync();
          requestAnimationFrame(() => {
            if (!alive) return;
            sync();
          });
        });
      });
    };
    runRafChain();

    const timeoutId = window.setTimeout(sync, 0);

    return () => {
      alive = false;
      clearTimeout(timeoutId);
    };
  }, [active, editKey]);

  const isDirty = useCallback(() => buildRef.current() !== baselineRef.current, []);

  // 상단 뒤로/앞으로처럼 "나간 뒤 이어서 할 일"이 있는 경우 (대화상자 취소 시 버림)
  const afterExitRef = useRef<(() => void) | null>(null);

  const runExit = useCallback(() => {
    exit();
    const after = afterExitRef.current;
    afterExitRef.current = null;
    after?.();
  }, [exit]);

  const requestExit = useCallback(() => {
    if (!active) return;
    afterExitRef.current = null;
    if (!isDirty()) runExit();
    else setDialogOpen(true);
  }, [active, runExit, isDirty]);

  /** 편집 화면을 나간 뒤(저장/버리기 확인 포함) after를 실행한다. 편집 중이 아니면 바로 실행. */
  const requestExitThen = useCallback((after: () => void) => {
    if (!active) {
      after();
      return;
    }
    afterExitRef.current = after;
    if (!isDirty()) runExit();
    else setDialogOpen(true);
  }, [active, runExit, isDirty]);

  const closeDialog = useCallback(() => {
    if (savingDialog) return;
    afterExitRef.current = null;
    setDialogOpen(false);
  }, [savingDialog]);

  const discardAndExit = useCallback(() => {
    setDialogOpen(false);
    runExit();
  }, [runExit]);

  const saveAndExit = useCallback(async () => {
    setSavingDialog(true);
    try {
      const ok = await save();
      if (ok) {
        setDialogOpen(false);
        runExit();
      }
    } finally {
      setSavingDialog(false);
    }
  }, [runExit, save]);

  /** 저장 직후 편집 상태와 동기화해 dirty를 해제한다(목록으로 나가지 않을 때). */
  const syncBaseline = useCallback(() => {
    requestAnimationFrame(() => {
      baselineRef.current = buildRef.current();
    });
  }, []);

  return {
    requestExit,
    requestExitThen,
    syncBaseline,
    dialogOpen,
    savingDialog,
    closeDialog,
    discardAndExit,
    saveAndExit,
  };
}
