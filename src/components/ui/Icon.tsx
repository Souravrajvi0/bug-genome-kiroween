import type { SVGProps } from 'react';

/** One consistent icon set: 16 px grid, 1.6 px round strokes, drawn for this app. */
const PATHS = {
  search: <><circle cx="7.25" cy="7.25" r="4.75" /><path d="m13.5 13.5-2.9-2.9" /></>,
  x: <path d="M4 4l8 8M12 4l-8 8" />,
  plus: <path d="M8 3.5v9M3.5 8h9" />,
  minus: <path d="M3.5 8h9" />,
  fit: <path d="M2.75 6V3.75a1 1 0 0 1 1-1H6M10 2.75h2.25a1 1 0 0 1 1 1V6M13.25 10v2.25a1 1 0 0 1-1 1H10M6 13.25H3.75a1 1 0 0 1-1-1V10" />,
  chevronDown: <path d="m4.5 6.25 3.5 3.5 3.5-3.5" />,
  chevronRight: <path d="m6.25 4.5 3.5 3.5-3.5 3.5" />,
  arrowLeft: <path d="M12.5 8h-9M7 4.5 3.5 8 7 11.5" />,
  arrowRight: <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" />,
  link: <path d="M5.5 8h5M3 8a2.5 2.5 0 0 1 2.5-2.5h1M3 8a2.5 2.5 0 0 0 2.5 2.5h1M13 8a2.5 2.5 0 0 0-2.5-2.5h-1M13 8a2.5 2.5 0 0 1-2.5 2.5h-1" />,
  check: <path d="m3.5 8.5 3 3 6-7" />,
  ban: <><circle cx="8" cy="8" r="5.25" /><path d="m4.3 11.7 7.4-7.4" /></>,
  reset: <><path d="M3.25 8a4.75 4.75 0 1 0 1.4-3.37" /><path d="M3 2.75v2.5h2.5" /></>,
  filter: <path d="M2.75 4h10.5M4.75 8h6.5M6.75 12h2.5" />,
  info: <><circle cx="8" cy="8" r="5.75" /><path d="M8 7.25v3.5M8 5.1v.05" /></>,
  trash: <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.25a1 1 0 0 0 1 .75h3.8a1 1 0 0 0 1-.75l.6-8.25" />,
  code: <path d="m5.5 4.5-3 3.5 3 3.5M10.5 4.5l3 3.5-3 3.5" />,
  layers: <path d="M8 2.75 13.25 5.5 8 8.25 2.75 5.5zM2.75 8.25 8 11l5.25-2.75M2.75 11 8 13.75 13.25 11" />,
  graph: <><circle cx="4" cy="4.5" r="1.75" /><circle cx="12" cy="5.5" r="1.75" /><circle cx="7" cy="12" r="1.75" /><path d="m5.7 4.9 4.6.6M4.8 6.1l1.5 4.2M10.8 6.9l-2.6 3.8" /></>,
  bug: <><rect x="5" y="5" width="6" height="8" rx="3" /><path d="M6.5 5V4a1.5 1.5 0 0 1 3 0v1M2.75 8.5H5M11 8.5h2.25M3.25 5.5 5.2 6.6M12.75 5.5l-1.95 1.1M3.25 12l2-1.1M12.75 12l-2-1.1" /></>,
  hatch: <><circle cx="8" cy="8" r="5.75" /><path d="m4.6 11.4 6.8-6.8M7.6 12.2l4.6-4.6M3.8 8.4l4.6-4.6" /></>,
  compare: <path d="M5 2.75v10.5M11 2.75v10.5M2.75 6H7.25M8.75 10h4.5" />,
  sparkle: <path d="M8 2.75v2.5M8 10.75v2.5M2.75 8h2.5M10.75 8h2.5M4.3 4.3l1.5 1.5M10.2 10.2l1.5 1.5M11.7 4.3l-1.5 1.5M5.8 10.2l-1.5 1.5" />,
  cursor: <path d="m3.5 3.5 3.25 9 1.4-3.85L12 7.25z" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className = '', ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`icon ${className}`}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
