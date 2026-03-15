import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import {
  findRelatedArticles,
  buildArticleGenerationPrompt,
  ARTICLE_SYSTEM_PROMPT,
  loadContentMaster,
  buildSystemPrompt,
  checkNgWords,
  type WizardAnswers,
} from "@/lib/article-generator";

/* ── Supabase admin client ── */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/* ── Anthropic client (lazy singleton) ── */
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_anthropic)
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

/* ── Auth helper ── */
async function requireAdmin(req: NextRequest) {
  const cookie = req.cookies.get("sb-urikwrakbafnsllimcbl-auth-token");
  const accessToken =
    cookie?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  if (!accessToken) return null;

  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(accessToken);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin ? user : null;
}

/* ── POST: 記事生成 ── */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropic = getAnthropic();
  if (!anthropic) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません" },
      { status: 500 },
    );
  }

  try {
    const body = await req.json();
    const {
      keyword,
      position,
      impressions,
      answers,
    }: {
      keyword: string;
      position?: number;
      impressions?: number;
      answers: WizardAnswers;
    } = body;

    if (!keyword) {
      return NextResponse.json(
        { error: "keyword は必須です" },
        { status: 400 },
      );
    }

    // 競合分析
    const relatedArticles = findRelatedArticles(keyword);

    // マスタープロンプト読み込み
    const master = await loadContentMaster();
    const systemPrompt =
      master.brand_voice.length > 0 ||
      master.facts.length > 0 ||
      master.instructions.length > 0
        ? buildSystemPrompt(master)
        : ARTICLE_SYSTEM_PROMPT;

    // ユーザープロンプト組み立て
    const userPrompt = buildArticleGenerationPrompt(
      keyword,
      answers,
      relatedArticles,
      position,
      impressions,
    );

    // Claude API コール
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // テキストレスポンスを抽出
    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    if (!text) {
      return NextResponse.json(
        { error: "Claude からの応答が空でした" },
        { status: 500 },
      );
    }

    // JSON 抽出（マークダウンコードブロックで囲まれている場合にも対応）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Claude の応答からJSONを抽出できませんでした", raw: text },
        { status: 500 },
      );
    }

    const article = JSON.parse(jsonMatch[0]) as {
      title: string;
      description: string;
      category: string;
      content: string;
    };

    // バリデーション
    if (!article.title || !article.content) {
      return NextResponse.json(
        { error: "生成された記事にtitleまたはcontentがありません", raw: text },
        { status: 500 },
      );
    }

    // NGワードチェック
    const fullText = `${article.title} ${article.description || ""} ${article.content}`;
    const ngCheck = checkNgWords(fullText, master.ng_words);

    return NextResponse.json({
      ok: true,
      article: {
        title: article.title,
        description: article.description || "",
        category: article.category || "ノウハウ",
        content: article.content,
      },
      relatedArticles,
      ngCheck: ngCheck.passed
        ? null
        : {
            violations: ngCheck.violations.map((v) => ({
              word: v.word,
              context: v.context,
            })),
          },
    });
  } catch (err) {
    console.error("Article generation error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "記事生成中にエラーが発生しました",
      },
      { status: 500 },
    );
  }
}
