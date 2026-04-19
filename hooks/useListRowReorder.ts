import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { ListOrderItem } from '../utils/listRowOrder';
import { persistListRowMove, sortTabListItems } from '../utils/listRowOrder';

export function useListRowReorder<T extends ListOrderItem & { id: string }>(
  items: T[],
  setItems: Dispatch<SetStateAction<T[]>>,
  save: (row: T) => Promise<unknown>
) {
  const ordered = useMemo(() => sortTabListItems(items), [items]);
  const [moving, setMoving] = useState(false);

  const move = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      if (moving) return;
      setMoving(true);
      try {
        const next = await persistListRowMove(ordered, id, direction, save);
        if (next) setItems(next);
      } finally {
        setMoving(false);
      }
    },
    [moving, ordered, save, setItems]
  );

  return { ordered, move, moving };
}
