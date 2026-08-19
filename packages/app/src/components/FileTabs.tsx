import type { EditorFile } from '../store/editorStore';
import styles from './FileTabs.module.css';

interface FileTabsProps {
  files: EditorFile[];
  activeFile: string;
  onSelect: (path: string) => void;
}

export function FileTabs({ files, activeFile, onSelect }: FileTabsProps) {
  if (files.length <= 1) return null;

  return (
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
  );
}
