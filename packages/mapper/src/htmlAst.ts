import { parse, serialize } from 'parse5';
import { DATA_ATTR, type MapperEntry, type SourceRange } from './types';

// parse5's tree-adapter types are awkward to narrow generically for a plain
// recursive walk (see packages/core/src/fileLoader.ts for the same call),
// so we work against the small shape we actually need.
interface Location {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}
interface ElementLocation extends Location {
  startTag?: Location;
}
interface Parse5Node {
  tagName?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: Parse5Node[];
  sourceCodeLocation?: ElementLocation | null;
}

function toRange(file: string, loc: Location): SourceRange {
  return {
    file,
    startLine: loc.startLine,
    startCol: loc.startCol,
    endLine: loc.endLine,
    endCol: loc.endCol,
  };
}

export interface MapperDocument {
  /** HTML with a `data-edith-id` attribute injected on every mappable element, ready for the Preview iframe. */
  renderedHtml: string;
  entries: MapperEntry[];
}

/**
 * Parses an HTML file, assigns a `data-edith-id` to every element that has a
 * source location, and returns both the re-serialized HTML (for Preview) and
 * the id → source-range table (spec §20).
 */
export function buildMapperDocument(html: string, file: string): MapperDocument {
  const documentNode = parse(html, { sourceCodeLocationInfo: true });
  const walkable = documentNode as unknown as Parse5Node;
  const entries: MapperEntry[] = [];
  let counter = 0;

  const walk = (node: Parse5Node): void => {
    if (node.tagName && node.sourceCodeLocation && node.attrs) {
      const id = `edith-${counter++}`;
      node.attrs.push({ name: DATA_ATTR, value: id });
      entries.push({
        id,
        tagName: node.tagName,
        range: toRange(file, node.sourceCodeLocation),
        openTagRange: toRange(file, node.sourceCodeLocation.startTag ?? node.sourceCodeLocation),
      });
    }
    for (const child of node.childNodes ?? []) walk(child);
  };
  walk(walkable);

  return { renderedHtml: serialize(documentNode), entries };
}
