import type { PreviewDevice } from '@edith/core';

// Chrome DevTools device presets referenced by spec §19.
export const DEVICE_PRESETS: Record<PreviewDevice, { label: string; width: number; height: number }> = {
  desktop: { label: 'Desktop', width: 1440, height: 900 },
  tablet: { label: 'Tablet', width: 768, height: 1024 },
  mobile: { label: 'Mobile', width: 390, height: 844 },
};

export const DEVICE_ORDER: PreviewDevice[] = ['desktop', 'tablet', 'mobile'];
