import type { Rect } from '../store/previewStore';
import styles from './SelectionOverlay.module.css';

interface SelectionOverlayProps {
  rect: Rect | null;
  iframeEl: HTMLIFrameElement | null;
  wrapEl: HTMLDivElement | null;
}

// Drawn in the parent window, never inside the iframe: it must never affect
// the page's own styles, the saved HTML, or the export (spec §23).
export function SelectionOverlay({ rect, iframeEl, wrapEl }: SelectionOverlayProps) {
  if (!rect || !iframeEl || !wrapEl) return null;

  const iframeRect = iframeEl.getBoundingClientRect();
  const wrapRect = wrapEl.getBoundingClientRect();
  const top = iframeRect.top - wrapRect.top + rect.top;
  const left = iframeRect.left - wrapRect.left + rect.left;

  return (
    <div
      className={styles.overlay}
      style={{ top, left, width: rect.width, height: rect.height }}
    />
  );
}
