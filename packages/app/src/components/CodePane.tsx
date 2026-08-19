import { useEffect, useRef } from 'react';
import { MonacoEditor, type MonacoEditorHandle } from '../editor/MonacoEditor';
import { languageForPath } from '../editor/language';
import { useEditorStore } from '../store/editorStore';
import { FileTabs } from './FileTabs';
import styles from './CodePane.module.css';

export function CodePane() {
  const files = useEditorStore((state) => state.files);
  const activeFile = useEditorStore((state) => state.activeFile);
  const setActiveFile = useEditorStore((state) => state.setActiveFile);
  const updateFileContent = useEditorStore((state) => state.updateFileContent);
  const pendingReveal = useEditorStore((state) => state.pendingReveal);
  const clearPendingReveal = useEditorStore((state) => state.clearPendingReveal);
  const setCursor = useEditorStore((state) => state.setCursor);
  const editorRef = useRef<MonacoEditorHandle>(null);

  const current = files.find((file) => file.path === activeFile);

  // Preview→Code jump (spec §20.1): switch to the target file first, then
  // reveal it once that file's model is actually active.
  useEffect(() => {
    if (!pendingReveal) return;
    if (pendingReveal.path !== activeFile) {
      setActiveFile(pendingReveal.path);
      return;
    }
    editorRef.current?.revealPosition(pendingReveal.line, pendingReveal.column);
    clearPendingReveal();
  }, [pendingReveal, activeFile, setActiveFile, clearPendingReveal]);

  return (
    <div className={styles.pane}>
      <FileTabs files={files} activeFile={activeFile} onSelect={setActiveFile} />
      <div className={styles.editor}>
        {current && (
          <MonacoEditor
            ref={editorRef}
            path={current.path}
            language={languageForPath(current.path)}
            value={current.content}
            onChange={(value) => updateFileContent(current.path, value)}
            onCursorChange={(position) => setCursor({ path: current.path, ...position })}
          />
        )}
      </div>
    </div>
  );
}
