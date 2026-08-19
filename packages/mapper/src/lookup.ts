import type { MapperEntry, SourceRange } from './types';

/** Preview → Code: resolve the element the user clicked back to its source range (§20.1). */
export function findEntryById(entries: MapperEntry[], id: string): MapperEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

function comparePosition(a: { line: number; col: number }, b: { line: number; col: number }): number {
  return a.line !== b.line ? a.line - b.line : a.col - b.col;
}

function rangeContains(range: SourceRange, line: number, col: number): boolean {
  const pos = { line, col };
  const start = { line: range.startLine, col: range.startCol };
  const end = { line: range.endLine, col: range.endCol };
  return comparePosition(pos, start) >= 0 && comparePosition(pos, end) <= 0;
}

function rangeSpan(range: SourceRange): number {
  // A coarse "how big is this range" proxy, good enough to pick the innermost
  // of several nested/overlapping candidates — exact character count isn't needed.
  return (range.endLine - range.startLine) * 100_000 + (range.endCol - range.startCol);
}

/**
 * Code → Preview: the innermost element whose source range contains the
 * cursor position, for highlighting the matching DOM node (§21). Returns
 * undefined when the cursor isn't inside any mappable element — callers must
 * not navigate in that case (§24).
 */
export function findEntryAtPosition(
  entries: MapperEntry[],
  line: number,
  col: number,
): MapperEntry | undefined {
  let best: MapperEntry | undefined;
  for (const entry of entries) {
    if (rangeContains(entry.range, line, col)) {
      if (!best || rangeSpan(entry.range) < rangeSpan(best.range)) {
        best = entry;
      }
    }
  }
  return best;
}
