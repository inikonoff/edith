import type { PreviewDevice } from '@edith/core';
import { DEVICE_ORDER, DEVICE_PRESETS } from '../preview/devicePresets';

interface DeviceSwitcherProps {
  device: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
}

export function DeviceSwitcher({ device, onChange }: DeviceSwitcherProps) {
  return (
    <div className="edith-segmented" role="group" aria-label="Responsive preview size">
      {DEVICE_ORDER.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === device}
          title={`${DEVICE_PRESETS[option].width}×${DEVICE_PRESETS[option].height}`}
          onClick={() => onChange(option)}
        >
          {DEVICE_PRESETS[option].label}
        </button>
      ))}
    </div>
  );
}
