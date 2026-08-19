import { deletePage, findLocalDependencies, getFileKindFromPath, listPages, type PageRecord } from '@edith/core';
import { useCallback, useEffect, useState } from 'react';
import { formatRelativeDate } from '../page/formatDate';
import {
  matchFilesToDependencies,
  pickDependencyFiles,
  pickHtmlFile,
} from '../page/openLocalFile';
import { importPage, loadPageForEditor, mimeTypeForPath, type DependencyFileInput } from '../page/pageService';
import { useEditorStore } from '../store/editorStore';
import { GitHubOpenPanel } from './GitHubOpenPanel';
import { ThemeSwitcher } from './ThemeSwitcher';
import styles from './LauncherScreen.module.css';

interface PendingImport {
  mainPath: string;
  mainContent: string;
  dependencies: string[];
  fileHandle: FileSystemFileHandle | null;
}

export function LauncherScreen() {
  const loadPage = useEditorStore((state) => state.loadPage);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const stored = await listPages();
    stored.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
    setPages(stored);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function finalizeImport(
    mainPath: string,
    mainContent: string,
    dependencies: DependencyFileInput[],
    fileHandle: FileSystemFileHandle | null,
  ) {
    setBusy(true);
    setError(null);
    try {
      const { page, failedFiles } = await importPage(mainPath, mainContent, dependencies);
      if (failedFiles.length > 0) {
        setError(`Skipped (too large): ${failedFiles.map((f) => f.path).join(', ')}`);
      }
      const loaded = await loadPageForEditor(page.id);
      if (loaded) loadPage({ ...loaded, fileHandle });
      setPendingImport(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenFile() {
    setError(null);
    let picked;
    try {
      picked = await pickHtmlFile();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    if (!picked) return;

    const dependencies = findLocalDependencies(picked.content, picked.name);
    if (dependencies.length === 0) {
      await finalizeImport(picked.name, picked.content, [], picked.fileHandle);
    } else {
      setPendingImport({
        mainPath: picked.name,
        mainContent: picked.content,
        dependencies,
        fileHandle: picked.fileHandle,
      });
    }
  }

  async function handleLoadDependencies() {
    if (!pendingImport) return;
    setBusy(true);
    try {
      const files = await pickDependencyFiles();
      const { matched } = matchFilesToDependencies(pendingImport.dependencies, files);
      const dependencyInputs: DependencyFileInput[] = [];
      for (const [path, file] of matched) {
        const kind = getFileKindFromPath(path);
        dependencyInputs.push({
          path,
          kind,
          mimeType: file.type || mimeTypeForPath(path),
          content: kind === 'text' ? await file.text() : file,
        });
      }
      await finalizeImport(
        pendingImport.mainPath,
        pendingImport.mainContent,
        dependencyInputs,
        pendingImport.fileHandle,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSkipDependencies() {
    if (!pendingImport) return;
    await finalizeImport(pendingImport.mainPath, pendingImport.mainContent, [], pendingImport.fileHandle);
  }

  async function handleOpenPage(pageId: string) {
    // Reopened from My Pages, not a live picker — no disk handle to write back to.
    const loaded = await loadPageForEditor(pageId);
    if (loaded) loadPage({ ...loaded, fileHandle: null });
  }

  async function handleDelete(pageId: string) {
    await deletePage(pageId);
    setConfirmDeleteId(null);
    refresh();
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1>Edith</h1>
        <ThemeSwitcher />
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {pendingImport && (
        <div className={styles.dependencyPrompt}>
          <p>Page uses additional files:</p>
          <ul>
            {pendingImport.dependencies.map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
          <div className={styles.dependencyActions}>
            <button type="button" onClick={handleLoadDependencies} disabled={busy}>
              Load dependencies
            </button>
            <button type="button" onClick={handleSkipDependencies} disabled={busy}>
              Continue without them
            </button>
          </div>
        </div>
      )}

      <h2 className={styles.sectionTitle}>My Pages</h2>
      <div className={styles.grid}>
        {pages.map((page) => (
          <div key={page.id} className={styles.card}>
            <button type="button" className={styles.cardBody} onClick={() => handleOpenPage(page.id)}>
              <strong>{page.title}</strong>
              <span className={styles.mainFile}>{page.mainFile}</span>
              <span className={styles.date}>{formatRelativeDate(page.updatedAt)}</span>
            </button>
            {confirmDeleteId === page.id ? (
              <div className={styles.confirmDelete}>
                <span>Delete this page?</span>
                <button type="button" onClick={() => handleDelete(page.id)}>
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.deleteButton}
                title="Delete page"
                onClick={() => setConfirmDeleteId(page.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}

        <button type="button" className={styles.openCard} onClick={handleOpenFile} disabled={busy}>
          + Open file
        </button>
        <GitHubOpenPanel onImported={refresh} />
      </div>
    </div>
  );
}
