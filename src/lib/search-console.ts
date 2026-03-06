import { google } from "googleapis";

export interface SearchConsoleRow {
  keyword: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

/**
 * Fetch search analytics data from Google Search Console.
 *
 * Uses a service account to authenticate.
 * Environment variables required:
 *   - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   - GOOGLE_SERVICE_ACCOUNT_KEY  (PEM private key, with literal \\n)
 *   - GOOGLE_SEARCH_CONSOLE_SITE_URL (e.g. "https://example.com" or "sc-domain:example.com")
 *
 * @param startDate  YYYY-MM-DD
 * @param endDate    YYYY-MM-DD
 */
export async function fetchSearchConsoleData(
  startDate: string,
  endDate: string
): Promise<SearchConsoleRow[]> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;

  if (!email || !rawKey || !siteUrl) {
    throw new Error(
      "Missing environment variables: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY, or GOOGLE_SEARCH_CONSOLE_SITE_URL"
    );
  }

  // Replace literal \n with real newlines (common when storing PEM keys in env vars)
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  const searchconsole = google.searchconsole({ version: "v1", auth });

  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 500,
    },
  });

  const rows = response.data.rows ?? [];

  return rows.map((row) => ({
    keyword: row.keys?.[0] ?? "",
    position: Math.round((row.position ?? 0) * 10) / 10,
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: Math.round((row.ctr ?? 0) * 10000) / 100, // Convert 0.xx -> xx.xx%
  }));
}
