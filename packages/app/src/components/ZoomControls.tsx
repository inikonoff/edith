import { MAX_ZOOM, MIN_ZOOM } from '../store/previewStore';
import styles from './ZoomControls.module.css';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className={styles.group} role="group" aria-label="Preview zoom">
      <button type="button" onClick={onZoomOut} disabled={zoom <= MIN_ZOOM} title="Zoom out">
        −
      </button>
      <button type="button" className={styles.label} onClick={onReset} title="Reset zoom to 100%">
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" onClick={onZoomIn} disabled={zoom >= MAX_ZOOM} title="Zoom in">
        +
      </button>
    </div>
  );
}
