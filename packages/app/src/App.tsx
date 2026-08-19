import { getPageState, listPages } from '@edith/core';
import * as monaco from 'monaco-editor';
import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { LauncherScreen } from './components/LauncherScreen';
import { loadPageForEditor } from './page/pageService';
import { useEditorStore } from './store/editorStore';
import { useThemeStore } from './store/themeStore';

export function App() {
  const view = useEditorStore((state) => state.view);
  const loadPage = useEditorStore((state) => state.loadPage);
  const setActiveFile = useEditorStore((state) => state.setActiveFile);
  const theme = useThemeStore((state) => state.theme);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Monaco's own theme is global, not per-instance — switch it alongside
    // the app chrome (spec §37). Preview itself never reflects this: the
    // iframe only ever renders the page's own CSS.
    monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
  }, [theme]);

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
