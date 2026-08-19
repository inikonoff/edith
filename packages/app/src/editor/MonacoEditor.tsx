import * as monaco from 'monaco-editor';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface CursorPosition {
  line: number;
  column: number;
}

interface MonacoEditorProps {
  path: string;
  language: string;
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (position: CursorPosition) => void;
}

export interface MonacoEditorHandle {
  revealPosition: (line: number, column: number) => void;
}

// One Monaco text model per open file, keyed by path, so switching tabs keeps
// each file's own undo stack, cursor, and scroll position (spec §8, §15).
const models = new Map<string, monaco.editor.ITextModel>();

function getOrCreateModel(path: string, language: string, value: string): monaco.editor.ITextModel {
  const existing = models.get(path);
  if (existing) return existing;
  const model = monaco.editor.createModel(value, language, monaco.Uri.parse(`file:///${path}`));
  models.set(path, model);
  return model;
}

export const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(function MonacoEditor(
  { path, language, value, onChange, onCursorChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;
  // Set for the duration of an imperative revealPosition() call so its own
  // cursor-change event doesn't get reported as a user move — otherwise a
  // Preview→Code jump immediately bounces back into a Code→Preview update
  // and clobbers the richer click-driven selection (e.g. its related-CSS
  // list) with the plainer cursor-driven one.
  const suppressCursorEventRef = useRef(false);

  useImperativeHandle(ref, () => ({
    revealPosition(line, column) {
      const editor = editorRef.current;
      if (!editor) return;
      suppressCursorEventRef.current = true;
      editor.revealPositionInCenter({ lineNumber: line, column });
      editor.setPosition({ lineNumber: line, column });
      editor.focus();
      suppressCursorEventRef.current = false;
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    const editor = monaco.editor.create(containerRef.current, {
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      // Source formatting is preserved as-is; Edith never reformats on its
      // own, only on an explicit user action (spec §16).
      formatOnPaste: false,
      formatOnType: false,
    });
    editorRef.current = editor;
    return () => {
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = getOrCreateModel(path, language, value);
    if (editor.getModel() !== model) {
      editor.setModel(model);
    }
    const changeSubscription = model.onDidChangeContent(() => {
      onChangeRef.current(model.getValue());
    });
    const cursorSubscription = editor.onDidChangeCursorPosition((event) => {
      if (suppressCursorEventRef.current) return;
      onCursorChangeRef.current?.({
        line: event.position.lineNumber,
        column: event.position.column,
      });
    });
    return () => {
      changeSubscription.dispose();
      cursorSubscription.dispose();
    };
    // `value` seeds a model only the first time it's created (see
    // getOrCreateModel) — re-running this on every keystroke would tear down
    // and rebuild the change subscription for no reason.
  }, [path, language]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
});
