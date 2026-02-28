/**
 * Deduplication utilities for cases and people.
 *
 * Strategy:
 *   - Same source (same sheet/Notion URL): skip or update (exact dedup)
 *   - Different sources: keep both, but flag as similar for admin comparison
 *
 * No npm dependencies — pure TypeScript implementation.
 */

// ============================================================
// Text Normalization
// ============================================================

/**
 * Normalize a case title for dedup comparison.
 * Handles full-width chars, katakana, decorators, whitespace, etc.
 */
export function normalizeCaseTitle(title: string): string {
  let t = title.normalize("NFC");

  // Full-width alphanumeric → half-width
  t = t.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );

  // Full-width symbols → half-width
  t = t
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[：]/g, ":")
    .replace(/[＿]/g, "_")
    .replace(/[～〜]/g, "~")
    .replace(/[・]/g, " ")
    .replace(/[【「『《〈]/g, "[")
    .replace(/[】」』》〉]/g, "]");

  // Katakana → Hiragana (U+30A1..U+30F6 → U+3041..U+3096)
  t = t.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );

  // Strip bracket groups at start: [PMO案件] or (新規)
  t = t.replace(/^\s*[\[(\[]\s*[^\])\]]*\s*[\])\]]\s*/, "");

  // Strip trailing case number patterns
  t = t.replace(/[_\s]*案件(?:No|NO|no)\.?\s*\d+\s*$/, "");

  // Collapse whitespace/underscores/hyphens
  t = t.replace(/[\s_\-\u3000]+/g, " ");

  // Remove decorators
  t = t.replace(/^[\s■●◆▼▶★☆・]+/, "").replace(/[\s■●◆▼▶★☆・]+$/, "");

  return t.toLowerCase().trim();
}

/**
 * Normalize a person name for comparison.
 */
export function normalizePersonName(name: string): string {
  let n = name.normalize("NFC");

  // Full-width → half-width
  n = n.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );

  // Katakana → Hiragana
  n = n.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );

  // Strip honorifics
  n = n.replace(/[\s]*(様|さん|氏|先生|殿)$/g, "");

  // Remove ALL spaces
  n = n.replace(/[\s\u3000]+/g, "");

  return n.toLowerCase().trim();
}

/**
 * Normalize email for comparison.
 */
export function normalizeEmail(email: string): string {
  const parts = email.toLowerCase().trim().split("@");
  if (parts.length !== 2) return email.toLowerCase().trim();

  let local = parts[0];
  const domain = parts[1];

  // Strip '+alias'
  const plusIdx = local.indexOf("+");
  if (plusIdx >= 0) local = local.slice(0, plusIdx);

  // Gmail dot-insensitivity
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
  }

  return `${local}@${domain}`;
}

/**
 * Normalize phone number.
 */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  // +81 → 0
  if (digits.startsWith("81") && digits.length >= 11) {
    digits = "0" + digits.slice(2);
  }
  return digits;
}

// ============================================================
// Similarity Scoring
// ============================================================

/** Generate bigrams from a string. */
function bigrams(str: string): string[] {
  const result: string[] = [];
  for (let i = 0; i < str.length - 1; i++) {
    result.push(str.slice(i, i + 2));
  }
  return result;
}

/** Dice coefficient (bigram similarity). Returns 0.0 - 1.0. */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length < 2 || b.length < 2) return 0.0;

  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);

  const setB = new Map<string, number>();
  for (const bg of bigramsB) {
    setB.set(bg, (setB.get(bg) || 0) + 1);
  }

  let intersection = 0;
  for (const bg of bigramsA) {
    const count = setB.get(bg);
    if (count && count > 0) {
      intersection++;
      setB.set(bg, count - 1);
    }
  }

  return (2 * intersection) / (bigramsA.length + bigramsB.length);
}

/** Levenshtein distance (space-optimized). */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  if (a.length > b.length) [a, b] = [b, a];

  const aLen = a.length;
  const bLen = b.length;
  let prev = Array.from({ length: aLen + 1 }, (_, i) => i);
  let curr = new Array(aLen + 1);

  for (let j = 1; j <= bLen; j++) {
    curr[0] = j;
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(prev[i] + 1, curr[i - 1] + 1, prev[i - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[aLen];
}

/** Normalized Levenshtein similarity (0.0 - 1.0). */
export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Combined similarity score (dice 60% + levenshtein 40%).
 */
export function combinedSimilarity(a: string, b: string): number {
  return diceCoefficient(a, b) * 0.6 + levenshteinSimilarity(a, b) * 0.4;
}

// ============================================================
// Thresholds
// ============================================================

export const CASE_THRESHOLDS = {
  /** Same source: auto-treat as duplicate */
  AUTO_MATCH: 0.9,
  /** Different source: flag as similar for comparison */
  SIMILAR: 0.7,
} as const;

export const PERSON_THRESHOLDS = {
  AUTO_MATCH: 0.95,
  SIMILAR: 0.75,
} as const;

// ============================================================
// Case Matching
// ============================================================

export interface CaseMatchCandidate {
  id: string;
  title: string;
  case_no: string | null;
  source_url: string | null;
  normalizedTitle: string;
}

export interface CaseMatchResult {
  existingId: string;
  existingTitle: string;
  similarity: number;
  matchType: "exact_case_no" | "exact_title" | "fuzzy_title";
  sameSource: boolean;
}

/**
 * Find matching existing cases for an incoming case.
 * Returns the best match above SIMILAR threshold, or null.
 */
export function findCaseMatch(
  incomingTitle: string,
  incomingCaseNo: string | null,
  sourceUrl: string,
  existingCases: CaseMatchCandidate[]
): CaseMatchResult | null {
  const normalizedIncoming = normalizeCaseTitle(incomingTitle);

  // 1. Exact case_no match
  if (incomingCaseNo) {
    const trimmed = incomingCaseNo.trim();
    for (const existing of existingCases) {
      if (existing.case_no && existing.case_no.trim() === trimmed) {
        return {
          existingId: existing.id,
          existingTitle: existing.title,
          similarity: 1.0,
          matchType: "exact_case_no",
          sameSource: isSameSource(sourceUrl, existing.source_url),
        };
      }
    }
  }

  // 2. Title matching
  let bestMatch: CaseMatchResult | null = null;
  let bestSimilarity = 0;

  for (const existing of existingCases) {
    // Exact normalized title
    if (existing.normalizedTitle === normalizedIncoming) {
      return {
        existingId: existing.id,
        existingTitle: existing.title,
        similarity: 1.0,
        matchType: "exact_title",
        sameSource: isSameSource(sourceUrl, existing.source_url),
      };
    }

    // Fuzzy match
    const sim = combinedSimilarity(normalizedIncoming, existing.normalizedTitle);
    if (sim > bestSimilarity && sim >= CASE_THRESHOLDS.SIMILAR) {
      bestSimilarity = sim;
      bestMatch = {
        existingId: existing.id,
        existingTitle: existing.title,
        similarity: sim,
        matchType: "fuzzy_title",
        sameSource: isSameSource(sourceUrl, existing.source_url),
      };
    }
  }

  return bestMatch;
}

/** Check if two source URLs refer to the same source. */
function isSameSource(
  sourceUrl1: string | null | undefined,
  sourceUrl2: string | null | undefined
): boolean {
  if (!sourceUrl1 || !sourceUrl2) return false;
  // Normalize: strip query params, trailing slashes
  const normalize = (url: string) =>
    url.split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase();
  return normalize(sourceUrl1) === normalize(sourceUrl2);
}

// ============================================================
// Person Matching
// ============================================================

export interface PersonMatchCandidate {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  normalizedName: string;
  normalizedEmail: string;
  normalizedPhone: string;
}

export interface PersonMatchResult {
  existingId: string;
  existingName: string | null;
  existingEmail: string | null;
  similarity: number;
  matchType: "exact_email" | "exact_phone" | "fuzzy_name" | "name_and_partial";
  matchedFields: string[];
}

/**
 * Find potential person matches.
 * Returns all matches above SIMILAR threshold, sorted by similarity desc.
 */
export function findPersonMatches(
  name: string | null,
  email: string | null,
  phone: string | null,
  existingPeople: PersonMatchCandidate[]
): PersonMatchResult[] {
  const results: PersonMatchResult[] = [];

  const normName = name ? normalizePersonName(name) : "";
  const normEmail = email ? normalizeEmail(email) : "";
  const normPhone = phone ? normalizePhone(phone) : "";

  for (const existing of existingPeople) {
    const matchedFields: string[] = [];

    // 1. Email match (definitive)
    if (
      normEmail &&
      existing.normalizedEmail &&
      normEmail === existing.normalizedEmail
    ) {
      results.push({
        existingId: existing.id,
        existingName: existing.full_name,
        existingEmail: existing.email,
        similarity: 1.0,
        matchType: "exact_email",
        matchedFields: ["email"],
      });
      continue;
    }

    // 2. Phone match
    if (
      normPhone &&
      existing.normalizedPhone &&
      normPhone === existing.normalizedPhone
    ) {
      results.push({
        existingId: existing.id,
        existingName: existing.full_name,
        existingEmail: existing.email,
        similarity: 0.95,
        matchType: "exact_phone",
        matchedFields: ["phone"],
      });
      continue;
    }

    // 3. Name similarity
    if (normName && existing.normalizedName) {
      const nameSim = diceCoefficient(normName, existing.normalizedName);
      let confidence = nameSim;

      if (nameSim >= 0.8) {
        // Boost if partial phone overlap
        if (normPhone.length >= 4 && existing.normalizedPhone.length >= 4) {
          if (normPhone.slice(-4) === existing.normalizedPhone.slice(-4)) {
            confidence = Math.min(1.0, nameSim + 0.15);
            matchedFields.push("phone_partial");
          }
        }
        // Boost if same email domain
        if (normEmail && existing.normalizedEmail) {
          const domA = normEmail.split("@")[1];
          const domB = existing.normalizedEmail.split("@")[1];
          if (domA && domB && domA === domB) {
            confidence = Math.min(1.0, confidence + 0.05);
            matchedFields.push("email_domain");
          }
        }
      }

      matchedFields.push("name");

      if (confidence >= PERSON_THRESHOLDS.SIMILAR) {
        results.push({
          existingId: existing.id,
          existingName: existing.full_name,
          existingEmail: existing.email,
          similarity: confidence,
          matchType:
            matchedFields.length > 1 ? "name_and_partial" : "fuzzy_name",
          matchedFields,
        });
      }
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

// ============================================================
// Batch Helpers
// ============================================================

/** Pre-normalize existing cases for batch matching. */
export function prepareCaseCandidates(
  cases: Array<{
    id: string;
    title: string;
    case_no: string | null;
    source_url?: string | null;
  }>
): CaseMatchCandidate[] {
  return cases.map((c) => ({
    id: c.id,
    title: c.title,
    case_no: c.case_no,
    source_url: c.source_url || null,
    normalizedTitle: normalizeCaseTitle(c.title),
  }));
}

/** Pre-normalize existing people for batch matching. */
export function preparePersonCandidates(
  people: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  }>
): PersonMatchCandidate[] {
  return people.map((p) => ({
    ...p,
    normalizedName: p.full_name ? normalizePersonName(p.full_name) : "",
    normalizedEmail: p.email ? normalizeEmail(p.email) : "",
    normalizedPhone: p.phone ? normalizePhone(p.phone) : "",
  }));
}

/**
 * Compute a hash of key case fields for change detection.
 * Used to determine if a case was updated since last sync.
 */
export function computeSourceHash(row: Record<string, string>): string {
  const payload = [
    row.title || "",
    row.fee || "",
    row.description || "",
    row.must_req || "",
    row.location || "",
  ].join("|");

  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}
