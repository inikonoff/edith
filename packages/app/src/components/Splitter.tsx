import { useCallback, useRef } from 'react';
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

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const container = containerRef.current;
      if (!draggingRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const fraction =
        axis === 'horizontal'
          ? (event.clientX - rect.left) / rect.width
          : (event.clientY - rect.top) / rect.height;
      onDrag(Math.min(0.85, Math.max(0.15, fraction)));
    },
    [axis, containerRef, onDrag],
  );

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDragging);
  }, [handlePointerMove]);

  const startDragging = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      draggingRef.current = true;
      document.body.style.cursor = axis === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopDragging);
    },
    [axis, handlePointerMove, stopDragging],
  );

  return (
    <div
      className={axis === 'horizontal' ? styles.splitterVertical : styles.splitterHorizontal}
      onPointerDown={startDragging}
      onDoubleClick={onReset}
      role="separator"
      aria-orientation={axis === 'horizontal' ? 'vertical' : 'horizontal'}
      title="Drag to resize · double-click to reset"
    />
  );
}
