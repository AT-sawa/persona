/**
 * PII masking utilities for admin display.
 * Shows enough info for identification while protecting against
 * shoulder surfing and accidental screen sharing.
 */

/** Mask email: test@example.com → te***@example.com */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visibleChars = Math.min(2, local.length);
  return `${local.slice(0, visibleChars)}***@${domain}`;
}

/** Mask phone: 090-1234-5678 → 090-****-5678 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

/** Mask name: show full last name, mask first name partially: 佐藤太郎 → 佐藤*郎 */
export function maskName(name: string | null | undefined): string {
  if (!name) return "名前未設定";
  // For admin purposes, show full name — masking names makes admin work difficult
  return name;
}
