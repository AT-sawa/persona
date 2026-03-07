import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { ParsedCase } from "@/lib/parse-email-cases";
import { sanitizeParsedCase } from "@/lib/sanitize-case-text";

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
- 重要: 元請け企業やパートナー企業の担当者名・連絡先・提案方法の注意書き（例:「LINEでご提案の際は～」「担当:○○」）は絶対に含めないでください。これらは業務内容ではなく営業上の情報です`;

export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json(
        { error: "テキストが短すぎます。案件情報を含むテキストを貼り付けてください。" },
        { status: 400 }
      );
    }

    const anthropic = getAnthropic();
    if (!anthropic) {
      return NextResponse.json(
        { error: "AI解析機能が利用できません（ANTHROPIC_API_KEY未設定）" },
        { status: 503 }
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `以下のテキストから案件情報を抽出してJSON配列で返してください:\n\n${text}`,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AIが案件情報を抽出できませんでした。テキストの内容を確認してください。" },
        { status: 422 }
      );
    }

    let parsed: Record<string, string>[];
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "AI応答のパースに失敗しました。もう一度お試しください。" },
        { status: 422 }
      );
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json(
        { error: "案件情報を抽出できませんでした。" },
        { status: 422 }
      );
    }

    // Convert to ParsedCase format
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

    // サニタイズ（元請け連絡先・提案注意書き等を除去）
    const sanitizedCases = cases.map((c) => sanitizeParsedCase(c));

    const errors: string[] = [];
    if (sanitizedCases.length < parsed.length) {
      errors.push(
        `${parsed.length - cases.length}件のタイトルなしデータをスキップしました`
      );
    }

    return NextResponse.json({
      cases: sanitizedCases,
      errors,
      rawSections: parsed.length,
    });
  } catch (err) {
    console.error("Parse text error:", err);
    return NextResponse.json(
      { error: "AI解析中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
