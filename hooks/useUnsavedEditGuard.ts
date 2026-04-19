import { useCallback, useLayoutEffect, useRef, useState } from 'react';

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

  useLayoutEffect(() => {
    if (active) baselineRef.current = buildRef.current();
  }, [active, editKey]);

  const isDirty = useCallback(() => buildRef.current() !== baselineRef.current, []);

  const requestExit = useCallback(() => {
    if (!active) return;
    if (!isDirty()) exit();
    else setDialogOpen(true);
  }, [active, exit, isDirty]);

  const closeDialog = useCallback(() => {
    if (!savingDialog) setDialogOpen(false);
  }, [savingDialog]);

  const discardAndExit = useCallback(() => {
    setDialogOpen(false);
    exit();
  }, [exit]);

  const saveAndExit = useCallback(async () => {
    setSavingDialog(true);
    try {
      const ok = await save();
      if (ok) {
        setDialogOpen(false);
        exit();
      }
    } finally {
      setSavingDialog(false);
    }
  }, [exit, save]);

  /** 저장 직후 편집 상태와 동기화해 dirty를 해제한다(목록으로 나가지 않을 때). */
  const syncBaseline = useCallback(() => {
    requestAnimationFrame(() => {
      baselineRef.current = buildRef.current();
    });
  }, []);

  return {
    requestExit,
    syncBaseline,
    dialogOpen,
    savingDialog,
    closeDialog,
    discardAndExit,
    saveAndExit,
  };
}
