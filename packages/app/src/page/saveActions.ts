import { getMainFilePath, useEditorStore } from '../store/editorStore';
import { savePageContent } from './pageService';
import { writeFileToDisk } from './saveExport';

export interface SaveOutcome {
  ok: boolean;
  message?: string;
}

/**
 * Local Save (spec §27): always persists to the Page Project in IndexedDB,
 * then also writes straight to disk if the file was opened via the File
 * System Access API. A disk-write failure is reported but doesn't erase the
 * fact that the Page Project itself was saved — never claim success when it
 * wasn't, but a partial success is still reported as what it is.
 */
export async function saveCurrentPage(): Promise<SaveOutcome> {
  const state = useEditorStore.getState();
  if (!state.pageId) return { ok: false, message: 'No page is open.' };

  try {
    await savePageContent(state.pageId, state.files);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }

  useEditorStore.getState().markSaved();

  if (state.fileHandle) {
    const mainPath = getMainFilePath(state.files);
    const mainFile = state.files.find((file) => file.path === mainPath);
    if (mainFile) {
      try {
        await writeFileToDisk(state.fileHandle, mainFile.content);
      } catch (error) {
        return {
          ok: true,
          message: `Saved to My Pages, but couldn't write to disk: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    }
  }

  return { ok: true };
}
