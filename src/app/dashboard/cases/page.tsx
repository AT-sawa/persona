"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { analytics } from "@/lib/analytics";
import type { Case } from "@/lib/types";
import { adjustFee } from "@/lib/matching/parseFee";

/** occupancy文字列から最小パーセンテージを抽出（例: "50%-100%" → 50, "80%" → 80） */
function parseOccupancyMin(occ: string | null): number | null {
  if (!occ) return null;
  const normalized = occ.replace(/％/g, "%").replace(/～/g, "~").replace(/〜/g, "~");
  const match = normalized.match(/(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return num > 0 && num <= 100 ? num : null;
}

const OCCUPANCY_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/** 日付からの経過日数に応じて「新着」バッジを表示するか判定 */
function isNew(dateStr: string | null, days = 7) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return now.getTime() - d.getTime() < days * 24 * 60 * 60 * 1000;
}

const CATEGORY_TREE: Record<string, string[]> = {
  戦略: [
    "戦略策定",
    "新規事業",
    "M&A / PMI",
    "DD（デューデリジェンス）",
    "市場調査・競合分析",
    "経営企画",
  ],
  BPR: [
    "業務改革・業務改善",
    "組織改革",
    "SCM / サプライチェーン",
    "人事制度設計",
    "経営管理・管理会計",
    "BPO推進",
  ],
  IT: [
    "PMO",
    "DX推進",
    "SAP導入・運用",
    "Salesforce導入",
    "ERP / 基幹システム",
    "クラウド / インフラ",
    "データ分析 / BI",
    "AI / 機械学習",
    "セキュリティ",
    "システム開発",
  ],
};

const ALL_CATEGORIES = Object.keys(CATEGORY_TREE);

export default function AppCasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [filtered, setFiltered] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [mainCategory, setMainCategory] = useState<string | null>(null);
  const [subCategory, setSubCategory] = useState<string | null>(null);
  const [feeMin, setFeeMin] = useState("");
  const [location, setLocation] = useState("");
  const [occMin, setOccMin] = useState(0);
  const [occMax, setOccMax] = useState(100);
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});

  // Drawer
  const [drawerCaseId, setDrawerCaseId] = useState<string | null>(null);
  const [drawerCase, setDrawerCase] = useState<Case | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const [casesRes, matchRes] = await Promise.all([
      supabase
        .from("cases")
        .select("id, title, fee, location, occupancy, category, industry, is_active, status, description, must_req, published_at, created_at")
        .eq("is_active", true)
        .order("published_at", { ascending: false }),
      supabase
        .from("matching_results")
        .select("case_id, score")
        .eq("user_id", user.id),
    ]);

    const casesData = (casesRes.data as Case[]) ?? [];
    setCases(casesData);
    setFiltered(casesData);

    const scores: Record<string, number> = {};
    (matchRes.data ?? []).forEach((m: { case_id: string; score: number }) => {
      scores[m.case_id] = m.score;
    });
    setMatchScores(scores);
    setLoading(false);
    analytics.caseListView(casesData.length);
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let result = cases;

    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(kw) ||
          c.description?.toLowerCase().includes(kw) ||
          c.must_req?.toLowerCase().includes(kw) ||
          c.industry?.toLowerCase().includes(kw)
      );
    }

    if (mainCategory) {
      const subs = CATEGORY_TREE[mainCategory] ?? [];
      const searchTerms = [mainCategory, ...subs];
      result = result.filter((c) => {
        const text = `${c.category ?? ""} ${c.title} ${c.description ?? ""} ${c.must_req ?? ""}`.toLowerCase();
        return searchTerms.some((term) => text.includes(term.toLowerCase()));
      });
    }

    if (subCategory) {
      result = result.filter((c) => {
        const text = `${c.category ?? ""} ${c.title} ${c.description ?? ""} ${c.must_req ?? ""}`.toLowerCase();
        return text.includes(subCategory.toLowerCase());
      });
    }

    if (feeMin) {
      const min = parseInt(feeMin);
      result = result.filter((c) => {
        if (!c.fee) return false;
        const nums = c.fee.match(/(\d+)/g);
        if (!nums) return false;
        return nums.some((n) => parseInt(n) >= min);
      });
    }

    if (location) {
      result = result.filter((c) => c.location?.includes(location));
    }

    // 稼働率フィルター
    if (occMin > 0 || occMax < 100) {
      result = result.filter((c) => {
        const minPct = parseOccupancyMin(c.occupancy);
        if (minPct === null) return false;
        return minPct >= occMin && minPct <= occMax;
      });
    }

    setFiltered(result);
  }, [cases, keyword, mainCategory, subCategory, feeMin, location, occMin, occMax]);

  // ドロワーを開く
  async function openDrawer(caseId: string) {
    setDrawerCaseId(caseId);
    setDrawerLoading(true);
    setDrawerCase(null);
    // アニメーション: まずマウント → 次フレームでvisible
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawerVisible(true));
    });

    const supabase = createClient();
    const { data } = await supabase
      .from("cases")
      .select("id, case_no, title, category, background, description, industry, start_date, extendable, occupancy, fee, work_style, office_days, location, must_req, nice_to_have, flow, status, published_at, created_at, is_active")
      .eq("id", caseId)
      .single();

    if (data) {
      setDrawerCase({ ...data, client_company: null, commercial_flow: null, email_intake_id: null } as Case);
    }
    setDrawerLoading(false);
  }

  // ドロワーを閉じる
  function closeDrawer() {
    setDrawerVisible(false);
    setTimeout(() => {
      setDrawerCaseId(null);
      setDrawerCase(null);
    }, 300); // アニメーション後にクリア
  }

  // ESCキーでドロワーを閉じる
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && drawerCaseId) closeDrawer();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerCaseId]);

  function clearFilters() {
    setKeyword("");
    setMainCategory(null);
    setSubCategory(null);
    setFeeMin("");
    setLocation("");
    setOccMin(0);
    setOccMax(100);
  }

  const hasFilters =
    keyword || mainCategory || subCategory || feeMin || location || occMin > 0 || occMax < 100;

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#999]">
          <Icon name="progress_activity" className="text-[24px] animate-spin" />
          <span className="text-sm">読み込み中...</span>
        </div>
      </div>
    );
  }

  const drawerScore = drawerCaseId ? matchScores[drawerCaseId] : undefined;

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-navy">案件検索</h1>
          <p className="text-[13px] text-[#888] mt-1">
            {filtered.length}件の案件
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-3 text-blue hover:underline"
              >
                フィルタをクリア
              </button>
            )}
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-2xl border border-border/60 p-5 mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => {
              setMainCategory(null);
              setSubCategory(null);
            }}
            className={`px-4 py-2 text-[13px] font-bold rounded-xl transition-all ${
              !mainCategory
                ? "bg-navy text-white"
                : "bg-[#f5f7fa] text-[#666] hover:bg-[#eee]"
            }`}
          >
            すべて
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setMainCategory(mainCategory === cat ? null : cat);
                setSubCategory(null);
              }}
              className={`px-4 py-2 text-[13px] font-bold rounded-xl transition-all ${
                mainCategory === cat
                  ? "bg-blue text-white"
                  : "bg-[#f5f7fa] text-[#666] hover:bg-[#eee]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sub-categories */}
        {mainCategory && CATEGORY_TREE[mainCategory] && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-border/40">
            {CATEGORY_TREE[mainCategory].map((sub) => (
              <button
                key={sub}
                onClick={() =>
                  setSubCategory(subCategory === sub ? null : sub)
                }
                className={`px-3 py-1.5 text-[12px] rounded-lg transition-all ${
                  subCategory === sub
                    ? "bg-blue/10 text-blue font-bold border border-blue/30"
                    : "bg-[#f5f7fa] text-[#888] hover:bg-[#eee] border border-transparent"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Filters */}
      <div className="bg-white rounded-2xl border border-border/60 p-4 mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#bbb]"
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="キーワード検索..."
              className="w-full pl-10 pr-3 py-2.5 border border-border/60 text-[13px] text-text outline-none rounded-xl bg-[#fafafa] focus:border-blue focus:bg-white transition-colors"
            />
          </div>
          <div className="relative">
            <Icon
              name="payments"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#bbb]"
            />
            <input
              type="number"
              value={feeMin}
              onChange={(e) => setFeeMin(e.target.value)}
              placeholder="最低報酬（万円）"
              min="0"
              className="w-full pl-10 pr-3 py-2.5 border border-border/60 text-[13px] text-text outline-none rounded-xl bg-[#fafafa] focus:border-blue focus:bg-white transition-colors"
            />
          </div>
          <div className="relative">
            <Icon
              name="location_on"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#bbb]"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="勤務地"
              className="w-full pl-10 pr-3 py-2.5 border border-border/60 text-[13px] text-text outline-none rounded-xl bg-[#fafafa] focus:border-blue focus:bg-white transition-colors"
            />
          </div>
          {/* 稼働率フィルター */}
          <div className="flex items-center gap-1.5">
            <Icon
              name="schedule"
              className="text-[18px] text-[#bbb] shrink-0"
            />
            <select
              value={occMin}
              onChange={(e) => {
                const v = Number(e.target.value);
                setOccMin(v);
                if (v > occMax) setOccMax(v);
              }}
              className="flex-1 py-2.5 pl-2 pr-6 border border-border/60 text-[13px] text-text outline-none rounded-xl bg-[#fafafa] focus:border-blue focus:bg-white transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
            >
              {OCCUPANCY_STEPS.map((v) => (
                <option key={v} value={v}>{v}%</option>
              ))}
            </select>
            <span className="text-[12px] text-[#bbb]">〜</span>
            <select
              value={occMax}
              onChange={(e) => {
                const v = Number(e.target.value);
                setOccMax(v);
                if (v < occMin) setOccMin(v);
              }}
              className="flex-1 py-2.5 pl-2 pr-6 border border-border/60 text-[13px] text-text outline-none rounded-xl bg-[#fafafa] focus:border-blue focus:bg-white transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
            >
              {OCCUPANCY_STEPS.map((v) => (
                <option key={v} value={v}>{v}%</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border/60 p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f5f7fa] flex items-center justify-center mb-3">
            <Icon name="search_off" className="text-[28px] text-[#ccc]" />
          </div>
          <p className="text-[13px] text-[#888]">
            条件に一致する案件が見つかりませんでした
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((c) => {
            const score = matchScores[c.id];
            const dateStr = formatDate(c.published_at || c.created_at);
            return (
              <button
                key={c.id}
                onClick={() => openDrawer(c.id)}
                className="group bg-white rounded-2xl border border-border/60 p-5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-blue/20 transition-all block w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.is_active
                            ? "text-[#10b981] bg-[#ecfdf5]"
                            : "text-[#888] bg-[#f5f5f5]"
                        }`}
                      >
                        {c.is_active
                          ? c.status === "最注力"
                            ? "最注力"
                            : "募集中"
                          : "クローズ"}
                      </span>
                      {c.category && (
                        <span className="text-[10px] text-[#888] bg-[#f5f7fa] px-2 py-0.5 rounded">
                          {c.category}
                        </span>
                      )}
                      {score !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            score >= 70
                              ? "text-[#10b981] bg-[#ecfdf5]"
                              : score >= 40
                              ? "text-[#f59e0b] bg-[#fffbeb]"
                              : "text-[#888] bg-[#f5f5f5]"
                          }`}
                        >
                          マッチ {score}%
                        </span>
                      )}
                      {isNew(c.published_at || c.created_at) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded text-[#3b82f6] bg-[#eff6ff]">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] font-bold text-navy mb-2 group-hover:text-blue transition-colors">
                      {c.title}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#888]">
                      {c.fee && (
                        <span className="flex items-center gap-1">
                          <Icon name="payments" className="text-[14px]" />
                          {adjustFee(c.fee, 30)}
                        </span>
                      )}
                      {c.location && (
                        <span className="flex items-center gap-1">
                          <Icon name="location_on" className="text-[14px]" />
                          {c.location}
                        </span>
                      )}
                      {c.occupancy && (
                        <span className="flex items-center gap-1">
                          <Icon name="schedule" className="text-[14px]" />
                          {c.occupancy}
                        </span>
                      )}
                      {c.industry && (
                        <span className="flex items-center gap-1">
                          <Icon name="business" className="text-[14px]" />
                          {c.industry}
                        </span>
                      )}
                      {dateStr && (
                        <span className="flex items-center gap-1">
                          <Icon name="calendar_today" className="text-[14px]" />
                          {dateStr}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[12px] text-blue font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    詳細
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ====== Right Drawer ====== */}
      {drawerCaseId && (
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${drawerVisible ? "opacity-100" : "opacity-0"}`}
            onClick={closeDrawer}
          />
          {/* Drawer panel */}
          <div
            className={`absolute top-0 right-0 h-full w-full max-w-[560px] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out ${drawerVisible ? "translate-x-0" : "translate-x-full"}`}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-border/60 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-[15px] font-black text-navy truncate pr-4">
                案件詳細
              </h2>
              <button
                onClick={closeDrawer}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#f5f7fa] transition-colors shrink-0"
              >
                <Icon name="close" className="text-[20px] text-[#888]" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto h-[calc(100%-65px)]">
              {drawerLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex items-center gap-3 text-[#999]">
                    <Icon name="progress_activity" className="text-[24px] animate-spin" />
                    <span className="text-sm">読み込み中...</span>
                  </div>
                </div>
              ) : drawerCase ? (
                <div className="px-6 py-5">
                  {/* Title & badges */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        drawerCase.is_active
                          ? "text-[#10b981] bg-[#ecfdf5]"
                          : "text-[#888] bg-[#f5f5f5]"
                      }`}
                    >
                      {drawerCase.is_active
                        ? drawerCase.status === "最注力" ? "最注力" : "募集中"
                        : "クローズ"}
                    </span>
                    {drawerCase.category && (
                      <span className="text-[10px] text-[#888] bg-[#f5f7fa] px-2 py-0.5 rounded">
                        {drawerCase.category}
                      </span>
                    )}
                    {drawerCase.case_no && (
                      <span className="text-[10px] text-[#aaa]">
                        {drawerCase.case_no}
                      </span>
                    )}
                    {drawerScore !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          drawerScore >= 70
                            ? "text-[#10b981] bg-[#ecfdf5]"
                            : drawerScore >= 40
                            ? "text-[#f59e0b] bg-[#fffbeb]"
                            : "text-[#888] bg-[#f5f5f5]"
                        }`}
                      >
                        マッチ {drawerScore}%
                      </span>
                    )}
                  </div>

                  <h3 className="text-[18px] font-black text-navy leading-[1.5] mb-4">
                    {drawerCase.title}
                  </h3>

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { icon: "payments", label: "報酬", value: adjustFee(drawerCase.fee, 30) },
                      { icon: "schedule", label: "稼働率", value: drawerCase.occupancy },
                      { icon: "location_on", label: "勤務地", value: drawerCase.location },
                      { icon: "home_work", label: "勤務形態", value: drawerCase.work_style },
                      { icon: "apartment", label: "出社日数", value: drawerCase.office_days },
                      { icon: "business", label: "業界", value: drawerCase.industry },
                      { icon: "event", label: "開始日", value: drawerCase.start_date },
                      { icon: "autorenew", label: "延長", value: drawerCase.extendable },
                      { icon: "calendar_today", label: "登録日", value: formatDate(drawerCase.published_at || drawerCase.created_at) },
                    ]
                      .filter((item) => item.value)
                      .map((item) => (
                        <div key={item.label} className="flex items-start gap-2 py-2 px-3 bg-[#fafafa] rounded-lg">
                          <Icon name={item.icon} className="text-[16px] text-[#bbb] mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-[#999] block">
                              {item.label}
                            </span>
                            <span className="text-[13px] text-navy font-medium">
                              {item.value}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Sections */}
                  {drawerCase.background && (
                    <div className="mb-4">
                      <h4 className="text-[12px] font-bold text-[#888] mb-1.5 flex items-center gap-1">
                        <Icon name="info" className="text-[14px]" />
                        案件背景
                      </h4>
                      <p className="text-[13px] text-text whitespace-pre-line leading-[1.8] pl-0.5">
                        {drawerCase.background}
                      </p>
                    </div>
                  )}

                  {drawerCase.description && (
                    <div className="mb-4">
                      <h4 className="text-[12px] font-bold text-[#888] mb-1.5 flex items-center gap-1">
                        <Icon name="description" className="text-[14px]" />
                        業務内容
                      </h4>
                      <p className="text-[13px] text-text whitespace-pre-line leading-[1.8] pl-0.5">
                        {drawerCase.description}
                      </p>
                    </div>
                  )}

                  {drawerCase.must_req && (
                    <div className="mb-4">
                      <h4 className="text-[12px] font-bold text-[#888] mb-1.5 flex items-center gap-1">
                        <Icon name="check_circle" className="text-[14px]" />
                        必須要件
                      </h4>
                      <p className="text-[13px] text-text whitespace-pre-line leading-[1.8] pl-0.5">
                        {drawerCase.must_req}
                      </p>
                    </div>
                  )}

                  {drawerCase.nice_to_have && (
                    <div className="mb-4">
                      <h4 className="text-[12px] font-bold text-[#888] mb-1.5 flex items-center gap-1">
                        <Icon name="add_circle" className="text-[14px]" />
                        歓迎要件
                      </h4>
                      <p className="text-[13px] text-text whitespace-pre-line leading-[1.8] pl-0.5">
                        {drawerCase.nice_to_have}
                      </p>
                    </div>
                  )}

                  {drawerCase.flow && (
                    <div className="mb-4">
                      <h4 className="text-[12px] font-bold text-[#888] mb-1.5 flex items-center gap-1">
                        <Icon name="route" className="text-[14px]" />
                        選考フロー
                      </h4>
                      <p className="text-[13px] text-text whitespace-pre-line leading-[1.8] pl-0.5">
                        {drawerCase.flow}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 pt-5 border-t border-border/60 flex flex-col gap-3">
                    <Link
                      href={`/dashboard/cases/${drawerCase.id}`}
                      className="w-full py-3.5 bg-blue text-white text-[14px] font-bold text-center rounded-xl hover:bg-blue-dark transition-colors flex items-center justify-center gap-2"
                    >
                      <Icon name="edit_note" className="text-[18px]" />
                      この案件にエントリーする
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-20">
                  <p className="text-[13px] text-[#888]">
                    案件データを取得できませんでした
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
