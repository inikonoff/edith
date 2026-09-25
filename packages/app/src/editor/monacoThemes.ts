import * as monaco from 'monaco-editor';
import type { Theme } from '../store/themeStore';

// Темы Monaco под токены Edith: фон редактора и гаттера совпадают с
// интерфейсом, подсветка — палитра GitHub (как в макете). Раньше
// использовались встроенные 'vs' / 'vs-dark', и в тёмной теме фон
// редактора (#1e1e1e) не совпадал с фоном приложения, а в LINK редактор
// оставался холодно-белым на тёплом фоне.

const LIGHT_RULES: monaco.editor.ITokenThemeRule[] = [
  { token: 'comment', foreground: '6A737D' },
  { token: 'metatag', foreground: '6A737D' }, // <!DOCTYPE>
  { token: 'metatag.content', foreground: '6A737D' },
  { token: 'metatag.html', foreground: '6A737D' },
  { token: 'metatag.content.html', foreground: '6A737D' },
  { token: 'delimiter.html', foreground: '22863A' },
  { token: 'tag', foreground: '22863A' },
  { token: 'attribute.name', foreground: '6F42C1' },
  { token: 'attribute.value', foreground: '032F62' },
  { token: 'string', foreground: '032F62' },
  { token: 'keyword', foreground: 'D73A49' },
  { token: 'number', foreground: '005CC5' },
  // CSS: селектор — фиолетовый, свойство — синий, значение — тёмный
  { token: 'tag.css', foreground: '6F42C1' },
  { token: 'attribute.name.css', foreground: '005CC5' },
  { token: 'attribute.value.css', foreground: '24292E' },
  { token: 'attribute.value.number.css', foreground: '005CC5' },
  { token: 'attribute.value.unit.css', foreground: '005CC5' },
  { token: 'attribute.value.hex.css', foreground: '24292E' },
  { token: 'delimiter.bracket.css', foreground: '24292E' },
];

const DARK_RULES: monaco.editor.ITokenThemeRule[] = [
  { token: 'comment', foreground: '8B949E' },
  { token: 'metatag', foreground: '8B949E' },
  { token: 'metatag.content', foreground: '8B949E' },
  { token: 'metatag.html', foreground: '8B949E' },
  { token: 'metatag.content.html', foreground: '8B949E' },
  { token: 'delimiter.html', foreground: '7EE787' },
  { token: 'tag', foreground: '7EE787' },
  { token: 'attribute.name', foreground: 'D2A8FF' },
  { token: 'attribute.value', foreground: 'A5D6FF' },
  { token: 'string', foreground: 'A5D6FF' },
  { token: 'keyword', foreground: 'FF7B72' },
  { token: 'number', foreground: '79C0FF' },
  { token: 'tag.css', foreground: 'D2A8FF' },
  { token: 'attribute.name.css', foreground: '79C0FF' },
  { token: 'attribute.value.css', foreground: 'E2E8F0' },
  { token: 'attribute.value.number.css', foreground: '79C0FF' },
  { token: 'attribute.value.unit.css', foreground: '79C0FF' },
  { token: 'attribute.value.hex.css', foreground: 'E2E8F0' },
  { token: 'delimiter.bracket.css', foreground: 'E2E8F0' },
];

let defined = false;

function defineEdithThemes() {
  if (defined) return;
  defined = true;

  monaco.editor.defineTheme('edith-light', {
    base: 'vs',
    inherit: true,
    rules: LIGHT_RULES,
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#24292E',
      'editorGutter.background': '#F8FAFC',
      'editorLineNumber.foreground': '#94A3B8',
      'editorLineNumber.activeForeground': '#334155',
      'editor.lineHighlightBackground': '#F1F5F9',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#BFDBFE',
      'editorCursor.foreground': '#1E293B',
      'editorIndentGuide.background1': '#F1F5F9',
      'editorWidget.background': '#FFFFFF',
      'editorWidget.border': '#CBD5E1',
    },
  });

  monaco.editor.defineTheme('edith-link', {
    base: 'vs',
    inherit: true,
    rules: LIGHT_RULES,
    colors: {
      'editor.background': '#FDFCFA',
      'editor.foreground': '#2B2620',
      'editorGutter.background': '#F8F5F0',
      'editorLineNumber.foreground': '#A69D8F',
      'editorLineNumber.activeForeground': '#433C33',
      'editor.lineHighlightBackground': '#F0ECE4',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#E9D5FF',
      'editorCursor.foreground': '#2B2620',
      'editorWidget.background': '#FDFCFA',
      'editorWidget.border': '#D4CAB8',
    },
  });

  monaco.editor.defineTheme('edith-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: DARK_RULES,
    colors: {
      'editor.background': '#0F172A',
      'editor.foreground': '#E2E8F0',
      'editorGutter.background': '#131C2E',
      'editorLineNumber.foreground': '#64748B',
      'editorLineNumber.activeForeground': '#CBD5E1',
      'editor.lineHighlightBackground': '#1A2438',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#1E3A8A',
      'editorCursor.foreground': '#E2E8F0',
      'editorWidget.background': '#131C2E',
      'editorWidget.border': '#334155',
    },
  });
}

export function applyMonacoTheme(theme: Theme): void {
  defineEdithThemes();
  monaco.editor.setTheme(`edith-${theme}`);
}

export function monacoThemeName(theme: Theme): string {
  defineEdithThemes();
  return `edith-${theme}`;
}
