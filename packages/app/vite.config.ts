import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import monacoEditorPluginModule from 'vite-plugin-monaco-editor';
import { VitePWA } from 'vite-plugin-pwa';

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
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Edith',
        short_name: 'Edith',
        description: 'Edit static HTML pages with live code and preview, side by side.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2563eb',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Monaco's bundled worker files and the app's own main chunk both
        // exceed Workbox's 2 MB default — without raising this, the largest
        // files would silently fall outside the precache and offline launch
        // (spec §38-39) would break for exactly the parts that matter most.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
      },
    }),
  ],
});
