"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SeoKeyword, SeoSnapshot } from "@/lib/types";

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

  /* ─── Fetch data ─── */
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo");
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setKeywords(data.keywords || []);
      setSnapshots(data.snapshots || []);
    } catch (err) {
      console.error("SEO data fetch error:", err);
    }
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
          キーワード一覧
        </h2>
        <p className="text-[11px] text-[#666] mb-4">
          登録済みキーワードと最新データ
        </p>

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
                  <th className="text-left py-2 pr-3 font-bold text-[#888]">
                    対象URL
                  </th>
                  <th className="text-center py-2 font-bold text-[#888] w-10">
                    削除
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedKeywords.map((kw) => {
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
                          <span className="font-bold text-[#091747]">
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
    </div>
  );
}
