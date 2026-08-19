import { useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { CodePane } from './CodePane';
import { PreviewPane } from './PreviewPane';
import { Splitter } from './Splitter';
import styles from './AppShell.module.css';

export function AppShell() {
  const splitPosition = useEditorStore((state) => state.splitPosition);
  const setSplitPosition = useEditorStore((state) => state.setSplitPosition);
  const autoUpdate = useEditorStore((state) => state.autoUpdate);
  const setAutoUpdate = useEditorStore((state) => state.setAutoUpdate);
  const dirty = useEditorStore((state) => state.dirty);
  const mainRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <span className={styles.brand}>Edith</span>
        <div className={styles.topBarActions}>
          <button type="button" disabled={!dirty}>
            Save
          </button>
          <button type="button" title="Fullscreen preview">
            Preview ⛶
          </button>
        </div>
      </header>

      <div className={styles.main} ref={mainRef}>
        <div className={styles.codeColumn} style={{ flexBasis: `${splitPosition * 100}%` }}>
          <CodePane />
        </div>
        <Splitter containerRef={mainRef} onDrag={setSplitPosition} />
        <div className={styles.previewColumn}>
          <PreviewPane />
        </div>
      </div>

      <footer className={styles.bottomBar}>
        <label>
          <input
            type="checkbox"
            checked={autoUpdate}
            onChange={(event) => setAutoUpdate(event.target.checked)}
          />
          Auto update
        </label>
        <button type="button">Update preview</button>
      </footer>
    </div>
  );
}
