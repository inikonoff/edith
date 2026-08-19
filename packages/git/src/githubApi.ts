const API_BASE = 'https://api.github.com';

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new GitHubApiError(`GitHub API ${response.status} on ${path}: ${body || response.statusText}`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface RepoInfo {
  defaultBranch: string;
}

export async function getRepo(owner: string, repo: string, token: string): Promise<RepoInfo> {
  const data = await request<{ default_branch: string }>(`/repos/${owner}/${repo}`, token);
  return { defaultBranch: data.default_branch };
}

export interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export async function getBranchHeadCommit(
  owner: string,
  repo: string,
  branch: string,
  token: string,
): Promise<string> {
  const data = await request<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    token,
  );
  return data.object.sha;
}

export async function getCommitTreeSha(owner: string, repo: string, commitSha: string, token: string): Promise<string> {
  const data = await request<{ tree: { sha: string } }>(`/repos/${owner}/${repo}/git/commits/${commitSha}`, token);
  return data.tree.sha;
}

export async function getTreeRecursive(
  owner: string,
  repo: string,
  treeSha: string,
  token: string,
): Promise<TreeEntry[]> {
  const data = await request<{ tree: TreeEntry[]; truncated: boolean }>(
    `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    token,
  );
  return data.tree;
}

export interface FileContent {
  content: string;
  encoding: string;
  sha: string;
}

/** Read path: simpler than the blob API for fetching one file's content by path. */
export async function getFileContent(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  token: string,
): Promise<FileContent> {
  return request(
    `/repos/${owner}/${repo}/contents/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}?ref=${encodeURIComponent(branch)}`,
    token,
  );
}

export async function createBlob(
  owner: string,
  repo: string,
  content: string,
  encoding: 'utf-8' | 'base64',
  token: string,
): Promise<string> {
  const data = await request<{ sha: string }>(`/repos/${owner}/${repo}/git/blobs`, token, {
    method: 'POST',
    body: JSON.stringify({ content, encoding }),
  });
  return data.sha;
}

export interface NewTreeEntry {
  path: string;
  mode: '100644';
  type: 'blob';
  sha: string;
}

export async function createTree(
  owner: string,
  repo: string,
  baseTreeSha: string,
  entries: NewTreeEntry[],
  token: string,
): Promise<string> {
  const data = await request<{ sha: string }>(`/repos/${owner}/${repo}/git/trees`, token, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTreeSha, tree: entries }),
  });
  return data.sha;
}

export async function createCommit(
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parentSha: string,
  token: string,
): Promise<string> {
  const data = await request<{ sha: string }>(`/repos/${owner}/${repo}/git/commits`, token, {
    method: 'POST',
    body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] }),
  });
  return data.sha;
}

export async function updateRef(
  owner: string,
  repo: string,
  branch: string,
  commitSha: string,
  token: string,
): Promise<void> {
  await request(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commitSha }),
  });
}
