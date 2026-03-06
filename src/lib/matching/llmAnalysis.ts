import Anthropic from "@anthropic-ai/sdk";
import type { Case, Profile, UserExperience } from "@/lib/types";

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
 */
export async function analyzeMatchWithLLM(
  caseData: Case,
  profile: Profile,
  experiences: UserExperience[]
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

## 評価基準（重要度順）
1. 必須要件の充足度（最重要）
2. 業界経験の一致
3. スキルセットの適合性
4. 案件背景に対する経験の関連性

## 案件情報
${caseInfo}

## 候補者情報
${profileInfo}

## 職務経歴
${experienceInfo}

## 出力形式
以下のJSON形式のみで回答してください。他のテキストは不要です。
{"relevance": 0〜100の整数, "reasoning": "50字以内の適合理由"}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
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
      reasoning: (parsed.reasoning || "").slice(0, 50),
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
        analyzeMatchWithLLM(m.caseData, m.profile, m.experiences)
      )
    );
    for (let j = 0; j < chunkResults.length; j++) {
      results[i + j] = chunkResults[j];
    }
  }

  return results;
}
