import type { Rect } from '../store/previewStore';
import styles from './SelectionOverlay.module.css';

interface SelectionOverlayProps {
  rect: Rect | null;
  iframeEl: HTMLIFrameElement | null;
}

// Drawn in the parent window, never inside the iframe: it must never affect
// the page's own styles, the saved HTML, or the export (spec §23). It's a
// sibling of the iframe inside .frameWrap, so the zoom transform on that
// ancestor scales this overlay in sync automatically — as long as its own
// position stays in .frameWrap's local (untransformed) coordinate space.
// offsetTop/offsetLeft give exactly that (unlike getBoundingClientRect,
// which reports post-transform screen coordinates and would double-scale).
export function SelectionOverlay({ rect, iframeEl }: SelectionOverlayProps) {
  if (!rect || !iframeEl) return null;

  const top = iframeEl.offsetTop + rect.top;
  const left = iframeEl.offsetLeft + rect.left;

  return (
    <div
      className={styles.overlay}
      style={{ top, left, width: rect.width, height: rect.height }}
    />
  );
}
