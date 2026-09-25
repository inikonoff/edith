import type { EditorFile } from '../store/editorStore';
import { NewFileMenu } from './NewFileMenu';
import styles from './FileTabs.module.css';

interface FileTabsProps {
  files: EditorFile[];
  activeFile: string;
  onSelect: (path: string) => void;
}

export function FileTabs({ files, activeFile, onSelect }: FileTabsProps) {
  // Always shown — even for a single file — so the code pane header lines
  // up with the preview toolbar next to it.
  if (files.length === 0) return null;

  return (
    <div className={styles.bar}>
      <div className={styles.tabs} role="tablist">
        {files.map((file) => (
          <button
            key={file.path}
            role="tab"
            aria-selected={file.path === activeFile}
            className={file.path === activeFile ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => onSelect(file.path)}
          >
            {file.path}
          </button>
        ))}
      </div>
      {/* Вне прокручиваемого списка — иначе overflow обрежет всплывашку. */}
      <NewFileMenu />
    </div>
  );
}
