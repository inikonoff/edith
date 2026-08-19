import { findLocalDependencies, getFileKindFromPath, mimeTypeForPath } from '@edith/core';
import { base64ToBlob, base64ToText, blobToBase64 } from './base64';
import {
  createBlob,
  createCommit,
  createTree,
  getBranchHeadCommit,
  getCommitTreeSha,
  getFileContent,
  getRepo,
  getTreeRecursive,
  updateRef,
  type NewTreeEntry,
} from './githubApi';

export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

export async function resolveDefaultBranch(owner: string, repo: string, token: string): Promise<string> {
  const info = await getRepo(owner, repo, token);
  return info.defaultBranch;
}

export interface RepoHtmlFile {
  path: string;
}

/** Lists candidate entry files for the "pick an HTML file" step (spec §28-30). */
export async function listHtmlFiles(ref: RepoRef, token: string): Promise<RepoHtmlFile[]> {
  const headSha = await getBranchHeadCommit(ref.owner, ref.repo, ref.branch, token);
  const treeSha = await getCommitTreeSha(ref.owner, ref.repo, headSha, token);
  const tree = await getTreeRecursive(ref.owner, ref.repo, treeSha, token);
  return tree
    .filter((entry) => entry.type === 'blob' && /\.html?$/i.test(entry.path))
    .map((entry) => ({ path: entry.path }));
}

export interface FetchedGitFile {
  path: string;
  kind: 'text' | 'binary';
  mimeType: string;
  content: string | Blob;
}

/**
 * Fetches the chosen entry file plus every local dependency the File Loader
 * finds in it, straight from the repo — no manual "load dependencies" step
 * is needed here, unlike local-disk open, because the whole tree is already
 * known (spec §28-30 checklist: "Загрузка зависимостей из репозитория").
 */
export async function fetchEntryWithDependencies(
  ref: RepoRef,
  entryPath: string,
  token: string,
): Promise<{ entry: FetchedGitFile; dependencies: FetchedGitFile[]; commitSha: string }> {
  const commitSha = await getBranchHeadCommit(ref.owner, ref.repo, ref.branch, token);
  const entryFile = await getFileContent(ref.owner, ref.repo, ref.branch, entryPath, token);
  const entryContent = base64ToText(entryFile.content);
  const entry: FetchedGitFile = {
    path: entryPath,
    kind: 'text',
    mimeType: 'text/html',
    content: entryContent,
  };

  const dependencyPaths = findLocalDependencies(entryContent, entryPath);
  const dependencies: FetchedGitFile[] = [];
  for (const depPath of dependencyPaths) {
    try {
      const file = await getFileContent(ref.owner, ref.repo, ref.branch, depPath, token);
      const kind = getFileKindFromPath(depPath);
      dependencies.push({
        path: depPath,
        kind,
        mimeType: mimeTypeForPath(depPath),
        content: kind === 'text' ? base64ToText(file.content) : base64ToBlob(file.content, mimeTypeForPath(depPath)),
      });
    } catch {
      // Referenced but not found in the repo — left out; Preview's existing
      // missing-resource handling covers it from here (spec §13).
    }
  }

  return { entry, dependencies, commitSha };
}

export interface GitSaveFile {
  path: string;
  content: string | Blob;
}

/**
 * Commits every changed file in one commit via the Git Data API — blobs,
 * then a tree, then a commit, then the branch ref (spec §31). Any step
 * failing throws; the caller must not report success unless this resolves.
 */
export async function saveFilesToGitHub(
  ref: RepoRef,
  files: GitSaveFile[],
  message: string,
  token: string,
): Promise<{ commitSha: string }> {
  const parentSha = await getBranchHeadCommit(ref.owner, ref.repo, ref.branch, token);
  const baseTreeSha = await getCommitTreeSha(ref.owner, ref.repo, parentSha, token);

  const entries: NewTreeEntry[] = [];
  for (const file of files) {
    const blobSha =
      typeof file.content === 'string'
        ? await createBlob(ref.owner, ref.repo, file.content, 'utf-8', token)
        : await createBlob(ref.owner, ref.repo, await blobToBase64(file.content), 'base64', token);
    entries.push({ path: file.path, mode: '100644', type: 'blob', sha: blobSha });
  }

  const newTreeSha = await createTree(ref.owner, ref.repo, baseTreeSha, entries, token);
  const newCommitSha = await createCommit(ref.owner, ref.repo, message, newTreeSha, parentSha, token);
  await updateRef(ref.owner, ref.repo, ref.branch, newCommitSha, token);

  return { commitSha: newCommitSha };
}
