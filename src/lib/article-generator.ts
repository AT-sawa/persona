/**
 * SEO記事生成ウィザード — 共有ロジック
 *
 * 既存ブログ記事の競合分析と、Claude API用プロンプト生成を
 * フロントエンド（SEO管理画面）とバックエンド（API）の両方で利用。
 *
 * content_master によるマスタープロンプト読み込み・NGチェック機能を含む。
 */

import { createClient } from "@supabase/supabase-js";

// ─── マスタープロンプト型 ───

export interface ContentMasterEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  is_active: boolean;
  sort_order: number;
}

export interface ContentMasterData {
  brand_voice: ContentMasterEntry[];
  facts: ContentMasterEntry[];
  instructions: ContentMasterEntry[];
  ng_words: ContentMasterEntry[];
  keywords: ContentMasterEntry[];
  qa: ContentMasterEntry[];
}

// ─── NGチェック結果型 ───

export interface NgCheckResult {
  passed: boolean;
  violations: { word: string; context: string }[];
}

/**
 * content_master テーブルからアクティブなエントリを全件取得し、
 * カテゴリ別に分類して返す。
 * サーバーサイド専用（SUPABASE_SERVICE_ROLE_KEY 必須）。
 */
export async function loadContentMaster(): Promise<ContentMasterData> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from("content_master")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load content_master:", error);
    return {
      brand_voice: [],
      facts: [],
      instructions: [],
      ng_words: [],
      keywords: [],
      qa: [],
    };
  }

  const result: ContentMasterData = {
    brand_voice: [],
    facts: [],
    instructions: [],
    ng_words: [],
    keywords: [],
    qa: [],
  };

  for (const entry of data ?? []) {
    const cat = entry.category as keyof ContentMasterData;
    if (result[cat]) result[cat].push(entry);
  }

  return result;
}

/**
 * content_master のデータからシステムプロンプトを動的に生成する。
 * マスターデータがない場合はデフォルトの ARTICLE_SYSTEM_PROMPT を返す。
 */
export function buildSystemPrompt(master: ContentMasterData): string {
  const sections: string[] = [
    "あなたはPERSONA（persona-consultant.com）のSEO記事ライターです。",
    "フリーランスコンサルタント向けの案件紹介プラットフォームのブログ記事を作成します。",
  ];

  // ブランドボイス
  if (master.brand_voice.length > 0) {
    sections.push("\n## ブランドボイス");
    for (const e of master.brand_voice) {
      sections.push(`- ${e.title}: ${e.content}`);
    }
  }

  // 事実データ
  if (master.facts.length > 0) {
    sections.push("\n## サイト情報（事実データ）");
    for (const e of master.facts) {
      sections.push(`- ${e.title}: ${e.content}`);
    }
  } else {
    sections.push(`\n## サイト情報
- 大手ファーム出身者1,200名以上が登録
- 月額報酬125万円〜の高単価案件中心
- PMO/戦略/IT/DX/SAP/生成AIなどのコンサル案件
- 提携エージェント30社以上`);
  }

  // 記事作成ルール
  if (master.instructions.length > 0) {
    sections.push("\n## 記事ルール");
    for (const e of master.instructions) {
      sections.push(`- ${e.title}: ${e.content}`);
    }
  } else {
    sections.push(`\n## 記事ルール
- E-E-A-T（経験・専門性・権威性・信頼性）を重視
- 3,000〜5,000文字の本格記事
- Markdown形式（## でH2見出し、### でH3見出し）
- 冒頭に太字で読者の課題を端的に提示（1-2文）
- 次に --- 区切り線を入れる
- 本文でデータや具体例を交えて解決策を提示
- 最後のセクションでCTA（PERSONAへの誘導は最小限、/cases へのリンク1つ程度）
- 内部リンクを2-4本配置（関連記事URLは /blog/{slug} 形式）
- 「PERSONAでは〜」のような直接的宣伝は最後のCTAセクションのみ`);
  }

  // NG表現
  if (master.ng_words.length > 0) {
    sections.push("\n## NG表現（以下の表現は絶対に使用禁止）");
    for (const e of master.ng_words) {
      sections.push(`- ${e.title}: ${e.content}`);
    }
  }

  // 重要キーワード
  if (master.keywords.length > 0) {
    sections.push("\n## 重要キーワード（自然に含めること）");
    for (const e of master.keywords) {
      sections.push(`- ${e.title}: ${e.content}`);
    }
  }

  // Q&Aから蓄積されたナレッジ
  if (master.qa.length > 0) {
    sections.push("\n## 追加ナレッジ（Q&Aから蓄積）");
    for (const e of master.qa) {
      sections.push(`### Q: ${e.title}\nA: ${e.content}`);
    }
  }

  // 出力形式
  sections.push(`\n## 出力形式
以下のJSON形式で出力してください。JSON以外のテキストを含めないでください。

{
  "title": "SEO最適化されたタイトル（50-65文字、キーワードを含む）",
  "description": "メタディスクリプション（120-160文字、検索ユーザーがクリックしたくなる内容）",
  "category": "カテゴリ名",
  "content": "Markdown形式の記事本文"
}

カテゴリは以下から選択:
- ノウハウ: フリーコンサルとしての実務テクニック
- キャリア: 独立・転身・キャリアパス関連
- 業界トレンド: 市場動向・将来展望
- 企業向け: フリーコンサル活用の企業側視点
- サービス紹介: PERSONAサービス・機能紹介`);

  return sections.join("\n");
}

/**
 * 生成テキストにNG表現が含まれていないかチェック。
 * content_master の ng_words カテゴリを使用。
 */
export function checkNgWords(
  text: string,
  ngEntries: ContentMasterEntry[],
): NgCheckResult {
  const violations: { word: string; context: string }[] = [];
  const textLower = text.toLowerCase();

  for (const entry of ngEntries) {
    // content からNG語を抽出（/ 区切り）
    const words = entry.content
      .split(/[/／\n]/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    for (const word of words) {
      const wordLower = word.toLowerCase();
      const idx = textLower.indexOf(wordLower);
      if (idx !== -1) {
        // 前後50文字を切り出してコンテキストを提供
        const start = Math.max(0, idx - 50);
        const end = Math.min(text.length, idx + word.length + 50);
        violations.push({
          word,
          context: text.slice(start, end),
        });
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

// ─── 既存ブログ記事リスト ───

export const EXISTING_ARTICLES: { slug: string; title: string }[] = [
  { slug: "persona-platform-overview", title: "PERSONAとは？｜大手ファーム出身者1,200人が選ぶフリーコンサルプラットフォームの全貌" },
  { slug: "choose-freelance-consulting-service", title: "フリーコンサル案件紹介サービスの選び方｜7つのチェックポイントと見落としがちな落とし穴" },
  { slug: "first-challenges-after-independence", title: "独立直後のフリーコンサルが最初にぶつかる3つの壁｜具体的な乗り越え方を解説" },
  { slug: "three-categories-of-consulting", title: "フリーコンサル案件の3分類｜戦略・業務・ITで何が違い、今どう変わっているか" },
  { slug: "ai-projects-for-freelance-consultants", title: "AI案件がフリーコンサル市場で急増している｜AI専門家でなくても参画できる理由" },
  { slug: "why-matching-fails", title: "フリーコンサルのマッチングはなぜ失敗するのか｜ファーム出身エージェントが目利きする理由" },
  { slug: "workload-design-strategy", title: "フリーコンサルの稼働率設計｜100%を目指さないほうがいい理由" },
  { slug: "how-many-agents-to-register", title: "フリーコンサルのエージェントは何社登録すべきか｜ハブ型プラットフォームという選択肢" },
  { slug: "why-strategy-projects-pay-more", title: "戦略案件の単価が高止まりしている理由｜参画できる人とできない人の差" },
  { slug: "why-top-firm-alumni-choose-persona", title: "PERSONAに大手ファーム出身者が集まる理由｜MBB・Big4出身者にとっての合理性" },
  { slug: "how-to-use-freelance-consultants", title: "フリーコンサルの活用方法｜ファームに頼むほどではない案件をどう外注するか" },
  { slug: "best-timing-to-leave-firm", title: "コンサルファームを辞めてフリーになるベストなタイミング｜早すぎても遅すぎても損をする" },
  { slug: "freelance-vs-firm-comparison", title: "フリーコンサルとファームの使い分け｜コスト・柔軟性・品質で比較する" },
  { slug: "fee-negotiation-tips", title: "フリーコンサルの単価交渉｜自分を安売りしないための考え方" },
  { slug: "why-companies-fail-with-freelancers", title: "フリーコンサルへの依頼で失敗する企業の共通点｜5つの原因と防ぎ方" },
  { slug: "business-consultant-to-it-projects", title: "業務コンサル出身者がIT案件に越境するための具体的ステップ" },
  { slug: "minimum-unit-freelance-consulting", title: "1人月から始めるフリーコンサル活用｜最小単位でのアサイン事例" },
  { slug: "skill-sheet-writing-guide", title: "フリーコンサルのスキルシートの書き方｜案件が決まる人と決まらない人の差" },
  { slug: "dx-with-freelance-consultants", title: "DX推進にフリーコンサルを活用すべき理由｜ファームより速く、SIerより上流から" },
  { slug: "how-to-get-repeat-projects", title: "フリーコンサルが案件を継続受注するために現場でやるべきこと" },
  { slug: "tax-filing-and-incorporation", title: "フリーコンサルの確定申告と法人化の判断基準｜いつ法人にすべきか" },
  { slug: "outsourcing-pmo-to-freelancers", title: "フリーコンサルにPMOを任せるときの注意点と成功パターン" },
  { slug: "mbb-alumni-freelance-guide", title: "MBB出身者がフリーコンサルになるとき知っておくべきこと" },
  { slug: "generative-ai-with-freelance-consultants", title: "生成AI導入にフリーコンサルを活用する方法｜PoC〜本格導入までの進め方" },
  { slug: "big4-alumni-freelance-guide", title: "Big4出身者のフリーコンサル転身｜総合系ファームの強みをどう活かすか" },
  { slug: "freelance-consulting-cost-guide", title: "フリーコンサルへの依頼費用の相場と予算の考え方" },
  { slug: "parallel-project-management", title: "フリーコンサルが複数案件を並行するための実践ガイド" },
  { slug: "mid-term-plan-with-freelancers", title: "中期経営計画の策定にフリーコンサルを活用する｜経営層の壁打ち相手として" },
  { slug: "remote-freelance-consulting", title: "フリーコンサルのリモート案件｜探し方と働き方の実態" },
  { slug: "freelance-consulting-case-studies", title: "フリーコンサルの活用事例｜業界別・テーマ別パターン集" },
  { slug: "accenture-alumni-freelance-guide", title: "アクセンチュア出身者のフリーコンサル転身｜デジタル×実行力の活かし方" },
  { slug: "freelance-contract-types", title: "フリーコンサルとの契約形態｜準委任・請負・顧問の違いと選び方" },
  { slug: "freelance-annual-income-simulation", title: "フリーコンサルの年収シミュレーション｜ファーム時代と比較する" },
  { slug: "new-business-with-freelancers", title: "新規事業開発にフリーコンサルを活用する｜アイデア創出からPoC実行まで" },
  { slug: "freelance-suitability-checklist", title: "フリーコンサルに向いている人・向いていない人｜独立前に確認すべきチェックリスト" },
  { slug: "why-companies-repeat-freelancers", title: "フリーコンサルをリピート活用する企業の共通点" },
  { slug: "skills-to-develop-after-independence", title: "フリーコンサルが独立後に伸ばすべきスキル3選" },
  { slug: "sap-with-freelance-consultants", title: "SAP導入にフリーコンサルを活用する｜専門人材不足の解決策" },
  { slug: "freelance-sales-not-needed", title: "フリーコンサルの営業は不要？案件獲得の全体像" },
  { slug: "freelance-onboarding-guide", title: "フリーコンサルのオンボーディング｜参画初日から成果を出させる方法" },
  { slug: "freelance-mental-health", title: "フリーコンサルのメンタルヘルス管理｜孤独と不安への対処法" },
  { slug: "pmi-with-freelance-consultants", title: "M&A後のPMIにフリーコンサルを活用する｜統合を成功させる外部人材の使い方" },
  { slug: "ten-year-freelance-career-design", title: "フリーコンサルとして10年活動するためのキャリア設計" },
  { slug: "freelancers-for-corporate-planning", title: "経営企画部門の外部リソースとしてフリーコンサルを活用する" },
  { slug: "freelance-client-interview-tips", title: "フリーコンサルのクライアント面接対策｜聞かれる質問と答え方" },
  { slug: "internal-approval-for-freelancers", title: "フリーコンサル活用のための社内稟議の通し方" },
  { slug: "freelance-market-outlook", title: "フリーコンサル市場の今後5年の展望｜需要は伸びるか、何が変わるか" },
  { slug: "cost-reduction-with-freelancers", title: "コスト削減プロジェクトにフリーコンサルを活用する" },
  { slug: "breaking-out-of-busy-but-stagnant", title: "フリーコンサルが陥る「忙しいのに成長しない」状態の抜け出し方" },
  { slug: "freelance-utilization-checklist", title: "フリーコンサル活用のチェックリスト｜初めての企業向け完全ガイド" },
];

// ─── 競合分析 ───

export interface RelatedArticle {
  slug: string;
  title: string;
  relevance: "high" | "medium";
}

/**
 * キーワードに関連する既存ブログ記事を検索
 *
 * - high: キーワード全体がタイトルに含まれる
 * - medium: キーワードのトークンが2つ以上タイトルに含まれる
 */
export function findRelatedArticles(keyword: string): RelatedArticle[] {
  const kw = keyword.toLowerCase();
  const kwTokens = kw.split(/[\s\u3000]+/).filter((t) => t.length > 1);
  const results: RelatedArticle[] = [];

  for (const article of EXISTING_ARTICLES) {
    const titleLower = article.title.toLowerCase();
    // 高関連: キーワード全体がタイトルに含まれる
    if (titleLower.includes(kw)) {
      results.push({ ...article, relevance: "high" });
      continue;
    }
    // 中関連: キーワードのトークンが2つ以上タイトルに含まれる
    const matchCount = kwTokens.filter((t) => titleLower.includes(t)).length;
    if (matchCount >= 2 || (kwTokens.length === 1 && matchCount === 1)) {
      results.push({ ...article, relevance: "medium" });
    }
  }
  return results;
}

// ─── ウィザード回答型 ───

export interface WizardAnswers {
  audience: string;
  angle: string;
  differentiator: string;
  keyPoints: string;
  tone: string;
  additionalNotes: string;
}

// ─── Claude指示コピー用プロンプト（既存互換） ───

export function buildClaudePrompt(
  keyword: string,
  position?: number,
  impressions?: number,
): string {
  const related = findRelatedArticles(keyword);
  const highRel = related.filter((r) => r.relevance === "high");
  const medRel = related.filter((r) => r.relevance === "medium");

  let competitionSection = "";
  if (related.length > 0) {
    competitionSection = `\n■ 自サイト内の既存記事（カニバリ・競合に注意）:\n`;
    if (highRel.length > 0) {
      competitionSection += `  【高関連 — 内容の重複回避が必須】\n`;
      for (const a of highRel) {
        competitionSection += `  - "${a.title}" → /blog/${a.slug}\n`;
      }
    }
    if (medRel.length > 0) {
      competitionSection += `  【中関連 — 内部リンク先として活用可能】\n`;
      for (const a of medRel.slice(0, 5)) {
        competitionSection += `  - "${a.title}" → /blog/${a.slug}\n`;
      }
    }
    competitionSection += `\n  ※ 上記の既存記事と内容が重複しないよう差別化してください。\n`;
    competitionSection += `  ※ 高関連の記事がある場合は、新記事からその記事へ内部リンクを貼り、\n`;
    competitionSection += `    逆に既存記事から新記事へリンクを追加する提案もしてください。\n`;
    if (highRel.length > 0) {
      competitionSection += `  ※ 既存記事のリライト・統合のほうが効果的な場合はその旨を提案してください。\n`;
    }
  } else {
    competitionSection = `\n■ 自サイト内の既存記事: このキーワードに直接関連する記事はまだありません（新規記事として有望）。\n`;
  }

  return `以下のキーワードでSEO記事を作成したい。記事の構成案を作ってください。

■ ターゲットキーワード: ${keyword}
${position ? `■ 現在の検索順位: ${position}位` : ""}
${impressions ? `■ 月間表示回数: ${impressions}回` : ""}
■ サイト: persona-consultant.com（フリーコンサル案件紹介サービス）
■ ターゲット読者: フリーランスコンサルタント / 独立を検討中のコンサルタント
■ 既存記事数: ${EXISTING_ARTICLES.length}本
${competitionSection}
以下を含めてください:
1. SEOに最適化されたタイトル案（3つ）— 既存記事と被らないこと
2. メタディスクリプション案（120-160文字）
3. 記事構成（H2/H3見出し）— 既存記事との差別化ポイントを明記
4. 各セクションの要点（箇条書き）
5. 内部リンク戦略:
   a. 新記事 → 既存記事への内部リンク候補
   b. 既存記事 → 新記事へ追加すべきリンク（どの記事のどのセクション）
6. 想定文字数: 3,000〜5,000文字
7. 既存記事との差別化ポイントの説明

■ 重要:
- 「フリーコンサル」「フリーランスコンサルタント」を自然に含める
- PERSONAサービスの強みを適切に織り交ぜる（案件数100+、提携エージェント30+、高単価帯）
- E-E-A-T（経験、専門性、権威性、信頼性）を意識した内容に
- 既存記事とのカニバリゼーション（共食い）を避け、相互リンクで全体のSEO効果を高める`;
}

// ─── 記事生成用プロンプト ───

export function buildArticleGenerationPrompt(
  keyword: string,
  answers: WizardAnswers,
  relatedArticles: RelatedArticle[],
  position?: number,
  impressions?: number,
): string {
  const highRel = relatedArticles.filter((r) => r.relevance === "high");
  const medRel = relatedArticles.filter((r) => r.relevance === "medium");

  let competitionInfo = "";
  if (relatedArticles.length > 0) {
    competitionInfo = "\n## 自サイト内の既存記事（重複回避必須）\n";
    if (highRel.length > 0) {
      competitionInfo += "### 高関連（内容の差別化が必須）\n";
      for (const a of highRel) {
        competitionInfo += `- "${a.title}" → /blog/${a.slug}\n`;
      }
    }
    if (medRel.length > 0) {
      competitionInfo += "### 中関連（内部リンク先として活用）\n";
      for (const a of medRel.slice(0, 5)) {
        competitionInfo += `- "${a.title}" → /blog/${a.slug}\n`;
      }
    }
  } else {
    competitionInfo =
      "\n## 既存記事: このキーワードに関連する記事はまだないため、新規記事として有望です。\n";
  }

  const parts = [
    `## ターゲットキーワード: ${keyword}`,
    position ? `- 現在の検索順位: ${position}位` : null,
    impressions ? `- 月間表示回数: ${impressions}回` : null,
    competitionInfo,
    "## ユーザーからの指示",
    answers.audience
      ? `### ターゲット読者\n${answers.audience}`
      : null,
    answers.angle
      ? `### 記事の切り口・アプローチ\n${answers.angle}`
      : null,
    answers.differentiator
      ? `### 他記事との差別化ポイント\n${answers.differentiator}`
      : null,
    answers.keyPoints
      ? `### 必ず含めたいポイント\n${answers.keyPoints}`
      : null,
    answers.tone ? `### トーン: ${answers.tone}` : null,
    answers.additionalNotes
      ? `### その他要望\n${answers.additionalNotes}`
      : null,
  ];

  return parts.filter(Boolean).join("\n\n");
}

// ─── Claudeシステムプロンプト ───

export const ARTICLE_SYSTEM_PROMPT = `あなたはPERSONA（persona-consultant.com）のSEO記事ライターです。
フリーランスコンサルタント向けの案件紹介プラットフォームのブログ記事を作成します。

## サイト情報
- 大手ファーム出身者1,200名以上が登録
- 月額報酬125万円〜の高単価案件中心
- PMO/戦略/IT/DX/SAP/生成AIなどのコンサル案件
- 提携エージェント30社以上

## 記事ルール
- E-E-A-T（経験・専門性・権威性・信頼性）を重視
- 3,000〜5,000文字の本格記事
- Markdown形式（## でH2見出し、### でH3見出し）
- 冒頭に太字で読者の課題を端的に提示（1-2文）
- 次に --- 区切り線を入れる
- 本文でデータや具体例を交えて解決策を提示
- 最後のセクションでCTA（PERSONAへの誘導は最小限、/cases へのリンク1つ程度）
- 内部リンクを2-4本配置（関連記事URLは /blog/{slug} 形式）
- 「PERSONAでは〜」のような直接的宣伝は最後のCTAセクションのみ

## 出力形式
以下のJSON形式で出力してください。JSON以外のテキストを含めないでください。

{
  "title": "SEO最適化されたタイトル（50-65文字、キーワードを含む）",
  "description": "メタディスクリプション（120-160文字、検索ユーザーがクリックしたくなる内容）",
  "category": "カテゴリ名",
  "content": "Markdown形式の記事本文"
}

カテゴリは以下から選択:
- ノウハウ: フリーコンサルとしての実務テクニック
- キャリア: 独立・転身・キャリアパス関連
- 業界トレンド: 市場動向・将来展望
- 企業向け: フリーコンサル活用の企業側視点
- サービス紹介: PERSONAサービス・機能紹介`;
