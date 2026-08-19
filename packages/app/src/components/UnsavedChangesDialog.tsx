import styles from './UnsavedChangesDialog.module.css';

interface UnsavedChangesDialogProps {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

// Spec §35.
export function UnsavedChangesDialog({ onSave, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.dialog} onClick={(event) => event.stopPropagation()}>
        <p>There are unsaved changes.</p>
        <div className={styles.actions}>
          <button type="button" onClick={onSave}>
            Save
          </button>
          <button type="button" onClick={onDiscard}>
            Don&apos;t save
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
