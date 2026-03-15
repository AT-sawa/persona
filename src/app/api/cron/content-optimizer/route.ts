import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import {
  loadContentMaster,
  buildSystemPrompt,
  checkNgWords,
  findRelatedArticles,
  type ContentMasterData,
} from "@/lib/article-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5分タイムアウト

/* ── Anthropic client (lazy singleton) ── */
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_anthropic)
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

const BLOG_DIR = path.join(process.cwd(), "content/blog");

interface OptimizationAction {
  type: string;
  keyword: string;
  slug?: string;
  detail: string;
}

/**
 * GET /api/cron/content-optimizer
 * 毎日04:00 UTCに実行。GSCデータを分析してコンテンツを自動最適化。
 */
async function handleOptimize(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 32) {
    console.error("CRON_SECRET is not configured or too short");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const actions: OptimizationAction[] = [];
  const errors: string[] = [];

  try {
    // マスタープロンプト読み込み
    const master = await loadContentMaster();
    const anthropic = getAnthropic();

    // ── 1. GSCスナップショットから直近7日と前7日を比較 ──
    const now = new Date();
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 7);
    const d14 = new Date(now);
    d14.setDate(d14.getDate() - 14);

    const fmt = (d: Date) => d.toISOString().split("T")[0];

    // 直近7日のスナップショット（keyword_id ごとに平均）
    const { data: recentSnaps } = await supabase
      .from("seo_snapshots")
      .select("keyword_id, position, impressions, ctr, clicks")
      .gte("snapshot_date", fmt(d7))
      .eq("source", "search_console");

    // 前7日のスナップショット
    const { data: prevSnaps } = await supabase
      .from("seo_snapshots")
      .select("keyword_id, position, impressions, ctr, clicks")
      .gte("snapshot_date", fmt(d14))
      .lt("snapshot_date", fmt(d7))
      .eq("source", "search_console");

    // keyword_id ごとに集計
    type Agg = {
      position: number;
      impressions: number;
      ctr: number;
      clicks: number;
      count: number;
    };
    function aggregate(
      snaps: typeof recentSnaps,
    ): Map<string, Agg> {
      const map = new Map<string, Agg>();
      for (const s of snaps ?? []) {
        const existing = map.get(s.keyword_id) || {
          position: 0,
          impressions: 0,
          ctr: 0,
          clicks: 0,
          count: 0,
        };
        existing.position += Number(s.position || 0);
        existing.impressions += Number(s.impressions || 0);
        existing.ctr += Number(s.ctr || 0);
        existing.clicks += Number(s.clicks || 0);
        existing.count++;
        map.set(s.keyword_id, existing);
      }
      // 平均化
      for (const [, v] of map) {
        if (v.count > 0) {
          v.position /= v.count;
          v.ctr /= v.count;
        }
      }
      return map;
    }

    const recentAgg = aggregate(recentSnaps);
    const prevAgg = aggregate(prevSnaps);

    // キーワード情報を取得
    const kwIds = [...new Set([...recentAgg.keys(), ...prevAgg.keys()])];
    if (kwIds.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No snapshot data found for optimization",
        actions: [],
        errors: [],
      });
    }

    const { data: keywords } = await supabase
      .from("seo_keywords")
      .select("id, keyword, target_url")
      .in("id", kwIds);

    const kwMap = new Map(
      (keywords ?? []).map((k) => [k.id, k]),
    );

    // ── 2. ルール適用 ──

    // ブログ記事一覧を取得（メタ更新対象の特定用）
    const blogFiles = fs.existsSync(BLOG_DIR)
      ? fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"))
      : [];

    const blogMeta: {
      filename: string;
      slug: string;
      title: string;
      description: string;
    }[] = [];
    for (const filename of blogFiles) {
      const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf8");
      const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
      const meta: Record<string, string> = {};
      if (fmMatch) {
        for (const line of fmMatch[1].split("\n")) {
          const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
          if (m) meta[m[1]] = m[2];
        }
      }
      blogMeta.push({
        filename,
        slug: filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(".md", ""),
        title: meta.title || "",
        description: meta.description || "",
      });
    }

    for (const [kwId, recent] of recentAgg) {
      const kw = kwMap.get(kwId);
      if (!kw) continue;

      const prev = prevAgg.get(kwId);

      // ── ルール A: メタ最適化 ──
      // 順位11-30位 + 表示32回以上 + CTR < 2%
      if (
        recent.position >= 11 &&
        recent.position <= 30 &&
        recent.impressions >= 32 &&
        recent.ctr < 2
      ) {
        // 対象記事を特定
        const targetBlog = blogMeta.find(
          (b) =>
            b.title.toLowerCase().includes(kw.keyword.toLowerCase()) ||
            (kw.target_url && kw.target_url.includes(b.slug)),
        );

        if (targetBlog && anthropic) {
          try {
            const result = await optimizeMeta(
              anthropic,
              master,
              kw.keyword,
              targetBlog,
              recent,
            );

            if (result) {
              // NGチェック
              const ngCheck = checkNgWords(
                `${result.title} ${result.description}`,
                master.ng_words,
              );

              if (ngCheck.passed) {
                // ファイル更新
                await updateBlogMeta(
                  targetBlog.filename,
                  result.title,
                  result.description,
                );

                // ログ記録
                if (result.title !== targetBlog.title) {
                  await supabase.from("content_updates").insert({
                    update_type: "meta_title",
                    target_slug: targetBlog.slug,
                    keyword: kw.keyword,
                    before_content: targetBlog.title,
                    after_content: result.title,
                    reason: `順位${recent.position.toFixed(1)}位, CTR${recent.ctr.toFixed(1)}%, 表示${recent.impressions}回 — タイトル最適化`,
                    auto_generated: true,
                  });
                }
                if (result.description !== targetBlog.description) {
                  await supabase.from("content_updates").insert({
                    update_type: "meta_description",
                    target_slug: targetBlog.slug,
                    keyword: kw.keyword,
                    before_content: targetBlog.description,
                    after_content: result.description,
                    reason: `順位${recent.position.toFixed(1)}位, CTR${recent.ctr.toFixed(1)}%, 表示${recent.impressions}回 — ディスクリプション最適化`,
                    auto_generated: true,
                  });
                }

                actions.push({
                  type: "meta_optimize",
                  keyword: kw.keyword,
                  slug: targetBlog.slug,
                  detail: `タイトル/ディスクリプションを最適化（順位${recent.position.toFixed(1)}, CTR${recent.ctr.toFixed(1)}%）`,
                });
              } else {
                errors.push(
                  `NG表現検出のためメタ更新をスキップ: ${kw.keyword} - ${ngCheck.violations.map((v) => v.word).join(", ")}`,
                );
              }
            }
          } catch (e) {
            errors.push(
              `メタ最適化エラー (${kw.keyword}): ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      }

      // ── ルール B: 記事リライト提案 ──
      // 順位が7日で3位以上下落
      if (prev && recent.position - prev.position >= 3) {
        await supabase.from("content_questions").insert({
          question: `「${kw.keyword}」の順位が${prev.position.toFixed(1)}位→${recent.position.toFixed(1)}位に下落しました。関連記事のリライトを検討すべきでしょうか？`,
          context: `7日間で${(recent.position - prev.position).toFixed(1)}位の下落。表示回数: ${recent.impressions}回, CTR: ${recent.ctr.toFixed(1)}%`,
          source: "seo_analysis",
          related_keyword: kw.keyword,
        });

        actions.push({
          type: "rewrite_proposal",
          keyword: kw.keyword,
          detail: `順位下落 ${prev.position.toFixed(1)} → ${recent.position.toFixed(1)} — リライト提案を質問キューに追加`,
        });
      }

      // ── ルール C: 新記事ドラフト ──
      // 表示50回以上だが記事がない（順位50位以下または順位なし）
      if (
        recent.impressions >= 50 &&
        (recent.position > 50 || recent.position === 0)
      ) {
        const relatedArticles = findRelatedArticles(kw.keyword);
        const hasDirectArticle = relatedArticles.some(
          (a) => a.relevance === "high",
        );

        if (!hasDirectArticle && anthropic) {
          try {
            const draft = await generateDraftArticle(
              anthropic,
              master,
              kw.keyword,
              recent,
            );

            if (draft) {
              // NGチェック
              const ngCheck = checkNgWords(
                `${draft.title} ${draft.description} ${draft.content}`,
                master.ng_words,
              );

              if (ngCheck.passed) {
                // content_updates にドラフトとして保存
                await supabase.from("content_updates").insert({
                  update_type: "new_draft",
                  keyword: kw.keyword,
                  after_content: JSON.stringify(draft),
                  reason: `表示${recent.impressions}回、既存記事なし — 新記事ドラフト自動生成`,
                  status: "draft",
                  auto_generated: true,
                });

                actions.push({
                  type: "new_draft",
                  keyword: kw.keyword,
                  detail: `新記事ドラフト「${draft.title}」を自動生成`,
                });
              } else {
                errors.push(
                  `NG表現検出のため新記事ドラフトをスキップ: ${kw.keyword}`,
                );
              }
            }
          } catch (e) {
            errors.push(
              `ドラフト生成エラー (${kw.keyword}): ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      optimizedAt: new Date().toISOString(),
      keywordsAnalyzed: recentAgg.size,
      actions,
      errors,
    });
  } catch (err) {
    console.error("Content optimizer error:", err);
    return NextResponse.json(
      {
        error: "Content optimization failed",
        message: err instanceof Error ? err.message : String(err),
        actions,
        errors,
      },
      { status: 500 },
    );
  }
}

/* ── メタタイトル/ディスクリプション最適化 ── */
async function optimizeMeta(
  anthropic: Anthropic,
  master: ContentMasterData,
  keyword: string,
  blog: { title: string; description: string; slug: string },
  stats: { position: number; impressions: number; ctr: number },
): Promise<{ title: string; description: string } | null> {
  const systemPrompt = buildSystemPrompt(master);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `以下の記事のメタタイトルとディスクリプションを最適化してください。
CTRを改善するため、検索ユーザーがクリックしたくなる表現に改善します。

## 対象キーワード: ${keyword}
- 現在の順位: ${stats.position.toFixed(1)}位
- 表示回数: ${stats.impressions}回
- CTR: ${stats.ctr.toFixed(1)}%

## 現在のメタ情報
- タイトル: ${blog.title}
- ディスクリプション: ${blog.description}

## 出力形式（JSON）
{"title": "新しいタイトル（50-65文字）", "description": "新しいディスクリプション（120-160文字）"}

注意:
- キーワード「${keyword}」を自然に含める
- 現在よりクリック率が上がる表現に
- 大きく変えすぎず、改善する程度に
- JSON以外のテキストを含めない`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

/* ── 新記事ドラフト生成 ── */
async function generateDraftArticle(
  anthropic: Anthropic,
  master: ContentMasterData,
  keyword: string,
  stats: { impressions: number; position: number },
): Promise<{
  title: string;
  description: string;
  category: string;
  content: string;
} | null> {
  const systemPrompt = buildSystemPrompt(master);
  const relatedArticles = findRelatedArticles(keyword);

  let competitionInfo = "";
  if (relatedArticles.length > 0) {
    competitionInfo = "\n## 自サイト内の中関連記事（内部リンク先として活用）\n";
    for (const a of relatedArticles.slice(0, 5)) {
      competitionInfo += `- "${a.title}" → /blog/${a.slug}\n`;
    }
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `以下のキーワードで新しいSEO記事を生成してください。

## ターゲットキーワード: ${keyword}
- 表示回数: ${stats.impressions}回（まだ記事がないため高い潜在需要あり）
${competitionInfo}

## ターゲット読者
フリーランスコンサルタント / 独立を検討中のコンサルタント / フリーコンサル活用を検討している企業

## 注意
- E-E-A-T重視の実践的な記事
- 3,000-5,000文字
- PERSONAの宣伝はCTAのみ
- 内部リンクを2-4本配置`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

/* ── ブログファイルのメタ更新 ── */
async function updateBlogMeta(
  filename: string,
  newTitle: string,
  newDescription: string,
) {
  const filepath = path.join(BLOG_DIR, filename);
  if (!fs.existsSync(filepath)) return;

  const raw = fs.readFileSync(filepath, "utf8");
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) return;

  const meta: Record<string, string> = {};
  for (const line of fmMatch[1].split("\n")) {
    const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
    if (m) meta[m[1]] = m[2];
  }

  meta.title = newTitle;
  meta.description = newDescription;

  const newFm = [
    "---",
    `title: "${meta.title.replace(/"/g, '\\"')}"`,
    `date: "${meta.date || ""}"`,
  ];
  if (meta.description)
    newFm.push(`description: "${meta.description.replace(/"/g, '\\"')}"`);
  if (meta.category) newFm.push(`category: "${meta.category}"`);
  if (meta.thumbnail) newFm.push(`thumbnail: "${meta.thumbnail}"`);
  newFm.push("---");

  fs.writeFileSync(filepath, newFm.join("\n") + "\n" + fmMatch[2], "utf8");
}

export async function GET(request: NextRequest) {
  return handleOptimize(request);
}

export async function POST(request: NextRequest) {
  return handleOptimize(request);
}
