import { MonacoEditor } from '../editor/MonacoEditor';
import { languageForPath } from '../editor/language';
import { useEditorStore } from '../store/editorStore';
import { FileTabs } from './FileTabs';
import styles from './CodePane.module.css';

export function CodePane() {
  const files = useEditorStore((state) => state.files);
  const activeFile = useEditorStore((state) => state.activeFile);
  const setActiveFile = useEditorStore((state) => state.setActiveFile);
  const updateFileContent = useEditorStore((state) => state.updateFileContent);

  const current = files.find((file) => file.path === activeFile);

  return (
    <div className={styles.pane}>
      <FileTabs files={files} activeFile={activeFile} onSelect={setActiveFile} />
      <div className={styles.editor}>
        {current && (
          <MonacoEditor
            path={current.path}
            language={languageForPath(current.path)}
            value={current.content}
            onChange={(value) => updateFileContent(current.path, value)}
          />
        )}
      </div>
    </div>
  );
}
