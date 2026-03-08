"use client";

import { useEffect, useState, useMemo } from "react";
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
    work_style: string | null;
    occupancy: string | null;
    start_date: string | null;
    must_req: string | null;
    nice_to_have: string | null;
    description: string | null;
    is_active: boolean;
    created_at: string | null;
  } | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    skills: string[] | null;
    years_experience: number | null;
    prefecture: string | null;
    remote_preference: string | null;
    is_looking: boolean;
    bio: string | null;
  } | null;
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

type ScoreFilter = "all" | "high" | "mid" | "low";

/**
 * Parse must_req text into individual requirement items.
 * Handles common patterns: newlines, bullets, commas, semicolons, numbered lists.
 */
function parseMustReq(text: string | null): string[] {
  if (!text || !text.trim()) return [];
  // Split by common delimiters
  const items = text
    .split(/[\n\r]+|[、；;]|(?:・|●|■|▪|▸|►|‣|⁃|‐|[-])\s*|(?:\d+[.)）]\s*)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 200);
  return items;
}

/**
 * Check if a requirement item is fulfilled by user skills.
 * Does a fuzzy match: check if any user skill appears in the requirement or vice versa.
 */
function checkRequirement(req: string, userSkills: string[]): boolean {
  if (!userSkills.length) return false;
  const normalizedReq = req.toLowerCase();
  for (const skill of userSkills) {
    const normalizedSkill = skill.toLowerCase();
    if (normalizedReq.includes(normalizedSkill) || normalizedSkill.includes(normalizedReq)) {
      return true;
    }
  }
  return false;
}

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

    const { data, error } = await supabase
      .from("matching_results")
      .select(`
        id, case_id, user_id, score, factors, semantic_score, llm_reasoning,
        is_notified, matched_at,
        cases(id, title, category, industry, fee, location, work_style, occupancy,
              start_date, must_req, nice_to_have, description, is_active, created_at),
        profiles(id, full_name, email, skills, years_experience, prefecture,
                 remote_preference, is_looking, bio)
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
  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (scoreFilter === "high" && m.score < 60) return false;
      if (scoreFilter === "mid" && (m.score < 40 || m.score >= 60)) return false;
      if (scoreFilter === "low" && m.score >= 40) return false;

      if (caseSearch) {
        const q = caseSearch.toLowerCase();
        const title = m.cases?.title?.toLowerCase() || "";
        const category = m.cases?.category?.toLowerCase() || "";
        const userName = m.profiles?.full_name?.toLowerCase() || "";
        const mustReq = m.cases?.must_req?.toLowerCase() || "";
        const skills = (m.profiles?.skills || []).join(" ").toLowerCase();
        if (!title.includes(q) && !category.includes(q) && !userName.includes(q)
            && !mustReq.includes(q) && !skills.includes(q)) return false;
      }

      return true;
    });
  }, [matches, scoreFilter, caseSearch]);

  function getScoreColor(score: number) {
    if (score >= 60) return "text-[#10b981]";
    if (score >= 40) return "text-[#f59e0b]";
    return "text-[#999]";
  }

  function getScoreBg(score: number) {
    if (score >= 60) return "bg-[#ecfdf5] border-[#10b981]/20";
    if (score >= 40) return "bg-[#fffbeb] border-[#f59e0b]/20";
    return "bg-[#f5f5f5] border-[#ddd]";
  }

  function getRemoteLabel(pref: string | null) {
    const map: Record<string, string> = {
      remote_only: "リモートのみ",
      hybrid: "ハイブリッド",
      onsite: "常駐",
      any: "問わない",
    };
    return pref ? map[pref] || pref : null;
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
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
          案件と人材のマッチング結果を確認 — 案件・人材の詳細をこのページで確認できます
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
          placeholder="案件名・人材名・スキルで検索..."
          value={caseSearch}
          onChange={(e) => setCaseSearch(e.target.value)}
          className="px-3 py-1.5 border border-border text-[13px] text-navy focus:outline-none focus:border-blue w-full sm:w-[300px]"
        />
      </div>

      {/* Results count */}
      <p className="text-[12px] text-[#888] mb-3">
        {filtered.length}件の結果
        {caseSearch && ` (「${caseSearch}」で絞り込み)`}
      </p>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-border p-12 text-center text-[#999]">
          <Icon name="psychology" className="text-[40px] block mx-auto mb-2 opacity-30" />
          <p className="text-[14px]">マッチング結果がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              isExpanded={expandedId === m.id}
              onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
              getScoreColor={getScoreColor}
              getScoreBg={getScoreBg}
              getRemoteLabel={getRemoteLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Individual match card component */
function MatchCard({
  match: m,
  isExpanded,
  onToggle,
  getScoreColor,
  getScoreBg,
  getRemoteLabel,
}: {
  match: MatchRow;
  isExpanded: boolean;
  onToggle: () => void;
  getScoreColor: (s: number) => string;
  getScoreBg: (s: number) => string;
  getRemoteLabel: (p: string | null) => string | null;
}) {
  const mustReqItems = useMemo(
    () => parseMustReq(m.cases?.must_req || null),
    [m.cases?.must_req]
  );
  const userSkills = m.profiles?.skills || [];
  const mustReqChecks = useMemo(
    () => mustReqItems.map((req) => ({ text: req, fulfilled: checkRequirement(req, userSkills) })),
    [mustReqItems, userSkills]
  );
  const fulfilledCount = mustReqChecks.filter((r) => r.fulfilled).length;
  const totalReqCount = mustReqChecks.length;

  return (
    <div className="bg-white border border-border">
      {/* Main card content - always visible */}
      <div className="p-4 sm:p-5">
        {/* Top row: Score + Case title + User */}
        <div className="flex items-start gap-4">
          {/* Score circle */}
          <div
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shrink-0 border ${getScoreBg(m.score)}`}
          >
            <span className={`text-[16px] font-black leading-none ${getScoreColor(m.score)}`}>
              {m.score}
            </span>
            <span className="text-[8px] text-[#aaa] font-bold">点</span>
          </div>

          {/* Case info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-[14px] font-bold text-navy leading-tight">
                {m.cases?.title || "不明な案件"}
              </p>
              {m.semantic_score != null && (
                <span className="text-[9px] font-bold text-[#7c3aed] bg-[#f5f3ff] px-1.5 py-0.5 shrink-0">
                  AI分析済
                </span>
              )}
              {m.cases?.category && (
                <span className="text-[9px] font-bold text-[#666] bg-[#f0f0f0] px-1.5 py-0.5">
                  {m.cases.category}
                </span>
              )}
            </div>

            {/* Case meta */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#888]">
              {m.cases?.fee && (
                <span className="flex items-center gap-0.5">
                  <Icon name="payments" className="text-[13px]" />
                  {m.cases.fee}
                </span>
              )}
              {m.cases?.work_style && (
                <span className="flex items-center gap-0.5">
                  <Icon name="home_work" className="text-[13px]" />
                  {m.cases.work_style}
                </span>
              )}
              {m.cases?.location && (
                <span className="flex items-center gap-0.5">
                  <Icon name="location_on" className="text-[13px]" />
                  {m.cases.location}
                </span>
              )}
              {m.cases?.start_date && (
                <span className="flex items-center gap-0.5">
                  <Icon name="calendar_today" className="text-[13px]" />
                  {m.cases.start_date}
                </span>
              )}
              {m.cases?.occupancy && (
                <span className="flex items-center gap-0.5">
                  <Icon name="schedule" className="text-[13px]" />
                  {m.cases.occupancy}
                </span>
              )}
            </div>
          </div>

          {/* User summary (right side) */}
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-[13px] font-bold text-navy">
              {m.profiles?.full_name || "不明"}
            </p>
            <p className="text-[10px] text-[#aaa]">{m.profiles?.email}</p>
            <div className="flex items-center gap-2 justify-end mt-0.5 text-[10px] text-[#888]">
              {m.profiles?.years_experience && (
                <span>経験{m.profiles.years_experience}年</span>
              )}
              {m.profiles?.prefecture && <span>{m.profiles.prefecture}</span>}
              {getRemoteLabel(m.profiles?.remote_preference || null) && (
                <span>{getRemoteLabel(m.profiles?.remote_preference || null)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: User info */}
        <div className="sm:hidden mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-[12px]">
            <Icon name="person" className="text-[14px] text-[#888]" />
            <span className="font-bold text-navy">{m.profiles?.full_name || "不明"}</span>
            <span className="text-[#aaa]">{m.profiles?.email}</span>
          </div>
        </div>

        {/* ===== Must-Req Fulfillment Section (ALWAYS VISIBLE) ===== */}
        {totalReqCount > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="checklist" className="text-[15px] text-[#E15454]" />
              <p className="text-[11px] font-bold text-navy">
                必須要件の充足状況
              </p>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 ${
                  fulfilledCount === totalReqCount
                    ? "bg-[#ecfdf5] text-[#10b981]"
                    : fulfilledCount > 0
                    ? "bg-[#fffbeb] text-[#f59e0b]"
                    : "bg-[#fef2f2] text-[#ef4444]"
                }`}
              >
                {fulfilledCount}/{totalReqCount} 充足
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mustReqChecks.map((req, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 border ${
                    req.fulfilled
                      ? "bg-[#ecfdf5] border-[#10b981]/30 text-[#059669]"
                      : "bg-[#fef2f2] border-[#ef4444]/20 text-[#dc2626]"
                  }`}
                >
                  <Icon
                    name={req.fulfilled ? "check_circle" : "cancel"}
                    className={`text-[13px] ${req.fulfilled ? "text-[#10b981]" : "text-[#ef4444]"}`}
                  />
                  <span className="leading-tight">{req.text}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* User skills (always visible) */}
        {userSkills.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 mb-1.5">
              <Icon name="engineering" className="text-[15px] text-[#888]" />
              <p className="text-[11px] font-bold text-[#888]">人材スキル</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {userSkills.map((skill) => {
                // Highlight skills that match must_req
                const isInMustReq = mustReqItems.some((req) => {
                  const r = req.toLowerCase();
                  const s = skill.toLowerCase();
                  return r.includes(s) || s.includes(r);
                });
                return (
                  <span
                    key={skill}
                    className={`text-[10px] px-2 py-0.5 font-bold ${
                      isInMustReq
                        ? "bg-blue/15 text-blue border border-blue/20"
                        : "bg-[#f5f5f5] text-[#666]"
                    }`}
                  >
                    {skill}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={onToggle}
          className="mt-3 flex items-center gap-1 text-[11px] text-[#999] hover:text-navy transition-colors"
        >
          <Icon
            name={isExpanded ? "expand_less" : "expand_more"}
            className="text-[18px]"
          />
          {isExpanded ? "詳細を閉じる" : "スコア内訳・AI分析・詳細を表示"}
        </button>
      </div>

      {/* Expanded detail section */}
      {isExpanded && (
        <div className="border-t border-border p-4 sm:p-5 bg-[#fafbfc]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Column 1: Score factors */}
            <div>
              <p className="text-[11px] font-bold text-navy mb-2 flex items-center gap-1">
                <Icon name="analytics" className="text-[14px]" />
                スコア内訳
              </p>
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
                <div className="mt-3">
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

              {/* AI Analysis */}
              {m.semantic_score != null && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[11px] font-bold text-[#888] mb-1">
                    セマンティックスコア: {Math.round(m.semantic_score)}%
                  </p>
                </div>
              )}
              {m.llm_reasoning && (
                <div className="mt-2">
                  <p className="text-[11px] font-bold text-[#888] mb-1">AI分析</p>
                  <p className="text-[12px] text-[#555] leading-[1.7] bg-white p-3 border border-border/50">
                    {m.llm_reasoning}
                  </p>
                </div>
              )}
            </div>

            {/* Column 2: Full Case Details */}
            <div>
              <p className="text-[11px] font-bold text-navy mb-2 flex items-center gap-1">
                <Icon name="work" className="text-[14px]" />
                案件詳細
              </p>
              <div className="space-y-2 text-[12px]">
                {m.cases?.must_req && (
                  <div>
                    <p className="text-[10px] font-bold text-[#E15454] mb-0.5">必須要件</p>
                    <p className="text-[12px] text-[#555] leading-[1.7] whitespace-pre-wrap bg-white p-2 border border-border/50">
                      {m.cases.must_req}
                    </p>
                  </div>
                )}
                {m.cases?.nice_to_have && (
                  <div>
                    <p className="text-[10px] font-bold text-[#888] mb-0.5">歓迎要件</p>
                    <p className="text-[12px] text-[#555] leading-[1.7] whitespace-pre-wrap bg-white p-2 border border-border/50">
                      {m.cases.nice_to_have}
                    </p>
                  </div>
                )}
                {m.cases?.description && (
                  <div>
                    <p className="text-[10px] font-bold text-[#888] mb-0.5">業務内容</p>
                    <p className="text-[12px] text-[#555] leading-[1.7] whitespace-pre-wrap bg-white p-2 border border-border/50 line-clamp-5">
                      {m.cases.description}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {m.cases?.industry && (
                    <div>
                      <span className="text-[#aaa]">業界: </span>
                      <span className="text-[#555]">{m.cases.industry}</span>
                    </div>
                  )}
                  {m.cases?.fee && (
                    <div>
                      <span className="text-[#aaa]">報酬: </span>
                      <span className="text-[#555]">{m.cases.fee}</span>
                    </div>
                  )}
                  {m.cases?.work_style && (
                    <div>
                      <span className="text-[#aaa]">勤務形態: </span>
                      <span className="text-[#555]">{m.cases.work_style}</span>
                    </div>
                  )}
                  {m.cases?.location && (
                    <div>
                      <span className="text-[#aaa]">勤務地: </span>
                      <span className="text-[#555]">{m.cases.location}</span>
                    </div>
                  )}
                  {m.cases?.occupancy && (
                    <div>
                      <span className="text-[#aaa]">稼働率: </span>
                      <span className="text-[#555]">{m.cases.occupancy}</span>
                    </div>
                  )}
                  {m.cases?.start_date && (
                    <div>
                      <span className="text-[#aaa]">開始: </span>
                      <span className="text-[#555]">{m.cases.start_date}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Full User Details */}
            <div>
              <p className="text-[11px] font-bold text-navy mb-2 flex items-center gap-1">
                <Icon name="person" className="text-[14px]" />
                人材詳細
              </p>
              <div className="space-y-2 text-[12px]">
                <div className="bg-white border border-border/50 p-3">
                  <p className="text-[14px] font-bold text-navy">
                    {m.profiles?.full_name || "不明"}
                  </p>
                  <p className="text-[11px] text-[#aaa]">{m.profiles?.email}</p>
                  <div className="grid grid-cols-2 gap-1 mt-2 text-[11px]">
                    {m.profiles?.years_experience && (
                      <div>
                        <span className="text-[#aaa]">経験: </span>
                        <span className="text-[#555]">{m.profiles.years_experience}年</span>
                      </div>
                    )}
                    {m.profiles?.prefecture && (
                      <div>
                        <span className="text-[#aaa]">所在地: </span>
                        <span className="text-[#555]">{m.profiles.prefecture}</span>
                      </div>
                    )}
                    {m.profiles?.remote_preference && (
                      <div>
                        <span className="text-[#aaa]">希望: </span>
                        <span className="text-[#555]">
                          {getRemoteLabel(m.profiles.remote_preference)}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-[#aaa]">ステータス: </span>
                      <span className={m.profiles?.is_looking ? "text-[#10b981]" : "text-[#aaa]"}>
                        {m.profiles?.is_looking ? "案件探し中" : "非アクティブ"}
                      </span>
                    </div>
                  </div>
                </div>

                {m.profiles?.bio && (
                  <div>
                    <p className="text-[10px] font-bold text-[#888] mb-0.5">自己紹介</p>
                    <p className="text-[12px] text-[#555] leading-[1.7] bg-white p-2 border border-border/50 line-clamp-4">
                      {m.profiles.bio}
                    </p>
                  </div>
                )}

                {userSkills.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-[#888] mb-0.5">全スキル</p>
                    <div className="flex flex-wrap gap-1">
                      {userSkills.map((s) => (
                        <span key={s} className="text-[10px] bg-[#f0f0f0] text-[#555] px-2 py-0.5">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="flex gap-3 mt-3 pt-3 border-t border-border/50">
                <Link
                  href={`/dashboard/cases/${m.case_id}`}
                  className="text-[11px] text-blue font-bold hover:underline flex items-center gap-1"
                >
                  <Icon name="open_in_new" className="text-[13px]" />
                  案件ページ
                </Link>
                <Link
                  href="/dashboard/admin/users"
                  className="text-[11px] text-blue font-bold hover:underline flex items-center gap-1"
                >
                  <Icon name="open_in_new" className="text-[13px]" />
                  ユーザー管理
                </Link>
              </div>
            </div>
          </div>

          {/* Match date */}
          <div className="mt-3 pt-3 border-t border-border/50 text-[10px] text-[#aaa]">
            マッチ日時:{" "}
            {m.matched_at
              ? new Date(m.matched_at).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "不明"}
          </div>
        </div>
      )}
    </div>
  );
}
