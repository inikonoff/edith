import { useState } from 'react';
import { exportHtml, exportZip } from '../page/saveExport';
import { getMainFilePath, useEditorStore } from '../store/editorStore';
import styles from './ExportMenu.module.css';

export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const files = useEditorStore((state) => state.files);
  const pageId = useEditorStore((state) => state.pageId);
  const pageTitle = useEditorStore((state) => state.pageTitle);

  function handleExportHtml() {
    setOpen(false);
    const mainPath = getMainFilePath(files);
    const mainFile = files.find((file) => file.path === mainPath);
    if (!mainFile) return;
    const otherFiles = files.filter((file) => file !== mainFile);
    if (
      otherFiles.length > 0 &&
      !window.confirm(
        `This page has ${otherFiles.length} additional file(s) (${otherFiles
          .map((f) => f.path)
          .join(', ')}) that a single HTML file can't include. Export ${mainFile.path} anyway?`,
      )
    ) {
      return;
    }
    exportHtml(mainFile);
  }

  async function handleExportZip() {
    setOpen(false);
    if (!pageId) return;
    const zipName = `${pageTitle || 'page'}.zip`;
    await exportZip(pageId, files, zipName);
  }

  return (
    <div className={styles.wrap}>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        Export ▾
      </button>
      {open && (
        <div className={styles.menu}>
          <button type="button" onClick={handleExportHtml}>
            Export HTML
          </button>
          <button type="button" onClick={handleExportZip}>
            Export ZIP
          </button>
        </div>
      )}
    </div>
  );
}
