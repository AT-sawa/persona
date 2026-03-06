/**
 * Site-wide URL constants.
 * Centralised so we never hard-code domain names in page files.
 */

/** Public-facing marketing site (persona-consultant.com) */
export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://persona-consultant.com";

/** Authenticated app domain (app.persona-consultant.com) */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.persona-consultant.com";

/** 勤務形態の選択肢 */
export const WORK_STYLE_OPTIONS = [
  { value: "フルリモート", label: "フルリモート", icon: "home" },
  { value: "一部リモート", label: "一部リモート", icon: "swap_horiz" },
  { value: "常駐", label: "常駐", icon: "apartment" },
  { value: "ミーティング出社", label: "ミーティング出社", icon: "groups" },
] as const;
