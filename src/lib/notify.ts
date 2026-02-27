/**
 * Send a notification email via the internal API route.
 * Fires and forgets — does not block form submission on failure.
 * Uses Supabase anon key as a shared secret (already public, but prevents random abuse).
 */
export function sendNotification(
  type: "consultant_lead" | "enterprise_inquiry" | "case_entry",
  data: Record<string, string | null | undefined>
): void {
  fetch("/api/notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-notify-key":
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    },
    body: JSON.stringify({ type, data }),
  }).catch(() => {
    // Silently fail — notification is best-effort
  });
}
