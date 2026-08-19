import {
  computeContentHash,
  FileTooLargeError,
  getPage,
  listPageFiles,
  putPage,
  putPageFile,
  type FileKind,
  type PageRecord,
} from '@edith/core';
import { languageForPath } from '../editor/language';
import type { EditorFile } from '../store/editorStore';

export interface DependencyFileInput {
  path: string;
  kind: FileKind;
  mimeType: string;
  content: string | Blob;
}

export interface ImportFailure {
  path: string;
  message: string;
}

export interface ImportResult {
  page: PageRecord;
  failedFiles: ImportFailure[];
}

function titleFromHtml(html: string): string | undefined {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  const title = match?.[1]?.trim();
  return title || undefined;
}

function fileNameOf(path: string): string {
  return path.includes('/') ? (path.split('/').pop() ?? path) : path;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

/** Fallback for when the picked File's own `.type` is empty (browsers don't guess every extension). */
export function mimeTypeForPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[ext] ?? 'application/octet-stream';
}

async function byteSizeOf(content: string | Blob): Promise<number> {
  return typeof content === 'string' ? new TextEncoder().encode(content).length : content.size;
}

/**
 * Persists a newly opened HTML file and its resolved dependencies as a Page
 * Project (spec §5-9). Dedupes by content-hash of the main file — reopening
 * the same page updates its metadata instead of creating a duplicate.
 * A file that fails to store (e.g. exceeds the size limit) is reported back
 * rather than aborting the whole import (spec §7).
 */
export async function importPage(
  mainPath: string,
  mainContent: string,
  dependencies: DependencyFileInput[],
): Promise<ImportResult> {
  const id = await computeContentHash(mainContent);
  const now = Date.now();
  const existing = await getPage(id);

  const page: PageRecord = {
    id,
    title: titleFromHtml(mainContent) ?? fileNameOf(mainPath) ?? 'Untitled',
    mainFile: mainPath,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastOpenedAt: now,
    dirty: false,
    source: 'local',
  };
  await putPage(page);

  const failedFiles: ImportFailure[] = [];

  async function storeFile(
    path: string,
    kind: FileKind,
    mimeType: string,
    content: string | Blob,
    isMain: boolean,
  ) {
    try {
      await putPageFile({
        pageId: id,
        path,
        kind,
        mimeType,
        size: await byteSizeOf(content),
        isMain,
        lastModified: now,
        content,
      });
    } catch (error) {
      const message = error instanceof FileTooLargeError ? error.message : String(error);
      failedFiles.push({ path, message });
    }
  }

  await storeFile(mainPath, 'text', 'text/html', mainContent, true);
  for (const dependency of dependencies) {
    await storeFile(dependency.path, dependency.kind, dependency.mimeType, dependency.content, false);
  }

  return { page, failedFiles };
}

export interface LoadedPage {
  page: PageRecord;
  editorFiles: EditorFile[];
  binaryFileCount: number;
}

/** Loads a stored Page Project's text files for the editor (spec §10, §27). */
export async function loadPageForEditor(pageId: string): Promise<LoadedPage | undefined> {
  const page = await getPage(pageId);
  if (!page) return undefined;

  const files = await listPageFiles(pageId);
  const editorFiles: EditorFile[] = [];
  let binaryFileCount = 0;
  for (const file of files) {
    if (file.kind === 'text' && typeof file.content === 'string') {
      editorFiles.push({
        path: file.path,
        language: languageForPath(file.path),
        content: file.content,
        isMain: file.isMain,
      });
    } else {
      binaryFileCount++;
    }
  }
  editorFiles.sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));

  await putPage({ ...page, lastOpenedAt: Date.now() });

  return { page, editorFiles, binaryFileCount };
}
