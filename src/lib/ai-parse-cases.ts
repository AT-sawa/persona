/**
 * Claude AIでメールテキストから案件情報を構造化抽出する
 * メール取込webhook・管理画面テキスト解析で共用
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ParsedCase } from "./parse-email-cases";
import { sanitizeParsedCase } from "./sanitize-case-text";

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_anthropic)
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

const SYSTEM_PROMPT = `あなたはフリーランスコンサルタント案件情報の構造化パーサーです。
ユーザーが貼り付けたテキスト（メール、Slack、チャット、案件表など）から案件情報を抽出し、JSON形式で返してください。

## 出力形式
以下のJSON配列のみを返してください。テキスト内に複数案件がある場合は配列に複数要素を入れてください。

[
  {
    "title": "案件タイトル（必須）",
    "case_no": "案件番号（あれば）",
    "category": "IT または 非IT",
    "industry": "業界（金融、製造、公共、医療など）",
    "background": "案件の背景・概要",
    "description": "業務内容・作業内容の詳細",
    "must_req": "必須要件・必須スキル",
    "nice_to_have": "歓迎要件・尚可スキル",
    "start_date": "開始時期（例: 2026年4月〜）",
    "fee": "報酬・単価（例: 100〜150万円/月）",
    "occupancy": "稼働率（例: 100%）",
    "location": "勤務地（例: 東京都千代田区）",
    "work_style": "勤務形態（以下のいずれか: フルリモート / 一部リモート / 常駐 / ミーティング出社）",
    "office_days": "出社日数の補足（例: 週3日出社）",
    "flow": "選考フロー（例: 面談2回）",
    "client_company": "元請け・クライアント企業名（あれば）",
    "commercial_flow": "商流（エンド直、2次請けなど）"
  }
]

## ルール
- タイトルが不明な場合は業務内容から適切なタイトルを生成してください
- カテゴリはIT系（システム開発、SAP、AWS等）なら "IT"、経営戦略・M&A・組織改革等なら "非IT"
- work_style は「フルリモート」「一部リモート」「常駐」「ミーティング出社」の4択から最も近いものを選んでください
- 情報がない項目は空文字 "" にしてください
- JSON以外のテキスト（説明や前置き）は一切不要です
- 重要: 元請け企業やパートナー企業の担当者名・連絡先・提案方法の注意書き（例:「LINEでご提案の際は～」「担当:○○」）は絶対に含めないでください。これらは業務内容ではなく営業上の情報です
- 重要: エントリー時のローカルルール（例:「エントリー時は◯×記載のご協力をお願いいたします」「スキルシートを添付の上ご連絡ください」「面談可能日を記載してください」「希望単価を明記してください」）も絶対に含めないでください。これらは元請け・パートナー企業の運用ルールであり、案件情報ではありません
- 重要: descriptionフィールドには必ず業務内容を入れてください。タイトルだけで本文が空になるのは不可です。テキストから読み取れる情報を最大限活用して記述してください`;

/**
 * Claude AIでテキストから案件情報を抽出
 * @returns ParsedCase[] (空配列の場合はAI利用不可 or 抽出失敗)
 */
export async function aiParseCases(text: string): Promise<ParsedCase[]> {
  const anthropic = getAnthropic();
  if (!anthropic) return [];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `以下のテキストから案件情報を抽出してJSON配列で返してください:\n\n${text.substring(0, 8000)}`,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed: Record<string, string>[] = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    const cases: ParsedCase[] = parsed
      .filter((c) => c.title && c.title.trim() !== "")
      .map((c) => ({
        case_no: c.case_no || "",
        title: c.title || "",
        category: c.category || "IT",
        industry: c.industry || "",
        background: c.background || "",
        description: c.description || "",
        must_req: c.must_req || "",
        nice_to_have: c.nice_to_have || "",
        start_date: c.start_date || "",
        fee: c.fee || "",
        occupancy: c.occupancy || "",
        location: c.location || "",
        work_style: c.work_style || "",
        office_days: c.office_days || "",
        flow: c.flow || "",
        client_company: c.client_company || "",
        commercial_flow: c.commercial_flow || "",
        source_url: "",
        _raw_title: c.title || "",
        _commercial_flow: c.commercial_flow || "",
        _headcount: "",
        _contract_type: "",
        _settlement: "",
        _other: "",
        _sales_rep: "",
      }));

    return cases.map((c) => sanitizeParsedCase(c));
  } catch (err) {
    console.error("AI parse cases error:", err);
    return [];
  }
}

/**
 * 案件に本文コンテンツ（description or must_req）があるか判定
 */
export function caseHasContent(c: { description?: string | null; must_req?: string | null }): boolean {
  return Boolean(
    (c.description && c.description.trim().length > 0) ||
    (c.must_req && c.must_req.trim().length > 0)
  );
}
