/**
 * Send a notification email via the internal API route.
 * Fires and forgets — does not block form submission on failure.
 */
export function sendNotification(
  type: "consultant_lead" | "enterprise_inquiry" | "case_entry",
  data: Record<string, string | null | undefined>
): void {
  // Fire-and-forget: don't await, don't block the user
  fetch("/api/notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-notify-key": process.env.NEXT_PUBLIC_NOTIFY_SECRET || "",
    },
    body: JSON.stringify({ type, data }),
  }).catch(() => {
    // Silently fail — notification is best-effort
  });
}
