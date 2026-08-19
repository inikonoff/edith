import { putPageState } from '@edith/core';
import { create } from 'zustand';

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

interface LoadedPageInput {
  page: { id: string; title: string };
  editorFiles: EditorFile[];
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
  pendingReveal: null,
  cursor: null,

  loadPage: ({ page, editorFiles }) =>
    set({
      view: 'editor',
      pageId: page.id,
      pageTitle: page.title,
      files: editorFiles,
      activeFile: editorFiles.find((file) => file.isMain)?.path ?? editorFiles[0]?.path ?? '',
      dirty: false,
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

  setSplitPosition: (value) => set({ splitPosition: value }),

  markSaved: () => set({ dirty: false }),

  revealPosition: (target) => set({ pendingReveal: target }),

  clearPendingReveal: () => set({ pendingReveal: null }),

  setCursor: (cursor) => set({ cursor }),
}));

export function getMainFilePath(files: EditorFile[]): string | undefined {
  return files.find((file) => file.isMain)?.path;
}
