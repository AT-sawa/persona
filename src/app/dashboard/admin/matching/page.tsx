"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface MatchRow {
  id: string;
  case_id: string;
  user_id: string;
  score: number;
  factors: Record<string, { score: number; max: number; matched?: string[] | boolean | string | null }>;
  semantic_score: number | null;
  llm_reasoning: string | null;
  is_notified: boolean;
  matched_at: string | null;
  cases: {
    id: string;
    title: string;
    category: string | null;
    industry: string | null;
    fee: string | null;
    location: string | null;
    is_active: boolean;
    created_at: string | null;
  } | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    skills: string[] | null;
    is_looking: boolean;
  } | null;
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

type ScoreFilter = "all" | "high" | "mid" | "low";

export default function AdminMatchingPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [caseSearch, setCaseSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Stats
  const [totalCount, setTotalCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [highCount, setHighCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  async function checkAdminAndFetch() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    const { data: profile } = await supabase
      .from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) { router.push("/dashboard"); return; }
    fetchMatches();
  }

  async function fetchMatches() {
    setLoading(true);
    const supabase = createClient();

    // Fetch matching results with joins
    const { data, error } = await supabase
      .from("matching_results")
      .select(`
        id, case_id, user_id, score, factors, semantic_score, llm_reasoning,
        is_notified, matched_at,
        cases(id, title, category, industry, fee, location, is_active, created_at),
        profiles(id, full_name, email, skills, is_looking)
      `)
      .order("score", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Fetch error:", error);
      setLoading(false);
      return;
    }

    const rows = (data as unknown as MatchRow[]) || [];
    setMatches(rows);

    // Calculate stats
    setTotalCount(rows.length);
    if (rows.length > 0) {
      const sum = rows.reduce((acc, r) => acc + r.score, 0);
      setAvgScore(Math.round(sum / rows.length));
    }
    setHighCount(rows.filter((r) => r.score >= 60).length);
    const uniqueUsers = new Set(rows.map((r) => r.user_id));
    setUserCount(uniqueUsers.size);

    setLoading(false);
  }

  // Filtering
  const filtered = matches.filter((m) => {
    // Score filter
    if (scoreFilter === "high" && m.score < 60) return false;
    if (scoreFilter === "mid" && (m.score < 40 || m.score >= 60)) return false;
    if (scoreFilter === "low" && m.score >= 40) return false;

    // Case search
    if (caseSearch) {
      const q = caseSearch.toLowerCase();
      const title = m.cases?.title?.toLowerCase() || "";
      const category = m.cases?.category?.toLowerCase() || "";
      const userName = m.profiles?.full_name?.toLowerCase() || "";
      if (!title.includes(q) && !category.includes(q) && !userName.includes(q)) return false;
    }

    return true;
  });

  function getScoreColor(score: number) {
    if (score >= 60) return "text-[#10b981] bg-[#ecfdf5]";
    if (score >= 40) return "text-[#f59e0b] bg-[#fffbeb]";
    return "text-[#888] bg-[#f5f5f5]";
  }

  if (loading) {
    return <div className="py-8"><div className="text-sm text-[#888]">読み込み中...</div></div>;
  }

  return (
    <div className="py-6">
      <Link
        href="/dashboard/admin"
        className="text-[12px] text-[#999] hover:text-navy transition-colors flex items-center gap-1 mb-4"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        管理者ダッシュボード
      </Link>

      <div className="mb-6">
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          ADMIN / MATCHING
        </p>
        <h1 className="text-xl font-black text-navy">マッチング結果一覧</h1>
        <p className="text-[12px] text-[#888] mt-1">
          案件と人材のマッチング結果を確認できます
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "総マッチ数", value: totalCount, icon: "handshake" },
          { label: "平均スコア", value: `${avgScore}%`, icon: "speed" },
          { label: "高スコア (60+)", value: highCount, icon: "star" },
          { label: "対象ユーザー数", value: userCount, icon: "group" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white border border-border p-5"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon name={item.icon} className="text-[18px] text-[#888]" />
              <p className="text-[11px] font-bold text-[#888]">{item.label}</p>
            </div>
            <p className="text-2xl font-black text-navy">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          {([
            { value: "all" as ScoreFilter, label: "すべて" },
            { value: "high" as ScoreFilter, label: "60以上" },
            { value: "mid" as ScoreFilter, label: "40-59" },
            { value: "low" as ScoreFilter, label: "20-39" },
          ]).map((item) => (
            <button
              key={item.value}
              onClick={() => setScoreFilter(item.value)}
              className={`px-4 py-1.5 text-[12px] font-bold border transition-colors ${
                scoreFilter === item.value
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-[#888] border-border hover:bg-[#fafafa]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="案件名・ユーザー名で検索..."
          value={caseSearch}
          onChange={(e) => setCaseSearch(e.target.value)}
          className="px-3 py-1.5 border border-border text-[13px] text-navy focus:outline-none focus:border-blue w-full sm:w-[280px]"
        />
      </div>

      {/* Results count */}
      <p className="text-[12px] text-[#888] mb-3">
        {filtered.length}件の結果
        {caseSearch && ` (「${caseSearch}」で絞り込み)`}
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-border p-12 text-center text-[#999]">
          <Icon name="psychology" className="text-[40px] block mx-auto mb-2 opacity-30" />
          <p className="text-[14px]">マッチング結果がありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const isExpanded = expandedId === m.id;
            return (
              <div key={m.id} className="bg-white border border-border">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className="w-full text-left p-4 hover:bg-[#fafafa] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Score */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${getScoreColor(m.score)}`}
                    >
                      <span className="text-[14px] font-black">{m.score}</span>
                    </div>

                    {/* Case info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[14px] font-bold text-navy truncate">
                          {m.cases?.title || "不明な案件"}
                        </p>
                        {m.semantic_score != null && (
                          <span className="text-[9px] font-bold text-[#7c3aed] bg-[#f5f3ff] px-1.5 py-0.5 shrink-0">
                            AI
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#888]">
                        {m.cases?.category && <span>{m.cases.category}</span>}
                        {m.cases?.fee && <span>{m.cases.fee}</span>}
                      </div>
                    </div>

                    {/* User info */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-[13px] font-bold text-navy">
                        {m.profiles?.full_name || "不明"}
                      </p>
                      <p className="text-[11px] text-[#aaa]">
                        {m.profiles?.email}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="text-right shrink-0 hidden md:block">
                      <p className="text-[11px] text-[#aaa]">
                        {m.matched_at
                          ? new Date(m.matched_at).toLocaleDateString("ja-JP", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </p>
                    </div>

                    <Icon
                      name={isExpanded ? "expand_less" : "expand_more"}
                      className="text-[20px] text-[#aaa] shrink-0"
                    />
                  </div>

                  {/* Mobile: user info */}
                  <div className="sm:hidden mt-2 text-[12px] text-[#888]">
                    {m.profiles?.full_name || "不明"} ({m.profiles?.email})
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-[#fafbfc]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Factors */}
                      <div>
                        <p className="text-[11px] font-bold text-[#888] mb-2">スコア内訳</p>
                        <div className="space-y-1.5">
                          {m.factors && Object.entries(m.factors).map(([key, val]) => {
                            if (!val || typeof val !== "object") return null;
                            const labels: Record<string, string> = {
                              skills: "スキル",
                              category: "カテゴリ",
                              industry: "業界",
                              rate: "報酬",
                              location: "勤務地",
                              occupancy: "稼働率",
                            };
                            return (
                              <div key={key} className="flex items-center gap-2">
                                <span className="text-[11px] text-[#888] w-[60px] shrink-0">
                                  {labels[key] || key}
                                </span>
                                <div className="flex-1 h-2 bg-[#eee] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue rounded-full transition-all"
                                    style={{
                                      width: `${val.max > 0 ? (val.score / val.max) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[11px] font-bold text-navy w-[40px] text-right">
                                  {val.score}/{val.max}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Matched skills */}
                        {m.factors?.skills?.matched && Array.isArray(m.factors.skills.matched) && m.factors.skills.matched.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] text-[#888] mb-1">マッチしたスキル:</p>
                            <div className="flex flex-wrap gap-1">
                              {(m.factors.skills.matched as string[]).map((s) => (
                                <span key={s} className="text-[10px] bg-blue/10 text-blue px-2 py-0.5 font-bold">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* AI Analysis & Links */}
                      <div>
                        {m.semantic_score != null && (
                          <div className="mb-3">
                            <p className="text-[11px] font-bold text-[#888] mb-1">
                              セマンティックスコア: {Math.round(m.semantic_score)}%
                            </p>
                          </div>
                        )}

                        {m.llm_reasoning && (
                          <div className="mb-3">
                            <p className="text-[11px] font-bold text-[#888] mb-1">AI分析</p>
                            <p className="text-[12px] text-[#555] leading-[1.7] bg-white p-3 border border-border/50">
                              {m.llm_reasoning}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-3 mt-3">
                          <Link
                            href={`/dashboard/cases/${m.case_id}`}
                            className="text-[12px] text-blue font-bold hover:underline flex items-center gap-1"
                          >
                            <Icon name="work" className="text-[14px]" />
                            案件詳細
                          </Link>
                          <Link
                            href={`/dashboard/admin/users`}
                            className="text-[12px] text-blue font-bold hover:underline flex items-center gap-1"
                          >
                            <Icon name="person" className="text-[14px]" />
                            ユーザー管理
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
