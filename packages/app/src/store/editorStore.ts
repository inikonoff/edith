import { putPageState, type SplitAxis } from '@edith/core';
import { create } from 'zustand';

export type { SplitAxis };

export interface EditorFile {
  path: string;
  language: string;
  content: string;
  isMain: boolean;
}

export interface RevealTarget {
  path: string;
  line: number;
  column: number;
}

export interface CursorState {
  path: string;
  line: number;
  column: number;
}

export type AppView = 'launcher' | 'editor';

function persistSplit(state: {
  pageId: string | null;
  activeFile: string;
  splitPosition: number;
  splitAxis: SplitAxis;
  splitSwapped: boolean;
}) {
  if (!state.pageId) return;
  putPageState({
    pageId: state.pageId,
    activeFile: state.activeFile,
    splitPosition: state.splitPosition,
    splitAxis: state.splitAxis,
    splitSwapped: state.splitSwapped,
  }).catch(() => {
    /* session hint only */
  });
}

interface LoadedPageInput {
  page: { id: string; title: string };
  editorFiles: EditorFile[];
  /** Live handle to the file opened via the File System Access API, if any — enables direct-to-disk Save (spec §11, §27). */
  fileHandle?: FileSystemFileHandle | null;
}

interface EditorStore {
  view: AppView;
  pageId: string | null;
  pageTitle: string;
  files: EditorFile[];
  activeFile: string;
  dirty: boolean;
  autoUpdate: boolean;
  splitPosition: number;
  splitAxis: SplitAxis;
  splitSwapped: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  fileHandle: FileSystemFileHandle | null;
  /** Set by a Preview→Code jump; CodePane switches tabs and reveals it, then clears it (spec §20.1). */
  pendingReveal: RevealTarget | null;
  /** Latest editor cursor position, feeding the Code→Preview highlight (spec §21). */
  cursor: CursorState | null;
  loadPage: (loaded: LoadedPageInput) => void;
  showLauncher: () => void;
  setActiveFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  setAutoUpdate: (value: boolean) => void;
  setSplitPosition: (value: number) => void;
  setSplitAxis: (axis: SplitAxis) => void;
  swapPanes: () => void;
  setSplitSwapped: (value: boolean) => void;
  restoreSplitFromSession: (session: { splitPosition?: number; splitAxis?: SplitAxis; splitSwapped?: boolean }) => void;
  setSaveStatus: (status: EditorStore['saveStatus']) => void;
  markSaved: () => void;
  revealPosition: (target: RevealTarget) => void;
  clearPendingReveal: () => void;
  setCursor: (cursor: CursorState) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  view: 'launcher',
  pageId: null,
  pageTitle: '',
  files: [],
  activeFile: '',
  dirty: false,
  autoUpdate: true,
  splitPosition: 0.5,
  splitAxis: 'horizontal',
  splitSwapped: false,
  saveStatus: 'idle',
  fileHandle: null,
  pendingReveal: null,
  cursor: null,

  loadPage: ({ page, editorFiles, fileHandle }) =>
    set({
      view: 'editor',
      pageId: page.id,
      pageTitle: page.title,
      files: editorFiles,
      activeFile: editorFiles.find((file) => file.isMain)?.path ?? editorFiles[0]?.path ?? '',
      dirty: false,
      fileHandle: fileHandle ?? null,
      pendingReveal: null,
      cursor: null,
    }),

  showLauncher: () => set({ view: 'launcher' }),

  setActiveFile: (path) => {
    set({ activeFile: path });
    // Minimal Editor Session restore target (spec §8): remember the active
    // file so relaunching the app can return to it.
    const pageId = get().pageId;
    if (pageId) {
      putPageState({ pageId, activeFile: path }).catch(() => {
        // Best-effort — losing the session-restore hint isn't user-facing.
      });
    }
  },

  updateFileContent: (path, content) =>
    set((state) => ({
      files: state.files.map((file) => (file.path === path ? { ...file, content } : file)),
      dirty: true,
    })),

  setAutoUpdate: (value) => set({ autoUpdate: value }),

  setSplitPosition: (value) => {
    set({ splitPosition: value });
    persistSplit(get());
  },

  setSplitAxis: (axis) => {
    set({ splitAxis: axis });
    persistSplit(get());
  },

  swapPanes: () => {
    const state = get();
    set({
      splitSwapped: !state.splitSwapped,
      splitPosition: 1 - state.splitPosition,
    });
    persistSplit(get());
  },

  setSplitSwapped: (value) => {
    set({ splitSwapped: value });
    persistSplit(get());
  },

  // Boot-time session restore (spec §8): one write instead of one per field,
  // since App.tsx used to call setSplitPosition/setSplitAxis/setSplitSwapped
  // in sequence, each independently persisting the same final state.
  restoreSplitFromSession: (session) => {
    set({
      ...(session.splitPosition !== undefined ? { splitPosition: session.splitPosition } : {}),
      ...(session.splitAxis !== undefined ? { splitAxis: session.splitAxis } : {}),
      ...(session.splitSwapped !== undefined ? { splitSwapped: session.splitSwapped } : {}),
    });
    persistSplit(get());
  },

  setSaveStatus: (saveStatus) => set({ saveStatus }),

  markSaved: () => set({ dirty: false, saveStatus: 'saved' }),

  revealPosition: (target) => set({ pendingReveal: target }),

  clearPendingReveal: () => set({ pendingReveal: null }),

  setCursor: (cursor) => set({ cursor }),
}));

export function getMainFilePath(files: EditorFile[]): string | undefined {
  return files.find((file) => file.isMain)?.path;
}
