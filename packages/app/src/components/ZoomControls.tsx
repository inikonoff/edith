import { MAX_ZOOM, MIN_ZOOM } from '../store/previewStore';
import { Icon } from './Icon';
import styles from './ZoomControls.module.css';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="edith-segmented" role="group" aria-label="Preview zoom">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <Icon name="minus" size={14} />
      </button>
      <button type="button" className={styles.label} onClick={onReset} title="Reset zoom to 100%">
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}
