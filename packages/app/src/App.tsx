import { useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { useEditorStore } from './store/editorStore';

const DEMO_FILES = [
  {
    path: 'index.html',
    language: 'html',
    isMain: true,
    content: `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Demo Landing</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="wrap">
      <button class="buy">Buy now</button>
    </div>
    <script src="app.js"></script>
  </body>
</html>
`,
  },
  {
    path: 'style.css',
    language: 'css',
    isMain: false,
    content: `.wrap {
  padding: 2rem;
}

.buy {
  padding: 0.5rem 1rem;
  border-radius: 4px;
}
`,
  },
  {
    path: 'app.js',
    language: 'javascript',
    isMain: false,
    content: `document.querySelector('.buy').addEventListener('click', () => {
  console.log('clicked');
});
`,
  },
];

export function App() {
  const files = useEditorStore((state) => state.files);

  useEffect(() => {
    if (files.length > 0) return;
    useEditorStore.setState({ files: DEMO_FILES, activeFile: DEMO_FILES[0]!.path });
  }, [files.length]);

  return <AppShell />;
}
