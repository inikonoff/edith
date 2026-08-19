import { getPage, putPage } from '@edith/core';
import { getStoredToken, saveFilesToGitHub, type RepoRef } from '@edith/git';
import { getMainFilePath, useEditorStore } from '../store/editorStore';
import { savePageContent } from './pageService';
import { writeFileToDisk } from './saveExport';

export interface SaveOutcome {
  ok: boolean;
  message?: string;
}

function parseRepoRef(repo: string, branch: string): RepoRef {
  const [owner, name] = repo.split('/');
  return { owner: owner ?? '', repo: name ?? '', branch };
}

/**
 * Local Save (spec §27): always persists to the Page Project in IndexedDB,
 * then also writes straight to disk if the file was opened via the File
 * System Access API, and pushes to GitHub in one commit if the page was
 * opened from a repo (spec §31). Each of those extra steps can fail without
 * undoing the local save that already succeeded — but a failure is always
 * reported, never silently swallowed as a plain "Saved."
 */
export async function saveCurrentPage(): Promise<SaveOutcome> {
  const state = useEditorStore.getState();
  if (!state.pageId) return { ok: false, message: 'No page is open.' };

  try {
    await savePageContent(state.pageId, state.files);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }

  useEditorStore.getState().markSaved();
  const messages: string[] = [];

  if (state.fileHandle) {
    const mainPath = getMainFilePath(state.files);
    const mainFile = state.files.find((file) => file.path === mainPath);
    if (mainFile) {
      try {
        await writeFileToDisk(state.fileHandle, mainFile.content);
      } catch (error) {
        messages.push(`couldn't write to disk: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  const page = await getPage(state.pageId);
  if (page?.source === 'git' && page.git) {
    const token = getStoredToken();
    if (!token) {
      messages.push("couldn't push to GitHub: no token stored");
    } else {
      try {
        const ref = parseRepoRef(page.git.repo, page.git.branch);
        const { commitSha } = await saveFilesToGitHub(
          ref,
          state.files.map((file) => ({ path: file.path, content: file.content })),
          `Edith: update ${page.mainFile}`,
          token,
        );
        await putPage({ ...page, git: { ...page.git, lastSyncedCommitSha: commitSha } });
        messages.push('pushed to GitHub');
      } catch (error) {
        messages.push(`couldn't push to GitHub: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return { ok: true, message: messages.length > 0 ? `Saved — ${messages.join('; ')}.` : undefined };
}
