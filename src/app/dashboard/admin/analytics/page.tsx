"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ─── */

interface SummaryKPIs {
  totalCases: number;
  totalEntries: number;
  totalUsers: number;
  activeCases: number;
}

interface DailyEntry {
  date: string; // "2026-03-01"
  label: string; // "3/1"
  count: number;
}

interface CategoryCount {
  category: string;
  count: number;
  color: string;
}

interface TopCaseByEntry {
  case_id: string;
  title: string;
  entryCount: number;
}

interface StatusBreakdown {
  pending: number;
  reviewing: number;
  accepted: number;
  rejected: number;
}

interface RecentEntry {
  id: string;
  userName: string;
  caseTitle: string;
  status: string;
  createdAt: string;
}

interface TrafficSourceItem {
  source: string;
  count: number;
}

interface FeatureUsageItem {
  label: string;
  count: number;
  icon: string;
  color: string;
}

interface FunnelStep {
  label: string;
  count: number;
  color: string;
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

const CATEGORY_COLORS = [
  "#1fabe9",
  "#091747",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#ec4899",
];

/* ─── Component ─── */

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState<SummaryKPIs>({
    totalCases: 0,
    totalEntries: 0,
    totalUsers: 0,
    activeCases: 0,
  });
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryCount[]>([]);
  const [topCases, setTopCases] = useState<TopCaseByEntry[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>({
    pending: 0,
    reviewing: 0,
    accepted: 0,
    rejected: 0,
  });
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSourceItem[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsageItem[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);

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

      /* ── 1. Summary KPIs ── */
      const [totalCasesRes, activeCasesRes, totalEntriesRes, totalUsersRes] =
        await Promise.all([
          supabase
            .from("cases")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("cases")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true),
          supabase
            .from("entries")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true }),
        ]);

      setKpis({
        totalCases: totalCasesRes.count ?? 0,
        activeCases: activeCasesRes.count ?? 0,
        totalEntries: totalEntriesRes.count ?? 0,
        totalUsers: totalUsersRes.count ?? 0,
      });

      /* ── 2. Entries over last 30 days ── */
      const now = new Date();
      const thirtyDaysAgo = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 29
      );
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      const { data: recentEntriesRaw } = await supabase
        .from("entries")
        .select("created_at")
        .gte("created_at", thirtyDaysAgoISO)
        .order("created_at", { ascending: true });

      // Build 30-day buckets
      const dayBuckets: DailyEntry[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(
          thirtyDaysAgo.getFullYear(),
          thirtyDaysAgo.getMonth(),
          thirtyDaysAgo.getDate() + i
        );
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        dayBuckets.push({
          date: key,
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          count: 0,
        });
      }

      (recentEntriesRaw ?? []).forEach(
        (e: { created_at: string | null }) => {
          if (!e.created_at) return;
          const d = new Date(e.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const bucket = dayBuckets.find((b) => b.date === key);
          if (bucket) bucket.count++;
        }
      );
      setDailyEntries(dayBuckets);

      /* ── 3. Cases by category (horizontal bar chart) ── */
      const { data: allCases } = await supabase
        .from("cases")
        .select("category")
        .eq("is_active", true);

      const catMap: Record<string, number> = {};
      (allCases ?? []).forEach((c: { category: string | null }) => {
        const cat = c.category?.trim() || "未分類";
        catMap[cat] = (catMap[cat] || 0) + 1;
      });

      const sortedCategories = Object.entries(catMap)
        .map(([category, count], i) => ({
          category,
          count,
          color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        }))
        .sort((a, b) => b.count - a.count);

      setCategoryData(sortedCategories);

      /* ── 4. Top cases by entry count ── */
      const { data: entriesWithCases } = await supabase
        .from("entries")
        .select("case_id, cases(title)");

      const caseEntryMap: Record<string, { title: string; count: number }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (entriesWithCases ?? []).forEach((e: any) => {
        const caseId = e.case_id as string;
        const caseData = Array.isArray(e.cases) ? e.cases[0] : e.cases;
        const title = caseData?.title ?? "不明";
        if (!caseEntryMap[caseId]) {
          caseEntryMap[caseId] = { title, count: 0 };
        }
        caseEntryMap[caseId].count++;
      });

      const topCasesArr = Object.entries(caseEntryMap)
        .map(([caseId, v]) => ({
          case_id: caseId,
          title: v.title,
          entryCount: v.count,
        }))
        .sort((a, b) => b.entryCount - a.entryCount)
        .slice(0, 10);

      setTopCases(topCasesArr);

      /* ── 5. Entry status breakdown ── */
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

      /* ── 6. Recent entries feed ── */
      const { data: recentData } = await supabase
        .from("entries")
        .select("id, status, created_at, profiles(full_name), cases(title)")
        .order("created_at", { ascending: false })
        .limit(15);

      setRecentEntries(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (recentData ?? []).map((e: any) => {
          const profileData = Array.isArray(e.profiles)
            ? e.profiles[0]
            : e.profiles;
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

      /* ── 7. Traffic Sources (from audit_logs) ── */
      const { data: registrationLogs } = await supabase
        .from("audit_logs")
        .select("details, created_at")
        .eq("action", "account.register")
        .order("created_at", { ascending: false })
        .limit(500);

      const sourceMap: Record<string, number> = {};
      (registrationLogs ?? []).forEach(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (log: any) => {
          const ts = log.details?.traffic_source;
          if (!ts || (!ts.referrer && !ts.utm_source)) {
            sourceMap["直接"] = (sourceMap["直接"] || 0) + 1;
            return;
          }
          let source = "直接";
          if (ts.utm_source) {
            source = ts.utm_source;
          } else if (ts.referrer) {
            try {
              source = new URL(ts.referrer).hostname
                .replace("www.", "")
                .replace(".com", "")
                .replace(".co.jp", "");
            } catch {
              source = "外部サイト";
            }
          }
          sourceMap[source] = (sourceMap[source] || 0) + 1;
        }
      );

      const sortedSources = Object.entries(sourceMap)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTrafficSources(sortedSources);

      /* ── 8. Feature Usage (last 30 days) ── */
      const [favCount, entryCount30d, prefsCount, resumeCount] =
        await Promise.all([
          supabase
            .from("favorites")
            .select("id", { count: "exact", head: true })
            .gte("created_at", thirtyDaysAgoISO),
          supabase
            .from("entries")
            .select("id", { count: "exact", head: true })
            .gte("created_at", thirtyDaysAgoISO),
          supabase
            .from("user_preferences")
            .select("id", { count: "exact", head: true })
            .gte("updated_at", thirtyDaysAgoISO),
          supabase
            .from("resumes")
            .select("id", { count: "exact", head: true })
            .gte("uploaded_at", thirtyDaysAgoISO),
        ]);

      setFeatureUsage([
        {
          label: "お気に入り追加",
          count: favCount.count ?? 0,
          icon: "bookmark",
          color: "#f59e0b",
        },
        {
          label: "エントリー",
          count: entryCount30d.count ?? 0,
          icon: "send",
          color: "#1fabe9",
        },
        {
          label: "希望条件更新",
          count: prefsCount.count ?? 0,
          icon: "tune",
          color: "#8b5cf6",
        },
        {
          label: "レジュメ登録",
          count: resumeCount.count ?? 0,
          icon: "description",
          color: "#10b981",
        },
      ]);

      /* ── 9. User Funnel ── */
      const [totalProfiles, onboardedRes, entryUsersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .not("skills", "is", null),
        supabase.from("entries").select("user_id"),
      ]);

      const uniqueEntryUsers = new Set(
        (entryUsersRes.data ?? []).map(
          (e: { user_id: string }) => e.user_id
        )
      ).size;

      setFunnelData([
        {
          label: "登録",
          count: totalProfiles.count ?? 0,
          color: "#1fabe9",
        },
        {
          label: "オンボーディング完了",
          count: onboardedRes.count ?? 0,
          color: "#8b5cf6",
        },
        {
          label: "エントリー済",
          count: uniqueEntryUsers,
          color: "#10b981",
        },
      ]);

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

  /* ── Derived values ── */
  const maxDailyCount = Math.max(...dailyEntries.map((d) => d.count), 1);
  const maxCategoryCount = Math.max(
    ...categoryData.map((c) => c.count),
    1
  );
  const maxTopCaseCount = Math.max(
    ...topCases.map((c) => c.entryCount),
    1
  );
  const totalStatusEntries =
    statusBreakdown.pending +
    statusBreakdown.reviewing +
    statusBreakdown.accepted +
    statusBreakdown.rejected;
  const totalEntries30d = dailyEntries.reduce((sum, d) => sum + d.count, 0);
  const maxSourceCount = Math.max(
    ...trafficSources.map((s) => s.count),
    1
  );
  const funnelMax = Math.max(...funnelData.map((f) => f.count), 1);

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

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "総案件数",
            value: kpis.totalCases,
            icon: "work",
            color: "#091747",
          },
          {
            label: "総エントリー数",
            value: kpis.totalEntries,
            icon: "send",
            color: "#1fabe9",
          },
          {
            label: "登録ユーザー数",
            value: kpis.totalUsers,
            icon: "group",
            color: "#10b981",
          },
          {
            label: "公開中の案件",
            value: kpis.activeCases,
            icon: "folder_open",
            color: "#f59e0b",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-[#e3e6eb] p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: card.color + "12" }}
              >
                <span
                  className="material-symbols-rounded text-[18px]"
                  style={{ color: card.color }}
                >
                  {card.icon}
                </span>
              </div>
              <p className="text-[11px] font-bold text-[#666] tracking-wide">
                {card.label}
              </p>
            </div>
            <p className="text-3xl font-black text-[#091747]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Entries over time (last 30 days bar chart) ── */}
      <div className="bg-white rounded-xl border border-[#e3e6eb] p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-[#091747] flex items-center gap-2">
            <Icon name="bar_chart" className="text-[18px] text-[#1fabe9]" />
            エントリー推移（過去30日間）
          </h2>
          <span className="text-[12px] font-bold text-[#1fabe9]">
            合計 {totalEntries30d}件
          </span>
        </div>
        <p className="text-[11px] text-[#666] mb-5">
          日別のエントリー数を表示
        </p>

        {totalEntries30d === 0 ? (
          <p className="text-[13px] text-[#888] text-center py-8">
            過去30日間のエントリーデータがありません
          </p>
        ) : (
          <div className="flex items-end gap-[3px] h-[180px]">
            {dailyEntries.map((d, i) => {
              const pct =
                maxDailyCount > 0 ? (d.count / maxDailyCount) * 100 : 0;
              // Show labels every 5 days to avoid overlap
              const showLabel = i % 5 === 0 || i === dailyEntries.length - 1;
              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                >
                  {/* Hover tooltip */}
                  <div className="relative mb-1">
                    <span className="text-[9px] font-bold text-[#091747] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {d.count}件
                    </span>
                  </div>
                  <div
                    className="w-full rounded-t bg-[#1fabe9] hover:bg-[#0d8ec7] transition-colors min-h-[2px]"
                    style={{ height: `${Math.max(pct, 1.5)}%` }}
                  />
                  {showLabel ? (
                    <span className="text-[8px] text-[#888] mt-1.5 font-medium whitespace-nowrap">
                      {d.label}
                    </span>
                  ) : (
                    <span className="text-[8px] mt-1.5 invisible">.</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Two-column row: Category + Entry Status ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Cases by category (horizontal bar chart) */}
        <div className="bg-white rounded-xl border border-[#e3e6eb] p-6">
          <h2 className="text-sm font-bold text-[#091747] mb-1 flex items-center gap-2">
            <Icon name="category" className="text-[18px] text-[#091747]" />
            カテゴリ別案件数
          </h2>
          <p className="text-[11px] text-[#666] mb-5">
            公開中案件のカテゴリ内訳
          </p>

          {categoryData.length === 0 ? (
            <p className="text-[13px] text-[#888] text-center py-4">
              案件データがありません
            </p>
          ) : (
            <div className="space-y-3">
              {categoryData.map((cat) => {
                const pct =
                  maxCategoryCount > 0
                    ? (cat.count / maxCategoryCount) * 100
                    : 0;
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-bold text-[#091747] truncate max-w-[60%]">
                        {cat.category}
                      </span>
                      <span className="text-[12px] font-bold text-[#091747]">
                        {cat.count}
                        <span className="text-[10px] text-[#666] ml-0.5">件</span>
                      </span>
                    </div>
                    <div className="w-full h-6 bg-[#f5f6f8] rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all flex items-center pl-2"
                        style={{
                          width: `${Math.max(pct, 4)}%`,
                          backgroundColor: cat.color,
                        }}
                      >
                        {pct > 15 && (
                          <span className="text-[10px] font-bold text-white">
                            {Math.round(
                              (cat.count /
                                categoryData.reduce(
                                  (s, c) => s + c.count,
                                  0
                                )) *
                                100
                            )}
                            %
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Entry Status Breakdown */}
        <div className="bg-white rounded-xl border border-[#e3e6eb] p-6">
          <h2 className="text-sm font-bold text-[#091747] mb-1 flex items-center gap-2">
            <Icon name="donut_small" className="text-[18px] text-[#8b5cf6]" />
            エントリーステータス
          </h2>
          <p className="text-[11px] text-[#666] mb-5">
            ステータス別エントリー数
          </p>

          {totalStatusEntries === 0 ? (
            <p className="text-[13px] text-[#888] text-center py-4">
              エントリーデータがありません
            </p>
          ) : (
            <>
              {/* Stacked bar overview */}
              <div className="w-full h-3 bg-[#f5f6f8] rounded-full overflow-hidden flex mb-5">
                {(
                  Object.entries(statusBreakdown) as [
                    keyof StatusBreakdown,
                    number,
                  ][]
                ).map(([key, count]) => {
                  const pct =
                    totalStatusEntries > 0
                      ? (count / totalStatusEntries) * 100
                      : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={key}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: STATUS_MAP[key].color,
                      }}
                    />
                  );
                })}
              </div>

              <div className="space-y-3">
                {(
                  Object.entries(statusBreakdown) as [
                    keyof StatusBreakdown,
                    number,
                  ][]
                ).map(([key, count]) => {
                  const s = STATUS_MAP[key];
                  const pct =
                    totalStatusEntries > 0
                      ? Math.round((count / totalStatusEntries) * 100)
                      : 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span
                        className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: s.color, backgroundColor: s.bg }}
                      >
                        {s.label}
                      </span>
                      <div className="flex-1" />
                      <span className="text-[13px] font-black text-[#091747]">
                        {count}
                      </span>
                      <span className="text-[11px] text-[#888] w-10 text-right">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Top cases by entry count ── */}
      <div className="bg-white rounded-xl border border-[#e3e6eb] p-6 mb-6">
        <h2 className="text-sm font-bold text-[#091747] mb-1 flex items-center gap-2">
          <Icon name="leaderboard" className="text-[18px] text-[#f59e0b]" />
          エントリー数TOP案件
        </h2>
        <p className="text-[11px] text-[#666] mb-5">
          エントリー数が多い上位10案件
        </p>

        {topCases.length === 0 ? (
          <p className="text-[13px] text-[#888] text-center py-6">
            エントリーデータがありません
          </p>
        ) : (
          <div className="space-y-3">
            {topCases.map((tc, i) => {
              const pct =
                maxTopCaseCount > 0
                  ? (tc.entryCount / maxTopCaseCount) * 100
                  : 0;
              return (
                <div key={tc.case_id} className="flex items-center gap-3">
                  {/* Rank */}
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                      i === 0
                        ? "bg-[#f59e0b] text-white"
                        : i === 1
                          ? "bg-[#94a3b8] text-white"
                          : i === 2
                            ? "bg-[#cd7f32] text-white"
                            : "bg-[#f5f6f8] text-[#888]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {/* Title + bar */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#091747] truncate mb-1">
                      {tc.title}
                    </p>
                    <div className="w-full h-2 bg-[#f5f6f8] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(pct, 3)}%`,
                          backgroundColor:
                            i === 0
                              ? "#f59e0b"
                              : i === 1
                                ? "#94a3b8"
                                : i === 2
                                  ? "#cd7f32"
                                  : "#1fabe9",
                        }}
                      />
                    </div>
                  </div>
                  {/* Count */}
                  <span className="text-[14px] font-black text-[#091747] shrink-0 min-w-[40px] text-right">
                    {tc.entryCount}
                    <span className="text-[10px] text-[#666] font-bold ml-0.5">
                      件
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Traffic Sources ── */}
      <div className="bg-white rounded-xl border border-[#e3e6eb] p-6 mb-6">
        <h2 className="text-sm font-bold text-[#091747] mb-1 flex items-center gap-2">
          <Icon name="public" className="text-[18px] text-[#6366f1]" />
          流入元分析
        </h2>
        <p className="text-[11px] text-[#666] mb-5">
          新規登録ユーザーの流入元（登録時のリファラー・UTMパラメータ）
        </p>

        {trafficSources.length === 0 ? (
          <p className="text-[13px] text-[#888] text-center py-6">
            流入元データがありません
            <br />
            <span className="text-[11px] text-[#aaa]">
              今後の新規登録から自動で記録されます
            </span>
          </p>
        ) : (
          <div className="space-y-3">
            {trafficSources.map((s, i) => {
              const pct =
                maxSourceCount > 0 ? (s.count / maxSourceCount) * 100 : 0;
              const colors = [
                "#6366f1",
                "#1fabe9",
                "#10b981",
                "#f59e0b",
                "#ef4444",
                "#8b5cf6",
                "#ec4899",
                "#14b8a6",
                "#f97316",
                "#091747",
              ];
              const color = colors[i % colors.length];
              return (
                <div key={s.source}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-bold text-[#091747] truncate max-w-[60%]">
                      {s.source}
                    </span>
                    <span className="text-[12px] font-bold text-[#091747]">
                      {s.count}
                      <span className="text-[10px] text-[#666] ml-0.5">
                        人
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-5 bg-[#f5f6f8] rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${Math.max(pct, 4)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Feature Usage (Last 30 Days) ── */}
      <div className="bg-white rounded-xl border border-[#e3e6eb] p-6 mb-6">
        <h2 className="text-sm font-bold text-[#091747] mb-1 flex items-center gap-2">
          <Icon name="touch_app" className="text-[18px] text-[#f59e0b]" />
          機能利用状況（直近30日間）
        </h2>
        <p className="text-[11px] text-[#666] mb-5">
          ユーザーが利用した主要機能の集計
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {featureUsage.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-[#e3e6eb] p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: item.color + "14" }}
                >
                  <span
                    className="material-symbols-rounded text-[16px]"
                    style={{ color: item.color }}
                  >
                    {item.icon}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-[#666]">
                  {item.label}
                </p>
              </div>
              <p className="text-2xl font-black text-[#091747]">
                {item.count}
                <span className="text-[11px] text-[#888] font-bold ml-1">
                  件
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── User Funnel ── */}
      <div className="bg-white rounded-xl border border-[#e3e6eb] p-6 mb-6">
        <h2 className="text-sm font-bold text-[#091747] mb-1 flex items-center gap-2">
          <Icon name="filter_alt" className="text-[18px] text-[#10b981]" />
          ユーザーファネル
        </h2>
        <p className="text-[11px] text-[#666] mb-5">
          登録からエントリーまでの各段階のユーザー数と転換率
        </p>

        {funnelData.length === 0 ? (
          <p className="text-[13px] text-[#888] text-center py-6">
            データがありません
          </p>
        ) : (
          <div className="space-y-4">
            {funnelData.map((step, i) => {
              const pct =
                funnelMax > 0 ? (step.count / funnelMax) * 100 : 0;
              const prevCount = i > 0 ? funnelData[i - 1].count : null;
              const convRate =
                prevCount && prevCount > 0
                  ? Math.round((step.count / prevCount) * 100)
                  : null;
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                        style={{ backgroundColor: step.color }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[12px] font-bold text-[#091747]">
                        {step.label}
                      </span>
                      {convRate !== null && (
                        <span className="text-[10px] font-bold text-[#888] bg-[#f5f6f8] px-1.5 py-0.5 rounded">
                          前段階から {convRate}%
                        </span>
                      )}
                    </div>
                    <span className="text-[14px] font-black text-[#091747]">
                      {step.count}
                      <span className="text-[10px] text-[#666] font-bold ml-0.5">
                        人
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-8 bg-[#f5f6f8] rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all flex items-center pl-3"
                      style={{
                        width: `${Math.max(pct, 4)}%`,
                        backgroundColor: step.color,
                      }}
                    >
                      {pct > 15 && (
                        <span className="text-[10px] font-bold text-white">
                          {Math.round(pct)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Activity Feed ── */}
      <div className="bg-white rounded-xl border border-[#e3e6eb] p-6">
        <h2 className="text-sm font-bold text-[#091747] mb-1 flex items-center gap-2">
          <Icon name="history" className="text-[18px] text-[#E15454]" />
          最近のエントリー
        </h2>
        <p className="text-[11px] text-[#666] mb-4">直近15件のエントリー</p>

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
                      ? "border-b border-[#e3e6eb]/60"
                      : ""
                  }`}
                >
                  {/* Timeline dot */}
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#091747] font-medium truncate">
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
