import {
  computeContentHash,
  FileTooLargeError,
  getPage,
  listPageFiles,
  mimeTypeForPath,
  putPage,
  putPageFile,
  type FileKind,
  type GitSourceInfo,
  type PageRecord,
} from '@edith/core';
import { languageForPath } from '../editor/language';
import type { EditorFile } from '../store/editorStore';

export { mimeTypeForPath };

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

async function byteSizeOf(content: string | Blob): Promise<number> {
  return typeof content === 'string' ? new TextEncoder().encode(content).length : content.size;
}

/**
 * Persists a newly opened HTML file and its resolved dependencies as a Page
 * Project (spec §5-9). Dedupes by content-hash of the main file — reopening
 * the same page updates its metadata instead of creating a duplicate.
 * A file that fails to store (e.g. exceeds the size limit) is reported back
 * rather than aborting the whole import (spec §7). Pass `git` to import a
 * file opened from a GitHub repo instead of local disk (spec §28-31).
 */
export async function importPage(
  mainPath: string,
  mainContent: string,
  dependencies: DependencyFileInput[],
  git?: GitSourceInfo,
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
    source: git ? 'git' : 'local',
    ...(git ? { git } : {}),
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

/**
 * Writes the editor's current text files back into the Page Project's
 * IndexedDB storage (Local Save, spec §27) and refreshes the page's title
 * from the (possibly just-edited) <title> tag. Binary files are untouched —
 * nothing in the editor can currently modify them.
 */
export async function savePageContent(pageId: string, files: EditorFile[]): Promise<void> {
  const page = await getPage(pageId);
  if (!page) throw new Error(`Page "${pageId}" no longer exists`);

  const now = Date.now();
  for (const file of files) {
    await putPageFile({
      pageId,
      path: file.path,
      kind: 'text',
      mimeType: mimeTypeForPath(file.path),
      size: await byteSizeOf(file.content),
      isMain: file.isMain,
      lastModified: now,
      content: file.content,
    });
  }

  const mainFile = files.find((file) => file.isMain);
  const title = (mainFile && titleFromHtml(mainFile.content)) ?? page.title;
  await putPage({ ...page, title, updatedAt: now, dirty: false });
}
