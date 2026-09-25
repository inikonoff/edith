// Небольшой набор SVG-иконок вместо Unicode-символов (⇄ ⛶ ⊞ ▾ …),
// которые в разных ОС рендерятся по-разному. Рисуются currentColor.

export type IconName =
  | 'play'
  | 'save'
  | 'columns'
  | 'rows'
  | 'swap'
  | 'download'
  | 'sparkle'
  | 'maximize'
  | 'minimize'
  | 'chevronDown'
  | 'minus'
  | 'plus'
  | 'close'
  | 'warning';

const PATHS: Record<IconName, JSX.Element> = {
  play: <polygon points="4,2.5 4,11.5 11,7" fill="currentColor" stroke="none" />,
  save: (
    <>
      <path d="M2.5 2.5h7l2 2v7h-9z" />
      <path d="M4.5 2.5v2.5h4v-2.5" />
    </>
  ),
  columns: (
    <>
      <rect x="2" y="2" width="10" height="10" rx="1.5" />
      <path d="M7 2v10" />
    </>
  ),
  rows: (
    <>
      <rect x="2" y="2" width="10" height="10" rx="1.5" />
      <path d="M2 7h10" />
    </>
  ),
  swap: <path d="M2.5 4.5h9l-2-2M11.5 9.5h-9l2 2" />,
  download: <path d="M7 2v6.5M4 5.5l3 3 3-3M2 11.5h10" />,
  sparkle: (
    <path
      d="M7 1.5l1.4 3.6 3.6 1.4-3.6 1.4L7 11.5 5.6 7.9 2 6.5l3.6-1.4z"
      fill="currentColor"
      stroke="none"
    />
  ),
  maximize: <path d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" />,
  minimize: <path d="M5 2v3H2M12 5H9V2M9 12V9h3M2 9h3v3" />,
  chevronDown: <path d="M4 5.5l3 3 3-3" />,
  minus: <path d="M3 7h8" />,
  plus: <path d="M3 7h8M7 3v8" />,
  close: <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />,
  warning: (
    <>
      <path d="M7 1.8l5.5 9.7h-11z" />
      <path d="M7 5.5v2.5M7 9.6v.1" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 12 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
