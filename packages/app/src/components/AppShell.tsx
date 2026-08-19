import { useEffect, useRef, useState } from 'react';
import { useAutosave } from '../hooks/useAutosave';
import { useHotkeys } from '../hooks/useHotkeys';
import { saveCurrentPage } from '../page/saveActions';
import { useAskEdithStore } from '../store/askEdithStore';
import { useEditorStore } from '../store/editorStore';
import { usePreviewStore } from '../store/previewStore';
import { AskEdithPanel } from './AskEdithPanel';
import { CodePane } from './CodePane';
import { ExportMenu } from './ExportMenu';
import { PreviewPane } from './PreviewPane';
import { Splitter } from './Splitter';
import { ThemeSwitcher } from './ThemeSwitcher';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import styles from './AppShell.module.css';

export function AppShell() {
  const splitPosition = useEditorStore((state) => state.splitPosition);
  const setSplitPosition = useEditorStore((state) => state.setSplitPosition);
  const autoUpdate = useEditorStore((state) => state.autoUpdate);
  const setAutoUpdate = useEditorStore((state) => state.setAutoUpdate);
  const dirty = useEditorStore((state) => state.dirty);
  const markSaved = useEditorStore((state) => state.markSaved);
  const fullscreen = usePreviewStore((state) => state.fullscreen);
  const setFullscreen = usePreviewStore((state) => state.setFullscreen);
  const requestManualUpdate = usePreviewStore((state) => state.requestManualUpdate);
  const pageTitle = useEditorStore((state) => state.pageTitle);
  const showLauncher = useEditorStore((state) => state.showLauncher);
  const openAskEdith = useAskEdithStore((state) => state.openPanel);
  const mainRef = useRef<HTMLDivElement>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useAutosave();

  // Esc exits fullscreen Preview (spec §26, §40).
  useEffect(() => {
    if (!fullscreen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setFullscreen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreen, setFullscreen]);

  // Native "leave site?" prompt on tab close/reload with unsaved changes.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  async function handleSaveClick() {
    setSaving(true);
    const outcome = await saveCurrentPage();
    setSaving(false);
    setStatusMessage(outcome.message ?? (outcome.ok ? 'Saved.' : 'Save failed.'));
    window.setTimeout(() => setStatusMessage(null), 4000);
  }

  useHotkeys({
    onSave: handleSaveClick,
    onUpdatePreview: requestManualUpdate,
  });

  function handleBrandClick() {
    if (dirty) {
      setShowUnsavedDialog(true);
    } else {
      showLauncher();
    }
  }

  async function handleDialogSave() {
    await saveCurrentPage();
    setShowUnsavedDialog(false);
    showLauncher();
  }

  function handleDialogDiscard() {
    markSaved();
    setShowUnsavedDialog(false);
    showLauncher();
  }

  if (fullscreen) {
    return (
      <div className={styles.fullscreenShell}>
        <PreviewPane />
        <AskEdithPanel />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {showUnsavedDialog && (
        <UnsavedChangesDialog
          onSave={handleDialogSave}
          onDiscard={handleDialogDiscard}
          onCancel={() => setShowUnsavedDialog(false)}
        />
      )}

      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button type="button" className={styles.brandButton} onClick={handleBrandClick} title="My Pages">
            Edith
          </button>
          {pageTitle && <span className={styles.pageTitle}>{pageTitle}</span>}
          {statusMessage && <span className={styles.statusMessage}>{statusMessage}</span>}
        </div>
        <div className={styles.topBarActions}>
          <button type="button" disabled={!dirty || saving} onClick={handleSaveClick}>
            Save
          </button>
          <ExportMenu />
          <button
            type="button"
            title="Ask Edith about the whole page"
            onClick={() => openAskEdith({ level: 'create', contextMode: 'page' })}
          >
            Ask Edith
          </button>
          <button type="button" title="Fullscreen preview" onClick={() => setFullscreen(true)}>
            Preview ⛶
          </button>
          <ThemeSwitcher />
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

      <AskEdithPanel />
    </div>
  );
}
