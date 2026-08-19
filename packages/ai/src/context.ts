import { findMatchingCssRules, type SourceRange } from '@edith/mapper';
import { parse } from 'parse5';
import type { ContextMode } from './models';
import type { AiEdit } from './patch';

// Same pragmatic minimal shape used by core/fileLoader.ts and
// mapper/htmlAst.ts — parse5's own tree-adapter types are awkward to narrow
// generically for a plain recursive walk.
interface Location {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}
interface Parse5Node {
  tagName?: string;
  childNodes?: Parse5Node[];
  sourceCodeLocation?: Location | null;
}

export interface ContextFile {
  path: string;
  content: string;
}

export interface SelectionInfo {
  range: SourceRange;
  tagName: string;
  id?: string;
  classNames: string[];
}

export interface CssSnippet {
  file: string;
  content: string;
  /** Line this snippet starts at in the real file (1-based) — needed to remap the model's edits back. */
  startLine: number;
}

export interface AskContext {
  mode: ContextMode;
  entryFile: string;
  html: string;
  /** Line `html` starts at in the real entry file (1-based); undefined in `page` mode, where html IS the whole file. */
  snippetStartLine?: number;
  cssSnippets: CssSnippet[];
}

function extractLines(content: string, startLine: number, endLine: number): string {
  return content.split('\n').slice(startLine - 1, endLine).join('\n');
}

function rangeContains(outer: SourceRange, inner: SourceRange): boolean {
  const startOk =
    outer.startLine < inner.startLine || (outer.startLine === inner.startLine && outer.startCol <= inner.startCol);
  const endOk = outer.endLine > inner.endLine || (outer.endLine === inner.endLine && outer.endCol >= inner.endCol);
  return startOk && endOk;
}

function rangeSize(range: SourceRange): number {
  return (range.endLine - range.startLine) * 100_000 + (range.endCol - range.startCol);
}

function rangeKey(range: SourceRange): string {
  return `${range.startLine}:${range.startCol}-${range.endLine}:${range.endCol}`;
}

const SEMANTIC_CONTAINER_TAGS = new Set(['section', 'article', 'header', 'footer', 'nav', 'main', 'form']);

/**
 * Finds the closest ancestor of `selectionRange` to use as "Section"
 * context: the nearest semantic container tag if one exists in the ancestor
 * chain, otherwise just the immediate parent element. The mapper package
 * doesn't track parent/child relationships (spec §20 only needs id→range),
 * so this re-parses the file with its own lightweight walk rather than
 * extending that model for a single AI-only need.
 */
export function findSectionRange(html: string, selectionRange: SourceRange): SourceRange | undefined {
  const document = parse(html, { sourceCodeLocationInfo: true }) as unknown as Parse5Node;
  const elements: SourceRange[] = [];
  const tagsByRangeKey = new Map<string, string>();

  const walk = (node: Parse5Node): void => {
    if (node.tagName && node.sourceCodeLocation) {
      const range: SourceRange = {
        file: selectionRange.file,
        startLine: node.sourceCodeLocation.startLine,
        startCol: node.sourceCodeLocation.startCol,
        endLine: node.sourceCodeLocation.endLine,
        endCol: node.sourceCodeLocation.endCol,
      };
      elements.push(range);
      tagsByRangeKey.set(rangeKey(range), node.tagName);
    }
    for (const child of node.childNodes ?? []) walk(child);
  };
  walk(document);

  const ancestors = elements
    .filter((range) => rangeContains(range, selectionRange) && rangeSize(range) > rangeSize(selectionRange))
    .sort((a, b) => rangeSize(a) - rangeSize(b));

  const semanticAncestor = ancestors.find((range) =>
    SEMANTIC_CONTAINER_TAGS.has(tagsByRangeKey.get(rangeKey(range)) ?? ''),
  );
  return semanticAncestor ?? ancestors[0];
}

/**
 * Builds the context sent to the model for one of the three breadths (spec
 * §41-48). Selection/Section only ever include the selected element's own
 * lines plus CSS rules that exactly match it — Page is the only mode that
 * sends a whole file, and it's never the default (privacy: only the
 * necessary context goes out unless the user explicitly widens it).
 *
 * Extraction is whole-line, not column-precise: the model is shown and asked
 * to reference line numbers, so keeping every snippet's boundaries on real
 * line boundaries means those numbers can be remapped back to the full file
 * with a single per-file offset (see remapEditsToRealLines) instead of
 * tracking column math through the round trip.
 */
export function buildContext(
  mode: ContextMode,
  files: ContextFile[],
  mainPath: string,
  selection: SelectionInfo | null,
): AskContext {
  const mainFile = files.find((file) => file.path === mainPath);
  if (!mainFile) throw new Error(`Main file "${mainPath}" not found among open files`);

  const cssFiles = files
    .filter((file) => file.path.toLowerCase().endsWith('.css'))
    .map((file) => ({ path: file.path, content: file.content }));

  if (mode === 'page' || !selection) {
    return {
      mode: 'page',
      entryFile: mainPath,
      html: mainFile.content,
      cssSnippets: cssFiles.map((file) => ({ file: file.path, content: file.content, startLine: 1 })),
    };
  }

  const matchedRules = findMatchingCssRules(cssFiles, {
    tagName: selection.tagName,
    id: selection.id,
    classNames: selection.classNames,
  });
  const cssSnippets: CssSnippet[] = matchedRules.map((rule) => ({
    file: rule.range.file,
    content: extractLines(
      files.find((file) => file.path === rule.range.file)?.content ?? '',
      rule.range.startLine,
      rule.range.endLine,
    ),
    startLine: rule.range.startLine,
  }));

  const range = mode === 'selection' ? selection.range : (findSectionRange(mainFile.content, selection.range) ?? selection.range);
  return {
    mode,
    entryFile: mainPath,
    html: extractLines(mainFile.content, range.startLine, range.endLine),
    snippetStartLine: range.startLine,
    cssSnippets,
  };
}

/**
 * The model sees each snippet with its own 1-based numbering starting at
 * line 1 (see prompts.ts's formatNumberedSnippet) — this maps its edits back
 * to real line numbers in the actual file content before they're applied.
 */
export function remapEditsToRealLines(edits: AiEdit[], context: AskContext): AiEdit[] {
  const cssOffsets = new Map(context.cssSnippets.map((snippet) => [snippet.file, snippet.startLine - 1]));
  const entryOffset = (context.snippetStartLine ?? 1) - 1;

  return edits.map((edit) => {
    const offset = edit.file === context.entryFile ? entryOffset : (cssOffsets.get(edit.file) ?? 0);
    return { ...edit, startLine: edit.startLine + offset, endLine: edit.endLine + offset };
  });
}
