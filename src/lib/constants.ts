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
