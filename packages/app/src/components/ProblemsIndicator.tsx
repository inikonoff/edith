import { useState } from 'react';
import type { ProblemItem } from '../store/previewStore';
import styles from './ProblemsIndicator.module.css';

interface ProblemsIndicatorProps {
  problems: ProblemItem[];
}

export function ProblemsIndicator({ problems }: ProblemsIndicatorProps) {
  const [open, setOpen] = useState(false);
  const errors = problems.filter((problem) => problem.kind === 'error');
  const warnings = problems.filter((problem) => problem.kind === 'warning');

  if (problems.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.badge} onClick={() => setOpen((value) => !value)}>
        ⚠ {errors.length} error{errors.length === 1 ? '' : 's'}
        {warnings.length > 0 && ` · ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`}
      </button>
      {open && (
        <ul className={styles.details}>
          {problems.map((problem) => (
            <li key={problem.id} className={problem.kind === 'error' ? styles.error : styles.warning}>
              {problem.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
