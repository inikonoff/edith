import * as monaco from 'monaco-editor';
import { useEffect } from 'react';

interface HotkeyHandlers {
  onSave: () => void;
  onUpdatePreview: () => void;
}

function activeEditor(): monaco.editor.ICodeEditor | undefined {
  return monaco.editor.getEditors()[0];
}

/**
 * App-level hotkeys (spec §40): Ctrl/Cmd+S, Ctrl/Cmd+Enter, Ctrl/Cmd+F,
 * Ctrl/Cmd+H. Handled on the parent window only — the sandboxed Preview
 * iframe is a separate document and never sees these keydown events, so
 * there's nothing here that could collide with the previewed page's own JS.
 * Undo/Redo (Ctrl/Cmd+Z / Shift+Z) need no handler: Monaco already binds
 * them itself whenever the editor has focus.
 */
export function useHotkeys({ onSave, onUpdatePreview }: HotkeyHandlers): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;

      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSave();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        onUpdatePreview();
      } else if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        const editor = activeEditor();
        editor?.focus();
        editor?.getAction('actions.find')?.run();
      } else if (event.key.toLowerCase() === 'h') {
        event.preventDefault();
        const editor = activeEditor();
        editor?.focus();
        editor?.getAction('editor.action.startFindReplaceAction')?.run();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSave, onUpdatePreview]);
}
