import { useThemeStore, type Theme } from '../store/themeStore';
import styles from './ThemeSwitcher.module.css';

const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  link: 'LINK',
  dark: 'Dark',
};

export function ThemeSwitcher() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <select
      className={styles.select}
      value={theme}
      onChange={(event) => setTheme(event.target.value as Theme)}
      aria-label="Theme"
    >
      {(Object.keys(THEME_LABELS) as Theme[]).map((option) => (
        <option key={option} value={option}>
          {THEME_LABELS[option]}
        </option>
      ))}
    </select>
  );
}
