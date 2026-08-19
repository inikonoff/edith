import type { PreviewDevice } from '@edith/core';
import type { MapperEntry, MatchedCssRule } from '@edith/mapper';
import { create } from 'zustand';

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ProblemItem {
  id: number;
  kind: 'error' | 'warning';
  message: string;
}

export interface SelectedElementInfo {
  tagName: string;
  id?: string;
  classNames: string[];
}

interface PreviewBuildResult {
  srcDoc: string;
  entries: MapperEntry[];
  missingResources: string[];
}

interface PreviewStore {
  srcDoc: string;
  /** Bumped on every build so the iframe is re-mounted (key={buildVersion}) instead of having
   *  its srcDoc property updated in place — Chromium doesn't reliably re-navigate an
   *  already-attached sandboxed iframe on an in-place srcdoc update. */
  buildVersion: number;
  entries: MapperEntry[];
  missingResources: string[];
  device: PreviewDevice;
  fullscreen: boolean;
  problems: ProblemItem[];
  selectedEntryId: string | null;
  selectedRect: Rect | null;
  selectedElementInfo: SelectedElementInfo | null;
  relatedCssRules: MatchedCssRule[];
  manualUpdateRequestId: number;
  setBuildResult: (result: PreviewBuildResult) => void;
  setDevice: (device: PreviewDevice) => void;
  setFullscreen: (value: boolean) => void;
  addProblem: (problem: Omit<ProblemItem, 'id'>) => void;
  clearSelection: () => void;
  selectEntry: (
    id: string,
    rect: Rect | null,
    relatedCssRules: MatchedCssRule[],
    elementInfo?: SelectedElementInfo,
  ) => void;
  requestManualUpdate: () => void;
}

let problemCounter = 0;

export const usePreviewStore = create<PreviewStore>((set) => ({
  srcDoc: '',
  buildVersion: 0,
  entries: [],
  missingResources: [],
  device: 'desktop',
  fullscreen: false,
  problems: [],
  selectedEntryId: null,
  selectedRect: null,
  selectedElementInfo: null,
  relatedCssRules: [],
  manualUpdateRequestId: 0,

  setBuildResult: ({ srcDoc, entries, missingResources }) =>
    set((state) => ({
      srcDoc,
      buildVersion: state.buildVersion + 1,
      entries,
      missingResources,
      problems: [],
      selectedEntryId: null,
      selectedRect: null,
      selectedElementInfo: null,
    })),

  setDevice: (device) => set({ device }),

  setFullscreen: (value) => set({ fullscreen: value }),

  addProblem: (problem) =>
    set((state) => ({ problems: [...state.problems, { ...problem, id: problemCounter++ }] })),

  clearSelection: () =>
    set({ selectedEntryId: null, selectedRect: null, relatedCssRules: [], selectedElementInfo: null }),

  selectEntry: (id, rect, relatedCssRules, elementInfo) =>
    set((state) => ({
      selectedEntryId: id,
      selectedRect: rect,
      relatedCssRules,
      selectedElementInfo: elementInfo ?? state.selectedElementInfo,
    })),

  requestManualUpdate: () => set((state) => ({ manualUpdateRequestId: state.manualUpdateRequestId + 1 })),
}));
