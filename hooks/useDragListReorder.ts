import { useCallback, useMemo, useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from 'react';
import type { ListOrderItem } from '../utils/listRowOrder';
import { persistListOrderAfterDrag, sortTabListItems } from '../utils/listRowOrder';

const ROW_MIME = 'application/x-docapp-row-id';

export function useDragListReorder<T extends ListOrderItem & { id: string }>(
  items: T[],
  setItems: Dispatch<SetStateAction<T[]>>,
  save: (row: T) => Promise<unknown>
) {
  const ordered = useMemo(() => sortTabListItems(items), [items]);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const dragSourceRef = useRef<string | null>(null);

  const onDragStart = useCallback((e: DragEvent, id: string) => {
    dragSourceRef.current = id;
    setDragSourceId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(ROW_MIME, id);
    try {
      e.dataTransfer.setData('text/plain', id);
    } catch {
      /* ignore */
    }
  }, []);

  const onDragEnd = useCallback(() => {
    dragSourceRef.current = null;
    setDragSourceId(null);
    setDragOverId(null);
  }, []);

  const onDragOver = useCallback((e: DragEvent, id: string) => {
    if (!dragSourceRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragSourceRef.current) setDragOverId(id);
  }, []);

  const onDrop = useCallback(
    async (e: DragEvent, targetId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const sourceId =
        dragSourceRef.current ||
        e.dataTransfer.getData(ROW_MIME) ||
        e.dataTransfer.getData('text/plain');
      dragSourceRef.current = null;
      setDragSourceId(null);
      setDragOverId(null);
      if (!sourceId || sourceId === targetId) return;
      setSavingOrder(true);
      try {
        const next = await persistListOrderAfterDrag(ordered, sourceId, targetId, save);
        if (next) setItems(next);
      } finally {
        setSavingOrder(false);
      }
    },
    [ordered, save, setItems]
  );

  const dragRowClassName = useCallback(
    (id: string) => {
      if (savingOrder) return 'opacity-60 pointer-events-none';
      if (dragSourceId === id) return 'opacity-70 ring-1 ring-dashed ring-slate-400';
      if (dragOverId === id && dragSourceId && dragSourceId !== id) return 'bg-indigo-50/70 ring-1 ring-indigo-300';
      return '';
    },
    [dragSourceId, dragOverId, savingOrder]
  );

  return {
    ordered,
    savingOrder,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    dragRowClassName,
  };
}
