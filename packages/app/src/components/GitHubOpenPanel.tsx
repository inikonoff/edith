import {
  fetchEntryWithDependencies,
  getStoredToken,
  listHtmlFiles,
  resolveDefaultBranch,
  setStoredToken,
  type RepoHtmlFile,
  type RepoRef,
} from '@edith/git';
import { useState } from 'react';
import { importPage, loadPageForEditor, type DependencyFileInput } from '../page/pageService';
import { useEditorStore } from '../store/editorStore';
import styles from './GitHubOpenPanel.module.css';

type Step = 'form' | 'files';

interface GitHubOpenPanelProps {
  onImported: () => void;
}

// Spec §28-31: GitHub is a source of files, not a Git IDE — a repo/branch,
// pick an HTML file, and its local dependencies come along automatically.
export function GitHubOpenPanel({ onImported }: GitHubOpenPanelProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [token, setToken] = useState(() => getStoredToken() ?? '');
  const [repoInput, setRepoInput] = useState('');
  const [branchInput, setBranchInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [htmlFiles, setHtmlFiles] = useState<RepoHtmlFile[]>([]);
  const [ref, setRef] = useState<RepoRef | null>(null);
  const loadPage = useEditorStore((state) => state.loadPage);

  async function handleListFiles() {
    setError(null);
    setBusy(true);
    try {
      if (!token.trim()) throw new Error('A GitHub personal access token is required.');
      setStoredToken(token.trim());
      const [owner, repoName] = repoInput.split('/').map((part) => part.trim());
      if (!owner || !repoName) throw new Error('Enter the repository as "owner/repo".');
      const branch = branchInput.trim() || (await resolveDefaultBranch(owner, repoName, token.trim()));
      const files = await listHtmlFiles({ owner, repo: repoName, branch }, token.trim());
      if (files.length === 0) throw new Error('No HTML files found on that branch.');
      setRef({ owner, repo: repoName, branch });
      setHtmlFiles(files);
      setStep('files');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handlePickFile(path: string) {
    if (!ref) return;
    setBusy(true);
    setError(null);
    try {
      const { entry, dependencies, commitSha } = await fetchEntryWithDependencies(ref, path, token.trim());
      const dependencyInputs: DependencyFileInput[] = dependencies.map((dependency) => ({
        path: dependency.path,
        kind: dependency.kind,
        mimeType: dependency.mimeType,
        content: dependency.content,
      }));
      const { page, failedFiles } = await importPage(entry.path, entry.content as string, dependencyInputs, {
        repo: `${ref.owner}/${ref.repo}`,
        branch: ref.branch,
        path: entry.path,
        lastSyncedCommitSha: commitSha,
      });
      if (failedFiles.length > 0) {
        setError(`Skipped (too large): ${failedFiles.map((f) => f.path).join(', ')}`);
      }
      const loaded = await loadPageForEditor(page.id);
      if (loaded) loadPage({ ...loaded, fileHandle: null });
      setOpen(false);
      setStep('form');
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={styles.openCard} onClick={() => setOpen(true)}>
        + Open from GitHub
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      {error && <div className={styles.error}>{error}</div>}

      {step === 'form' && (
        <>
          <label className={styles.field}>
            Personal access token
            <input type="password" value={token} onChange={(event) => setToken(event.target.value)} />
          </label>
          <label className={styles.field}>
            Repository (owner/repo)
            <input
              type="text"
              value={repoInput}
              onChange={(event) => setRepoInput(event.target.value)}
              placeholder="owner/repo"
            />
          </label>
          <label className={styles.field}>
            Branch (optional — defaults to the repo's default branch)
            <input type="text" value={branchInput} onChange={(event) => setBranchInput(event.target.value)} />
          </label>
          <div className={styles.actions}>
            <button type="button" onClick={handleListFiles} disabled={busy}>
              List HTML files
            </button>
            <button type="button" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
          </div>
        </>
      )}

      {step === 'files' && (
        <>
          <p>Pick the entry HTML file:</p>
          <ul className={styles.fileList}>
            {htmlFiles.map((file) => (
              <li key={file.path}>
                <button type="button" onClick={() => handlePickFile(file.path)} disabled={busy}>
                  {file.path}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setStep('form')} disabled={busy}>
            Back
          </button>
        </>
      )}
    </div>
  );
}
