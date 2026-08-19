import { useEffect } from 'react';
import { saveCurrentPage } from '../page/saveActions';
import { useEditorStore } from '../store/editorStore';

const AUTOSAVE_DEBOUNCE_MS = 1500;

/** Autosaves to the Page Project a short debounce after edits stop (spec §36) — doesn't replace explicit Save/Export. */
export function useAutosave(): void {
  const files = useEditorStore((state) => state.files);
  const dirty = useEditorStore((state) => state.dirty);
  const pageId = useEditorStore((state) => state.pageId);

  useEffect(() => {
    if (!dirty || !pageId) return;
    const timer = setTimeout(() => {
      saveCurrentPage();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [files, dirty, pageId]);
}
