import { create } from 'zustand';

export interface EditorFile {
  path: string;
  language: string;
  content: string;
  isMain: boolean;
}

interface EditorStore {
  files: EditorFile[];
  activeFile: string;
  dirty: boolean;
  autoUpdate: boolean;
  splitPosition: number;
  setActiveFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  setAutoUpdate: (value: boolean) => void;
  setSplitPosition: (value: number) => void;
  markSaved: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  files: [],
  activeFile: '',
  dirty: false,
  autoUpdate: true,
  splitPosition: 0.5,

  setActiveFile: (path) => set({ activeFile: path }),

  updateFileContent: (path, content) =>
    set((state) => ({
      files: state.files.map((file) => (file.path === path ? { ...file, content } : file)),
      dirty: true,
    })),

  setAutoUpdate: (value) => set({ autoUpdate: value }),

  setSplitPosition: (value) => set({ splitPosition: value }),

  markSaved: () => set({ dirty: false }),
}));
