import type { MatchedCssRule } from '@edith/mapper';
import styles from './RelatedCssPanel.module.css';

interface RelatedCssPanelProps {
  rules: MatchedCssRule[];
  onJump: (file: string, line: number, column: number) => void;
}

export function RelatedCssPanel({ rules, onJump }: RelatedCssPanelProps) {
  if (rules.length === 0) return null;

  return (
    <div className={styles.panel}>
      <span className={styles.label}>Related CSS:</span>
      {rules.map((rule, index) => (
        <button
          key={`${rule.range.file}:${rule.range.startLine}:${index}`}
          type="button"
          className={styles.chip}
          onClick={() => onJump(rule.range.file, rule.range.startLine, rule.range.startCol)}
        >
          {rule.selector} <span className={styles.location}>{rule.range.file}:{rule.range.startLine}</span>
        </button>
      ))}
    </div>
  );
}
