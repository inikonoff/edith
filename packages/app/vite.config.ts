import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import monacoEditorPluginModule from 'vite-plugin-monaco-editor';

// The package's ESM/CJS interop under Vite 5 sometimes puts the factory on
// `.default`, sometimes on the module itself.
type MonacoEditorPluginFactory = typeof monacoEditorPluginModule;
const monacoEditorPlugin: MonacoEditorPluginFactory =
  (monacoEditorPluginModule as unknown as { default?: MonacoEditorPluginFactory }).default ??
  monacoEditorPluginModule;

export default defineConfig({
  plugins: [
    react(),
    // Bundles the Monaco workers locally so the editor works fully offline
    // (spec §38-39) instead of fetching them from a CDN at runtime.
    monacoEditorPlugin({ languageWorkers: ['editorWorkerService', 'html', 'css', 'typescript'] }),
  ],
});
