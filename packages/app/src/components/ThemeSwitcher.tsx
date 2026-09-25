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
    <label className={styles.wrap}>
      <span className={styles.prefix}>Theme:</span>
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
      <svg className={styles.chevron} width="8" height="6" viewBox="0 0 8 6" aria-hidden="true">
        <path
          d="M1 1.5l3 3 3-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </label>
  );
}
