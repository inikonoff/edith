import { useState } from 'react';
import { useAskEdithStore } from '../store/askEdithStore';
import type { ProblemItem } from '../store/previewStore';
import styles from './ProblemsIndicator.module.css';

interface ProblemsIndicatorProps {
  problems: ProblemItem[];
}

export function ProblemsIndicator({ problems }: ProblemsIndicatorProps) {
  const [open, setOpen] = useState(false);
  const openAskEdith = useAskEdithStore((state) => state.openPanel);
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
              {problem.kind === 'error' && (
                <button
                  type="button"
                  className={styles.fixLink}
                  onClick={() =>
                    openAskEdith({ level: 'fix', contextMode: 'page', problemMessage: problem.message })
                  }
                >
                  Fix with Ask Edith
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
