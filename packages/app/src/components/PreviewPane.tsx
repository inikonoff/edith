import { findEntryAtPosition, findEntryById, findMatchingCssRules } from '@edith/mapper';
import { useCallback, useEffect, useRef } from 'react';
import { buildPreviewDocument } from '../preview/buildPreviewDocument';
import { DEVICE_PRESETS } from '../preview/devicePresets';
import { useAskEdithStore } from '../store/askEdithStore';
import { getMainFilePath, useEditorStore } from '../store/editorStore';
import { type Rect, usePreviewStore } from '../store/previewStore';
import { DeviceSwitcher } from './DeviceSwitcher';
import { Icon } from './Icon';
import { ProblemsIndicator } from './ProblemsIndicator';
import { RelatedCssPanel } from './RelatedCssPanel';
import { SelectionOverlay } from './SelectionOverlay';
import { ZoomControls } from './ZoomControls';
import styles from './PreviewPane.module.css';

const AUTO_UPDATE_DEBOUNCE_MS = 500;

export function PreviewPane() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const files = useEditorStore((state) => state.files);
  const autoUpdate = useEditorStore((state) => state.autoUpdate);
  const cursor = useEditorStore((state) => state.cursor);
  const revealPosition = useEditorStore((state) => state.revealPosition);

  const srcDoc = usePreviewStore((state) => state.srcDoc);
  const buildVersion = usePreviewStore((state) => state.buildVersion);
  const entries = usePreviewStore((state) => state.entries);
  const missingResources = usePreviewStore((state) => state.missingResources);
  const device = usePreviewStore((state) => state.device);
  const setDevice = usePreviewStore((state) => state.setDevice);
  const zoom = usePreviewStore((state) => state.zoom);
  const zoomIn = usePreviewStore((state) => state.zoomIn);
  const zoomOut = usePreviewStore((state) => state.zoomOut);
  const resetZoom = usePreviewStore((state) => state.resetZoom);
  const problems = usePreviewStore((state) => state.problems);
  const addProblem = usePreviewStore((state) => state.addProblem);
  const setBuildResult = usePreviewStore((state) => state.setBuildResult);
  const patchBuildMeta = usePreviewStore((state) => state.patchBuildMeta);
  const lastFilesRef = useRef<Map<string, string>>(new Map());
  const lastScrollRef = useRef({ x: 0, y: 0 });
  const selectedRect = usePreviewStore((state) => state.selectedRect);
  const selectedEntryId = usePreviewStore((state) => state.selectedEntryId);
  const relatedCssRules = usePreviewStore((state) => state.relatedCssRules);
  const selectEntry = usePreviewStore((state) => state.selectEntry);
  const clearSelection = usePreviewStore((state) => state.clearSelection);
  const manualUpdateRequestId = usePreviewStore((state) => state.manualUpdateRequestId);
  const openAskEdith = useAskEdithStore((state) => state.openPanel);
  const fullscreen = usePreviewStore((state) => state.fullscreen);
  const setFullscreen = usePreviewStore((state) => state.setFullscreen);

  const rebuild = useCallback(
    (forceFull = false) => {
      const state = useEditorStore.getState();
      const mainFile = getMainFilePath(state.files);
      if (!mainFile) return;
      const snapshot = state.files.map((file) => ({ path: file.path, content: file.content }));
      const previous = lastFilesRef.current;
      const changed = snapshot.filter((file) => previous.get(file.path) !== file.content);
      lastFilesRef.current = new Map(snapshot.map((file) => [file.path, file.content]));

      const result = buildPreviewDocument(mainFile, snapshot);

      const cssOnly =
        !forceFull &&
        previous.size > 0 &&
        changed.length > 0 &&
        changed.every((file) => file.path.toLowerCase().endsWith('.css'));
      if (cssOnly) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'edith:replace-css', files: changed },
          '*',
        );
        patchBuildMeta({ entries: result.entries, missingResources: result.missingResources });
        return;
      }

      setBuildResult(result);
    },
    [patchBuildMeta, setBuildResult],
  );

  useEffect(() => {
    rebuild(true);
  }, [rebuild, manualUpdateRequestId]);

  useEffect(() => {
    if (!autoUpdate) return;
    const timer = setTimeout(() => rebuild(false), AUTO_UPDATE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [files, autoUpdate, rebuild]);

  // Messages from the sandboxed iframe: element clicks, JS/resource errors,
  // and rect replies. Page errors are caught at this postMessage boundary and
  // never reach Edith's own window (spec §17, §25).
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as Record<string, unknown> | undefined;
      if (!data || typeof data.type !== 'string') return;

      switch (data.type) {
        case 'edith:element-click': {
          const id = String(data.id);
          const entry = findEntryById(usePreviewStore.getState().entries, id);
          if (!entry) break; // no unambiguous source node → no navigation (spec §24)
          revealPosition({
            path: entry.openTagRange.file,
            line: entry.openTagRange.startLine,
            column: entry.openTagRange.startCol,
          });
          const cssFiles = useEditorStore
            .getState()
            .files.filter((file) => file.language === 'css')
            .map((file) => ({ path: file.path, content: file.content }));
          const elementId = typeof data.elementId === 'string' ? data.elementId : undefined;
          const classNames = Array.isArray(data.classNames) ? (data.classNames as string[]) : [];
          const related = findMatchingCssRules(cssFiles, {
            tagName: String(data.tagName),
            id: elementId,
            classNames,
          });
          selectEntry(id, (data.rect as Rect) ?? null, related, {
            tagName: String(data.tagName),
            id: elementId,
            classNames,
          });
          break;
        }
        case 'edith:rect': {
          const state = usePreviewStore.getState();
          const id = data.id == null ? null : String(data.id);
          if (id && state.selectedEntryId !== id) break;
          if (!id) {
            usePreviewStore.setState({ selectedRect: null });
            break;
          }
          selectEntry(id, (data.rect as Rect | null) ?? null, state.relatedCssRules);
          break;
        }
        case 'edith:error':
          addProblem({ kind: 'error', message: String(data.message) });
          break;
        case 'edith:resource-error':
          addProblem({
            kind: 'warning',
            message: `Failed to load ${String(data.tagName)}: ${String(data.src)}`,
          });
          break;
        case 'edith:scroll':
          lastScrollRef.current = { x: Number(data.x) || 0, y: Number(data.y) || 0 };
          break;
        default:
          break;
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addProblem, revealPosition, selectEntry]);

  // Code→Preview: cursor moved inside the entry HTML file → ask the iframe
  // for that element's live rect (spec §21). No match → clear the
  // highlight instead of guessing (spec §24).
  useEffect(() => {
    if (!cursor) return;
    const mainFile = getMainFilePath(useEditorStore.getState().files);
    if (cursor.path !== mainFile) return;
    const entry = findEntryAtPosition(entries, cursor.line, cursor.column);
    if (!entry) {
      iframeRef.current?.contentWindow?.postMessage({ type: 'edith:clear-rect' }, '*');
      clearSelection();
      return;
    }
    const shouldScroll = usePreviewStore.getState().selectedEntryId !== entry.id;
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'edith:query-rect', id: entry.id, scroll: shouldScroll },
      '*',
    );
    if (shouldScroll) {
      selectEntry(entry.id, null, []);
    }
  }, [cursor, entries, clearSelection, selectEntry]);

  const preset = DEVICE_PRESETS[device];

  return (
    <div className={styles.pane}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <DeviceSwitcher device={device} onChange={setDevice} />
          <ZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />
        </div>
        <div className={styles.toolbarGroup}>
          <ProblemsIndicator problems={problems} />
          {fullscreen && (
            // Раньше из полноэкранного режима можно было выйти только по Esc.
            <button
              type="button"
              className={`edith-btn ${styles.exitFullscreen}`}
              title="Exit fullscreen (Esc)"
              onClick={() => setFullscreen(false)}
            >
              <Icon name="minimize" />
              Exit
            </button>
          )}
        </div>
      </div>

      {missingResources.length > 0 && (
        <div className={styles.missingBanner}>
          <Icon name="warning" size={13} /> {missingResources.length} resource
          {missingResources.length === 1 ? '' : 's'} not found
          <ul>
            {missingResources.map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
        </div>
      )}

      <RelatedCssPanel
        rules={relatedCssRules}
        onJump={(file, line, column) => revealPosition({ path: file, line, column })}
      />

      {selectedEntryId && (
        <button
          type="button"
          className={`edith-btn ${styles.askEdithButton}`}
          onClick={() => openAskEdith({ level: 'explain', contextMode: 'selection' })}
        >
          <Icon name="sparkle" />
          Ask Edith about this element
        </button>
      )}

      <div className={styles.frameScroll}>
        {/* Sized to the zoomed footprint so .frameScroll's scrollbars reflect
            the actual visual size — the transform below scales .frameWrap's
            painted output to match, without touching its layout box. */}
        <div
          className={styles.zoomBox}
          style={{ width: preset.width * zoom, height: preset.height * zoom }}
        >
          <div
            className={styles.frameWrap}
            ref={wrapRef}
            style={{ width: preset.width, height: preset.height, transform: `scale(${zoom})` }}
          >
            <iframe
              key={buildVersion}
              ref={iframeRef}
              className={styles.frame}
              title="Preview"
              sandbox="allow-scripts"
              srcDoc={srcDoc}
              onLoad={() => {
                const { x, y } = lastScrollRef.current;
                iframeRef.current?.contentWindow?.postMessage(
                  { type: 'edith:set-scroll', x, y },
                  '*',
                );
              }}
            />
            <SelectionOverlay rect={selectedRect} iframeEl={iframeRef.current} />
          </div>
        </div>
      </div>
    </div>
  );
}
