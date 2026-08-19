export type FileKind = 'text' | 'binary';

export interface PageFileMeta {
  path: string;
  kind: FileKind;
  mimeType: string;
  size: number;
  isMain: boolean;
  lastModified: number;
}

export interface PageFileRecord extends PageFileMeta {
  pageId: string;
  content: string | Blob;
}

export type PageSource = 'local' | 'git';

export interface GitSourceInfo {
  repo: string;
  branch: string;
  path: string;
}

export interface PageRecord {
  id: string;
  title: string;
  mainFile: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  dirty: boolean;
  thumbnail?: string;
  source: PageSource;
  git?: GitSourceInfo;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface SelectionRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface ScrollPosition {
  scrollTop: number;
  scrollLeft: number;
}

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

export interface PreviewState {
  autoUpdate: boolean;
  device: PreviewDevice;
}

export interface EditorSessionState {
  pageId: string;
  activeFile: string;
  cursorPosition?: CursorPosition;
  selection?: SelectionRange;
  scrollPosition?: ScrollPosition;
  splitPosition?: number;
  previewState?: PreviewState;
}
