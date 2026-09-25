import { useCallback, useEffect, useRef, useState } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import {
  createEditorFile,
  linkIntoHtml,
  NEW_FILE_KIND_ORDER,
  NEW_FILE_KINDS,
  normalizeFileName,
  resolveNewFilePath,
  suggestFileName,
  type NewFileKind,
} from '../page/newFile';
import { getMainFilePath, useEditorStore } from '../store/editorStore';
import { Icon } from './Icon';
import styles from './NewFileMenu.module.css';

/** Кнопка «+» рядом с вкладками: новый файл в текущем проекте. */
export function NewFileMenu() {
  const files = useEditorStore((state) => state.files);
  const addFile = useEditorStore((state) => state.addFile);
  const updateFileContent = useEditorStore((state) => state.updateFileContent);

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<NewFileKind>('css');
  const [name, setName] = useState('');
  const [linkToMain, setLinkToMain] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapRef, open, close);

  const mainPath = getMainFilePath(files) ?? files[0]?.path ?? 'index.html';
  const mainName = mainPath.split('/').pop() ?? mainPath;
  const existingPaths = files.map((file) => file.path);

  function pickKind(next: NewFileKind) {
    setKind(next);
    setName(suggestFileName(next, existingPaths, mainPath));
    inputRef.current?.focus();
  }

  function toggle() {
    if (!open) setName(suggestFileName(kind, existingPaths, mainPath));
    setOpen((value) => !value);
  }

  useEffect(() => {
    if (open) inputRef.current?.select();
  }, [open]);

  const fileName = normalizeFileName(name, kind);
  const path = fileName ? resolveNewFilePath(fileName, mainPath) : '';
  const duplicate = path !== '' && existingPaths.includes(path);
  const canCreate = path !== '' && !duplicate;
  const linkable = NEW_FILE_KINDS[kind].linkable;

  function handleCreate() {
    if (!canCreate) return;
    if (linkable && linkToMain) {
      const main = useEditorStore.getState().files.find((file) => file.path === mainPath);
      const href = fileName; // новый файл лежит рядом с главным
      const linked = main ? linkIntoHtml(main.content, kind, href) : null;
      if (main && linked !== null) updateFileContent(main.path, linked);
    }
    addFile(createEditorFile(kind, path));
    setOpen(false);
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.plus}
        title="New file"
        aria-label="New file"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        <Icon name="plus" size={14} />
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="New file">
          <div className={styles.title}>New file</div>

          <div className="edith-segmented" role="group" aria-label="File type">
            {NEW_FILE_KIND_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === kind}
                onClick={() => pickKind(option)}
              >
                {NEW_FILE_KINDS[option].label}
              </button>
            ))}
          </div>

          <label className={styles.field}>
            <span>Name</span>
            <input
              ref={inputRef}
              value={name}
              spellCheck={false}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreate();
              }}
            />
          </label>

          {duplicate && <div className={styles.error}>{fileName} already exists.</div>}

          {linkable && (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={linkToMain}
                onChange={(event) => setLinkToMain(event.target.checked)}
              />
              {kind === 'css' ? 'Add <link> to ' : 'Add <script> to '}
              {mainName}
            </label>
          )}

          <div className={styles.actions}>
            <button type="button" className="edith-btn" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              className="edith-btn-primary"
              onClick={handleCreate}
              disabled={!canCreate}
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
