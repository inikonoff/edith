import {
  applyEdits,
  buildContext,
  buildPrompt,
  callWithFallback,
  getGroqKey,
  getOpenRouterKey,
  groupEditsByFile,
  parseAiResponse,
  remapEditsToRealLines,
  selectModelSize,
  type AiEdit,
  type AskLevel,
  type ContextMode,
  type SelectionInfo,
} from '@edith/ai';
import { findEntryById } from '@edith/mapper';
import { create } from 'zustand';
import { getMainFilePath, useEditorStore } from './editorStore';
import { usePreviewStore } from './previewStore';

export type AskEdithStatus = 'idle' | 'loading' | 'reviewing' | 'applying' | 'error';

interface OpenPanelOptions {
  level: AskLevel;
  contextMode?: ContextMode;
  problemMessage?: string;
}

interface AskEdithStore {
  open: boolean;
  level: AskLevel;
  contextMode: ContextMode;
  requestText: string;
  /** Reported error text for Fix, pre-filled from ProblemsIndicator (spec §41-48). */
  problemMessage: string | null;
  status: AskEdithStatus;
  explanation: string | null;
  /** Already remapped to real file line numbers — ready for applyEdits/DiffView. */
  edits: AiEdit[];
  error: string | null;
  openPanel: (options: OpenPanelOptions) => void;
  closePanel: () => void;
  setLevel: (level: AskLevel) => void;
  setContextMode: (mode: ContextMode) => void;
  setRequestText: (text: string) => void;
  submit: () => Promise<void>;
  approve: () => void;
  reject: () => void;
}

function resetReview() {
  return { status: 'idle' as const, explanation: null, edits: [] as AiEdit[], error: null };
}

export const useAskEdithStore = create<AskEdithStore>((set, get) => ({
  open: false,
  level: 'explain',
  contextMode: 'selection',
  requestText: '',
  problemMessage: null,
  status: 'idle',
  explanation: null,
  edits: [],
  error: null,

  openPanel: ({ level, contextMode, problemMessage }) =>
    set({
      open: true,
      level,
      contextMode: contextMode ?? (level === 'create' ? 'page' : 'selection'),
      problemMessage: problemMessage ?? null,
      requestText: '',
      ...resetReview(),
    }),

  closePanel: () => set({ open: false, ...resetReview() }),

  setLevel: (level) => set({ level, ...resetReview() }),

  setContextMode: (contextMode) => set({ contextMode, ...resetReview() }),

  setRequestText: (requestText) => set({ requestText }),

  submit: async () => {
    const state = get();
    set({ status: 'loading', error: null });
    try {
      const editorState = useEditorStore.getState();
      const mainPath = getMainFilePath(editorState.files);
      if (!mainPath) throw new Error('No main HTML file is loaded.');
      const files = editorState.files.map((file) => ({ path: file.path, content: file.content }));

      let selection: SelectionInfo | null = null;
      if (state.contextMode !== 'page') {
        const previewState = usePreviewStore.getState();
        const entry = previewState.selectedEntryId
          ? findEntryById(previewState.entries, previewState.selectedEntryId)
          : undefined;
        if (!entry || !previewState.selectedElementInfo) {
          throw new Error('Select an element in the Preview first, or switch to Page context.');
        }
        selection = { range: entry.range, ...previewState.selectedElementInfo };
      }

      const context = buildContext(state.contextMode, files, mainPath, selection);
      const modelSize = selectModelSize(state.level, context.mode);
      const messages = buildPrompt(
        state.level,
        context,
        state.level === 'edit' || state.level === 'create' ? state.requestText : undefined,
        state.level === 'fix' ? (state.problemMessage ?? undefined) : undefined,
      );

      const groqKey = getGroqKey();
      const openRouterKey = getOpenRouterKey();
      if (!groqKey && !openRouterKey) {
        throw new Error('Add a Groq or OpenRouter API key in Ask Edith settings first.');
      }

      const response = await callWithFallback({ messages, modelSize, groqKey, openRouterKey });
      const parsed = parseAiResponse(response.content);
      const edits = remapEditsToRealLines(parsed.edits, context);

      set({ status: 'reviewing', explanation: parsed.explanation, edits, error: null });
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  },

  approve: () => {
    const { edits } = get();
    if (edits.length > 0) {
      set({ status: 'applying' });
      const editorState = useEditorStore.getState();
      for (const [path, fileEdits] of groupEditsByFile(edits)) {
        const file = editorState.files.find((candidate) => candidate.path === path);
        if (!file) continue;
        editorState.updateFileContent(path, applyEdits(file.content, fileEdits));
      }
    }
    set({ open: false, requestText: '', ...resetReview() });
  },

  reject: () => set(resetReview()),
}));
