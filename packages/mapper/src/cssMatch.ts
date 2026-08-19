import { findCssRules } from './cssRules';
import type { ElementSelectorInfo, MatchedCssRule, SourceRange } from './types';

const BARE_IDENTIFIER = /^[a-zA-Z][\w-]*$/;

/**
 * MVP rule (spec §22): a CSS selector "matches" only if it is a single bare
 * tag name, `.class`, or `#id` that exactly equals one of the element's own
 * tag/class/id — no specificity, no cascade, no compound/combinator
 * selectors (`button.buy`, `.a .b`, ...).
 */
function selectorMatchesElement(selector: string, el: ElementSelectorInfo): boolean {
  if (selector.startsWith('#')) return selector.slice(1) === el.id;
  if (selector.startsWith('.')) return el.classNames.includes(selector.slice(1));
  return BARE_IDENTIFIER.test(selector) && selector.toLowerCase() === el.tagName.toLowerCase();
}

export function findMatchingCssRules(
  cssFiles: { path: string; content: string }[],
  element: ElementSelectorInfo,
): MatchedCssRule[] {
  const matches: MatchedCssRule[] = [];

  for (const file of cssFiles) {
    for (const rule of findCssRules(file.content)) {
      for (const selector of rule.selectorText.split(',').map((s) => s.trim())) {
        if (selectorMatchesElement(selector, element)) {
          const range: SourceRange = {
            file: file.path,
            startLine: rule.startLine,
            startCol: rule.startCol,
            endLine: rule.endLine,
            endCol: rule.endCol,
          };
          matches.push({ selector, range });
        }
      }
    }
  }

  return matches;
}
