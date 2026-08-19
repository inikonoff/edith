import { listPageFiles } from '@edith/core';
import JSZip from 'jszip';
import type { EditorFile } from '../store/editorStore';

/** Writes straight back to the file the user opened via the File System Access API (spec §11, §27). */
export async function writeFileToDisk(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Exports the main file exactly as edited — not self-contained if it has local dependencies (spec §32). */
export function exportHtml(mainFile: EditorFile): void {
  const blob = new Blob([mainFile.content], { type: 'text/html' });
  downloadBlob(mainFile.path, blob);
}

/**
 * Exports the whole Page Project as a ZIP, directory structure and all
 * (spec §33). Text files come from the live editor (so unsaved edits are
 * included); binary files (images, fonts, ...) come from storage, since the
 * editor never loads or modifies them.
 */
export async function exportZip(pageId: string, editorFiles: EditorFile[], zipName: string): Promise<void> {
  const zip = new JSZip();
  for (const file of editorFiles) {
    zip.file(file.path, file.content);
  }
  const storedFiles = await listPageFiles(pageId);
  for (const file of storedFiles) {
    if (file.kind === 'binary') {
      zip.file(file.path, file.content as Blob);
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipName, blob);
}
