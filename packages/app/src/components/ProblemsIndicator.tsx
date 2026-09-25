import { useCallback, useRef, useState } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import { useAskEdithStore } from '../store/askEdithStore';
import type { ProblemItem } from '../store/previewStore';
import styles from './ProblemsIndicator.module.css';

interface ProblemsIndicatorProps {
  problems: ProblemItem[];
}

export function ProblemsIndicator({ problems }: ProblemsIndicatorProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapRef, open, close);
  const openAskEdith = useAskEdithStore((state) => state.openPanel);
  const errors = problems.filter((problem) => problem.kind === 'error');
  const warnings = problems.filter((problem) => problem.kind === 'warning');

  if (problems.length === 0) return null;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.badge} ${errors.length > 0 ? styles.badgeError : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.badgeDot} aria-hidden="true" />
        {[
          errors.length > 0 && `${errors.length} error${errors.length === 1 ? '' : 's'}`,
          warnings.length > 0 && `${warnings.length} warning${warnings.length === 1 ? '' : 's'}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </button>
      {open && (
        <ul className={styles.details}>
          {problems.map((problem) => (
            <li
              key={problem.id}
              className={problem.kind === 'error' ? styles.error : styles.warning}
            >
              {problem.message}
              {problem.kind === 'error' && (
                <button
                  type="button"
                  className={styles.fixLink}
                  onClick={() =>
                    openAskEdith({
                      level: 'fix',
                      contextMode: 'page',
                      problemMessage: problem.message,
                    })
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
