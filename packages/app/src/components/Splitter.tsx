import { useCallback, useRef, useState } from 'react';
import type { SplitAxis } from '../store/editorStore';
import styles from './Splitter.module.css';

interface SplitterProps {
  axis: SplitAxis;
  containerRef: React.RefObject<HTMLElement>;
  onDrag: (fraction: number) => void;
  onReset?: () => void;
}

export function Splitter({ axis, containerRef, onDrag, onReset }: SplitterProps) {
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const applyFraction = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const fraction =
        axis === 'horizontal'
          ? (clientX - rect.left) / rect.width
          : (clientY - rect.top) / rect.height;
      if (!Number.isFinite(fraction)) return;
      onDrag(Math.min(0.85, Math.max(0.15, fraction)));
    },
    [axis, containerRef, onDrag],
  );

  const stopDragging = useCallback((event?: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
    if (event) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
    }
  }, []);

  const startDragging = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      draggingRef.current = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.cursor = axis === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      applyFraction(event.clientX, event.clientY);
    },
    [axis, applyFraction],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      applyFraction(event.clientX, event.clientY);
    },
    [applyFraction],
  );

  return (
    <div
      className={`${axis === 'horizontal' ? styles.splitterVertical : styles.splitterHorizontal} ${
        dragging ? styles.isDragging : ''
      }`}
      onPointerDown={startDragging}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onLostPointerCapture={() => stopDragging()}
      onDoubleClick={onReset}
      role="separator"
      aria-orientation={axis === 'horizontal' ? 'vertical' : 'horizontal'}
      title="Drag to resize · double-click to reset"
    />
  );
}
