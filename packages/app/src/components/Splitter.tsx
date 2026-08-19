import { useCallback, useRef } from 'react';
import styles from './Splitter.module.css';

interface SplitterProps {
  containerRef: React.RefObject<HTMLElement>;
  onDrag: (fraction: number) => void;
}

export function Splitter({ containerRef, onDrag }: SplitterProps) {
  const draggingRef = useRef(false);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const container = containerRef.current;
      if (!draggingRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const fraction = (event.clientX - rect.left) / rect.width;
      onDrag(Math.min(0.85, Math.max(0.15, fraction)));
    },
    [containerRef, onDrag],
  );

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDragging);
  }, [handlePointerMove]);

  const startDragging = useCallback(() => {
    draggingRef.current = true;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
  }, [handlePointerMove, stopDragging]);

  return (
    <div
      className={styles.splitter}
      onPointerDown={startDragging}
      role="separator"
      aria-orientation="vertical"
    />
  );
}
