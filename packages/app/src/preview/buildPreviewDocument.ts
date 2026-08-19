import { dirname, isLocalResourceUrl, resolveRelativePath } from '@edith/core';
import { buildMapperDocument, type MapperEntry } from '@edith/mapper';
import { PREVIEW_BRIDGE_SCRIPT } from './bridgeScript';

export interface PreviewSourceFile {
  path: string;
  content: string;
}

export interface PreviewBuildResult {
  srcDoc: string;
  entries: MapperEntry[];
  missingResources: string[];
}

/**
 * Turns the entry HTML file into a self-contained document for the Preview
 * iframe: local <link rel="stylesheet"> and <script src> are inlined (the
 * sandboxed srcdoc has no real base to fetch them from), the mapper's
 * data-edith-id markers are injected, and the postMessage bridge is added.
 * Local <img>/font references that aren't inlined here yet simply 404 inside
 * the iframe, which naturally surfaces as a missing-resource problem (§13) —
 * binary asset inlining lands once the editor store carries real file blobs.
 */
export function buildPreviewDocument(entryPath: string, files: PreviewSourceFile[]): PreviewBuildResult {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const entryFile = byPath.get(entryPath);
  if (!entryFile) {
    return { srcDoc: '', entries: [], missingResources: [] };
  }

  const { renderedHtml, entries } = buildMapperDocument(entryFile.content, entryPath);
  const baseDir = dirname(entryPath);
  const missingResources: string[] = [];

  const doc = new DOMParser().parseFromString(renderedHtml, 'text/html');

  for (const link of Array.from(doc.querySelectorAll('link'))) {
    const rel = (link.getAttribute('rel') ?? '').toLowerCase().split(/\s+/);
    const href = link.getAttribute('href');
    if (!rel.includes('stylesheet') || !href || !isLocalResourceUrl(href)) continue;
    const resolved = resolveRelativePath(href, baseDir);
    const file = byPath.get(resolved);
    if (!file) {
      missingResources.push(resolved);
      continue;
    }
    const style = doc.createElement('style');
    style.setAttribute('data-edith-src', resolved);
    style.textContent = file.content;
    link.replaceWith(style);
  }

  for (const script of Array.from(doc.querySelectorAll('script[src]'))) {
    const src = script.getAttribute('src');
    if (!src || !isLocalResourceUrl(src)) continue;
    const resolved = resolveRelativePath(src, baseDir);
    const file = byPath.get(resolved);
    if (!file) {
      missingResources.push(resolved);
      continue;
    }
    script.removeAttribute('src');
    script.setAttribute('data-edith-src', resolved);
    script.textContent = file.content;
  }

  // Inserted first, before any other script — otherwise its window 'error'
  // listener would register too late to catch an error thrown synchronously
  // by the page's own top-level script code.
  const bridge = doc.createElement('script');
  bridge.textContent = PREVIEW_BRIDGE_SCRIPT;
  doc.head.insertBefore(bridge, doc.head.firstChild);

  return { srcDoc: `<!doctype html>${doc.documentElement.outerHTML}`, entries, missingResources };
}
