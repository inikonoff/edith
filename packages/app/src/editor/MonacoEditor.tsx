import * as monaco from 'monaco-editor';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useThemeStore } from '../store/themeStore';
import { monacoThemeName } from './monacoThemes';

interface CursorPosition {
  line: number;
  column: number;
}

interface MonacoEditorProps {
  path: string;
  /**
   * Ключ модели Monaco. По умолчанию — path, но CodePane передаёт
   * `${pageId}/${path}`: иначе у двух разных страниц с index.html была бы
   * одна общая модель, и открытая вторая страница показывала бы текст первой.
   */
  modelKey?: string;
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

function getOrCreateModel(key: string, language: string, value: string): monaco.editor.ITextModel {
  const existing = models.get(key);
  if (existing) return existing;
  const model = monaco.editor.createModel(value, language, monaco.Uri.parse(`file:///${key}`));
  models.set(key, model);
  return model;
}

/**
 * Переносит внешнее изменение (Ask Edith → Approve, вставка <link> при
 * создании файла) в модель Monaco. Заменяется только отличающийся кусок
 * между общим началом и общим концом — курсор и прокрутка не прыгают, а
 * правка попадает в историю Undo как обычная.
 */
function syncModelValue(model: monaco.editor.ITextModel, value: string): void {
  const current = model.getValue();
  if (current === value) return;
  let start = 0;
  const maxStart = Math.min(current.length, value.length);
  while (start < maxStart && current.charCodeAt(start) === value.charCodeAt(start)) start++;
  let endCurrent = current.length;
  let endValue = value.length;
  while (
    endCurrent > start &&
    endValue > start &&
    current.charCodeAt(endCurrent - 1) === value.charCodeAt(endValue - 1)
  ) {
    endCurrent--;
    endValue--;
  }
  const from = model.getPositionAt(start);
  const to = model.getPositionAt(endCurrent);
  model.pushEditOperations(
    [],
    [
      {
        range: new monaco.Range(from.lineNumber, from.column, to.lineNumber, to.column),
        text: value.slice(start, endValue),
      },
    ],
    () => null,
  );
}

export const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(function MonacoEditor(
  { path, modelKey, language, value, onChange, onCursorChange },
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
      // Тема задаётся сразу при создании, иначе первый кадр рисуется в 'vs'.
      theme: monacoThemeName(useThemeStore.getState().theme),
      fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
      fontSize: 12,
      lineHeight: 20,
      padding: { top: 8 },
      lineNumbersMinChars: 3,
      renderLineHighlight: 'line',
      // Скобки красятся палитрой темы, а не радужной подсветкой пар.
      bracketPairColorization: { enabled: false },
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      // Source formatting is preserved as-is; Edith never reformats on its
      // own, only on an explicit user action (spec §16).
      formatOnPaste: false,
      formatOnType: false,
    });
    editorRef.current = editor;
    // JetBrains Mono грузится асинхронно — после загрузки Monaco должен
    // перемерить ширину символов, иначе курсор съезжает относительно текста.
    document.fonts?.ready.then(() => monaco.editor.remeasureFonts());
    return () => {
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = getOrCreateModel(modelKey ?? path, language, value);
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
  }, [path, modelKey, language]);

  // Внешние изменения содержимого. Раньше модель читала `value` только при
  // создании, поэтому правки Ask Edith попадали в store, но не в редактор —
  // и следующее нажатие клавиши затирало их старым текстом из модели.
  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (model) syncModelValue(model, value);
  }, [value]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
});
