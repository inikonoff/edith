// 3.5 MB — safe IndexedDB per-value limit on mobile browsers, with headroom
// for several Page Projects to coexist (see spec §7).
export const MAX_FILE_SIZE_BYTES = 3.5 * 1024 * 1024;

const BINARY_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'ico',
  'bmp',
  'avif',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'mp4',
  'webm',
  'mp3',
  'wav',
  'ogg',
]);

export function getFileKindFromPath(path: string): 'text' | 'binary' {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return BINARY_EXTENSIONS.has(ext) ? 'binary' : 'text';
}
