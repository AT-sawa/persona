"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Case } from "@/lib/types";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[12px]">
      <span className="text-[#999] shrink-0 w-[100px]">{label}</span>
      <span className={highlight ? "text-navy font-bold" : "text-[#333]"}>
        {value}
      </span>
    </div>
  );
}

function Tag({
  children,
  color = "gray",
}: {
  children: React.ReactNode;
  color?: "gray" | "blue" | "green" | "navy" | "red";
}) {
  const cls = {
    gray: "bg-[#f0f2f5] text-[#555]",
    blue: "bg-[#EBF7FD] text-blue",
    green: "bg-[#ecfdf5] text-[#10b981]",
    navy: "bg-navy/8 text-navy",
    red: "bg-[#fef2f2] text-[#E15454]",
  }[color];
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${cls}`}>
      {children}
    </span>
  );
}

export default function AdminCasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchData() {
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

      // Admin can see all cases (active + inactive)
      const { data } = await supabase
        .from("cases")
        .select("id, case_no, title, category, background, description, industry, start_date, extendable, occupancy, fee, work_style, office_days, location, must_req, nice_to_have, flow, status, published_at, created_at, is_active, client_company, commercial_flow, source, source_url, synced_at, title_normalized, source_hash, email_intake_id")
        .order("created_at", { ascending: false });
      setCases(data ?? []);

      // Fetch entry counts per case
      const { data: entryData } = await supabase
        .from("entries")
        .select("case_id");

      if (entryData) {
        const counts: Record<string, number> = {};
        for (const e of entryData) {
          counts[e.case_id] = (counts[e.case_id] || 0) + 1;
        }
        setEntryCounts(counts);
      }

      setLoading(false);
    }
    fetchData();
  }, [router]);

  async function toggleActive(id: string, currentActive: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from("cases")
      .update({ is_active: !currentActive })
      .eq("id", id);
    if (!error) {
      setCases((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, is_active: !currentActive } : c
        )
      );
    }
  }

  const filtered =
    filter === "all"
      ? cases
      : filter === "active"
      ? cases.filter((c) => c.is_active)
      : cases.filter((c) => !c.is_active);

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/dashboard/admin"
            className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
          >
            &larr; 管理者TOP
          </Link>
          <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
            ADMIN / CASES
          </p>
          <h1 className="text-xl font-black text-navy">案件管理</h1>
          <p className="text-[12px] text-[#888] mt-1">
            {cases.length}件（公開: {cases.filter((c) => c.is_active).length} /
            非公開: {cases.filter((c) => !c.is_active).length}）
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/admin/cases/sync"
            className="px-4 py-2 border border-[#E15454] text-[#E15454] text-[13px] font-bold hover:bg-[#fef2f2] transition-colors"
          >
            外部同期
          </Link>
          <Link
            href="/dashboard/admin/cases/emails"
            className="px-4 py-2 border border-[#E15454] text-[#E15454] text-[13px] font-bold hover:bg-[#fef2f2] transition-colors"
          >
            受信ログ
          </Link>
          <Link
            href="/dashboard/admin/cases/email"
            className="px-4 py-2 border border-[#E15454] text-[#E15454] text-[13px] font-bold hover:bg-[#fef2f2] transition-colors"
          >
            テキスト登録
          </Link>
          <Link
            href="/dashboard/admin/cases/import"
            className="px-4 py-2 border border-[#E15454] text-[#E15454] text-[13px] font-bold hover:bg-[#fef2f2] transition-colors"
          >
            CSV一括
          </Link>
          <Link
            href="/dashboard/admin/cases/new"
            className="px-4 py-2 bg-[#E15454] text-white text-[13px] font-bold hover:bg-[#d04343] transition-colors"
          >
            + 案件追加
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[
          { value: "active", label: "公開中" },
          { value: "inactive", label: "非公開" },
          { value: "all", label: "すべて" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 text-[12px] font-bold border transition-colors ${
              filter === opt.value
                ? "bg-[#E15454] text-white border-[#E15454]"
                : "bg-white text-[#666] border-border hover:border-[#E15454]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Cases list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-border p-8 text-center">
          <p className="text-[13px] text-[#888]">案件がありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((c) => {
            const isExpanded = expandedId === c.id;
            const entryCount = entryCounts[c.id] || 0;

            return (
              <div
                key={c.id}
                className="bg-white border border-border rounded-lg overflow-hidden"
              >
                {/* ── Summary Row ── */}
                <div
                  className="p-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : c.id)
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Row 1: badges */}
                      <div className="flex items-center gap-2 mb-1">
                        <Icon
                          name={isExpanded ? "expand_less" : "expand_more"}
                          className="text-[18px] text-[#999] shrink-0"
                        />
                        {c.case_no && (
                          <span className="text-[10px] text-[#aaa]">
                            {c.case_no}
                          </span>
                        )}
                        {c.category && (
                          <Tag color="navy">{c.category}</Tag>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            c.is_active
                              ? "text-[#10b981] bg-[#ecfdf5]"
                              : "text-[#888] bg-[#f5f5f5]"
                          }`}
                        >
                          {c.is_active ? "公開中" : "非公開"}
                        </span>
                        {entryCount > 0 && (
                          <Tag color="blue">
                            エントリー {entryCount}件
                          </Tag>
                        )}
                      </div>

                      {/* Row 2: title */}
                      <p className="text-[14px] font-bold text-navy mb-1.5 ml-7">
                        {c.title}
                      </p>

                      {/* Row 3: key conditions */}
                      <div className="ml-7 flex flex-wrap gap-1.5 mb-1">
                        {c.fee && <Tag color="navy">{c.fee}</Tag>}
                        {c.occupancy && <Tag color="blue">{c.occupancy}</Tag>}
                        {c.start_date && (
                          <Tag color="green">開始: {c.start_date}</Tag>
                        )}
                        {c.location && <Tag>{c.location}</Tag>}
                        {c.work_style && <Tag color="green">{c.work_style}</Tag>}
                        {c.office_days && <Tag>{c.office_days}</Tag>}
                        {c.industry && <Tag>{c.industry}</Tag>}
                      </div>

                      {/* Row 4: meta */}
                      <div className="ml-7 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#aaa]">
                        {c.client_company && (
                          <span className="text-navy font-bold">
                            元請: {c.client_company}
                          </span>
                        )}
                        {c.commercial_flow && (
                          <span className="text-navy font-bold">
                            商流: {c.commercial_flow}
                          </span>
                        )}
                        {c.created_at && (
                          <span>
                            作成:{" "}
                            {new Date(c.created_at).toLocaleDateString(
                              "ja-JP"
                            )}
                          </span>
                        )}
                        {c.source && (
                          <span>ソース: {c.source}</span>
                        )}
                      </div>
                    </div>

                    {/* Toggle button */}
                    <div
                      className="flex gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => toggleActive(c.id, c.is_active)}
                        className={`text-[11px] px-3 py-1 border font-bold rounded ${
                          c.is_active
                            ? "text-[#888] border-border hover:text-[#E15454]"
                            : "text-[#10b981] border-[#10b981] hover:bg-[#ecfdf5]"
                        }`}
                      >
                        {c.is_active ? "非公開にする" : "公開する"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Expanded Detail ── */}
                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
                      {/* Left: Basic Info */}
                      <div className="p-5">
                        <p className="text-[11px] font-bold text-[#E15454] tracking-[0.12em] uppercase mb-3">
                          基本情報
                        </p>
                        <div className="flex flex-col gap-2">
                          <InfoRow label="案件番号" value={c.case_no} />
                          <InfoRow
                            label="案件名"
                            value={c.title}
                            highlight
                          />
                          <InfoRow
                            label="元請け"
                            value={c.client_company}
                            highlight
                          />
                          <InfoRow
                            label="商流"
                            value={c.commercial_flow}
                            highlight
                          />
                          <InfoRow label="カテゴリ" value={c.category} />
                          <InfoRow label="業界" value={c.industry} />
                          <InfoRow
                            label="単価"
                            value={c.fee}
                            highlight
                          />
                          <InfoRow
                            label="稼働率"
                            value={c.occupancy}
                            highlight
                          />
                          <InfoRow
                            label="開始時期"
                            value={c.start_date}
                            highlight
                          />
                          <InfoRow label="勤務地" value={c.location} />
                          <InfoRow
                            label="勤務形態"
                            value={c.work_style}
                            highlight
                          />
                          <InfoRow
                            label="出社日数"
                            value={c.office_days}
                          />
                          <InfoRow
                            label="延長"
                            value={c.extendable}
                          />
                          <InfoRow
                            label="公開状態"
                            value={c.is_active ? "公開中" : "非公開"}
                          />
                          <InfoRow
                            label="ステータス"
                            value={c.status}
                          />
                          <InfoRow
                            label="公開日"
                            value={
                              c.published_at
                                ? new Date(
                                    c.published_at
                                  ).toLocaleString("ja-JP")
                                : null
                            }
                          />
                          <InfoRow
                            label="作成日"
                            value={
                              c.created_at
                                ? new Date(
                                    c.created_at
                                  ).toLocaleString("ja-JP")
                                : null
                            }
                          />
                          {entryCount > 0 && (
                            <div className="flex gap-2 text-[12px]">
                              <span className="text-[#999] shrink-0 w-[100px]">
                                エントリー
                              </span>
                              <Link
                                href="/dashboard/admin/entries"
                                className="text-blue font-bold hover:underline"
                              >
                                {entryCount}件
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Detail Text */}
                      <div className="p-5">
                        <p className="text-[11px] font-bold text-blue tracking-[0.12em] uppercase mb-3">
                          案件詳細
                        </p>
                        <div className="flex flex-col gap-2">
                          {c.background && (
                            <div>
                              <span className="text-[11px] text-[#999]">
                                背景
                              </span>
                              <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg">
                                {c.background}
                              </p>
                            </div>
                          )}
                          {c.description && (
                            <div>
                              <span className="text-[11px] text-[#999]">
                                案件詳細
                              </span>
                              <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg max-h-[300px] overflow-y-auto">
                                {c.description}
                              </p>
                            </div>
                          )}
                          {c.must_req && (
                            <div>
                              <span className="text-[11px] text-[#999]">
                                必須要件
                              </span>
                              <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#fef2f2] p-3 rounded-lg">
                                {c.must_req}
                              </p>
                            </div>
                          )}
                          {c.nice_to_have && (
                            <div>
                              <span className="text-[11px] text-[#999]">
                                歓迎要件
                              </span>
                              <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f0faf5] p-3 rounded-lg">
                                {c.nice_to_have}
                              </p>
                            </div>
                          )}
                          {c.flow && (
                            <div>
                              <span className="text-[11px] text-[#999]">
                                選考フロー
                              </span>
                              <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#fef9ee] p-3 rounded-lg border border-[#fde68a]">
                                {c.flow}
                              </p>
                            </div>
                          )}
                          {!c.background &&
                            !c.description &&
                            !c.must_req &&
                            !c.nice_to_have &&
                            !c.flow && (
                              <p className="text-[12px] text-[#aaa] italic">
                                詳細情報はありません
                              </p>
                            )}
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
