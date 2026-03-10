import { google } from "googleapis";

export interface SearchConsoleRow {
  keyword: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

/**
 * Resolve Google service account credentials.
 *
 * Supports two modes (in priority order):
 *
 * 1. GOOGLE_CREDENTIALS_BASE64  — the entire service-account JSON file,
 *    base64-encoded.  This is the recommended approach because it avoids
 *    all newline / escaping issues in environment variable storage.
 *
 * 2. Individual env vars (legacy):
 *    - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *    - GOOGLE_SERVICE_ACCOUNT_KEY  (PEM private key with literal \n)
 *
 * In both cases GOOGLE_SEARCH_CONSOLE_SITE_URL is required.
 */
function resolveCredentials(): { email: string; privateKey: string; siteUrl: string } {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
  if (!siteUrl) {
    throw new Error("Missing GOOGLE_SEARCH_CONSOLE_SITE_URL");
  }

  // ── Mode 1: Base64-encoded JSON (recommended) ──
  const b64 = process.env.GOOGLE_CREDENTIALS_BASE64;
  if (b64) {
    try {
      const json = Buffer.from(b64, "base64").toString("utf-8");
      const creds = JSON.parse(json) as { client_email?: string; private_key?: string };
      if (!creds.client_email || !creds.private_key) {
        throw new Error("JSON missing client_email or private_key");
      }
      console.log("[GSC] Using GOOGLE_CREDENTIALS_BASE64, email:", creds.client_email);
      return { email: creds.client_email, privateKey: creds.private_key, siteUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse GOOGLE_CREDENTIALS_BASE64: ${msg}`);
    }
  }

  // ── Mode 2: Individual env vars (legacy) ──
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!email || !rawKey) {
    throw new Error(
      "Missing credentials: set either GOOGLE_CREDENTIALS_BASE64, or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_KEY"
    );
  }

  // Handle literal \n in the PEM key
  let privateKey = rawKey;
  if (rawKey.includes("\\n")) {
    privateKey = rawKey.replace(/\\n/g, "\n");
  }

  console.log("[GSC] Using individual env vars, email:", email, "keyLen:", rawKey.length);
  return { email, privateKey, siteUrl };
}

/**
 * Fetch search analytics data from Google Search Console.
 *
 * @param startDate  YYYY-MM-DD
 * @param endDate    YYYY-MM-DD
 */
export async function fetchSearchConsoleData(
  startDate: string,
  endDate: string
): Promise<SearchConsoleRow[]> {
  const { email, privateKey, siteUrl } = resolveCredentials();

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
