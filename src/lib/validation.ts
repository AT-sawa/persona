// Sanitize text input (strip dangerous characters for SQL/XSS)
export function sanitizeText(input: string): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
    .trim();
}

// Validate UUID format
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Validate email format
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * Check if an email domain is blocked (competitor domains).
 * Blocked domains are configured via BLOCKED_EMAIL_DOMAINS env var (comma-separated).
 * Example: BLOCKED_EMAIL_DOMAINS=competitor1.com,competitor2.co.jp
 */
export function isBlockedEmailDomain(email: string): boolean {
  const blockedDomainsEnv = process.env.BLOCKED_EMAIL_DOMAINS;
  if (!blockedDomainsEnv) return false;

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  const blockedDomains = blockedDomainsEnv
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  return blockedDomains.some(
    (blocked) => domain === blocked || domain.endsWith(`.${blocked}`)
  );
}

// Validate that string doesn't contain SQL injection patterns
export function isSafeInput(input: string): boolean {
  const dangerousPatterns = [
    /('|\"|;|--|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bUNION\b|\bSELECT\b.*\bFROM\b)/i
  ];
  return !dangerousPatterns.some(p => p.test(input));
}

// Limit string length
export function truncate(input: string, maxLength: number): string {
  return input.length > maxLength ? input.slice(0, maxLength) : input;
}
