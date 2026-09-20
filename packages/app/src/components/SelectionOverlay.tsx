import type { Rect } from '../store/previewStore';
import styles from './SelectionOverlay.module.css';

interface SelectionOverlayProps {
  rect: Rect | null;
  iframeEl: HTMLIFrameElement | null;
}

/** Extra space around the element's box so glyphs (descenders, "ы") are not covered. */
const PAD = 4;

export function SelectionOverlay({ rect, iframeEl }: SelectionOverlayProps) {
  if (!rect || !iframeEl) return null;

  const top = iframeEl.offsetTop + rect.top - PAD;
  const left = iframeEl.offsetLeft + rect.left - PAD;

  return (
    <div
      className={styles.overlay}
      style={{ top, left, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
    />
  );
}
