import Anthropic from "@anthropic-ai/sdk";
import type { Case, Profile, UserExperience, UserPreferences } from "@/lib/types";

// Lazy-initialize to avoid errors when ANTHROPIC_API_KEY not set
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_anthropic)
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

/**
 * Use Claude to analyze the fit between a case and a candidate profile.
 * Returns a relevance score (0-100) and a short reasoning string.
 *
 * Evaluation criteria (weighted):
 * 1. Must-have requirements fulfillment (40pts)
 * 2. Nice-to-have requirements fulfillment (15pts)
 * 3. Rate compatibility with ±20% flexibility (15pts)
 * 4. Occupancy compatibility with ±10% flexibility (10pts)
 * 5. Industry experience alignment (10pts)
 * 6. Skill & experience relevance (10pts)
 */
export async function analyzeMatchWithLLM(
  caseData: Case,
  profile: Profile,
  experiences: UserExperience[],
  preferences: UserPreferences | null
): Promise<{ relevance: number; reasoning: string }> {
  const anthropic = getAnthropic();
  if (!anthropic) {
    return { relevance: 0, reasoning: "" };
  }

  const caseInfo = [
    `案件名: ${caseData.title}`,
    caseData.category ? `カテゴリ: ${caseData.category}` : null,
    caseData.industry ? `業界: ${caseData.industry}` : null,
    caseData.description ? `概要: ${caseData.description}` : null,
    caseData.must_req ? `必須要件: ${caseData.must_req}` : null,
    caseData.nice_to_have ? `歓迎要件: ${caseData.nice_to_have}` : null,
    caseData.background ? `背景: ${caseData.background}` : null,
    caseData.fee ? `報酬: ${caseData.fee}` : null,
    caseData.occupancy ? `稼働率: ${caseData.occupancy}` : null,
    caseData.location ? `勤務地: ${caseData.location}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const profileInfo = [
    profile.full_name ? `氏名: ${profile.full_name}` : null,
    profile.bio ? `自己紹介: ${profile.bio}` : null,
    profile.background ? `経歴概要: ${profile.background}` : null,
    profile.skills?.length
      ? `スキル: ${profile.skills.join(", ")}`
      : null,
    profile.years_experience != null
      ? `経験年数: ${profile.years_experience}年`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Build rate info from preferences or profile
  const userRateMin = preferences?.desired_rate_min ?? profile.hourly_rate_min;
  const userRateMax = preferences?.desired_rate_max ?? profile.hourly_rate_max;
  const rateInfo =
    userRateMin != null || userRateMax != null
      ? `希望報酬: ${userRateMin ?? "?"}~${userRateMax ?? "?"}万円/月`
      : null;

  // Build preferences info
  const preferencesInfo = [
    rateInfo,
    preferences?.min_occupancy != null || preferences?.max_occupancy != null
      ? `希望稼働率: ${preferences?.min_occupancy != null ? Math.round(preferences.min_occupancy * 100) : "?"}%~${preferences?.max_occupancy != null ? Math.round(preferences.max_occupancy * 100) : "?"}%`
      : null,
    preferences?.desired_industries?.length
      ? `希望業界: ${preferences.desired_industries.join(", ")}`
      : null,
    preferences?.desired_roles?.length
      ? `希望ロール: ${preferences.desired_roles.join(", ")}`
      : null,
    preferences?.notes ? `備考: ${preferences.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const experienceInfo =
    experiences.length > 0
      ? experiences
          .map((exp) => {
            const parts = [`${exp.company_name} - ${exp.role}`];
            if (exp.industry) parts.push(`業界: ${exp.industry}`);
            if (exp.description) parts.push(`内容: ${exp.description}`);
            if (exp.skills_used?.length)
              parts.push(`スキル: ${exp.skills_used.join(", ")}`);
            return parts.join(" / ");
          })
          .join("\n")
      : "経歴情報なし";

  const prompt = `あなたはフリーコンサルタントと案件のマッチング評価を行うAIです。
以下の案件と候補者の情報を分析し、適合度を評価してください。

## 評価基準（重要度順・配点）
1. **必須要件の充足度**（40点）: 案件の「必須要件」に対して候補者のスキル・経験がどの程度合致するか。すべて満たす場合は満点、部分的に満たす場合は比例配分。
2. **歓迎要件の充足度**（15点）: 案件の「歓迎要件」に対する合致度。必須要件ほど重要ではないが、差別化要因として評価。
3. **報酬の適合性**（15点）: 案件の報酬と候補者の希望報酬を比較。完全に範囲内なら満点。±20%の柔軟性を考慮して部分点を付与。
4. **稼働率の適合性**（10点）: 案件の稼働率と候補者の希望稼働率を比較。±10%の柔軟性を考慮。
5. **業界経験の一致**（10点）: 案件の業界と候補者の業界経験・希望業界が合致するか。
6. **スキルセット・経験の関連性**（10点）: 案件背景に対する候補者の総合的な経験の関連性。

## 案件情報
${caseInfo}

## 候補者プロフィール
${profileInfo}

## 職務経歴
${experienceInfo}
${preferencesInfo ? `\n## 希望条件\n${preferencesInfo}` : ""}

## 出力形式
以下のJSON形式のみで回答してください。他のテキストは不要です。
{"relevance": 0〜100の整数, "reasoning": "80字以内の適合理由（必須要件充足度と報酬/稼働率の適合性を含む）"}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return { relevance: 0, reasoning: "" };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      relevance: number;
      reasoning: string;
    };

    return {
      relevance: Math.max(0, Math.min(100, Math.round(parsed.relevance))),
      reasoning: (parsed.reasoning || "").slice(0, 80),
    };
  } catch (err) {
    console.error("LLM analysis error:", err);
    return { relevance: 0, reasoning: "" };
  }
}

/**
 * Batch analyze multiple matches in parallel with a concurrency limit.
 */
export async function batchAnalyzeMatches(
  matches: Array<{
    caseData: Case;
    profile: Profile;
    experiences: UserExperience[];
    preferences: UserPreferences | null;
  }>,
  concurrency: number = 5
): Promise<Array<{ relevance: number; reasoning: string }>> {
  const results: Array<{ relevance: number; reasoning: string }> = new Array(
    matches.length
  );

  // Process in chunks of `concurrency`
  for (let i = 0; i < matches.length; i += concurrency) {
    const chunk = matches.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((m) =>
        analyzeMatchWithLLM(m.caseData, m.profile, m.experiences, m.preferences)
      )
    );
    for (let j = 0; j < chunkResults.length; j++) {
      results[i + j] = chunkResults[j];
    }
  }

  return results;
}
