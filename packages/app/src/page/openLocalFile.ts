// File System Access API where available, `<input type="file">` fallback
// otherwise (spec §11) — feature-detected, never assumed.
export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function pickFilesFallback(accept: string, multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      resolve(Array.from(input.files ?? []));
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}

export interface PickedHtmlFile {
  name: string;
  content: string;
  /** Present only via the File System Access API — lets Save write straight back to this file (spec §11, §27). */
  fileHandle: FileSystemFileHandle | null;
}

export async function pickHtmlFile(): Promise<PickedHtmlFile | undefined> {
  if (supportsFileSystemAccess()) {
    let handles: FileSystemFileHandle[];
    try {
      handles = await window.showOpenFilePicker!({
        types: [{ description: 'HTML', accept: { 'text/html': ['.html', '.htm'] } }],
      });
    } catch (error) {
      if (isAbortError(error)) return undefined;
      throw error;
    }
    const handle = handles[0]!;
    const file = await handle.getFile();
    return { name: file.name, content: await file.text(), fileHandle: handle };
  }

  const [file] = await pickFilesFallback('.html,.htm,text/html', false);
  if (!file) return undefined;
  return { name: file.name, content: await file.text(), fileHandle: null };
}

export interface PickedProjectFile {
  path: string;
  file: File;
}

export interface PickedFolderProject {
  mainPath: string;
  mainContent: string;
  files: PickedProjectFile[];
}

function pickPreferredHtml(paths: string[]): string | undefined {
  const htmlFiles = paths.filter((path) => /\.html?$/i.test(path));
  if (htmlFiles.length === 0) return undefined;
  return (
    htmlFiles.find((path) => /(^|\/)index\.html?$/i.test(path)) ??
    htmlFiles.sort((a, b) => a.length - b.length || a.localeCompare(b))[0]
  );
}

// Skips directories/files a user almost never means to import when they pick
// or drop a whole project folder — without this, "Open folder" on a real web
// project walks node_modules in its entirety (tens of thousands of files).
const EXCLUDED_ENTRY_NAMES = new Set(['node_modules', '.git']);
const MAX_FOLDER_FILES = 500;

function shouldSkipEntryName(name: string): boolean {
  return name.startsWith('.') || EXCLUDED_ENTRY_NAMES.has(name);
}

async function collectDirectoryFiles(
  handle: FileSystemDirectoryHandle,
  prefix = '',
): Promise<PickedProjectFile[]> {
  const collected: PickedProjectFile[] = [];
  for await (const [name, child] of handle.entries()) {
    if (shouldSkipEntryName(name)) continue;
    if (child.kind === 'directory') {
      collected.push(...(await collectDirectoryFiles(child, `${prefix}${name}/`)));
    } else {
      const file = await (child as FileSystemFileHandle).getFile();
      collected.push({ path: `${prefix}${name}`, file });
    }
  }
  return collected;
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickHtmlFolder(): Promise<PickedFolderProject | undefined> {
  if (supportsDirectoryPicker()) {
    let root: FileSystemDirectoryHandle;
    try {
      root = await window.showDirectoryPicker!({ mode: 'read' });
    } catch (error) {
      if (isAbortError(error)) return undefined;
      throw error;
    }
    const files = await collectDirectoryFiles(root);
    const project = folderProjectFromFiles(files);
    if (!project) throw new Error('No HTML file found in this folder.');
    return project;
  }

  const files = await pickFilesFallback('*/*', true);
  if (files.length === 0) return undefined;
  const project = folderProjectFromFiles(files.map((file) => ({ path: file.name, file })));
  if (!project) throw new Error('No HTML file found in this folder.');
  return project;
}

/**
 * `undefined` means no HTML file was found — a normal, expected outcome for a
 * plain drag-and-drop (the caller decides how to report it). A folder over
 * the file-count cap throws instead, since silently importing it would hang
 * the tab rather than just "not find" anything.
 */
export function folderProjectFromFiles(
  files: PickedProjectFile[],
): PickedFolderProject | undefined {
  if (files.length > MAX_FOLDER_FILES) {
    throw new Error(
      `This folder has ${files.length} files (limit ${MAX_FOLDER_FILES}) — pick a smaller project folder.`,
    );
  }
  const mainPath = pickPreferredHtml(files.map((entry) => entry.path));
  if (!mainPath) return undefined;
  const main = files.find((entry) => entry.path === mainPath);
  if (!main) return undefined;
  return { mainPath, mainContent: '', files };
}

export async function readFolderProject(
  project: PickedFolderProject,
): Promise<PickedFolderProject> {
  const main = project.files.find((entry) => entry.path === project.mainPath);
  if (!main) return project;
  return { ...project, mainContent: await main.file.text() };
}

interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (ok: (file: File) => void, err: (error: Error) => void) => void;
  createReader?: () => {
    readEntries: (
      ok: (entries: FileSystemEntryLike[]) => void,
      err: (error: Error) => void,
    ) => void;
  };
}

async function readDroppedEntry(
  entry: FileSystemEntryLike,
  prefix = '',
): Promise<PickedProjectFile[]> {
  if (shouldSkipEntryName(entry.name)) return [];
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      entry.file!(resolve, reject);
    });
    return [{ path: `${prefix}${entry.name}`, file }];
  }
  if (!entry.isDirectory || !entry.createReader) return [];
  const reader = entry.createReader();
  const children: FileSystemEntryLike[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntryLike[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (batch.length === 0) break;
    children.push(...batch);
  }
  const nested: PickedProjectFile[] = [];
  for (const child of children) {
    nested.push(...(await readDroppedEntry(child, `${prefix}${entry.name}/`)));
  }
  return nested;
}

export async function filesFromDataTransfer(transfer: DataTransfer): Promise<PickedProjectFile[]> {
  const items = Array.from(transfer.items ?? []);
  const collected: PickedProjectFile[] = [];
  for (const item of items) {
    const entry = (
      item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntryLike | null }
    ).webkitGetAsEntry?.();
    if (entry) {
      collected.push(...(await readDroppedEntry(entry)));
      continue;
    }
    const file = item.getAsFile();
    if (file) collected.push({ path: file.name, file });
  }
  if (collected.length === 0) {
    return Array.from(transfer.files ?? []).map((file) => ({ path: file.name, file }));
  }
  return collected;
}

export async function pickDependencyFiles(): Promise<File[]> {
  if (supportsFileSystemAccess()) {
    let handles: FileSystemFileHandle[];
    try {
      handles = await window.showOpenFilePicker!({ multiple: true });
    } catch (error) {
      if (isAbortError(error)) return [];
      throw error;
    }
    return Promise.all(handles.map((handle) => handle.getFile()));
  }
  return pickFilesFallback('*/*', true);
}

/** Matches picked files to expected dependency paths by filename (spec §12). */
export function matchFilesToDependencies(
  dependencyPaths: string[],
  pickedFiles: File[],
): { matched: Map<string, File>; unmatched: string[] } {
  const byBasename = new Map<string, File>();
  for (const file of pickedFiles) {
    byBasename.set(file.name.toLowerCase(), file);
  }

  const matched = new Map<string, File>();
  const unmatched: string[] = [];
  for (const path of dependencyPaths) {
    const basename = path.includes('/') ? (path.split('/').pop() ?? path) : path;
    const file = byBasename.get(basename.toLowerCase());
    if (file) matched.set(path, file);
    else unmatched.push(path);
  }
  return { matched, unmatched };
}
