import type { AiEdit } from '@edith/ai';
import { useEditorStore } from '../store/editorStore';
import styles from './DiffView.module.css';

interface DiffViewProps {
  edits: AiEdit[];
}

function extractLines(content: string, startLine: number, endLine: number): string {
  return content.split('\n').slice(startLine - 1, endLine).join('\n');
}

// Edits are already line-range-localized by the model (spec §41-48), so a
// per-edit before/after block is enough — no need for a diff library.
export function DiffView({ edits }: DiffViewProps) {
  const files = useEditorStore((state) => state.files);

  if (edits.length === 0) {
    return <p className={styles.empty}>No changes proposed.</p>;
  }

  return (
    <div className={styles.diff}>
      {edits.map((edit, index) => {
        const file = files.find((candidate) => candidate.path === edit.file);
        const before = file ? extractLines(file.content, edit.startLine, edit.endLine) : '';
        return (
          <div key={`${edit.file}:${edit.startLine}:${index}`} className={styles.block}>
            <div className={styles.fileHeader}>{edit.file}</div>
            {before && (
              <pre className={styles.before}>
                {before.split('\n').map((line, lineIndex) => (
                  <div key={lineIndex}>- {line}</div>
                ))}
              </pre>
            )}
            {edit.newText && (
              <pre className={styles.after}>
                {edit.newText.split('\n').map((line, lineIndex) => (
                  <div key={lineIndex}>+ {line}</div>
                ))}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
