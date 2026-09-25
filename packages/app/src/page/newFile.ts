import { dirname } from '@edith/core';
import { languageForPath } from '../editor/language';
import type { EditorFile } from '../store/editorStore';

export type NewFileKind = 'html' | 'css' | 'js' | 'json' | 'svg' | 'md';

export interface NewFileKindInfo {
  label: string;
  ext: string;
  defaultName: string;
  /** css/js можно сразу подключить к главной странице. */
  linkable: boolean;
}

export const NEW_FILE_KINDS: Record<NewFileKind, NewFileKindInfo> = {
  html: { label: 'HTML', ext: 'html', defaultName: 'page', linkable: false },
  css: { label: 'CSS', ext: 'css', defaultName: 'styles', linkable: true },
  js: { label: 'JS', ext: 'js', defaultName: 'script', linkable: true },
  json: { label: 'JSON', ext: 'json', defaultName: 'data', linkable: false },
  svg: { label: 'SVG', ext: 'svg', defaultName: 'image', linkable: false },
  md: { label: 'MD', ext: 'md', defaultName: 'notes', linkable: false },
};

export const NEW_FILE_KIND_ORDER: NewFileKind[] = ['html', 'css', 'js', 'json', 'svg', 'md'];

function templateFor(kind: NewFileKind, fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  switch (kind) {
    case 'html':
      return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${base}</title>
</head>
<body>
  <h1>${base}</h1>
</body>
</html>
`;
    case 'css':
      return `/* ${fileName} */\n\n`;
    case 'js':
      return `// ${fileName}\n\n`;
    case 'json':
      return '{\n  \n}\n';
    case 'svg':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect x="10" y="10" width="80" height="80" rx="8" fill="#e2e8f0" />
</svg>
`;
    case 'md':
      return `# ${base}\n\n`;
  }
}

/** Добавляет расширение, если его нет, и чистит недопустимые символы. */
export function normalizeFileName(raw: string, kind: NewFileKind): string {
  const ext = NEW_FILE_KINDS[kind].ext;
  const cleaned = raw
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/[<>:"|?*]/g, '');
  if (!cleaned) return '';
  return cleaned.toLowerCase().endsWith(`.${ext}`) ? cleaned : `${cleaned}.${ext}`;
}

/** Первое свободное имя: styles.css, styles-2.css, styles-3.css… */
export function suggestFileName(
  kind: NewFileKind,
  existingPaths: string[],
  mainPath: string,
): string {
  const { defaultName, ext } = NEW_FILE_KINDS[kind];
  const dir = dirname(mainPath);
  const taken = new Set(existingPaths);
  for (let index = 1; ; index++) {
    const name = index === 1 ? `${defaultName}.${ext}` : `${defaultName}-${index}.${ext}`;
    if (!taken.has(dir ? `${dir}/${name}` : name)) return name;
  }
}

/** Путь нового файла — рядом с главным HTML, чтобы ссылки были простыми. */
export function resolveNewFilePath(fileName: string, mainPath: string): string {
  const dir = dirname(mainPath);
  return dir ? `${dir}/${fileName}` : fileName;
}

export function createEditorFile(kind: NewFileKind, path: string): EditorFile {
  const fileName = path.split('/').pop() ?? path;
  return {
    path,
    language: languageForPath(path),
    content: templateFor(kind, fileName),
    isMain: false,
  };
}

/**
 * Вставляет <link>/<script> в главную страницу. href — относительно главного
 * файла (новый файл лежит рядом, поэтому это просто имя). Возвращает null,
 * если вставлять не нужно или уже подключено.
 */
export function linkIntoHtml(html: string, kind: NewFileKind, href: string): string | null {
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (kind === 'css') {
    if (new RegExp(`<link[^>]+href=["']${escaped}["']`, 'i').test(html)) return null;
    const tag = `<link rel="stylesheet" href="${href}" />`;
    return (
      insertBefore(html, /<\/head>/i, tag) ??
      insertBefore(html, /<body[^>]*>/i, tag, true) ??
      `${tag}\n${html}`
    );
  }
  if (kind === 'js') {
    if (new RegExp(`<script[^>]+src=["']${escaped}["']`, 'i').test(html)) return null;
    const tag = `<script src="${href}"></script>`;
    return insertBefore(html, /<\/body>/i, tag) ?? `${html}\n${tag}\n`;
  }
  return null;
}

function insertBefore(html: string, pattern: RegExp, tag: string, after = false): string | null {
  const match = pattern.exec(html);
  if (!match) return null;
  const position = after ? match.index + match[0].length : match.index;
  // Отступ берём у строки с закрывающим тегом, чтобы вставка выглядела аккуратно.
  const lineStart = html.lastIndexOf('\n', match.index) + 1;
  const indent = /^[ \t]*/.exec(html.slice(lineStart))?.[0] ?? '';
  const insertion = after ? `\n${indent}  ${tag}` : `  ${tag}\n${indent}`;
  return html.slice(0, position) + insertion + html.slice(position);
}
