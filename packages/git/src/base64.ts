export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function base64ToText(base64: string): string {
  return new TextDecoder('utf-8').decode(base64ToBytes(base64));
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  return new Blob([base64ToBytes(base64).buffer as ArrayBuffer], { type: mimeType });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
