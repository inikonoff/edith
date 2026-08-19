import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { usePreviewStore } from '../store/previewStore';
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
  const fullscreen = usePreviewStore((state) => state.fullscreen);
  const setFullscreen = usePreviewStore((state) => state.setFullscreen);
  const requestManualUpdate = usePreviewStore((state) => state.requestManualUpdate);
  const mainRef = useRef<HTMLDivElement>(null);

  // Esc exits fullscreen Preview (spec §26, §40).
  useEffect(() => {
    if (!fullscreen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setFullscreen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreen, setFullscreen]);

  if (fullscreen) {
    return (
      <div className={styles.fullscreenShell}>
        <PreviewPane />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <span className={styles.brand}>Edith</span>
        <div className={styles.topBarActions}>
          <button type="button" disabled={!dirty}>
            Save
          </button>
          <button type="button" title="Fullscreen preview" onClick={() => setFullscreen(true)}>
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
        <button type="button" onClick={requestManualUpdate}>
          Update preview
        </button>
      </footer>
    </div>
  );
}
