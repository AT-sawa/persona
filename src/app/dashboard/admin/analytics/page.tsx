"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ─── */

interface KPIs {
  totalUsers: number;
  activeCases: number;
  totalEntries: number;
  entriesThisMonth: number;
  avgMatchScore: number;
}

interface MonthlyReg {
  month: string; // "2025-06" etc.
  label: string; // "6月" etc.
  count: number;
}

interface StatusBreakdown {
  pending: number;
  reviewing: number;
  accepted: number;
  rejected: number;
}

interface TopCase {
  case_id: string;
  title: string;
  matchCount: number;
  avgScore: number;
}

interface RecentEntry {
  id: string;
  userName: string;
  caseTitle: string;
  status: string;
  createdAt: string;
}

interface CategoryDist {
  consul: number;
  si: number;
  other: number;
}

/* ─── Helpers ─── */

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> =
  {
    pending: { label: "審査中", color: "#3b82f6", bg: "#EBF7FD" },
    reviewing: { label: "書類選考中", color: "#8b5cf6", bg: "#f5f3ff" },
    accepted: { label: "承認済", color: "#10b981", bg: "#ecfdf5" },
    rejected: { label: "不採用", color: "#ef4444", bg: "#fef2f2" },
  };

/* ─── Component ─── */

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState<KPIs>({
    totalUsers: 0,
    activeCases: 0,
    totalEntries: 0,
    entriesThisMonth: 0,
    avgMatchScore: 0,
  });
  const [monthlyRegs, setMonthlyRegs] = useState<MonthlyReg[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>({
    pending: 0,
    reviewing: 0,
    accepted: 0,
    rejected: 0,
  });
  const [topCases, setTopCases] = useState<TopCase[]>([]);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [categoryDist, setCategoryDist] = useState<CategoryDist>({
    consul: 0,
    si: 0,
    other: 0,
  });

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      /* ── Auth & admin check ── */
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

      /* ── KPI counts ── */
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [usersRes, casesRes, entriesRes, entriesMonthRes, matchScoreRes] =
        await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase
            .from("cases")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true),
          supabase.from("entries").select("id", { count: "exact", head: true }),
          supabase
            .from("entries")
            .select("id", { count: "exact", head: true })
            .gte("created_at", monthStart),
          supabase.from("matching_results").select("score"),
        ]);

      const scores = (matchScoreRes.data ?? []).map(
        (r: { score: number }) => r.score
      );
      const avgScore =
        scores.length > 0
          ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
          : 0;

      setKpis({
        totalUsers: usersRes.count ?? 0,
        activeCases: casesRes.count ?? 0,
        totalEntries: entriesRes.count ?? 0,
        entriesThisMonth: entriesMonthRes.count ?? 0,
        avgMatchScore: avgScore,
      });

      /* ── Monthly registrations (last 12 months) ── */
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("created_at")
        .order("created_at", { ascending: true });

      const months: MonthlyReg[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({
          month: key,
          label: `${d.getMonth() + 1}月`,
          count: 0,
        });
      }

      (allProfiles ?? []).forEach((p: { created_at: string | null }) => {
        if (!p.created_at) return;
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const item = months.find((m) => m.month === key);
        if (item) item.count++;
      });
      setMonthlyRegs(months);

      /* ── Entry status breakdown ── */
      const { data: allEntries } = await supabase
        .from("entries")
        .select("status");

      const breakdown: StatusBreakdown = {
        pending: 0,
        reviewing: 0,
        accepted: 0,
        rejected: 0,
      };
      (allEntries ?? []).forEach((e: { status: string }) => {
        if (e.status in breakdown) {
          breakdown[e.status as keyof StatusBreakdown]++;
        }
      });
      setStatusBreakdown(breakdown);

      /* ── Top 10 cases by match count ── */
      const { data: matchingData } = await supabase
        .from("matching_results")
        .select("case_id, score, cases(title)");

      const caseMap: Record<
        string,
        { title: string; scores: number[] }
      > = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (matchingData ?? []).forEach((m: any) => {
          const caseId = m.case_id as string;
          const score = m.score as number;
          const caseTitle = Array.isArray(m.cases)
            ? m.cases[0]?.title ?? "不明"
            : m.cases?.title ?? "不明";
          if (!caseMap[caseId]) {
            caseMap[caseId] = { title: caseTitle, scores: [] };
          }
          caseMap[caseId].scores.push(score);
        }
      );
      const topCasesArr: TopCase[] = Object.entries(caseMap)
        .map(([caseId, v]) => ({
          case_id: caseId,
          title: v.title,
          matchCount: v.scores.length,
          avgScore: Math.round(
            v.scores.reduce((a, b) => a + b, 0) / v.scores.length
          ),
        }))
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 10);
      setTopCases(topCasesArr);

      /* ── Recent 20 entries ── */
      const { data: recentData } = await supabase
        .from("entries")
        .select("id, status, created_at, profiles(full_name), cases(title)")
        .order("created_at", { ascending: false })
        .limit(20);

      setRecentEntries(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (recentData ?? []).map((e: any) => {
          const profileData = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
          const caseData = Array.isArray(e.cases) ? e.cases[0] : e.cases;
          return {
            id: e.id,
            userName: profileData?.full_name ?? "名前未設定",
            caseTitle: caseData?.title ?? "案件不明",
            status: e.status,
            createdAt: e.created_at ?? "",
          };
        })
      );

      /* ── Category distribution ── */
      const { data: activeCases } = await supabase
        .from("cases")
        .select("category")
        .eq("is_active", true);

      const dist: CategoryDist = { consul: 0, si: 0, other: 0 };
      (activeCases ?? []).forEach((c: { category: string | null }) => {
        const cat = (c.category ?? "").toLowerCase();
        if (cat.includes("consul") || cat === "コンサル") {
          dist.consul++;
        } else if (cat.includes("si") || cat === "SI") {
          dist.si++;
        } else {
          dist.other++;
        }
      });
      setCategoryDist(dist);

      setLoading(false);
    }
    fetchData();
  }, [router]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  const maxRegCount = Math.max(...monthlyRegs.map((m) => m.count), 1);
  const totalStatusEntries =
    statusBreakdown.pending +
    statusBreakdown.reviewing +
    statusBreakdown.accepted +
    statusBreakdown.rejected;
  const totalCategoryCases =
    categoryDist.consul + categoryDist.si + categoryDist.other;

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
          ADMIN / ANALYTICS
        </p>
        <h1 className="text-xl font-black text-navy">アナリティクス</h1>
        <p className="text-[12px] text-[#888] mt-1">
          プラットフォーム全体の統計データ
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          {
            label: "登録ユーザー",
            value: kpis.totalUsers,
            icon: "group",
            color: "#3b82f6",
          },
          {
            label: "公開案件",
            value: kpis.activeCases,
            icon: "folder_open",
            color: "#10b981",
          },
          {
            label: "総エントリー",
            value: kpis.totalEntries,
            icon: "send",
            color: "#8b5cf6",
          },
          {
            label: "今月のエントリー",
            value: kpis.entriesThisMonth,
            icon: "calendar_month",
            color: "#f59e0b",
          },
          {
            label: "平均マッチスコア",
            value: kpis.avgMatchScore > 0 ? `${kpis.avgMatchScore}%` : "---",
            icon: "auto_awesome",
            color: "#E15454",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-border/60 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="material-symbols-rounded text-[20px]"
                style={{ color: card.color }}
              >
                {card.icon}
              </span>
              <p className="text-[10px] font-bold text-[#888] tracking-wide">
                {card.label}
              </p>
            </div>
            <p className="text-2xl font-black text-navy">{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Registration Trends ── */}
      <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <h2 className="text-sm font-bold text-navy mb-1 flex items-center gap-2">
          <Icon name="trending_up" className="text-[18px] text-[#3b82f6]" />
          ユーザー登録推移（過去12ヶ月）
        </h2>
        <p className="text-[11px] text-[#888] mb-5">
          月別の新規ユーザー登録数
        </p>

        <div className="flex items-end gap-1.5 h-[160px]">
          {monthlyRegs.map((m) => {
            const pct = maxRegCount > 0 ? (m.count / maxRegCount) * 100 : 0;
            return (
              <div
                key={m.month}
                className="flex-1 flex flex-col items-center justify-end h-full group"
              >
                {/* Tooltip on hover */}
                <div className="relative mb-1">
                  <span className="text-[10px] font-bold text-navy opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.count}
                  </span>
                </div>
                <div
                  className="w-full rounded-t-md bg-[#3b82f6] hover:bg-[#2563eb] transition-colors min-h-[2px]"
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
                <span className="text-[9px] text-[#888] mt-1.5 font-medium">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Two-column row: Entry Status + Category Distribution ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Entry Status Breakdown */}
        <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-sm font-bold text-navy mb-1 flex items-center gap-2">
            <Icon name="donut_small" className="text-[18px] text-[#8b5cf6]" />
            エントリーステータス
          </h2>
          <p className="text-[11px] text-[#888] mb-5">
            ステータス別エントリー数
          </p>

          {totalStatusEntries === 0 ? (
            <p className="text-[13px] text-[#888] text-center py-4">
              エントリーデータがありません
            </p>
          ) : (
            <div className="space-y-3">
              {(
                Object.entries(statusBreakdown) as [
                  keyof StatusBreakdown,
                  number
                ][]
              ).map(([key, count]) => {
                const s = STATUS_MAP[key];
                const pct =
                  totalStatusEntries > 0
                    ? Math.round((count / totalStatusEntries) * 100)
                    : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[12px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{ color: s.color, backgroundColor: s.bg }}
                      >
                        {s.label}
                      </span>
                      <span className="text-[12px] font-bold text-navy">
                        {count}
                        <span className="text-[10px] text-[#888] ml-1">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#f5f5f5] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-sm font-bold text-navy mb-1 flex items-center gap-2">
            <Icon name="category" className="text-[18px] text-[#10b981]" />
            カテゴリ分布
          </h2>
          <p className="text-[11px] text-[#888] mb-5">
            公開案件のカテゴリ内訳
          </p>

          {totalCategoryCases === 0 ? (
            <p className="text-[13px] text-[#888] text-center py-4">
              案件データがありません
            </p>
          ) : (
            <div className="space-y-4">
              {[
                {
                  key: "consul",
                  label: "コンサル",
                  count: categoryDist.consul,
                  color: "#3b82f6",
                },
                {
                  key: "si",
                  label: "SI",
                  count: categoryDist.si,
                  color: "#10b981",
                },
                {
                  key: "other",
                  label: "その他",
                  count: categoryDist.other,
                  color: "#888",
                },
              ].map((cat) => {
                const pct =
                  totalCategoryCases > 0
                    ? Math.round((cat.count / totalCategoryCases) * 100)
                    : 0;
                return (
                  <div key={cat.key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-[13px] font-bold text-navy">
                          {cat.label}
                        </span>
                      </div>
                      <span className="text-[13px] font-bold text-navy">
                        {cat.count}件
                        <span className="text-[10px] text-[#888] ml-1">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-[#f5f5f5] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Top Matched Cases ── */}
      <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <h2 className="text-sm font-bold text-navy mb-1 flex items-center gap-2">
          <Icon name="leaderboard" className="text-[18px] text-[#f59e0b]" />
          マッチ数TOP案件
        </h2>
        <p className="text-[11px] text-[#888] mb-4">
          マッチング結果が多い上位10案件
        </p>

        {topCases.length === 0 ? (
          <p className="text-[13px] text-[#888] text-center py-4">
            マッチングデータがありません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left text-[10px] font-bold text-[#888] tracking-wider uppercase py-2 pr-4">
                    #
                  </th>
                  <th className="text-left text-[10px] font-bold text-[#888] tracking-wider uppercase py-2 pr-4">
                    案件名
                  </th>
                  <th className="text-right text-[10px] font-bold text-[#888] tracking-wider uppercase py-2 pr-4">
                    マッチ数
                  </th>
                  <th className="text-right text-[10px] font-bold text-[#888] tracking-wider uppercase py-2">
                    平均スコア
                  </th>
                </tr>
              </thead>
              <tbody>
                {topCases.map((tc, i) => (
                  <tr
                    key={tc.case_id}
                    className="border-b border-border/30 last:border-b-0"
                  >
                    <td className="py-2.5 pr-4 text-[12px] font-bold text-[#aaa]">
                      {i + 1}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-[13px] font-bold text-navy line-clamp-1">
                        {tc.title}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className="text-[13px] font-black text-navy">
                        {tc.matchCount}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          tc.avgScore >= 70
                            ? "text-[#10b981] bg-[#ecfdf5]"
                            : tc.avgScore >= 40
                            ? "text-[#f59e0b] bg-[#fffbeb]"
                            : "text-[#888] bg-[#f5f5f5]"
                        }`}
                      >
                        {tc.avgScore}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent Activity Feed ── */}
      <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="text-sm font-bold text-navy mb-1 flex items-center gap-2">
          <Icon name="history" className="text-[18px] text-[#E15454]" />
          最近のエントリー
        </h2>
        <p className="text-[11px] text-[#888] mb-4">直近20件のエントリー</p>

        {recentEntries.length === 0 ? (
          <p className="text-[13px] text-[#888] text-center py-4">
            エントリーがありません
          </p>
        ) : (
          <div className="space-y-0">
            {recentEntries.map((entry, i) => {
              const s = STATUS_MAP[entry.status] ?? {
                label: entry.status,
                color: "#888",
                bg: "#f5f5f5",
              };
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 py-3 ${
                    i < recentEntries.length - 1
                      ? "border-b border-border/30"
                      : ""
                  }`}
                >
                  {/* Timeline dot */}
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-navy font-medium truncate">
                      <span className="font-bold">{entry.userName}</span>
                      <span className="text-[#888] mx-1">→</span>
                      <span>{entry.caseTitle}</span>
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: s.color, backgroundColor: s.bg }}
                  >
                    {s.label}
                  </span>
                  <span className="text-[11px] text-[#aaa] shrink-0 min-w-[80px] text-right">
                    {entry.createdAt
                      ? new Date(entry.createdAt).toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
