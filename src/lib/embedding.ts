import OpenAI from "openai";
import type {
  Case,
  Profile,
  UserExperience,
  UserPreferences,
} from "@/lib/types";

// Lazy-initialize to avoid errors when OPENAI_API_KEY not set
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

/**
 * Generate a 1536-dimensional embedding vector for a given text using OpenAI.
 * Returns null if OPENAI_API_KEY is not configured.
 */
export async function generateEmbedding(
  text: string
): Promise<number[] | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return res.data[0].embedding;
}

/**
 * Build a rich text representation of a Case for embedding generation.
 * Combines all available fields into structured text.
 */
export function buildCaseEmbeddingText(c: Case): string {
  const parts: string[] = [];

  if (c.title) {
    parts.push(`案件名: ${c.title}`);
  }
  if (c.category) {
    parts.push(`カテゴリ: ${c.category}`);
  }
  if (c.industry) {
    parts.push(`業界: ${c.industry}`);
  }
  if (c.background) {
    parts.push(`背景: ${c.background}`);
  }
  if (c.description) {
    parts.push(`案件概要: ${c.description}`);
  }
  if (c.must_req) {
    parts.push(`必須要件: ${c.must_req}`);
  }
  if (c.nice_to_have) {
    parts.push(`歓迎要件: ${c.nice_to_have}`);
  }
  if (c.fee) {
    parts.push(`報酬: ${c.fee}`);
  }
  if (c.location) {
    parts.push(`勤務地: ${c.location}`);
  }
  if (c.work_style) {
    parts.push(`勤務形態: ${c.work_style}`);
  }
  if (c.office_days) {
    parts.push(`出社頻度: ${c.office_days}`);
  }
  if (c.occupancy) {
    parts.push(`稼働率: ${c.occupancy}`);
  }

  return parts.join("\n");
}

/**
 * Build a rich text representation of a Profile (+ experiences, preferences) for embedding generation.
 * Combines profile info, experiences, and preferences into structured text.
 */
export function buildProfileEmbeddingText(
  p: Profile,
  exps: UserExperience[],
  prefs: UserPreferences | null
): string {
  const parts: string[] = [];

  if (p.full_name) {
    parts.push(`氏名: ${p.full_name}`);
  }
  if (p.bio) {
    parts.push(`自己紹介: ${p.bio}`);
  }
  if (p.background) {
    parts.push(`経歴概要: ${p.background}`);
  }
  if (p.skills && p.skills.length > 0) {
    parts.push(`スキル: ${p.skills.join(", ")}`);
  }
  if (p.years_experience != null) {
    parts.push(`経験年数: ${p.years_experience}年`);
  }
  if (p.prefecture) {
    parts.push(`所在地: ${p.prefecture}`);
  }
  if (p.remote_preference) {
    const remoteLabels: Record<string, string> = {
      remote_only: "フルリモート希望",
      hybrid: "ハイブリッド希望",
      onsite: "オンサイト希望",
      any: "勤務形態問わず",
    };
    parts.push(`勤務形態: ${remoteLabels[p.remote_preference] || p.remote_preference}`);
  }

  // Experiences
  if (exps.length > 0) {
    parts.push("--- 職務経歴 ---");
    for (const exp of exps) {
      const expParts: string[] = [];
      expParts.push(`会社: ${exp.company_name}, 役職: ${exp.role}`);
      if (exp.industry) expParts.push(`業界: ${exp.industry}`);
      if (exp.description) expParts.push(`業務内容: ${exp.description}`);
      if (exp.skills_used && exp.skills_used.length > 0) {
        expParts.push(`使用スキル: ${exp.skills_used.join(", ")}`);
      }
      const period = exp.is_current
        ? `${exp.start_date} ~ 現在`
        : `${exp.start_date} ~ ${exp.end_date || ""}`;
      expParts.push(`期間: ${period}`);
      parts.push(expParts.join(" / "));
    }
  }

  // Preferences
  if (prefs) {
    parts.push("--- 希望条件 ---");
    if (prefs.desired_categories && prefs.desired_categories.length > 0) {
      parts.push(`希望カテゴリ: ${prefs.desired_categories.join(", ")}`);
    }
    if (prefs.desired_industries && prefs.desired_industries.length > 0) {
      parts.push(`希望業界: ${prefs.desired_industries.join(", ")}`);
    }
    if (prefs.desired_roles && prefs.desired_roles.length > 0) {
      parts.push(`希望ロール: ${prefs.desired_roles.join(", ")}`);
    }
    if (prefs.desired_rate_min != null || prefs.desired_rate_max != null) {
      parts.push(
        `希望単価: ${prefs.desired_rate_min ?? "?"}~${prefs.desired_rate_max ?? "?"}万円`
      );
    }
    if (prefs.preferred_locations && prefs.preferred_locations.length > 0) {
      parts.push(`希望勤務地: ${prefs.preferred_locations.join(", ")}`);
    }
    if (prefs.min_occupancy != null || prefs.max_occupancy != null) {
      const minPct = prefs.min_occupancy != null ? Math.round(prefs.min_occupancy * 100) : "?";
      const maxPct = prefs.max_occupancy != null ? Math.round(prefs.max_occupancy * 100) : "?";
      parts.push(`希望稼働率: ${minPct}%~${maxPct}%`);
    }
    if (prefs.notes) {
      parts.push(`備考: ${prefs.notes}`);
    }
  }

  return parts.join("\n");
}
