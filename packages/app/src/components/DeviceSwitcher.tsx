import type { PreviewDevice } from '@edith/core';
import { DEVICE_ORDER, DEVICE_PRESETS } from '../preview/devicePresets';
import styles from './DeviceSwitcher.module.css';

interface DeviceSwitcherProps {
  device: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
}

export function DeviceSwitcher({ device, onChange }: DeviceSwitcherProps) {
  return (
    <div className={styles.group} role="group" aria-label="Responsive preview size">
      {DEVICE_ORDER.map((option) => (
        <button
          key={option}
          type="button"
          className={option === device ? `${styles.button} ${styles.active}` : styles.button}
          onClick={() => onChange(option)}
        >
          {DEVICE_PRESETS[option].label}
        </button>
      ))}
    </div>
  );
}
