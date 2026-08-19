export interface CssRuleLocation {
  selectorText: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

function offsetToPosition(text: string, offset: number): { line: number; col: number } {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < offset; i++) {
    if (text[i] === '\n') {
      line++;
      lastNewline = i;
    }
  }
  return { line, col: offset - lastNewline };
}

// Blanks out /* ... */ comments (replacing each character but newlines with a
// space) so downstream scanning never has to special-case them, while every
// offset stays numerically identical to the original source.
function stripComments(css: string): string {
  let result = '';
  let i = 0;
  const n = css.length;
  while (i < n) {
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      const commentEnd = end === -1 ? n : end + 2;
      for (let j = i; j < commentEnd; j++) {
        result += css[j] === '\n' ? '\n' : ' ';
      }
      i = commentEnd;
      continue;
    }
    result += css[i];
    i++;
  }
  return result;
}

/**
 * Finds every `selector { ... }` block in a CSS file, including ones nested
 * inside @media/@supports (their condition is not evaluated — spec §22 does
 * not resolve media queries, it only lists matching rules by selector).
 * Quoted strings are skipped so a stray brace inside one doesn't break block
 * boundaries. @-rule preludes (e.g. `@media (...)`, `@font-face`) are tracked
 * only to keep brace nesting correct — they never become entries.
 */
export function findCssRules(css: string): CssRuleLocation[] {
  const text = stripComments(css);
  const rules: CssRuleLocation[] = [];
  const openStack: (CssRuleLocation | null)[] = [];
  let blockStart = 0;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < n && text[i] !== quote) {
        i += text[i] === '\\' ? 2 : 1;
      }
      i++;
      continue;
    }
    if (ch === '{') {
      const rawSelector = text.slice(blockStart, i);
      const selectorText = rawSelector.trim();
      if (selectorText && !selectorText.startsWith('@')) {
        const leadingWhitespace = rawSelector.length - rawSelector.trimStart().length;
        const start = offsetToPosition(text, blockStart + leadingWhitespace);
        const entry: CssRuleLocation = {
          selectorText,
          startLine: start.line,
          startCol: start.col,
          endLine: -1,
          endCol: -1,
        };
        rules.push(entry);
        openStack.push(entry);
      } else {
        openStack.push(null);
      }
      blockStart = i + 1;
      i++;
      continue;
    }
    if (ch === '}') {
      const entry = openStack.pop();
      if (entry) {
        const end = offsetToPosition(text, i + 1);
        entry.endLine = end.line;
        entry.endCol = end.col;
      }
      blockStart = i + 1;
      i++;
      continue;
    }
    i++;
  }

  return rules.filter((rule) => rule.endLine !== -1);
}
