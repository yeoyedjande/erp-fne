import { cn } from "@/lib/cn";

/**
 * Jeu d'icônes maison : trait 1,5px, `currentColor`, jamais multicolore
 * (décision d'absence de design/FICHE-DESIGN.md).
 */
const PATHS = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  building: "M4 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15M12 21V10h7a1 1 0 0 1 1 1v10M3 21h18M7 9h2M7 13h2M7 17h2M16 14h1M16 18h1",
  users: "M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 20v-1.5a4 4 0 0 0-3-3.87M16 3.63a4 4 0 0 1 0 7.75",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  quote: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M9 13h6M9 17h4",
  invoice: "M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 6h6M9 12h6M9 16h3",
  shield: "M12 2 4 5.5v6c0 4.5 3.2 8.7 8 10.5 4.8-1.8 8-6 8-10.5v-6L12 2Zm-3 9.5 2.2 2.2L15.5 9.5",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5V12l3.5 2",
  lifebuoy: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9",
  calendar: "M3 9h18M7 3v3m10-3v3M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 8h2m4 0h2m-8 4h2m4 0h2",
  box: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v18M4 7.5l8 4.5 8-4.5",
  chart: "M4 20V10m5 10V4m5 16v-7m5 7V8",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-2.4.9-.6-.9-1.6-1 .3a5.6 5.6 0 0 0-1.3-.8l-.2-1h-1.8l-.2 1c-.5.2-.9.4-1.3.8l-1-.3-.9 1.6.9.6a5.4 5.4 0 0 0 0 1.5l-.9.6.9 1.6 1-.3c.4.3.8.6 1.3.8l.2 1h1.8l.2-1c.5-.2.9-.5 1.3-.8l1 .3.9-1.6-.9-.6c.1-.5.1-1 0-1.5Z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8ZM10.3 21a2 2 0 0 0 3.4 0",
  plus: "M12 5v14M5 12h14",
  check: "m4 12.5 5 5L20 6.5",
  x: "M18 6 6 18M6 6l12 12",
  chevronRight: "m9 6 6 6-6 6",
  chevronDown: "m6 9 6 6 6-6",
  chevronLeft: "m15 6-6 6 6 6",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  arrowRight: "M5 12h14M13 5l7 7-7 7",
  trend: "m3 17 6-6 4 4 8-8M21 7v5h-5",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  mail: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 .5 9 6 9-6",
  phone: "M6.6 3h3l1.5 4-2 1.5a12 12 0 0 0 5.4 5.4l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3Z",
  pin: "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  edit: "M4 20h4l10-10-4-4L4 16v4ZM14.5 5.5l4 4",
  trash: "M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12ZM10 11v6M14 11v6",
  download: "M12 3v12m0 0 4-4m-4 4-4-4M4 19h16",
  print: "M7 8V3h10v5M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7v-7Z",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  qr: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-4 4h2v2h-2v-2Zm4 0h2v2h-2v-2Z",
  seal: "m12 2 2.4 1.8 3-.2 1 2.8 2.4 1.7-1 2.9 1 2.8-2.4 1.8-1 2.8-3-.2L12 20.4 9.6 18.6l-3 .2-1-2.8L3.2 14l1-2.8-1-2.9 2.4-1.7 1-2.8 3 .2L12 2Zm-3 9.2 2.2 2.2 4.3-4.3",
  filter: "M3 5h18l-7 8v6l-4 2v-8L3 5Z",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Zm10 2.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z",
  warning: "M12 3 2.5 20h19L12 3Zm0 6v5m0 3h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9v4.5M12 7.75h.01",
  sparkle: "m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Zm7 10 .8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13Z",
  code: "m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16",
  cloud: "M6.5 19a4.5 4.5 0 0 1-.4-9 6 6 0 0 1 11.6 1.5A4 4 0 0 1 17.5 19h-11Z",
  lock: "M6 11V8a6 6 0 1 1 12 0v3m-13 0h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Zm7 4v2",
  play: "M8 5.5v13l11-6.5-11-6.5Z",
  menu: "M3 6h18M3 12h18M3 18h18",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5",
  refresh: "M3 12a9 9 0 0 1 15.3-6.4L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.3 6.4L3 16M3 21v-5h5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name, size = 16, className, strokeWidth = 1.5,
}: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={cn("shrink-0", className)} aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
