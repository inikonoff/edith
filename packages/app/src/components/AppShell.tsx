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
import { Icon } from './Icon';
import { PreviewPane } from './PreviewPane';
import { Splitter } from './Splitter';
import { ThemeSwitcher } from './ThemeSwitcher';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import styles from './AppShell.module.css';

export function AppShell() {
  const splitPosition = useEditorStore((state) => state.splitPosition);
  const setSplitPosition = useEditorStore((state) => state.setSplitPosition);
  const splitAxis = useEditorStore((state) => state.splitAxis);
  const setSplitAxis = useEditorStore((state) => state.setSplitAxis);
  const splitSwapped = useEditorStore((state) => state.splitSwapped);
  const swapPanes = useEditorStore((state) => state.swapPanes);
  const autoUpdate = useEditorStore((state) => state.autoUpdate);
  const setAutoUpdate = useEditorStore((state) => state.setAutoUpdate);
  const dirty = useEditorStore((state) => state.dirty);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const markSaved = useEditorStore((state) => state.markSaved);
  const fullscreen = usePreviewStore((state) => state.fullscreen);
  const setFullscreen = usePreviewStore((state) => state.setFullscreen);
  const requestManualUpdate = usePreviewStore((state) => state.requestManualUpdate);
  const pageTitle = useEditorStore((state) => state.pageTitle);
  const cursor = useEditorStore((state) => state.cursor);
  const activeFile = useEditorStore((state) => state.activeFile);
  const showLauncher = useEditorStore((state) => state.showLauncher);
  const openAskEdith = useAskEdithStore((state) => state.openPanel);
  const mainRef = useRef<HTMLDivElement>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useAutosave();

  useEffect(() => {
    if (!fullscreen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setFullscreen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreen, setFullscreen]);

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

  const saveLabel =
    saving || saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'error' && !saving
        ? 'Save failed'
        : saveStatus === 'saved' && !dirty
          ? 'Saved'
          : 'Save';

  const status =
    saving || saveStatus === 'saving'
      ? { label: 'Saving…', tone: styles.dotBusy }
      : saveStatus === 'error'
        ? { label: 'Save failed', tone: styles.dotError }
        : dirty
          ? { label: 'Unsaved', tone: styles.dotIdle }
          : { label: saveStatus === 'saved' ? 'Saved' : 'Ready', tone: styles.dotOk };
  const cursorLabel =
    cursor && cursor.path === activeFile ? `Ln ${cursor.line}, Col ${cursor.column}` : null;

  if (fullscreen) {
    return (
      <div className={styles.fullscreenShell}>
        <PreviewPane />
        <AskEdithPanel />
      </div>
    );
  }

  // CodePane/PreviewPane are always rendered in the same JSX position, and
  // Swap ⇄ only changes their flex `order` (-1/1, with the Splitter fixed at
  // the default 0 so it always ends up between them) — not which JSX branch
  // renders which component. Conditionally swapping JSX branches instead
  // would put a different component type at the same tree position on each
  // toggle, so React would unmount and remount both CodePane and PreviewPane
  // (losing Monaco's undo history/scroll/cursor and reloading the preview
  // iframe) on every single Swap click.
  //
  // Whichever pane ends up visually first (order -1) takes the explicit
  // splitPosition share; the other (order 1) grows to fill the rest — kept
  // as inline style rather than baked into the .codeColumn/.previewColumn
  // classes so grow/basis follow visual position, not content type (pinning
  // grow to content type made the swapped pane balloon and the other
  // collapse; see AppShell.module.css, neither class carries flex: 1).
  const firstPaneStyle = { flexBasis: `${splitPosition * 100}%` };
  const secondPaneStyle = { flex: 1 };
  const codeStyle = {
    order: splitSwapped ? 1 : -1,
    ...(splitSwapped ? secondPaneStyle : firstPaneStyle),
  };
  const previewStyle = {
    order: splitSwapped ? -1 : 1,
    ...(splitSwapped ? firstPaneStyle : secondPaneStyle),
  };

  return (
    <div className={styles.shell}>
      {showUnsavedDialog && (
        <UnsavedChangesDialog
          onSave={handleDialogSave}
          onDiscard={handleDialogDiscard}
          onCancel={() => setShowUnsavedDialog(false)}
        />
      )}

      <header className={styles.menuBar}>
        <div className={styles.menuLeft}>
          <button
            type="button"
            className={styles.brandButton}
            onClick={handleBrandClick}
            title="My Pages"
          >
            Edith
          </button>
          {pageTitle && (
            <>
              <span className={styles.divider} aria-hidden="true" />
              <span className={styles.pageTitle}>{pageTitle}</span>
            </>
          )}
          {statusMessage && <span className={styles.statusMessage}>{statusMessage}</span>}
        </div>
        <ThemeSwitcher />
      </header>

      <div className={styles.toolbar} role="toolbar" aria-label="Page actions">
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className="edith-btn"
            title="Save (Ctrl/Cmd+S)"
            disabled={!dirty || saving}
            onClick={handleSaveClick}
          >
            <Icon name="save" />
            {saveLabel}
          </button>
          <span className={styles.separator} aria-hidden="true" />
          <button
            type="button"
            className="edith-btn"
            title={splitAxis === 'horizontal' ? 'Stack panes' : 'Place panes side by side'}
            onClick={() => setSplitAxis(splitAxis === 'horizontal' ? 'vertical' : 'horizontal')}
          >
            <Icon name={splitAxis === 'horizontal' ? 'columns' : 'rows'} />
            Layout
          </button>
          <button
            type="button"
            className="edith-btn"
            title="Swap code and preview"
            onClick={swapPanes}
          >
            <Icon name="swap" />
            Swap
          </button>
          <span className={styles.separator} aria-hidden="true" />
          <ExportMenu />
          <button
            type="button"
            className="edith-btn"
            title="Ask Edith about the whole page"
            onClick={() => openAskEdith({ level: 'create', contextMode: 'page' })}
          >
            <Icon name="sparkle" />
            Ask Edith
          </button>
        </div>
        <button
          type="button"
          className="edith-btn"
          title="Fullscreen preview (Esc to exit)"
          onClick={() => setFullscreen(true)}
        >
          <Icon name="maximize" />
          Fullscreen
        </button>
      </div>

      <div
        className={splitAxis === 'horizontal' ? styles.mainRow : styles.mainColumn}
        ref={mainRef}
      >
        <div className={styles.codeColumn} style={codeStyle}>
          <CodePane />
        </div>
        <Splitter
          axis={splitAxis}
          containerRef={mainRef}
          onDrag={setSplitPosition}
          onReset={() => setSplitPosition(0.5)}
        />
        <div className={styles.previewColumn} style={previewStyle}>
          <PreviewPane />
        </div>
      </div>

      <footer className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.statusItem}>
            <span className={`${styles.dot} ${status.tone}`} aria-hidden="true" />
            {status.label}
          </span>
          {cursorLabel && <span className={styles.statusMuted}>{cursorLabel}</span>}
          <span className={styles.statusMuted}>UTF-8</span>
        </div>
        <label
          className={styles.statusItem}
          title="Rebuild the preview while you type. When off, press Ctrl/Cmd+Enter to update."
        >
          <input
            type="checkbox"
            checked={autoUpdate}
            onChange={(event) => setAutoUpdate(event.target.checked)}
          />
          Auto update
        </label>
      </footer>

      <AskEdithPanel />
    </div>
  );
}
