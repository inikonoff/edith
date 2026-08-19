import { getPageState, listPages } from '@edith/core';
import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { LauncherScreen } from './components/LauncherScreen';
import { loadPageForEditor } from './page/pageService';
import { useEditorStore } from './store/editorStore';

export function App() {
  const view = useEditorStore((state) => state.view);
  const loadPage = useEditorStore((state) => state.loadPage);
  const setActiveFile = useEditorStore((state) => state.setActiveFile);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Minimal session restore (spec §8): reopen whichever page was open
      // most recently, and its last active file if we have one on record.
      const pages = await listPages();
      if (pages.length > 0) {
        const mostRecent = pages.reduce((a, b) => (a.lastOpenedAt > b.lastOpenedAt ? a : b));
        const loaded = await loadPageForEditor(mostRecent.id);
        if (loaded && !cancelled) {
          loadPage(loaded);
          const sessionState = await getPageState(mostRecent.id);
          const activeFile = sessionState?.activeFile;
          if (activeFile && loaded.editorFiles.some((file) => file.path === activeFile)) {
            setActiveFile(activeFile);
          }
        }
      }
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once on mount to restore the last session.
  }, []);

  if (booting) return null;
  return view === 'editor' ? <AppShell /> : <LauncherScreen />;
}
