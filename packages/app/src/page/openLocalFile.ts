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
