import { parse } from 'parse5';

// parse5's tree-adapter types are awkward to narrow generically for a plain
// recursive walk, so we work against the small shape we actually need.
interface Parse5Element {
  tagName?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: Parse5Element[];
}

const DEPENDENCY_ATTRS: Record<string, string[]> = {
  link: ['href'],
  script: ['src'],
  img: ['src'],
  source: ['src'],
  video: ['src', 'poster'],
  audio: ['src'],
};

export function isLocalResourceUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('#')) return false;
  if (trimmed.startsWith('//')) return false; // protocol-relative → external
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false; // has a URL scheme (http:, data:, mailto:, ...)
  return true;
}

export function resolveRelativePath(url: string, baseDir: string): string {
  const normalizedBase = baseDir ? `${baseDir.replace(/^\/+|\/+$/g, '')}/` : '';
  const resolved = new URL(url, `file:///${normalizedBase}`);
  return decodeURIComponent(resolved.pathname.replace(/^\//, ''));
}

/**
 * Finds local (non-external) resources referenced by an HTML document:
 * stylesheets, scripts, images, and media (spec §12).
 */
export function findLocalDependencies(html: string, entryFilePath: string): string[] {
  const baseDir = entryFilePath.includes('/')
    ? entryFilePath.slice(0, entryFilePath.lastIndexOf('/'))
    : '';
  const document = parse(html) as unknown as Parse5Element;
  const found = new Set<string>();

  const walk = (node: Parse5Element): void => {
    if (node.tagName && DEPENDENCY_ATTRS[node.tagName]) {
      for (const attrName of DEPENDENCY_ATTRS[node.tagName]!) {
        const attr = node.attrs?.find((a) => a.name === attrName);
        if (attr?.value && isLocalResourceUrl(attr.value)) {
          found.add(resolveRelativePath(attr.value, baseDir));
        }
      }
    }
    for (const child of node.childNodes ?? []) walk(child);
  };
  walk(document);

  return Array.from(found);
}
