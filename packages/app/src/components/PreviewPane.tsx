import { findEntryAtPosition, findEntryById, findMatchingCssRules } from '@edith/mapper';
import { useCallback, useEffect, useRef } from 'react';
import { buildPreviewDocument } from '../preview/buildPreviewDocument';
import { DEVICE_PRESETS } from '../preview/devicePresets';
import { getMainFilePath, useEditorStore } from '../store/editorStore';
import { type Rect, usePreviewStore } from '../store/previewStore';
import { DeviceSwitcher } from './DeviceSwitcher';
import { ProblemsIndicator } from './ProblemsIndicator';
import { RelatedCssPanel } from './RelatedCssPanel';
import { SelectionOverlay } from './SelectionOverlay';
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
  const problems = usePreviewStore((state) => state.problems);
  const addProblem = usePreviewStore((state) => state.addProblem);
  const setBuildResult = usePreviewStore((state) => state.setBuildResult);
  const selectedRect = usePreviewStore((state) => state.selectedRect);
  const relatedCssRules = usePreviewStore((state) => state.relatedCssRules);
  const selectEntry = usePreviewStore((state) => state.selectEntry);
  const clearSelection = usePreviewStore((state) => state.clearSelection);
  const manualUpdateRequestId = usePreviewStore((state) => state.manualUpdateRequestId);

  const rebuild = useCallback(() => {
    const state = useEditorStore.getState();
    const mainFile = getMainFilePath(state.files);
    if (!mainFile) return;
    const result = buildPreviewDocument(
      mainFile,
      state.files.map((file) => ({ path: file.path, content: file.content })),
    );
    setBuildResult(result);
  }, [setBuildResult]);

  // Initial render and the explicit "Update preview" button (available in both modes, spec §18).
  useEffect(() => {
    rebuild();
  }, [rebuild, manualUpdateRequestId]);

  // Auto Update: re-render a short debounce after edits stop (spec §18).
  useEffect(() => {
    if (!autoUpdate) return;
    const timer = setTimeout(rebuild, AUTO_UPDATE_DEBOUNCE_MS);
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
          const related = findMatchingCssRules(cssFiles, {
            tagName: String(data.tagName),
            id: typeof data.elementId === 'string' ? data.elementId : undefined,
            classNames: Array.isArray(data.classNames) ? (data.classNames as string[]) : [],
          });
          selectEntry(id, (data.rect as Rect) ?? null, related);
          break;
        }
        case 'edith:rect': {
          const state = usePreviewStore.getState();
          if (state.selectedEntryId !== data.id) break;
          selectEntry(String(data.id), (data.rect as Rect | null) ?? null, state.relatedCssRules);
          break;
        }
        case 'edith:error':
          addProblem({ kind: 'error', message: String(data.message) });
          break;
        case 'edith:resource-error':
          addProblem({ kind: 'warning', message: `Failed to load ${String(data.tagName)}: ${String(data.src)}` });
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
      clearSelection();
      return;
    }
    iframeRef.current?.contentWindow?.postMessage({ type: 'edith:query-rect', id: entry.id }, '*');
    selectEntry(entry.id, null, []);
  }, [cursor, entries, clearSelection, selectEntry]);

  const preset = DEVICE_PRESETS[device];

  return (
    <div className={styles.pane}>
      <div className={styles.toolbar}>
        <DeviceSwitcher device={device} onChange={setDevice} />
        <ProblemsIndicator problems={problems} />
      </div>

      {missingResources.length > 0 && (
        <div className={styles.missingBanner}>
          ⚠ {missingResources.length} resource{missingResources.length === 1 ? '' : 's'} not found
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

      <div className={styles.frameScroll}>
        <div
          className={styles.frameWrap}
          ref={wrapRef}
          style={{ width: preset.width, height: preset.height }}
        >
          <iframe
            key={buildVersion}
            ref={iframeRef}
            className={styles.frame}
            title="Preview"
            sandbox="allow-scripts"
            srcDoc={srcDoc}
          />
          <SelectionOverlay rect={selectedRect} iframeEl={iframeRef.current} wrapEl={wrapRef.current} />
        </div>
      </div>
    </div>
  );
}
