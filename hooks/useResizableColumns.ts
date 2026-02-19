import { useState, useCallback, useEffect } from 'react';

const MIN_COL_WIDTH = 48;

export function useResizableColumns(
  numColumns: number,
  defaultWidths?: number[]
) {
  const [widths, setWidths] = useState<number[]>(() =>
    defaultWidths && defaultWidths.length === numColumns
      ? defaultWidths
      : Array(numColumns).fill(120)
  );
  const [resizing, setResizing] = useState<{
    index: number;
    startX: number;
    startWidths: number[];
  } | null>(null);

  const handleMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (index >= numColumns - 1) return;
      setResizing({ index, startX: e.clientX, startWidths: [...widths] });
    },
    [numColumns, widths]
  );

  useEffect(() => {
    if (resizing === null) return;
    const { index, startX, startWidths } = resizing;
    const handleMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newLeft = Math.max(MIN_COL_WIDTH, startWidths[index] + delta);
      const newRight = Math.max(
        MIN_COL_WIDTH,
        startWidths[index + 1] - delta
      );
      setWidths((prev) => {
        const next = [...prev];
        next[index] = newLeft;
        next[index + 1] = newRight;
        return next;
      });
    };
    const handleUp = () => setResizing(null);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing]);

  const getColStyle = (i: number) => ({
    width: widths[i],
    minWidth: MIN_COL_WIDTH,
  });
  const getThStyle = (i: number) => ({
    width: widths[i],
    minWidth: MIN_COL_WIDTH,
    position: 'relative' as const,
  });

  const ResizeHandle = useCallback(
    ({ columnIndex }: { columnIndex: number }) =>
      columnIndex < numColumns - 1 ? (
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={(e) => handleMouseDown(columnIndex, e)}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 8,
            cursor: 'col-resize',
            zIndex: 1,
          }}
          className="hover:bg-indigo-200/50"
        />
      ) : null,
    [numColumns, handleMouseDown]
  );

  return {
    widths,
    getColStyle,
    getThStyle,
    ResizeHandle,
  };
}
