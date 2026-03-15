"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SeoKeyword, SeoSnapshot } from "@/lib/types";
import {
  EXISTING_ARTICLES,
  findRelatedArticles,
  buildClaudePrompt,
  type WizardAnswers,
} from "@/lib/article-generator";

/* ─── Helpers ─── */

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

const CHART_COLORS = [
  "#1FABE9",
  "#091747",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
];

type SortField = "position" | "clicks" | "impressions" | "ctr" | "keyword";
type KeywordTab = "relevant" | "irrelevant" | "all";

/* ─── Keyword relevance classifier ─── */

const RELEVANT_PATTERNS = [
  // Core business
  /コンサル/i, /フリーランス/i, /フリーコンサル/i, /フリー\s?コンサル/i,
  /案件/i, /マッチング/i, /独立/i, /エージェント/i, /プラットフォーム/i,
  // Domains
  /pmo/i, /sap/i, /dx/i, /erp/i, /iot/i, /it\s?コンサル/i,
  /戦略/i, /金融/i, /公共/i, /セキュリティ/i, /servicenow/i,
  /マーケティング/i, /業務改善/i, /業務改革/i, /人事\s?案件/i, /人材\s?案件/i,
  /教育\s?案件/i, /通信\s?案件/i, /商社\s?案件/i, /食品\s?案件/i, /業務\s?案件/i,
  // Brand
  /persona/i, /ペルソナ\s?コンサル/i,
  // Fee / work style
  /高単価/i, /副業/i, /年収/i, /社員代替/i, /常駐/i,
];

function isRelevantKeyword(kw: string): boolean {
  return RELEVANT_PATTERNS.some((p) => p.test(kw));
}

/* ─── Component ─── */

export default function AdminSeoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState<SeoKeyword[]>([]);
  const [snapshots, setSnapshots] = useState<SeoSnapshot[]>([]);

  // Form states
  const [snapshotKeywordId, setSnapshotKeywordId] = useState("");
  const [snapshotPosition, setSnapshotPosition] = useState("");
  const [snapshotClicks, setSnapshotClicks] = useState("");
  const [snapshotImpressions, setSnapshotImpressions] = useState("");
  const [snapshotCtr, setSnapshotCtr] = useState("");
  const [submittingSnapshot, setSubmittingSnapshot] = useState(false);

  const [newKeyword, setNewKeyword] = useState("");
  const [newTargetUrl, setNewTargetUrl] = useState("");
  const [newIsPrimary, setNewIsPrimary] = useState(false);
  const [submittingKeyword, setSubmittingKeyword] = useState(false);

  const [sortField, setSortField] = useState<SortField>("position");
  const [sortAsc, setSortAsc] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showTodos, setShowTodos] = useState(true);
  const [keywordTab, setKeywordTab] = useState<KeywordTab>("relevant");

  // Sync status states
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Blog article creation dialog
  const [showArticleDialog, setShowArticleDialog] = useState(false);
  const [articleTitle, setArticleTitle] = useState("");
  const [articleSlug, setArticleSlug] = useState("");
  const [articleDate, setArticleDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [articleDescription, setArticleDescription] = useState("");
  const [articleCategory, setArticleCategory] = useState("ノウハウ");
  const [articleContent, setArticleContent] = useState("");
  const [articleSaving, setArticleSaving] = useState(false);
  const [articleResult, setArticleResult] = useState<{
    ok: boolean;
    url?: string;
    error?: string;
  } | null>(null);

  // Claude prompt copy states
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [promptKeyword, setPromptKeyword] = useState("");

  // Claude prompt preview states
  const [previewKeyword, setPreviewKeyword] = useState<string | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState<string>("");

  // Article generation wizard states
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardKeyword, setWizardKeyword] = useState("");
  const [wizardPosition, setWizardPosition] = useState<number | undefined>();
  const [wizardImpressions, setWizardImpressions] = useState<number | undefined>();
  const [wizAnswers, setWizAnswers] = useState<WizardAnswers>({
    audience: "",
    angle: "",
    differentiator: "",
    keyPoints: "",
    tone: "実践的",
    additionalNotes: "",
  });
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedArticle, setGeneratedArticle] = useState<{
    title: string;
    description: string;
    category: string;
    content: string;
  } | null>(null);

  // SEO action tracking
  interface SeoAction {
    id: string;
    action_type: string;
    keyword: string;
    description: string;
    before_position: number | null;
    before_clicks: number | null;
    before_impressions: number | null;
    after_position: number | null;
    after_clicks: number | null;
    after_impressions: number | null;
    created_at: string;
  }
  const [seoActions, setSeoActions] = useState<SeoAction[]>([]);
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionType, setActionType] = useState("article");
  const [actionKeyword, setActionKeyword] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [savingAction, setSavingAction] = useState(false);

  /* ─── Fetch data ─── */
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo");
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setKeywords(data.keywords || []);
      setSnapshots(data.snapshots || []);

      // Determine last Search Console sync time from snapshots
      const scSnapshots = (data.snapshots || []).filter(
        (s: SeoSnapshot) => s.source === "search_console"
      );
      if (scSnapshots.length > 0) {
        const latest = scSnapshots.reduce(
          (a: SeoSnapshot, b: SeoSnapshot) =>
            (a.created_at ?? "") > (b.created_at ?? "") ? a : b
        );
        setLastSyncTime(latest.created_at);
      } else {
        setLastSyncTime(null);
      }
    } catch (err) {
      console.error("SEO data fetch error:", err);
    }

    // Fetch SEO actions
    try {
      const actionsRes = await fetch("/api/admin/seo-actions");
      if (actionsRes.ok) {
        const actionsData = await actionsRes.json();
        setSeoActions(actionsData.actions || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.is_admin) {
        router.push("/dashboard");
        return;
      }
      await fetchData();
      setLoading(false);
    }
    init();
  }, [router, fetchData]);

  /* ─── Derived data ─── */

  // Map keyword_id -> latest snapshot per keyword
  const latestByKeyword = useMemo(() => {
    const map: Record<string, SeoSnapshot> = {};
    for (const s of snapshots) {
      if (!map[s.keyword_id] || s.snapshot_date > map[s.keyword_id].snapshot_date) {
        map[s.keyword_id] = s;
      }
    }
    return map;
  }, [snapshots]);

  // Map keyword_id -> snapshot from ~7 days ago
  const weekAgoByKeyword = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const targetDate = sevenDaysAgo.toISOString().split("T")[0];

    const map: Record<string, SeoSnapshot> = {};
    for (const s of snapshots) {
      if (s.snapshot_date <= targetDate) {
        if (!map[s.keyword_id] || s.snapshot_date > map[s.keyword_id].snapshot_date) {
          map[s.keyword_id] = s;
        }
      }
    }
    return map;
  }, [snapshots]);

  // KPIs
  const primaryKeywords = keywords.filter((k) => k.is_primary);
  const primaryPositions = primaryKeywords
    .map((k) => latestByKeyword[k.id]?.position)
    .filter((p): p is number => p !== null && p !== undefined);
  const avgPrimaryPosition =
    primaryPositions.length > 0
      ? primaryPositions.reduce((a, b) => a + b, 0) / primaryPositions.length
      : null;

  const totalClicks30d = snapshots.reduce((sum, s) => sum + (s.clicks || 0), 0);
  const totalImpressions30d = snapshots.reduce((sum, s) => sum + (s.impressions || 0), 0);
  const avgCtr =
    totalImpressions30d > 0
      ? (totalClicks30d / totalImpressions30d) * 100
      : 0;

  // Chart data: primary keywords, position over time
  const chartData = useMemo(() => {
    const primaryKws = keywords.filter((k) => k.is_primary);
    if (primaryKws.length === 0) return { dates: [], series: [] };

    // Build 30-day date range
    const now = new Date();
    const dates: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      dates.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      );
    }

    // Group snapshots by keyword_id and date
    const snapshotMap: Record<string, Record<string, number | null>> = {};
    for (const kw of primaryKws) {
      snapshotMap[kw.id] = {};
    }
    for (const s of snapshots) {
      if (snapshotMap[s.keyword_id]) {
        snapshotMap[s.keyword_id][s.snapshot_date] = s.position;
      }
    }

    const series = primaryKws.map((kw, i) => ({
      keyword: kw.keyword,
      color: CHART_COLORS[i % CHART_COLORS.length],
      data: dates.map((d) => snapshotMap[kw.id]?.[d] ?? null),
    }));

    return { dates, series };
  }, [keywords, snapshots]);

  // Sorted keywords for table
  const sortedKeywords = useMemo(() => {
    const arr = [...keywords];
    arr.sort((a, b) => {
      const snapA = latestByKeyword[a.id];
      const snapB = latestByKeyword[b.id];

      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortField) {
        case "keyword":
          valA = a.keyword;
          valB = b.keyword;
          break;
        case "position":
          valA = snapA?.position ?? 999;
          valB = snapB?.position ?? 999;
          break;
        case "clicks":
          valA = snapA?.clicks ?? 0;
          valB = snapB?.clicks ?? 0;
          break;
        case "impressions":
          valA = snapA?.impressions ?? 0;
          valB = snapB?.impressions ?? 0;
          break;
        case "ctr":
          valA = snapA?.ctr ?? 0;
          valB = snapB?.ctr ?? 0;
          break;
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });
    return arr;
  }, [keywords, latestByKeyword, sortField, sortAsc]);

  // Filtered keywords by tab
  const filteredKeywords = useMemo(() => {
    if (keywordTab === "all") return sortedKeywords;
    return sortedKeywords.filter((kw) =>
      keywordTab === "relevant"
        ? kw.is_primary || isRelevantKeyword(kw.keyword)
        : !kw.is_primary && !isRelevantKeyword(kw.keyword)
    );
  }, [sortedKeywords, keywordTab]);

  const relevantCount = useMemo(
    () => keywords.filter((kw) => kw.is_primary || isRelevantKeyword(kw.keyword)).length,
    [keywords]
  );
  const irrelevantCount = keywords.length - relevantCount;

  /* ─── Dynamic SEO Recommendations ─── */

  type SeoRecommendation = {
    type: "article" | "ctr" | "declining" | "opportunity" | "quick_win";
    priority: "high" | "medium" | "low";
    keyword: string;
    message: string;
    detail: string;
    metric?: string;
  };

  const recommendations = useMemo<SeoRecommendation[]>(() => {
    const recs: SeoRecommendation[] = [];
    const relevantKws = keywords.filter(
      (kw) => kw.is_primary || isRelevantKeyword(kw.keyword)
    );

    for (const kw of relevantKws) {
      const latest = latestByKeyword[kw.id];
      const weekAgo = weekAgoByKeyword[kw.id];
      if (!latest) continue;

      const pos = latest.position ?? 999;
      const clicks = latest.clicks ?? 0;
      const impressions = latest.impressions ?? 0;
      const ctr = latest.ctr ?? 0;
      const prevPos = weekAgo?.position ?? null;

      // 1) 順位11-30位 + 表示回数が多い → 記事作成推奨
      if (pos >= 11 && pos <= 30 && impressions >= 5) {
        recs.push({
          type: "article",
          priority: impressions >= 20 ? "high" : "medium",
          keyword: kw.keyword,
          message: `「${kw.keyword}」の専用記事を作成`,
          detail: `現在${pos}位・表示${impressions}回。専用記事を書いて10位以内を目指しましょう。`,
          metric: `${pos}位 / ${impressions}表示`,
        });
      }

      // 2) 順位1-10位だがCTRが低い → メタ説明文・タイトル改善
      if (pos >= 1 && pos <= 10 && ctr < 3.0 && impressions >= 10) {
        recs.push({
          type: "ctr",
          priority: pos <= 5 ? "high" : "medium",
          keyword: kw.keyword,
          message: `「${kw.keyword}」のtitle/descriptionを改善`,
          detail: `${pos}位でCTR ${ctr.toFixed(1)}%は低め。タイトルやmeta descriptionを魅力的にしてクリック率を上げましょう。`,
          metric: `CTR ${ctr.toFixed(1)}% / ${pos}位`,
        });
      }

      // 3) 7日間で順位が3以上下がった → アラート
      if (prevPos !== null && pos - prevPos >= 3) {
        recs.push({
          type: "declining",
          priority: pos - prevPos >= 5 ? "high" : "medium",
          keyword: kw.keyword,
          message: `「${kw.keyword}」が${pos - prevPos}位下降 → 要対応`,
          detail: `${prevPos}位→${pos}位に下降。コンテンツの更新・内部リンクの追加を検討してください。`,
          metric: `${prevPos}位→${pos}位（-${pos - prevPos}）`,
        });
      }

      // 4) 表示はあるがクリック0 → 潜在キーワード
      if (impressions >= 10 && clicks === 0 && pos <= 50) {
        recs.push({
          type: "opportunity",
          priority: impressions >= 30 ? "high" : "low",
          keyword: kw.keyword,
          message: `「${kw.keyword}」で表示はあるがクリック0`,
          detail: `${impressions}回表示されているのにクリックされていません。記事を作成するか、既存ページのタイトルにこのキーワードを含めましょう。`,
          metric: `${impressions}表示 / 0クリック`,
        });
      }

      // 5) 順位31-50位 + 表示回数が多い → 伸ばせる余地あり
      if (pos >= 31 && pos <= 50 && impressions >= 10) {
        recs.push({
          type: "quick_win",
          priority: "low",
          keyword: kw.keyword,
          message: `「${kw.keyword}」はコンテンツ強化で上位狙える`,
          detail: `${pos}位で${impressions}表示。関連する記事に内部リンクを追加し、コンテンツを充実させましょう。`,
          metric: `${pos}位 / ${impressions}表示`,
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    return recs;
  }, [keywords, latestByKeyword, weekAgoByKeyword]);

  // Content gap analysis: keywords that exist in patterns but no blog post covers
  const contentGaps = useMemo(() => {
    const gaps: { topic: string; suggestion: string; reason: string }[] = [];
    const relevantKws = keywords.filter(
      (kw) => kw.is_primary || isRelevantKeyword(kw.keyword)
    );
    // Cluster related keywords by topic
    const topicClusters: Record<string, { keywords: string[]; totalImpressions: number; bestPosition: number }> = {};
    const topicPatterns: [RegExp, string][] = [
      [/副業/i, "副業コンサル"],
      [/年収|単価|報酬/i, "フリーコンサル報酬"],
      [/sap/i, "SAP案件"],
      [/pmo/i, "PMO案件"],
      [/dx|デジタル/i, "DX案件"],
      [/戦略/i, "戦略コンサル"],
      [/金融/i, "金融業界"],
      [/セキュリティ/i, "セキュリティ"],
      [/servicenow/i, "ServiceNow"],
      [/erp/i, "ERP導入"],
      [/マーケティング/i, "マーケティング"],
      [/公共/i, "公共セクター"],
      [/業務改善|業務改革|bpr/i, "業務改革"],
      [/独立/i, "コンサル独立"],
      [/エージェント|マッチング/i, "エージェント比較"],
    ];

    for (const kw of relevantKws) {
      const latest = latestByKeyword[kw.id];
      if (!latest) continue;
      for (const [pattern, topic] of topicPatterns) {
        if (pattern.test(kw.keyword)) {
          if (!topicClusters[topic]) {
            topicClusters[topic] = { keywords: [], totalImpressions: 0, bestPosition: 999 };
          }
          topicClusters[topic].keywords.push(kw.keyword);
          topicClusters[topic].totalImpressions += latest.impressions ?? 0;
          const pos = latest.position ?? 999;
          if (pos < topicClusters[topic].bestPosition) {
            topicClusters[topic].bestPosition = pos;
          }
        }
      }
    }

    // Suggest content for clusters with poor position or high impressions
    for (const [topic, data] of Object.entries(topicClusters)) {
      if (data.bestPosition > 15 && data.totalImpressions >= 5) {
        gaps.push({
          topic,
          suggestion: `「${topic}」に関する専門記事を追加`,
          reason: `関連KW ${data.keywords.length}件、合計${data.totalImpressions}表示、最高${data.bestPosition}位`,
        });
      }
    }

    // Sort by totalImpressions
    gaps.sort((a, b) => {
      const aCluster = topicClusters[a.topic];
      const bCluster = topicClusters[b.topic];
      return (bCluster?.totalImpressions ?? 0) - (aCluster?.totalImpressions ?? 0);
    });

    return gaps;
  }, [keywords, latestByKeyword]);

  /* ─── Claude prompt helpers (imported from @/lib/article-generator) ─── */

  function handleCopyPrompt(keyword: string, position?: number, impressions?: number) {
    const prompt = buildClaudePrompt(keyword, position, impressions);
    navigator.clipboard.writeText(prompt).then(() => {
      setCopiedKeyword(keyword);
      setTimeout(() => setCopiedKeyword(null), 2000);
    });
  }

  function openWizard(keyword: string, position?: number, impressions?: number) {
    setWizardKeyword(keyword);
    setWizardPosition(position);
    setWizardImpressions(impressions);
    setWizardStep(1);
    setWizAnswers({
      audience: "",
      angle: "",
      differentiator: "",
      keyPoints: "",
      tone: "実践的",
      additionalNotes: "",
    });
    setGeneratedArticle(null);
    setGenerateError(null);
    setGenerating(false);
    setWizardOpen(true);
  }

  async function handleGenerateArticle() {
    setGenerating(true);
    setGenerateError(null);
    setWizardStep(2);
    try {
      const res = await fetch("/api/admin/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: wizardKeyword,
          position: wizardPosition,
          impressions: wizardImpressions,
          answers: wizAnswers,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setGenerateError(data.error || "記事生成に失敗しました");
        setWizardStep(1);
        return;
      }
      setGeneratedArticle(data.article);
      setWizardStep(3);
    } catch {
      setGenerateError("ネットワークエラーが発生しました");
      setWizardStep(1);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveGeneratedArticle() {
    if (!generatedArticle) return;
    setArticleTitle(generatedArticle.title);
    setArticleDescription(generatedArticle.description);
    setArticleCategory(generatedArticle.category);
    setArticleContent(generatedArticle.content);
    setArticleSlug("");
    setArticleDate(new Date().toISOString().split("T")[0]);
    setArticleResult(null);
    setWizardOpen(false);
    setShowArticleDialog(true);
  }

  // ── Existing page keyword mapping ──
  const EXISTING_PAGES: { path: string; title: string; description: string; editable: boolean }[] = [
    { path: "/", title: "フリーコンサル案件紹介サービスPERSONA（ペルソナ）", description: "コンサルティングファーム出身のフリーランスコンサルタントに特化した案件紹介サービス", editable: false },
    { path: "/cases", title: "フリーコンサル案件一覧", description: "戦略・DX・PMO・SAP・業務改革など100件以上のフリーコンサル案件", editable: false },
    { path: "/expertise", title: "専門領域から探す", description: "フリーコンサル案件を専門領域別に探す", editable: false },
    { path: "/industries", title: "業界別案件", description: "業界別のフリーコンサル案件一覧", editable: false },
    { path: "/for-enterprise", title: "企業様向けサービス", description: "フリーランスコンサルタントの活用でプロジェクトを成功へ", editable: false },
    { path: "/ai-diagnosis", title: "AI業務診断", description: "あなたの部署のAI活用ポテンシャルを無料診断", editable: false },
    { path: "/blog", title: "フリーコンサルブログ", description: "フリーランスコンサルタント向けのノウハウ・キャリア情報", editable: false },
  ];

  function suggestPageOptimizations(keyword: string, position: number, impressions: number): { page: string; currentTitle: string; suggestedTitle: string; suggestedDescription: string }[] {
    const suggestions: { page: string; currentTitle: string; suggestedTitle: string; suggestedDescription: string }[] = [];
    const kw = keyword.toLowerCase();

    for (const page of EXISTING_PAGES) {
      const titleLower = page.title.toLowerCase();

      // Skip if keyword already in title
      if (titleLower.includes(kw)) continue;

      // Check if keyword is related to page content
      let relevant = false;
      if (kw.includes("案件") && (page.path === "/cases" || page.path === "/")) relevant = true;
      if (kw.includes("pmo") && (page.path === "/cases" || page.path === "/expertise")) relevant = true;
      if (kw.includes("sap") && (page.path === "/cases" || page.path === "/expertise")) relevant = true;
      if (kw.includes("dx") && (page.path === "/cases" || page.path === "/expertise")) relevant = true;
      if (kw.includes("戦略") && (page.path === "/cases" || page.path === "/expertise")) relevant = true;
      if (kw.includes("フリーコンサル") && page.path === "/") relevant = true;
      if (kw.includes("フリーランス") && page.path === "/") relevant = true;
      if (kw.includes("副業") && page.path === "/") relevant = true;
      if (kw.includes("コンサル") && kw.includes("独立") && page.path === "/") relevant = true;
      if (kw.includes("業界") && page.path === "/industries") relevant = true;
      if (kw.includes("ai") && page.path === "/ai-diagnosis") relevant = true;
      if (kw.includes("診断") && page.path === "/ai-diagnosis") relevant = true;
      if (kw.includes("企業") && page.path === "/for-enterprise") relevant = true;
      if (kw.includes("ブログ") && page.path === "/blog") relevant = true;
      if (kw.includes("エージェント") && page.path === "/") relevant = true;
      if (kw.includes("高単価") && (page.path === "/cases" || page.path === "/")) relevant = true;
      if (kw.includes("年収") && page.path === "/") relevant = true;
      if (kw.includes("マッチング") && page.path === "/") relevant = true;

      if (!relevant) continue;

      // Generate title suggestion that includes keyword
      const suggestedTitle = `${page.title}｜${keyword}`;
      const suggestedDescription = `${keyword}の情報はPERSONAで。${page.description}。`;

      suggestions.push({
        page: page.path,
        currentTitle: page.title,
        suggestedTitle,
        suggestedDescription,
      });
    }

    return suggestions;
  }

  /* ─── Actions ─── */

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  async function handleAddSnapshot(e: React.FormEvent) {
    e.preventDefault();
    if (!snapshotKeywordId || !snapshotPosition) return;
    setSubmittingSnapshot(true);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword_id: snapshotKeywordId,
          position: Number(snapshotPosition),
          clicks: snapshotClicks ? Number(snapshotClicks) : undefined,
          impressions: snapshotImpressions ? Number(snapshotImpressions) : undefined,
          ctr: snapshotCtr ? Number(snapshotCtr) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "登録に失敗しました");
        return;
      }
      // Reset form and refresh
      setSnapshotPosition("");
      setSnapshotClicks("");
      setSnapshotImpressions("");
      setSnapshotCtr("");
      await fetchData();
    } catch {
      alert("登録に失敗しました");
    } finally {
      setSubmittingSnapshot(false);
    }
  }

  async function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    setSubmittingKeyword(true);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: newKeyword,
          target_url: newTargetUrl || undefined,
          is_primary: newIsPrimary,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "登録に失敗しました");
        return;
      }
      setNewKeyword("");
      setNewTargetUrl("");
      setNewIsPrimary(false);
      await fetchData();
    } catch {
      alert("登録に失敗しました");
    } finally {
      setSubmittingKeyword(false);
    }
  }

  async function handleDeleteKeyword(keywordId: string) {
    if (!confirm("このキーワードを削除しますか？関連するスナップショットもすべて削除されます。")) {
      return;
    }
    setDeletingId(keywordId);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword_id: keywordId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
        return;
      }
      await fetchData();
    } catch {
      alert("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleManualSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/seo-sync", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = [data.error, data.message].filter(Boolean).join(" - ");
        const diagStr = data.diagnostics
          ? `\n[診断] ${JSON.stringify(data.diagnostics)}`
          : "";
        setSyncResult(`同期失敗: ${detail || "不明なエラー"}${diagStr}`);
        return;
      }
      setSyncResult(
        `同期完了: ${data.keywordsSynced}件同期, ${data.newKeywordsAdded}件新規追加${
          data.errors?.length > 0 ? ` (${data.errors.length}件のエラー)` : ""
        }`
      );
      await fetchData();
    } catch {
      setSyncResult("同期に失敗しました。ネットワークエラーが発生しました。");
    } finally {
      setSyncing(false);
    }
  }

  /* ─── SVG Chart renderer ─── */

  function renderChart() {
    const { dates, series } = chartData;
    if (dates.length === 0 || series.length === 0) {
      return (
        <p className="text-[13px] text-[#888] text-center py-8">
          プライマリキーワードのデータがありません
        </p>
      );
    }

    // Collect all non-null positions to determine scale
    const allPositions: number[] = [];
    for (const s of series) {
      for (const p of s.data) {
        if (p !== null) allPositions.push(p);
      }
    }

    if (allPositions.length === 0) {
      return (
        <p className="text-[13px] text-[#888] text-center py-8">
          スナップショットデータがありません
        </p>
      );
    }

    const minPos = Math.max(1, Math.min(...allPositions) - 2);
    const maxPos = Math.max(...allPositions) + 2;

    const chartW = 800;
    const chartH = 240;
    const padL = 44;
    const padR = 16;
    const padT = 16;
    const padB = 32;
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;

    function xPos(i: number) {
      return padL + (i / (dates.length - 1)) * plotW;
    }

    // Inverted Y: lower position number = higher on chart
    function yPos(position: number) {
      const ratio = (position - minPos) / (maxPos - minPos);
      return padT + ratio * plotH;
    }

    // Y-axis grid lines (position ranks)
    const ySteps: number[] = [];
    const range = maxPos - minPos;
    const step = range <= 10 ? 1 : range <= 30 ? 5 : 10;
    for (let v = Math.ceil(minPos / step) * step; v <= maxPos; v += step) {
      ySteps.push(v);
    }

    // X-axis labels: show every 5th date
    const xLabels: { idx: number; label: string }[] = [];
    for (let i = 0; i < dates.length; i++) {
      if (i % 5 === 0 || i === dates.length - 1) {
        const d = new Date(dates[i]);
        xLabels.push({
          idx: i,
          label: `${d.getMonth() + 1}/${d.getDate()}`,
        });
      }
    }

    return (
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full min-w-[600px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {ySteps.map((v) => (
            <g key={`grid-${v}`}>
              <line
                x1={padL}
                y1={yPos(v)}
                x2={chartW - padR}
                y2={yPos(v)}
                stroke="#e3e6eb"
                strokeWidth={0.5}
              />
              <text
                x={padL - 8}
                y={yPos(v) + 4}
                textAnchor="end"
                fill="#888"
                fontSize={10}
              >
                {v}位
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xLabels.map(({ idx, label }) => (
            <text
              key={`xlabel-${idx}`}
              x={xPos(idx)}
              y={chartH - 6}
              textAnchor="middle"
              fill="#888"
              fontSize={10}
            >
              {label}
            </text>
          ))}

          {/* Data lines */}
          {series.map((s) => {
            // Build path segments (skip nulls)
            const segments: { x: number; y: number }[][] = [];
            let current: { x: number; y: number }[] = [];

            for (let i = 0; i < s.data.length; i++) {
              if (s.data[i] !== null) {
                current.push({ x: xPos(i), y: yPos(s.data[i]!) });
              } else {
                if (current.length > 0) {
                  segments.push(current);
                  current = [];
                }
              }
            }
            if (current.length > 0) segments.push(current);

            return (
              <g key={s.keyword}>
                {segments.map((seg, si) => {
                  if (seg.length < 2) {
                    // Single point - draw a dot
                    return (
                      <circle
                        key={`dot-${si}`}
                        cx={seg[0].x}
                        cy={seg[0].y}
                        r={3}
                        fill={s.color}
                      />
                    );
                  }
                  const d = seg
                    .map((p, pi) => `${pi === 0 ? "M" : "L"}${p.x},${p.y}`)
                    .join(" ");
                  return (
                    <g key={`seg-${si}`}>
                      <path
                        d={d}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Draw dots at data points */}
                      {seg.map((p, pi) => (
                        <circle
                          key={`pt-${pi}`}
                          cx={p.x}
                          cy={p.y}
                          r={2.5}
                          fill={s.color}
                        />
                      ))}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3 px-1">
          {series.map((s) => (
            <div key={s.keyword} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-[11px] font-bold text-[#555]">
                {s.keyword}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/admin"
          className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
        >
          ← 管理者TOP
        </Link>
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          ADMIN / SEO
        </p>
        <h1 className="text-xl font-black text-navy">SEO モニタリング</h1>
        <p className="text-[12px] text-[#888] mt-1">
          キーワード順位・クリック・表示回数の推移を管理
        </p>
      </div>

      {/* ── Create article button ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            setArticleTitle("");
            setArticleSlug("");
            setArticleDate(new Date().toISOString().split("T")[0]);
            setArticleDescription("");
            setArticleCategory("ノウハウ");
            setArticleContent("");
            setArticleResult(null);
            setShowArticleDialog(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1FABE9] text-white text-[13px] font-bold hover:bg-[#1890c8] transition-colors rounded-lg"
        >
          <Icon name="edit_note" className="text-[20px]" />
          ブログ記事を作成
        </button>
        <Link
          href="/blog"
          target="_blank"
          className="flex items-center gap-1 text-[12px] text-[#888] hover:text-[#1FABE9] transition-colors"
        >
          <Icon name="open_in_new" className="text-[14px]" />
          ブログを見る
        </Link>
      </div>

      {/* ── SEO TODO Checklist ── */}
      <div className="bg-gradient-to-r from-[#091747]/5 to-[#1FABE9]/5 rounded-xl border border-[#1FABE9]/20 p-5 mb-6">
        <button
          onClick={() => setShowTodos(!showTodos)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-sm font-bold text-[#091747] flex items-center gap-2">
            <Icon name="checklist" className="text-[18px] text-[#1FABE9]" />
            SEO 改善TODO
          </h2>
          <Icon
            name={showTodos ? "expand_less" : "expand_more"}
            className="text-[20px] text-[#888]"
          />
        </button>
        {showTodos && (
          <div className="mt-4 space-y-4">
            {/* Completed */}
            <div>
              <p className="text-[10px] font-bold text-[#10b981] tracking-wide uppercase mb-2">
                完了済み
              </p>
              <ul className="space-y-1.5">
                {[
                  "案件詳細ページにFAQ構造化データ(JSON-LD)を追加",
                  "カテゴリ/業界ページにパンくずリスト構造化データを追加",
                  "案件一覧ページのmeta descriptionを動的に最適化",
                  "内部リンク構造を強化（関連案件セクション追加）",
                  "OGP画像を案件タイトル入り動的OG画像に変更",
                  "XMLサイトマップにlastmod, changefreq, priorityを設定済み",
                  "案件ページにcanonical URLを設定済み",
                  "カテゴリページにリード文（200-300文字）を設定済み",
                  "hreflangタグ追加済み（日本語サイト明示）",
                  "404ページにカテゴリ・ナビゲーションリンク追加済み",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-[#999] line-through">
                    <span className="mt-0.5 text-[#10b981]"><Icon name="check_circle" className="text-[14px]" /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Additional completed: Technical SEO */}
            <div>
              <p className="text-[10px] font-bold text-[#10b981] tracking-wide uppercase mb-2">
                追加完了（テクニカルSEO）
              </p>
              <ul className="space-y-1.5">
                {[
                  "robots.txt最適化（AI検索クローラー許可、スクレイパーbot拒否）",
                  "不要ページにnoindex設定（プライバシー、利用規約、検索、404、ダッシュボード）",
                  "構造化データ網羅（Organization, WebSite+SearchAction, JobPosting, BlogPosting, FAQPage, BreadcrumbList, HowTo, CollectionPage）",
                  "next/image全ページ適用、AVIF/WebP対応済み",
                  "ホームページ下部コンポーネントの遅延読み込み（dynamic import）導入",
                  "案件詳細の内部リンク強化（業界別・専門領域・事例・ブログへのクロスリンク）",
                  "フォント最適化（display:swap、preconnect設定済み）",
                  "WebSite SearchAction追加（サイトリンク検索ボックス対応）",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-[#999] line-through">
                    <span className="mt-0.5 text-[#10b981]"><Icon name="check_circle" className="text-[14px]" /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Content / Marketing (User action needed) */}
            <div>
              <p className="text-[10px] font-bold text-[#f59e0b] tracking-wide uppercase mb-2">
                ✍️ コンテンツ・運用（手動対応が必要）
              </p>
              <ul className="space-y-1.5">
                {[
                  "ブログ記事作成 → ターゲットキーワードを設定し案件ページへ内部リンク誘導",
                  "事例インタビュー記事の追加（導入事例ページのコンテンツ拡充）",
                  "Search Consoleでインデックスカバレッジエラーを定期確認（月1回推奨）",
                  "外部被リンク獲得（メディア掲載依頼、パートナーサイトからのリンク）",
                  "Googleビジネスプロフィールの登録・最適化",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-[#333]">
                    <span className="mt-0.5 text-[#f59e0b]"><Icon name="edit_note" className="text-[14px]" /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ── Daily SEO Actions (Dynamic Recommendations) ── */}
      {(recommendations.length > 0 || contentGaps.length > 0) && (
        <div className="bg-white rounded-xl border border-[#e3e6eb] p-6 mb-6">
          <h2 className="text-sm font-bold text-[#091747] mb-1 flex items-center gap-2">
            <Icon name="auto_awesome" className="text-[18px] text-[#f59e0b]" />
            今日のSEOアクション
          </h2>
          <p className="text-[11px] text-[#666] mb-4">
            キーワードデータを分析して自動生成された改善アクション
          </p>

          {/* Declining alerts (highest priority) */}
          {recommendations.filter((r) => r.type === "declining").length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#ef4444]" />
                <p className="text-[11px] font-bold text-[#ef4444] tracking-wide uppercase">
                  順位下降アラート
                </p>
              </div>
              <div className="space-y-2">
                {recommendations
                  .filter((r) => r.type === "declining")
                  .map((r, i) => (
                    <div
                      key={`declining-${i}`}
                      className="bg-[#fef2f2] border border-[#fecaca] rounded-lg px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-[12px] font-bold text-[#991b1b]">
                            {r.message}
                          </p>
                          <p className="text-[11px] text-[#b91c1c] mt-0.5">
                            {r.detail}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-[#ef4444]/10 text-[#ef4444]">
                          {r.metric}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Article creation suggestions */}
          {recommendations.filter((r) => r.type === "article").length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#1FABE9]" />
                <p className="text-[11px] font-bold text-[#1FABE9] tracking-wide uppercase">
                  記事作成の推奨
                </p>
                <span className="text-[10px] text-[#888]">
                  — 11位以下で表示回数が多いKW
                </span>
              </div>
              <div className="space-y-2">
                {recommendations
                  .filter((r) => r.type === "article")
                  .slice(0, 8)
                  .map((r, i) => {
                    const articleKw = (r.message.match(/「(.+?)」/) || [])[1] || r.message;
                    const articlePosMatch = r.metric?.match(/(\d+)/);
                    const articlePos = articlePosMatch ? parseInt(articlePosMatch[1]) : undefined;
                    return (
                    <div key={`article-${i}`}>
                      <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-lg px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[12px] font-bold text-[#0c4a6e]">
                                {r.message}
                              </p>
                              {r.priority === "high" && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ef4444] text-white">
                                  HIGH
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#0369a1] mt-0.5">
                              {r.detail}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-[#1FABE9]/10 text-[#1FABE9]">
                            {r.metric}
                          </span>
                          <button
                            onClick={() => openWizard(articleKw, articlePos)}
                            className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white hover:from-[#7c3aed] hover:to-[#5b21b6] transition-all"
                          >
                            <Icon name="auto_awesome" className="text-[12px]" />
                            AI生成
                          </button>
                          <button
                            onClick={() => handleCopyPrompt(articleKw, articlePos)}
                            className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-[#091747] text-white hover:bg-[#0c1e52] transition-colors"
                          >
                            <Icon name={copiedKeyword === articleKw ? "check" : "content_copy"} className="text-[12px]" />
                            {copiedKeyword === articleKw ? "Copied!" : "Claude指示"}
                          </button>
                          <button
                            onClick={() => {
                              if (previewKeyword === `article-${articleKw}`) {
                                setPreviewKeyword(null);
                                setPreviewPrompt("");
                              } else {
                                setPreviewKeyword(`article-${articleKw}`);
                                setPreviewPrompt(buildClaudePrompt(articleKw, articlePos));
                              }
                            }}
                            className={`shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
                              previewKeyword === `article-${articleKw}`
                                ? "bg-[#1FABE9] text-white border-[#1FABE9]"
                                : "bg-white text-[#1FABE9] border-[#1FABE9]/30 hover:bg-[#1FABE9]/5"
                            }`}
                          >
                            <Icon name={previewKeyword === `article-${articleKw}` ? "visibility_off" : "visibility"} className="text-[12px]" />
                            プレビュー
                          </button>
                        </div>
                      </div>
                      {previewKeyword === `article-${articleKw}` && (
                        <div className="mt-1 bg-[#f8f9fb] border border-[#e3e6eb] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Claude指示プレビュー</span>
                            <button onClick={() => handleCopyPrompt(articleKw, articlePos)} className="flex items-center gap-1 text-[10px] font-bold text-[#1FABE9] hover:text-[#0c4a6e] transition-colors">
                              <Icon name="content_copy" className="text-[12px]" />
                              コピー
                            </button>
                          </div>
                          <pre className="text-[11px] text-[#333] whitespace-pre-wrap font-sans leading-relaxed">{previewPrompt}</pre>
                        </div>
                      )}
                    </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* CTR improvement suggestions */}
          {recommendations.filter((r) => r.type === "ctr").length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#f59e0b]" />
                <p className="text-[11px] font-bold text-[#f59e0b] tracking-wide uppercase">
                  CTR改善
                </p>
                <span className="text-[10px] text-[#888]">
                  — 10位以内だがCTRが低いKW
                </span>
              </div>
              <div className="space-y-2">
                {recommendations
                  .filter((r) => r.type === "ctr")
                  .slice(0, 5)
                  .map((r, i) => (
                    <div
                      key={`ctr-${i}`}
                      className="bg-[#fffbeb] border border-[#fde68a] rounded-lg px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[12px] font-bold text-[#78350f]">
                              {r.message}
                            </p>
                            {r.priority === "high" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f59e0b] text-white">
                                HIGH
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#92400e] mt-0.5">
                            {r.detail}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-[#f59e0b]/10 text-[#f59e0b]">
                          {r.metric}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Zero-click opportunities */}
          {recommendations.filter((r) => r.type === "opportunity").length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#8b5cf6]" />
                <p className="text-[11px] font-bold text-[#8b5cf6] tracking-wide uppercase">
                  潜在キーワード
                </p>
                <span className="text-[10px] text-[#888]">
                  — 表示されているがクリックされていない
                </span>
              </div>
              <div className="space-y-2">
                {recommendations
                  .filter((r) => r.type === "opportunity")
                  .slice(0, 5)
                  .map((r, i) => {
                    const oppKw = (r.message.match(/「(.+?)」/) || [])[1] || r.keyword;
                    const oppPosMatch = r.metric?.match(/(\d+)/);
                    const oppImpMatch = r.metric?.match(/(\d+)表示/);
                    const oppPos = oppPosMatch ? parseInt(oppPosMatch[1]) : undefined;
                    return (
                    <div key={`opp-${i}`}>
                      <div className="bg-[#f5f3ff] border border-[#ddd6fe] rounded-lg px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-[12px] font-bold text-[#4c1d95]">
                              {r.message}
                            </p>
                            <p className="text-[11px] text-[#6d28d9] mt-0.5">
                              {r.detail}
                            </p>
                            {/* Page optimization suggestions */}
                            {(() => {
                              const pageOpts = suggestPageOptimizations(
                                r.keyword,
                                oppPosMatch ? parseInt(oppPosMatch[1]) : 50,
                                oppImpMatch ? parseInt(oppImpMatch[1]) : 0
                              );
                              if (pageOpts.length === 0) return null;
                              return (
                                <div className="mt-2 space-y-1">
                                  {pageOpts.slice(0, 2).map((opt, j) => (
                                    <div key={j} className="bg-white/60 rounded px-2 py-1.5 text-[10px]">
                                      <span className="text-[#6d28d9] font-bold">{opt.page}</span>
                                      <span className="text-[#888] mx-1">&rarr;</span>
                                      <span className="text-[#333]">タイトルに「{r.keyword}」を追加可能</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                          <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-[#8b5cf6]/10 text-[#8b5cf6]">
                            {r.metric}
                          </span>
                          <button
                            onClick={() => openWizard(oppKw, oppPos)}
                            className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white hover:from-[#7c3aed] hover:to-[#5b21b6] transition-all"
                          >
                            <Icon name="auto_awesome" className="text-[12px]" />
                            AI生成
                          </button>
                          <button
                            onClick={() => handleCopyPrompt(oppKw, oppPos)}
                            className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-[#091747] text-white hover:bg-[#0c1e52] transition-colors"
                          >
                            <Icon name={copiedKeyword === oppKw ? "check" : "content_copy"} className="text-[12px]" />
                            {copiedKeyword === oppKw ? "Copied!" : "Claude指示"}
                          </button>
                          <button
                            onClick={() => {
                              if (previewKeyword === `opp-${oppKw}`) {
                                setPreviewKeyword(null);
                                setPreviewPrompt("");
                              } else {
                                setPreviewKeyword(`opp-${oppKw}`);
                                setPreviewPrompt(buildClaudePrompt(oppKw, oppPos));
                              }
                            }}
                            className={`shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
                              previewKeyword === `opp-${oppKw}`
                                ? "bg-[#8b5cf6] text-white border-[#8b5cf6]"
                                : "bg-white text-[#8b5cf6] border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/5"
                            }`}
                          >
                            <Icon name={previewKeyword === `opp-${oppKw}` ? "visibility_off" : "visibility"} className="text-[12px]" />
                            プレビュー
                          </button>
                        </div>
                      </div>
                      {previewKeyword === `opp-${oppKw}` && (
                        <div className="mt-1 bg-[#f8f9fb] border border-[#e3e6eb] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Claude指示プレビュー</span>
                            <button onClick={() => handleCopyPrompt(oppKw, oppPos)} className="flex items-center gap-1 text-[10px] font-bold text-[#8b5cf6] hover:text-[#4c1d95] transition-colors">
                              <Icon name="content_copy" className="text-[12px]" />
                              コピー
                            </button>
                          </div>
                          <pre className="text-[11px] text-[#333] whitespace-pre-wrap font-sans leading-relaxed">{previewPrompt}</pre>
                        </div>
                      )}
                    </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Content gap analysis */}
          {contentGaps.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#10b981]" />
                <p className="text-[11px] font-bold text-[#10b981] tracking-wide uppercase">
                  コンテンツギャップ
                </p>
                <span className="text-[10px] text-[#888]">
                  — トピック別に記事が不足している領域
                </span>
              </div>
              <div className="space-y-2">
                {contentGaps.slice(0, 6).map((gap, i) => (
                  <div
                    key={`gap-${i}`}
                    className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-[12px] font-bold text-[#064e3b]">
                          {gap.suggestion}
                        </p>
                        <p className="text-[11px] text-[#047857] mt-0.5">
                          {gap.reason}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-[#10b981]/10 text-[#10b981]">
                        {gap.topic}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick wins */}
          {recommendations.filter((r) => r.type === "quick_win").length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#6366f1]" />
                <p className="text-[11px] font-bold text-[#6366f1] tracking-wide uppercase">
                  コンテンツ強化で伸びる余地
                </p>
                <span className="text-[10px] text-[#888]">
                  — 31-50位で表示回数があるKW
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recommendations
                  .filter((r) => r.type === "quick_win")
                  .slice(0, 6)
                  .map((r, i) => (
                    <div
                      key={`qw-${i}`}
                      className="bg-[#eef2ff] border border-[#c7d2fe] rounded-lg px-3 py-2.5"
                    >
                      <p className="text-[11px] font-bold text-[#3730a3]">
                        {r.keyword}
                      </p>
                      <p className="text-[10px] text-[#4338ca] mt-0.5">
                        {r.metric}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="mt-4 pt-3 border-t border-[#e3e6eb]">
            <p className="text-[11px] text-[#888]">
              検出されたアクション: {recommendations.length}件
              {contentGaps.length > 0 && ` / コンテンツギャップ: ${contentGaps.length}件`}
              <span className="ml-2 text-[10px]">
                （キーワードデータが更新されると自動で再分析されます）
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ── AI記事生成 & Claude指示 ── */}
      <div className="bg-white rounded-xl border border-[#e3e6eb] p-6 mb-6">
        <h2 className="text-sm font-bold text-[#091747] mb-1 flex items-center gap-2">
          <Icon name="smart_toy" className="text-[18px] text-[#8b5cf6]" />
          AI記事生成 / Claude指示
        </h2>
        <p className="text-[11px] text-[#666] mb-4">
          キーワードを入力して、AIで記事を自動生成するか、Claudeへの指示をコピー
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={promptKeyword}
            onChange={(e) => setPromptKeyword(e.target.value)}
            placeholder="例: フリーコンサル PMO 案件"
            className="flex-1 p-3 border border-border text-[13px] rounded-lg focus:outline-none focus:border-[#8b5cf6]"
          />
          <button
            onClick={() => { if (promptKeyword.trim()) openWizard(promptKeyword.trim()); }}
            disabled={!promptKeyword.trim()}
            className="px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white text-[13px] font-bold rounded-lg hover:from-[#7c3aed] hover:to-[#5b21b6] disabled:opacity-50 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Icon name="auto_awesome" className="text-[16px]" />
            AI記事生成
          </button>
          <button
            onClick={() => { if (promptKeyword.trim()) handleCopyPrompt(promptKeyword.trim()); }}
            disabled={!promptKeyword.trim()}
            className="px-4 py-3 bg-[#8b5cf6] text-white text-[13px] font-bold rounded-lg hover:bg-[#7c3aed] disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Icon name={copiedKeyword === promptKeyword.trim() ? "check" : "content_copy"} className="text-[16px]" />
            {copiedKeyword === promptKeyword.trim() ? "コピー済み！" : "指示コピー"}
          </button>
        </div>
        {promptKeyword.trim() && (
          <div className="mt-3 bg-[#f8f9fb] border border-[#e3e6eb] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Claude指示プレビュー</span>
              <button onClick={() => handleCopyPrompt(promptKeyword.trim())} className="flex items-center gap-1 text-[10px] font-bold text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">
                <Icon name="content_copy" className="text-[12px]" />
                コピー
              </button>
            </div>
            <pre className="text-[11px] text-[#333] whitespace-pre-wrap font-sans leading-relaxed max-h-[200px] overflow-y-auto">
              {buildClaudePrompt(promptKeyword.trim())}
            </pre>
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-[#e3e6eb] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#091747" + "12" }}
            >
              <Icon name="target" className="text-[18px] text-[#091747]" />
            </div>
            <p className="text-[11px] font-bold text-[#666] tracking-wide">
              主要KW平均順位
            </p>
          </div>
          <p className="text-3xl font-black text-[#091747]">
            {avgPrimaryPosition !== null
              ? avgPrimaryPosition.toFixed(1)
              : "–"}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e3e6eb] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#1FABE9" + "12" }}
            >
              <Icon name="ads_click" className="text-[18px] text-[#1FABE9]" />
            </div>
            <p className="text-[11px] font-bold text-[#666] tracking-wide">
              クリック数（30日）
            </p>
          </div>
          <p className="text-3xl font-black text-[#091747]">
            {totalClicks30d.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e3e6eb] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#10b981" + "12" }}
            >
              <Icon name="visibility" className="text-[18px] text-[#10b981]" />
            </div>
            <p className="text-[11px] font-bold text-[#666] tracking-wide">
              表示回数（30日）
            </p>
          </div>
          <p className="text-3xl font-black text-[#091747]">
            {totalImpressions30d.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e3e6eb] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#f59e0b" + "12" }}
            >
              <Icon name="percent" className="text-[18px] text-[#f59e0b]" />
            </div>
            <p className="text-[11px] font-bold text-[#666] tracking-wide">
              平均CTR
            </p>
          </div>
          <p className="text-3xl font-black text-[#091747]">
            {avgCtr.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* ── SEO Action Tracking ── */}
      <div className="bg-white rounded-xl border border-[#e3e6eb] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#091747] flex items-center gap-2">
              <Icon name="monitoring" className="text-[18px] text-[#10b981]" />
              施策トラッキング
            </h2>
            <p className="text-[11px] text-[#666] mt-0.5">
              SEO施策の効果を記録・測定
            </p>
          </div>
          <button
            onClick={() => setShowActionForm(!showActionForm)}
            className="px-3 py-1.5 bg-[#10b981] text-white text-[11px] font-bold rounded-lg hover:bg-[#059669] transition-colors flex items-center gap-1"
          >
            <Icon name="add" className="text-[14px]" />
            施策を記録
          </button>
        </div>

        {/* New action form */}
        {showActionForm && (
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-bold text-[#666] mb-1">施策タイプ</label>
                <select value={actionType} onChange={(e) => setActionType(e.target.value)}
                  className="w-full p-2 border border-border text-[12px] rounded-lg bg-white">
                  <option value="article">記事作成</option>
                  <option value="meta_update">メタ情報更新</option>
                  <option value="internal_link">内部リンク追加</option>
                  <option value="content_update">コンテンツ更新</option>
                  <option value="structured_data">構造化データ追加</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#666] mb-1">ターゲットKW</label>
                <input type="text" value={actionKeyword} onChange={(e) => setActionKeyword(e.target.value)}
                  placeholder="例: フリーコンサル PMO"
                  className="w-full p-2 border border-border text-[12px] rounded-lg" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#666] mb-1">施策の内容</label>
                <input type="text" value={actionDescription} onChange={(e) => setActionDescription(e.target.value)}
                  placeholder="例: PMO案件のブログ記事を公開"
                  className="w-full p-2 border border-border text-[12px] rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowActionForm(false)}
                className="px-3 py-1.5 text-[11px] text-[#666] hover:text-[#333]">キャンセル</button>
              <button
                onClick={async () => {
                  if (!actionKeyword.trim() || !actionDescription.trim()) return;
                  setSavingAction(true);
                  // Find current metrics for this keyword
                  const matchKw = keywords.find(k => k.keyword === actionKeyword.trim());
                  const currentSnap = matchKw ? latestByKeyword[matchKw.id] : null;
                  try {
                    const res = await fetch("/api/admin/seo-actions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action_type: actionType,
                        keyword: actionKeyword.trim(),
                        description: actionDescription.trim(),
                        before_position: currentSnap?.position || null,
                        before_clicks: currentSnap?.clicks || null,
                        before_impressions: currentSnap?.impressions || null,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setSeoActions(prev => [data.action, ...prev]);
                      setActionKeyword("");
                      setActionDescription("");
                      setShowActionForm(false);
                    }
                  } catch {}
                  setSavingAction(false);
                }}
                disabled={savingAction || !actionKeyword.trim() || !actionDescription.trim()}
                className="px-4 py-1.5 bg-[#10b981] text-white text-[11px] font-bold rounded-lg hover:bg-[#059669] disabled:opacity-50 transition-colors"
              >
                {savingAction ? "保存中..." : "記録する"}
              </button>
            </div>
          </div>
        )}

        {/* Action timeline */}
        {seoActions.length > 0 ? (
          <div className="space-y-3">
            {seoActions.slice(0, 10).map((action) => {
              const posChange = action.after_position && action.before_position
                ? action.before_position - action.after_position
                : null;
              const typeLabels: Record<string, string> = {
                article: "記事作成",
                meta_update: "メタ更新",
                internal_link: "内部リンク",
                content_update: "コンテンツ更新",
                structured_data: "構造化データ",
                other: "その他",
              };
              const typeColors: Record<string, string> = {
                article: "bg-[#1FABE9]/10 text-[#1FABE9]",
                meta_update: "bg-[#f59e0b]/10 text-[#f59e0b]",
                internal_link: "bg-[#8b5cf6]/10 text-[#8b5cf6]",
                content_update: "bg-[#10b981]/10 text-[#10b981]",
                structured_data: "bg-[#6366f1]/10 text-[#6366f1]",
                other: "bg-[#888]/10 text-[#888]",
              };
              return (
                <div key={action.id} className="flex gap-3 p-3 rounded-lg border border-[#e3e6eb] hover:bg-[#f8f9fb] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${typeColors[action.action_type] || typeColors.other}`}>
                        {typeLabels[action.action_type] || action.action_type}
                      </span>
                      <span className="text-[11px] font-bold text-[#091747]">
                        {action.keyword}
                      </span>
                      <span className="text-[10px] text-[#888]">
                        {new Date(action.created_at).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#666] truncate">{action.description}</p>
                    {/* Before / After metrics */}
                    <div className="flex items-center gap-4 mt-1.5">
                      {action.before_position && (
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-[#888]">順位:</span>
                          <span className="font-mono text-[#888]">{action.before_position}</span>
                          {action.after_position && (
                            <>
                              <span className="text-[#888]">&rarr;</span>
                              <span className="font-mono font-bold text-[#091747]">{action.after_position}</span>
                              {posChange !== null && posChange !== 0 && (
                                <span className={`font-bold ${posChange > 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                                  ({posChange > 0 ? `+${posChange}` : posChange})
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {action.before_impressions !== null && (
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-[#888]">表示:</span>
                          <span className="font-mono text-[#888]">{action.before_impressions}</span>
                          {action.after_impressions !== null && (
                            <>
                              <span className="text-[#888]">&rarr;</span>
                              <span className="font-mono font-bold text-[#091747]">{action.after_impressions}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Update after metrics button */}
                  {!action.after_position && (
                    <button
                      onClick={async () => {
                        const matchKw = keywords.find(k => k.keyword === action.keyword);
                        const currentSnap = matchKw ? latestByKeyword[matchKw.id] : null;
                        if (!currentSnap) return;
                        try {
                          const res = await fetch("/api/admin/seo-actions", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: action.id,
                              after_position: currentSnap.position,
                              after_clicks: currentSnap.clicks,
                              after_impressions: currentSnap.impressions,
                            }),
                          });
                          if (res.ok) {
                            setSeoActions(prev => prev.map(a =>
                              a.id === action.id
                                ? { ...a, after_position: currentSnap.position, after_clicks: currentSnap.clicks, after_impressions: currentSnap.impressions }
                                : a
                            ));
                          }
                        } catch {}
                      }}
                      className="shrink-0 self-center px-2 py-1 text-[10px] font-bold text-[#1FABE9] border border-[#1FABE9]/30 rounded hover:bg-[#1FABE9]/5 transition-colors"
                    >
                      効果を計測
                    </button>
                  )}
                  {posChange !== null && posChange > 0 && (
                    <div className="shrink-0 self-center">
                      <span className="text-[14px] font-black text-[#10b981]">
                        &uarr;{posChange}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-[12px] text-[#888]">
            <Icon name="monitoring" className="text-[32px] text-[#ddd] block mx-auto mb-2" />
            まだ施策が記録されていません。上の「施策を記録」から始めましょう。
          </div>
        )}
      </div>

      {/* ── Search Console Sync Status ── */}
      <div className="bg-white rounded-xl border border-[#e3e6eb] p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#091747] flex items-center gap-2">
              <Icon name="sync" className="text-[18px] text-[#6366f1]" />
              Search Console 同期ステータス
            </h2>
            <p className="text-[11px] text-[#666] mt-1">
              最終同期:{" "}
              {lastSyncTime
                ? new Date(lastSyncTime).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "未同期"}
            </p>
            {syncResult && (
              <p
                className={`text-[11px] mt-1 font-medium ${
                  syncResult.includes("失敗")
                    ? "text-[#ef4444]"
                    : "text-[#10b981]"
                }`}
              >
                {syncResult}
              </p>
            )}
          </div>
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="px-4 py-2 bg-[#6366f1] text-white text-[13px] font-bold rounded-lg hover:bg-[#4f46e5] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {syncing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                同期中...
              </>
            ) : (
              <>
                <Icon name="sync" className="text-[18px]" />
                今すぐ同期
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Position Trend Chart ── */}
      <div className="bg-white rounded-xl border border-[#e3e6eb] p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-[#091747] flex items-center gap-2">
            <Icon name="monitoring" className="text-[18px] text-[#1FABE9]" />
            順位推移（過去30日間）
          </h2>
          <span className="text-[12px] font-bold text-[#1FABE9]">
            {primaryKeywords.length}件のプライマリKW
          </span>
        </div>
        <p className="text-[11px] text-[#666] mb-5">
          プライマリキーワードの検索順位を表示（上が高順位）
        </p>
        {renderChart()}
      </div>

      {/* ── Keywords Table ── */}
      <div className="bg-white rounded-xl border border-[#e3e6eb] p-6 mb-6">
        <h2 className="text-sm font-bold text-[#091747] mb-1 flex items-center gap-2">
          <Icon name="list" className="text-[18px] text-[#091747]" />
          検索クエリ一覧
        </h2>
        <p className="text-[11px] text-[#666] mb-2">
          Google Search Consoleで表示された検索語句（不要なものはゴミ箱で削除）
        </p>

        {/* Tab filter */}
        <div className="flex gap-1 mb-4 border-b border-[#e3e6eb]">
          {([
            { key: "relevant" as KeywordTab, label: "関連キーワード", count: relevantCount, color: "#10b981" },
            { key: "irrelevant" as KeywordTab, label: "削除候補", count: irrelevantCount, color: "#ef4444" },
            { key: "all" as KeywordTab, label: "すべて", count: keywords.length, color: "#888" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setKeywordTab(tab.key)}
              className={`px-3 py-2 text-[12px] font-bold border-b-2 transition-colors ${
                keywordTab === tab.key
                  ? "border-[#091747] text-[#091747]"
                  : "border-transparent text-[#888] hover:text-[#091747]"
              }`}
            >
              {tab.label}
              <span
                className="ml-1.5 inline-block px-1.5 py-0.5 rounded-full text-[10px] text-white"
                style={{ backgroundColor: keywordTab === tab.key ? tab.color : "#ccc" }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {keywordTab === "irrelevant" && irrelevantCount > 0 && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between">
            <p className="text-[12px] text-[#991b1b]">
              <Icon name="info" className="text-[14px] align-middle mr-1" />
              事業と無関係な検索クエリです。削除しても順位に影響はありません。
            </p>
          </div>
        )}

        {keywords.length === 0 ? (
          <p className="text-[13px] text-[#888] text-center py-6">
            キーワードが登録されていません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#e3e6eb]">
                  <th
                    className="text-left py-2 pr-3 font-bold text-[#888] cursor-pointer hover:text-[#091747] select-none"
                    onClick={() => handleSort("keyword")}
                  >
                    キーワード
                    {sortField === "keyword" && (
                      <Icon
                        name={sortAsc ? "arrow_upward" : "arrow_downward"}
                        className="text-[14px] ml-1 align-middle"
                      />
                    )}
                  </th>
                  <th
                    className="text-right py-2 pr-3 font-bold text-[#888] cursor-pointer hover:text-[#091747] select-none"
                    onClick={() => handleSort("position")}
                  >
                    順位
                    {sortField === "position" && (
                      <Icon
                        name={sortAsc ? "arrow_upward" : "arrow_downward"}
                        className="text-[14px] ml-1 align-middle"
                      />
                    )}
                  </th>
                  <th className="text-right py-2 pr-3 font-bold text-[#888]">
                    7日間変動
                  </th>
                  <th
                    className="text-right py-2 pr-3 font-bold text-[#888] cursor-pointer hover:text-[#091747] select-none"
                    onClick={() => handleSort("clicks")}
                  >
                    クリック
                    {sortField === "clicks" && (
                      <Icon
                        name={sortAsc ? "arrow_upward" : "arrow_downward"}
                        className="text-[14px] ml-1 align-middle"
                      />
                    )}
                  </th>
                  <th
                    className="text-right py-2 pr-3 font-bold text-[#888] cursor-pointer hover:text-[#091747] select-none"
                    onClick={() => handleSort("impressions")}
                  >
                    表示回数
                    {sortField === "impressions" && (
                      <Icon
                        name={sortAsc ? "arrow_upward" : "arrow_downward"}
                        className="text-[14px] ml-1 align-middle"
                      />
                    )}
                  </th>
                  <th
                    className="text-right py-2 pr-3 font-bold text-[#888] cursor-pointer hover:text-[#091747] select-none"
                    onClick={() => handleSort("ctr")}
                  >
                    CTR
                    {sortField === "ctr" && (
                      <Icon
                        name={sortAsc ? "arrow_upward" : "arrow_downward"}
                        className="text-[14px] ml-1 align-middle"
                      />
                    )}
                  </th>
                  <th className="text-center py-2 pr-3 font-bold text-[#888]">
                    ソース
                  </th>
                  <th className="text-left py-2 pr-3 font-bold text-[#888]">
                    対象URL
                  </th>
                  <th className="text-center py-2 font-bold text-[#888] w-10">
                    削除
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredKeywords.map((kw) => {
                  const latest = latestByKeyword[kw.id];
                  const weekAgo = weekAgoByKeyword[kw.id];
                  const currentPos = latest?.position ?? null;
                  const prevPos = weekAgo?.position ?? null;

                  let changeVal: number | null = null;
                  let changeColor = "#888";
                  let changeIcon = "";
                  if (currentPos !== null && prevPos !== null) {
                    changeVal = prevPos - currentPos; // positive = improved
                    if (changeVal > 0) {
                      changeColor = "#10b981";
                      changeIcon = "arrow_upward";
                    } else if (changeVal < 0) {
                      changeColor = "#ef4444";
                      changeIcon = "arrow_downward";
                    } else {
                      changeColor = "#888";
                      changeIcon = "remove";
                    }
                  }

                  return (
                    <tr
                      key={kw.id}
                      className={`border-b border-[#e3e6eb]/60 ${
                        kw.is_primary ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1.5">
                          {kw.is_primary && (
                            <span className="inline-block px-1.5 py-0.5 bg-[#1FABE9]/10 text-[#1FABE9] text-[9px] font-bold rounded">
                              PRIMARY
                            </span>
                          )}
                          {!kw.is_primary && !isRelevantKeyword(kw.keyword) && keywordTab === "all" && (
                            <span className="inline-block px-1.5 py-0.5 bg-[#ef4444]/10 text-[#ef4444] text-[9px] font-bold rounded">
                              無関係
                            </span>
                          )}
                          <span className={`font-bold ${
                            !kw.is_primary && !isRelevantKeyword(kw.keyword)
                              ? "text-[#999]"
                              : "text-[#091747]"
                          }`}>
                            {kw.keyword}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-black text-[#091747]">
                        {currentPos !== null ? `${currentPos}位` : "–"}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        {changeVal !== null ? (
                          <span
                            className="inline-flex items-center gap-0.5 font-bold"
                            style={{ color: changeColor }}
                          >
                            <Icon name={changeIcon} className="text-[14px]" />
                            {Math.abs(changeVal)}
                          </span>
                        ) : (
                          <span className="text-[#888]">–</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-[#091747]">
                        {latest?.clicks?.toLocaleString() ?? "–"}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-[#091747]">
                        {latest?.impressions?.toLocaleString() ?? "–"}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-[#091747]">
                        {latest?.ctr != null
                          ? `${latest.ctr.toFixed(2)}%`
                          : "–"}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {latest?.source === "search_console" ? (
                          <span className="inline-block px-1.5 py-0.5 bg-[#6366f1]/10 text-[#6366f1] text-[9px] font-bold rounded">
                            GSC
                          </span>
                        ) : latest ? (
                          <span className="inline-block px-1.5 py-0.5 bg-[#888]/10 text-[#888] text-[9px] font-bold rounded">
                            手動
                          </span>
                        ) : (
                          <span className="text-[#ccc]">--</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-[#888] truncate max-w-[200px]">
                        {kw.target_url ? (
                          <a
                            href={kw.target_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#1FABE9] hover:underline"
                          >
                            {kw.target_url}
                          </a>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        <button
                          onClick={() => handleDeleteKeyword(kw.id)}
                          disabled={deletingId === kw.id}
                          className="p-1 text-[#ccc] hover:text-[#ef4444] transition-colors disabled:opacity-50"
                          title="削除"
                        >
                          <Icon name="delete" className="text-[18px]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Forms row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual Snapshot Input */}
        <div className="bg-white rounded-xl border border-[#e3e6eb] p-6">
          <h2 className="text-sm font-bold text-[#091747] mb-1 flex items-center gap-2">
            <Icon name="add_chart" className="text-[18px] text-[#8b5cf6]" />
            スナップショット追加
          </h2>
          <p className="text-[11px] text-[#666] mb-4">
            手動で順位データを登録
          </p>

          <form onSubmit={handleAddSnapshot} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-[#888] block mb-1">
                キーワード
              </label>
              <select
                value={snapshotKeywordId}
                onChange={(e) => setSnapshotKeywordId(e.target.value)}
                className="w-full border border-[#e3e6eb] rounded-lg px-3 py-2 text-[13px] text-[#091747] bg-white focus:outline-none focus:border-[#1FABE9] transition-colors"
                required
              >
                <option value="">選択してください</option>
                {keywords.map((kw) => (
                  <option key={kw.id} value={kw.id}>
                    {kw.keyword}
                    {kw.is_primary ? " (primary)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#888] block mb-1">
                順位 *
              </label>
              <input
                type="number"
                min={1}
                value={snapshotPosition}
                onChange={(e) => setSnapshotPosition(e.target.value)}
                placeholder="例: 5"
                className="w-full border border-[#e3e6eb] rounded-lg px-3 py-2 text-[13px] text-[#091747] focus:outline-none focus:border-[#1FABE9] transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-[#888] block mb-1">
                  クリック
                </label>
                <input
                  type="number"
                  min={0}
                  value={snapshotClicks}
                  onChange={(e) => setSnapshotClicks(e.target.value)}
                  placeholder="0"
                  className="w-full border border-[#e3e6eb] rounded-lg px-3 py-2 text-[13px] text-[#091747] focus:outline-none focus:border-[#1FABE9] transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#888] block mb-1">
                  表示回数
                </label>
                <input
                  type="number"
                  min={0}
                  value={snapshotImpressions}
                  onChange={(e) => setSnapshotImpressions(e.target.value)}
                  placeholder="0"
                  className="w-full border border-[#e3e6eb] rounded-lg px-3 py-2 text-[13px] text-[#091747] focus:outline-none focus:border-[#1FABE9] transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#888] block mb-1">
                  CTR (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={snapshotCtr}
                  onChange={(e) => setSnapshotCtr(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-[#e3e6eb] rounded-lg px-3 py-2 text-[13px] text-[#091747] focus:outline-none focus:border-[#1FABE9] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingSnapshot}
              className="w-full py-2.5 bg-[#8b5cf6] text-white text-[13px] font-bold rounded-lg hover:bg-[#7c3aed] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submittingSnapshot ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  登録中...
                </>
              ) : (
                <>
                  <Icon name="add" className="text-[18px]" />
                  スナップショットを登録
                </>
              )}
            </button>
          </form>
        </div>

        {/* Add Keyword Form */}
        <div className="bg-white rounded-xl border border-[#e3e6eb] p-6">
          <h2 className="text-sm font-bold text-[#091747] mb-1 flex items-center gap-2">
            <Icon name="add_circle" className="text-[18px] text-[#10b981]" />
            キーワード追加
          </h2>
          <p className="text-[11px] text-[#666] mb-4">
            新しい追跡キーワードを登録
          </p>

          <form onSubmit={handleAddKeyword} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-[#888] block mb-1">
                キーワード *
              </label>
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="例: フリーランス エンジニア 案件"
                className="w-full border border-[#e3e6eb] rounded-lg px-3 py-2 text-[13px] text-[#091747] focus:outline-none focus:border-[#1FABE9] transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#888] block mb-1">
                対象URL
              </label>
              <input
                type="url"
                value={newTargetUrl}
                onChange={(e) => setNewTargetUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="w-full border border-[#e3e6eb] rounded-lg px-3 py-2 text-[13px] text-[#091747] focus:outline-none focus:border-[#1FABE9] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-primary"
                checked={newIsPrimary}
                onChange={(e) => setNewIsPrimary(e.target.checked)}
                className="w-4 h-4 rounded border-[#e3e6eb] text-[#1FABE9] focus:ring-[#1FABE9]"
              />
              <label
                htmlFor="is-primary"
                className="text-[13px] font-medium text-[#091747]"
              >
                プライマリキーワードとして設定
              </label>
            </div>

            <button
              type="submit"
              disabled={submittingKeyword}
              className="w-full py-2.5 bg-[#10b981] text-white text-[13px] font-bold rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submittingKeyword ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  登録中...
                </>
              ) : (
                <>
                  <Icon name="add" className="text-[18px]" />
                  キーワードを追加
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ═══════════════ Blog Article Creation Dialog ═══════════════ */}
      {/* ── Article Generation Wizard Modal ── */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !generating && setWizardOpen(false)}
          />
          <div className="relative bg-white w-[95vw] max-w-[900px] max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Wizard Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-[#8b5cf6]/5 to-[#6d28d9]/5">
              <div>
                <p className="text-[10px] font-bold text-[#8b5cf6] tracking-[0.18em] uppercase">
                  AI ARTICLE GENERATOR
                </p>
                <h2 className="text-lg font-black text-navy">
                  AI記事生成ウィザード
                </h2>
                <p className="text-[11px] text-[#888] mt-0.5">
                  キーワード: <span className="font-bold text-[#8b5cf6]">{wizardKeyword}</span>
                  {wizardPosition && <span className="ml-2">（{wizardPosition}位）</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Step indicator */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        wizardStep === s
                          ? "bg-[#8b5cf6] w-6"
                          : wizardStep > s
                            ? "bg-[#8b5cf6]/40"
                            : "bg-[#ddd]"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => !generating && setWizardOpen(false)}
                  className="text-[#888] hover:text-navy transition-colors"
                >
                  <Icon name="close" className="text-[24px]" />
                </button>
              </div>
            </div>

            {/* Wizard Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Questions */}
              {wizardStep === 1 && (
                <div>
                  {/* Related articles summary */}
                  {(() => {
                    const related = findRelatedArticles(wizardKeyword);
                    if (related.length === 0) return null;
                    return (
                      <div className="mb-5 bg-[#faf5ff] border border-[#8b5cf6]/20 rounded-lg p-4">
                        <p className="text-[11px] font-bold text-[#8b5cf6] mb-2">
                          <Icon name="info" className="text-[14px] align-middle mr-1" />
                          関連する既存記事 ({related.length}件) — 差別化が必要です
                        </p>
                        <div className="space-y-1">
                          {related.slice(0, 5).map((a) => (
                            <p key={a.slug} className="text-[11px] text-[#666]">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mr-1.5 ${
                                a.relevance === "high"
                                  ? "bg-[#fee2e2] text-[#dc2626]"
                                  : "bg-[#fef3c7] text-[#d97706]"
                              }`}>
                                {a.relevance === "high" ? "高" : "中"}
                              </span>
                              {a.title}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {generateError && (
                    <div className="mb-4 bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3">
                      <p className="text-[12px] text-[#dc2626] font-bold">
                        <Icon name="error" className="text-[14px] align-middle mr-1" />
                        {generateError}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-bold text-[#333] mb-1.5">
                        <Icon name="group" className="text-[14px] align-middle mr-1 text-[#8b5cf6]" />
                        ターゲット読者は？
                      </label>
                      <textarea
                        value={wizAnswers.audience}
                        onChange={(e) => setWizAnswers({ ...wizAnswers, audience: e.target.value })}
                        placeholder="例: 大手ファーム出身で独立1-2年目のコンサルタント、PMO案件を探している"
                        rows={2}
                        className="w-full p-3 border border-border text-[13px] rounded-lg resize-none focus:outline-none focus:border-[#8b5cf6]"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#333] mb-1.5">
                        <Icon name="lightbulb" className="text-[14px] align-middle mr-1 text-[#8b5cf6]" />
                        記事の切り口・アプローチは？
                      </label>
                      <textarea
                        value={wizAnswers.angle}
                        onChange={(e) => setWizAnswers({ ...wizAnswers, angle: e.target.value })}
                        placeholder="例: 実体験ベースの失敗談から学ぶ形式、データ駆動の分析記事"
                        rows={2}
                        className="w-full p-3 border border-border text-[13px] rounded-lg resize-none focus:outline-none focus:border-[#8b5cf6]"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#333] mb-1.5">
                        <Icon name="star" className="text-[14px] align-middle mr-1 text-[#8b5cf6]" />
                        他記事との差別化ポイントは？
                      </label>
                      <textarea
                        value={wizAnswers.differentiator}
                        onChange={(e) => setWizAnswers({ ...wizAnswers, differentiator: e.target.value })}
                        placeholder="例: 具体的な単価交渉テクニック、実際の案件紹介事例を交える"
                        rows={2}
                        className="w-full p-3 border border-border text-[13px] rounded-lg resize-none focus:outline-none focus:border-[#8b5cf6]"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#333] mb-1.5">
                        <Icon name="checklist" className="text-[14px] align-middle mr-1 text-[#8b5cf6]" />
                        必ず含めたいポイントは？
                      </label>
                      <textarea
                        value={wizAnswers.keyPoints}
                        onChange={(e) => setWizAnswers({ ...wizAnswers, keyPoints: e.target.value })}
                        placeholder="例: PMO案件の実例、報酬相場（125万円〜）、PERSONAの登録メリット"
                        rows={2}
                        className="w-full p-3 border border-border text-[13px] rounded-lg resize-none focus:outline-none focus:border-[#8b5cf6]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-bold text-[#333] mb-1.5">
                          <Icon name="tune" className="text-[14px] align-middle mr-1 text-[#8b5cf6]" />
                          トーン
                        </label>
                        <select
                          value={wizAnswers.tone}
                          onChange={(e) => setWizAnswers({ ...wizAnswers, tone: e.target.value })}
                          className="w-full p-3 border border-border text-[13px] rounded-lg bg-white focus:outline-none focus:border-[#8b5cf6]"
                        >
                          <option value="実践的">実践的（具体的で行動に繋がる）</option>
                          <option value="専門的">専門的（深い知識を示す）</option>
                          <option value="カジュアル">カジュアル（読みやすさ重視）</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-[#333] mb-1.5">
                          <Icon name="edit_note" className="text-[14px] align-middle mr-1 text-[#8b5cf6]" />
                          その他要望（任意）
                        </label>
                        <textarea
                          value={wizAnswers.additionalNotes}
                          onChange={(e) => setWizAnswers({ ...wizAnswers, additionalNotes: e.target.value })}
                          placeholder="自由記述"
                          rows={2}
                          className="w-full p-3 border border-border text-[13px] rounded-lg resize-none focus:outline-none focus:border-[#8b5cf6]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Generating */}
              {wizardStep === 2 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 border-4 border-[#8b5cf6] border-t-transparent rounded-full animate-spin mb-6" />
                  <p className="text-lg font-bold text-[#091747] mb-2">
                    Claude が記事を執筆中...
                  </p>
                  <p className="text-[13px] text-[#888]">
                    キーワード「{wizardKeyword}」に最適化された記事を生成しています
                  </p>
                  <p className="text-[11px] text-[#aaa] mt-2">
                    通常15〜30秒かかります
                  </p>
                </div>
              )}

              {/* Step 3: Preview & Edit */}
              {wizardStep === 3 && generatedArticle && (
                <div>
                  <div className="mb-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg p-3">
                    <p className="text-[12px] text-[#16a34a] font-bold">
                      <Icon name="check_circle" className="text-[16px] align-middle mr-1" />
                      記事が生成されました！内容を確認・編集して保存してください。
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#888] mb-1">
                        タイトル
                      </label>
                      <input
                        type="text"
                        value={generatedArticle.title}
                        onChange={(e) => setGeneratedArticle({ ...generatedArticle, title: e.target.value })}
                        className="w-full p-3 border border-border text-[13px] rounded-lg focus:outline-none focus:border-[#8b5cf6]"
                      />
                      <p className="text-[10px] text-[#aaa] mt-0.5">{generatedArticle.title.length}文字</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#888] mb-1">
                          メタディスクリプション
                        </label>
                        <textarea
                          value={generatedArticle.description}
                          onChange={(e) => setGeneratedArticle({ ...generatedArticle, description: e.target.value })}
                          rows={2}
                          className="w-full p-3 border border-border text-[13px] rounded-lg resize-none focus:outline-none focus:border-[#8b5cf6]"
                        />
                        <p className="text-[10px] text-[#aaa] mt-0.5">
                          {generatedArticle.description.length}文字
                          {generatedArticle.description.length >= 120 && generatedArticle.description.length <= 160 && (
                            <span className="text-[#10b981]"> — 適切な長さ</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#888] mb-1">
                          カテゴリ
                        </label>
                        <select
                          value={generatedArticle.category}
                          onChange={(e) => setGeneratedArticle({ ...generatedArticle, category: e.target.value })}
                          className="w-full p-3 border border-border text-[13px] rounded-lg bg-white focus:outline-none focus:border-[#8b5cf6]"
                        >
                          <option value="ノウハウ">ノウハウ</option>
                          <option value="キャリア">キャリア</option>
                          <option value="業界トレンド">業界トレンド</option>
                          <option value="企業向け">企業向け</option>
                          <option value="サービス紹介">サービス紹介</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#888] mb-1">
                        記事本文（Markdown）
                        <span className="text-[10px] font-normal text-[#aaa] ml-2">
                          {generatedArticle.content.length}文字
                        </span>
                      </label>
                      <textarea
                        value={generatedArticle.content}
                        onChange={(e) => setGeneratedArticle({ ...generatedArticle, content: e.target.value })}
                        className="w-full min-h-[350px] p-4 border border-border text-[13px] font-mono leading-relaxed rounded-lg resize-y focus:outline-none focus:border-[#8b5cf6]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="px-6 py-4 border-t border-border bg-[#fafafa] flex items-center gap-3">
              {wizardStep === 1 && (
                <>
                  <div className="flex-1 text-[11px] text-[#aaa]">
                    未記入の項目があってもAIが自動補完します
                  </div>
                  <button
                    onClick={() => setWizardOpen(false)}
                    className="px-5 py-2.5 border border-border text-[13px] text-[#888] rounded-lg hover:border-navy hover:text-navy transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleGenerateArticle}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white text-[13px] font-bold rounded-lg hover:from-[#7c3aed] hover:to-[#5b21b6] transition-all flex items-center gap-2"
                  >
                    <Icon name="auto_awesome" className="text-[18px]" />
                    記事を生成する
                  </button>
                </>
              )}
              {wizardStep === 3 && (
                <>
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      setWizardStep(1);
                      setGeneratedArticle(null);
                    }}
                    className="px-5 py-2.5 border border-border text-[13px] text-[#888] rounded-lg hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-colors flex items-center gap-1.5"
                  >
                    <Icon name="refresh" className="text-[16px]" />
                    再生成
                  </button>
                  <button
                    onClick={handleSaveGeneratedArticle}
                    className="px-6 py-2.5 bg-[#1FABE9] text-white text-[13px] font-bold rounded-lg hover:bg-[#1890c8] transition-colors flex items-center gap-2"
                  >
                    <Icon name="edit_note" className="text-[18px]" />
                    ブログエディタで開く
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showArticleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !articleSaving && setShowArticleDialog(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white w-[95vw] max-w-[1100px] h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[#fafafa]">
              <div>
                <p className="text-[10px] font-bold text-[#1FABE9] tracking-[0.18em] uppercase">
                  NEW ARTICLE
                </p>
                <h2 className="text-lg font-black text-navy">
                  ブログ記事を作成
                </h2>
              </div>
              <button
                onClick={() => !articleSaving && setShowArticleDialog(false)}
                className="text-[#888] hover:text-navy transition-colors"
              >
                <Icon name="close" className="text-[24px]" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: meta fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#888] mb-1">
                      タイトル <span className="text-[#E15454]">*</span>
                    </label>
                    <input
                      type="text"
                      value={articleTitle}
                      onChange={(e) => setArticleTitle(e.target.value)}
                      placeholder="例: フリーコンサルのPMO案件で求められるスキルとは？"
                      className="w-full p-3 border border-border text-[13px] rounded-lg focus:outline-none focus:border-[#1FABE9]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#888] mb-1">
                        公開日
                      </label>
                      <input
                        type="date"
                        value={articleDate}
                        onChange={(e) => setArticleDate(e.target.value)}
                        className="w-full p-3 border border-border text-[13px] rounded-lg focus:outline-none focus:border-[#1FABE9]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#888] mb-1">
                        カテゴリ
                      </label>
                      <select
                        value={articleCategory}
                        onChange={(e) => setArticleCategory(e.target.value)}
                        className="w-full p-3 border border-border text-[13px] rounded-lg focus:outline-none focus:border-[#1FABE9] bg-white"
                      >
                        <option value="ノウハウ">ノウハウ</option>
                        <option value="キャリア">キャリア</option>
                        <option value="業界トレンド">業界トレンド</option>
                        <option value="企業向け">企業向け</option>
                        <option value="サービス紹介">サービス紹介</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#888] mb-1">
                      スラッグ（空欄でタイトルから自動生成）
                    </label>
                    <input
                      type="text"
                      value={articleSlug}
                      onChange={(e) => setArticleSlug(e.target.value)}
                      placeholder="例: pmo-skills-for-freelance-consultants"
                      className="w-full p-3 border border-border text-[13px] font-mono rounded-lg focus:outline-none focus:border-[#1FABE9]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#888] mb-1">
                      メタディスクリプション（SEO用）
                    </label>
                    <textarea
                      value={articleDescription}
                      onChange={(e) => setArticleDescription(e.target.value)}
                      placeholder="検索結果に表示される説明文（120-160文字推奨）"
                      rows={3}
                      className="w-full p-3 border border-border text-[13px] rounded-lg resize-none focus:outline-none focus:border-[#1FABE9]"
                    />
                    <p className="text-[10px] text-[#aaa] mt-1">
                      {articleDescription.length}文字
                      {articleDescription.length > 0 && articleDescription.length < 120 && (
                        <span className="text-[#f59e0b]"> — もう少し長くすると効果的です</span>
                      )}
                      {articleDescription.length >= 120 && articleDescription.length <= 160 && (
                        <span className="text-[#10b981]"> — 適切な長さです</span>
                      )}
                      {articleDescription.length > 160 && (
                        <span className="text-[#E15454]"> — 少し長すぎます</span>
                      )}
                    </p>
                  </div>

                  {/* Tips */}
                  <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-lg p-4">
                    <p className="text-[11px] font-bold text-[#0c4a6e] mb-2">
                      <Icon name="lightbulb" className="text-[14px] align-middle mr-1" />
                      ライティングのコツ
                    </p>
                    <ul className="text-[11px] text-[#0369a1] space-y-1">
                      <li>・Markdown形式で記述できます（## 見出し、- リスト、**太字**）</li>
                      <li>・H2見出しが3つ以上で目次が自動生成されます</li>
                      <li>・内部リンクを含めるとSEO効果が高まります</li>
                      <li>・2,000〜4,000文字が推奨です</li>
                    </ul>
                  </div>
                </div>

                {/* Right: content editor */}
                <div className="flex flex-col">
                  <label className="block text-[11px] font-bold text-[#888] mb-1">
                    本文（Markdown） <span className="text-[#E15454]">*</span>
                    <span className="text-[10px] font-normal text-[#aaa] ml-2">
                      {articleContent.length}文字
                    </span>
                  </label>
                  <textarea
                    value={articleContent}
                    onChange={(e) => setArticleContent(e.target.value)}
                    placeholder={`ここにMarkdown形式で記事を書いてください。\n\n例:\nフリーコンサルとして活躍するために...\n\n---\n\n## PMO案件とは？\n\nPMO（Project Management Office）は...\n\n## 求められるスキル\n\n- プロジェクト管理経験\n- ステークホルダー調整力\n- ...`}
                    className="flex-1 min-h-[400px] p-4 border border-border text-[13px] font-mono leading-relaxed rounded-lg resize-none focus:outline-none focus:border-[#1FABE9] placeholder:text-[#ccc]"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-[#fafafa] flex items-center gap-3">
              {articleResult && (
                <div className={`flex-1 text-[13px] font-bold ${articleResult.ok ? "text-[#10b981]" : "text-[#E15454]"}`}>
                  {articleResult.ok ? (
                    <>
                      <Icon name="check_circle" className="text-[16px] align-middle mr-1" />
                      記事を保存しました！
                      <a
                        href={articleResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-[#1FABE9] hover:underline font-normal text-[12px]"
                      >
                        プレビュー →
                      </a>
                    </>
                  ) : (
                    <>
                      <Icon name="error" className="text-[16px] align-middle mr-1" />
                      {articleResult.error}
                    </>
                  )}
                </div>
              )}
              {!articleResult && <div className="flex-1" />}
              <button
                onClick={() => setShowArticleDialog(false)}
                disabled={articleSaving}
                className="px-5 py-2.5 border border-border text-[13px] text-[#888] rounded-lg hover:border-navy hover:text-navy transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  if (!articleTitle || !articleContent) return;
                  setArticleSaving(true);
                  setArticleResult(null);
                  try {
                    const res = await fetch("/api/admin/blog", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: articleTitle,
                        slug: articleSlug || undefined,
                        date: articleDate,
                        description: articleDescription,
                        category: articleCategory,
                        content: articleContent,
                      }),
                    });
                    const data = await res.json();
                    if (res.ok && data.ok) {
                      setArticleResult({ ok: true, url: data.url });
                    } else {
                      setArticleResult({ ok: false, error: data.error || "保存に失敗しました" });
                    }
                  } catch {
                    setArticleResult({ ok: false, error: "ネットワークエラーが発生しました" });
                  } finally {
                    setArticleSaving(false);
                  }
                }}
                disabled={articleSaving || !articleTitle || !articleContent}
                className="px-6 py-2.5 bg-[#1FABE9] text-white text-[13px] font-bold rounded-lg hover:bg-[#1890c8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {articleSaving ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Icon name="publish" className="text-[18px]" />
                    記事を保存
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
