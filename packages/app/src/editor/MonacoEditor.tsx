import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';

interface MonacoEditorProps {
  path: string;
  language: string;
  value: string;
  onChange: (value: string) => void;
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

export function MonacoEditor({ path, language, value, onChange }: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
    const subscription = model.onDidChangeContent(() => {
      onChangeRef.current(model.getValue());
    });
    return () => subscription.dispose();
    // `value` seeds a model only the first time it's created (see
    // getOrCreateModel) — re-running this on every keystroke would tear down
    // and rebuild the change subscription for no reason.
  }, [path, language]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
