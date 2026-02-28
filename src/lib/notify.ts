/**
 * Send a notification email via the internal API route.
 * Fires and forgets — does not block form submission on failure.
 *
 * Uses NOTIFY_SECRET (server-only) when available,
 * falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY (available on both client and server).
 */
export function sendNotification(
  type: "consultant_lead" | "enterprise_inquiry" | "case_entry",
  data: Record<string, string | null | undefined>
): void {
  const notifyKey =
    // Server-only secret (preferred, not exposed to browser)
    (typeof process !== "undefined" && process.env?.NOTIFY_SECRET) ||
    // Fallback: public anon key (works on client and server)
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  fetch("/api/notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-notify-key": notifyKey,
    },
    body: JSON.stringify({ type, data }),
  }).catch(() => {
    // Silently fail — notification is best-effort
  });
}
