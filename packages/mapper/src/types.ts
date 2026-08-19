export const DATA_ATTR = 'data-edith-id';

export interface SourceRange {
  file: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

export interface MapperEntry {
  id: string;
  tagName: string;
  /** Full element range (open tag through matching close tag), used for Code→Preview containment lookups. */
  range: SourceRange;
  /** Opening-tag-only range, used to focus/highlight code on a Preview→Code jump. */
  openTagRange: SourceRange;
}

export interface ElementSelectorInfo {
  tagName: string;
  id?: string;
  classNames: string[];
}

export interface MatchedCssRule {
  selector: string;
  range: SourceRange;
}
