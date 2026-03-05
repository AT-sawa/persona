"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { maskEmail } from "@/lib/mask";

interface AdminEntry {
  id: string;
  case_id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string | null;
  cases?: {
    title: string;
    fee: string | null;
    category: string | null;
    industry: string | null;
    occupancy: string | null;
    start_date: string | null;
    location: string | null;
    office_days: string | null;
    description: string | null;
    must_req: string | null;
    nice_to_have: string | null;
    background: string | null;
  };
  profiles?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    background: string | null;
    bio: string | null;
    skills: string[] | null;
    prefecture: string | null;
    years_experience: number | null;
    available_from: string | null;
    is_looking: boolean | null;
    hourly_rate_min: number | null;
    hourly_rate_max: number | null;
    remote_preference: string | null;
  };
}

interface DuplicateMatch {
  existingId: string;
  existingName: string | null;
  existingEmail: string | null;
  similarity: number;
  matchType: string;
  matchedFields: string[];
  created_at: string | null;
}

interface DuplicateGroup {
  person: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string | null;
  };
  matches: DuplicateMatch[];
}

const STATUS_OPTIONS = [
  { value: "pending", label: "審査中" },
  { value: "reviewing", label: "書類選考中" },
  { value: "accepted", label: "承認済" },
  { value: "rejected", label: "不採用" },
];

const REMOTE_LABELS: Record<string, string> = {
  remote_only: "フルリモート",
  hybrid: "ハイブリッド",
  onsite: "常駐",
  any: "こだわりなし",
};

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact_email: "メール一致",
  exact_phone: "電話番号一致",
  fuzzy_name: "名前類似",
  name_and_partial: "名前＋部分一致",
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[12px]">
      <span className="text-[#999] shrink-0 w-[100px]">{label}</span>
      <span className="text-[#333]">{value}</span>
    </div>
  );
}

export default function AdminEntriesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [dedupLoading, setDedupLoading] = useState(false);
  const [showDedup, setShowDedup] = useState(false);

  const fetchDuplicates = useCallback(async () => {
    setDedupLoading(true);
    try {
      const res = await fetch("/api/admin/dedup");
      if (res.ok) {
        const data = await res.json();
        setDuplicateGroups(data.groups ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setDedupLoading(false);
    }
  }, []);

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

      const { data } = await supabase
        .from("entries")
        .select(
          "*, cases(title, fee, category, industry, occupancy, start_date, location, office_days, description, must_req, nice_to_have, background), profiles(full_name, email, phone, background, bio, skills, prefecture, years_experience, available_from, is_looking, hourly_rate_min, hourly_rate_max, remote_preference)"
        )
        .order("created_at", { ascending: false });
      setEntries((data as AdminEntry[]) ?? []);
      setLoading(false);

      fetchDuplicates();
    }
    fetchData();
  }, [router, fetchDuplicates]);

  async function updateStatus(entryId: string, newStatus: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("entries")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", entryId);
    if (!error) {
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, status: newStatus } : e))
      );
    }
  }

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.status === filter);

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <Link
          href="/dashboard/admin"
          className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
        >
          &larr; 管理者TOP
        </Link>
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          ADMIN / ENTRIES
        </p>
        <h1 className="text-xl font-black text-navy">エントリー管理</h1>
        <p className="text-[12px] text-[#888] mt-1">{entries.length}件</p>
      </div>

      {/* Duplicate Alert Banner */}
      {duplicateGroups.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowDedup(!showDedup)}
            className="w-full flex items-center justify-between bg-[#FFF7ED] border border-[#FB923C] px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Icon name="warning" className="text-[20px] text-[#F97316]" />
              <span className="text-[13px] font-bold text-[#9A3412]">
                重複の可能性がある人材: {duplicateGroups.length}グループ
              </span>
            </div>
            <Icon
              name={showDedup ? "expand_less" : "expand_more"}
              className="text-[20px] text-[#F97316]"
            />
          </button>
          {showDedup && (
            <div className="border border-t-0 border-[#FB923C] bg-white divide-y divide-[#FED7AA]">
              {duplicateGroups.map((group, gi) => (
                <div key={gi} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="person" className="text-[16px] text-navy" />
                    <span className="text-[13px] font-bold text-navy">
                      {group.person.full_name || "名前未設定"}
                    </span>
                    <span className="text-[11px] text-[#888]">
                      ({maskEmail(group.person.email)})
                    </span>
                  </div>
                  <div className="ml-6 flex flex-col gap-1.5">
                    {group.matches.map((match, mi) => (
                      <div
                        key={mi}
                        className="flex items-center gap-2 text-[12px]"
                      >
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 font-bold ${
                            match.similarity >= 0.95
                              ? "bg-[#FEE2E2] text-[#DC2626]"
                              : match.similarity >= 0.85
                              ? "bg-[#FEF3C7] text-[#D97706]"
                              : "bg-[#F3F4F6] text-[#6B7280]"
                          }`}
                        >
                          {Math.round(match.similarity * 100)}%
                        </span>
                        <span className="text-[#888]">
                          {MATCH_TYPE_LABELS[match.matchType] || match.matchType}
                        </span>
                        <Icon name="compare_arrows" className="text-[14px] text-[#CBD5E1]" />
                        <span className="font-medium text-navy">
                          {match.existingName || "名前未設定"}
                        </span>
                        <span className="text-[#aaa]">
                          ({maskEmail(match.existingEmail)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="px-4 py-2 bg-[#FFF7ED] text-[11px] text-[#9A3412]">
                <button
                  onClick={fetchDuplicates}
                  disabled={dedupLoading}
                  className="text-[#F97316] hover:underline font-bold"
                >
                  {dedupLoading ? "チェック中..." : "再チェック"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[{ value: "all", label: "すべて" }, ...STATUS_OPTIONS].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 text-[12px] font-bold border transition-colors ${
              filter === opt.value
                ? "bg-[#E15454] text-white border-[#E15454]"
                : "bg-white text-[#666] border-border hover:border-[#E15454] hover:text-[#E15454]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-border p-8 text-center">
          <p className="text-[13px] text-[#888]">エントリーがありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const p = entry.profiles;
            const c = entry.cases;

            return (
              <div key={entry.id} className="bg-white border border-border rounded-lg overflow-hidden">
                {/* Summary Row */}
                <div
                  className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon
                        name={isExpanded ? "expand_less" : "expand_more"}
                        className="text-[18px] text-[#999]"
                      />
                      <p className="text-[14px] font-bold text-navy truncate">
                        {c?.title || "案件情報なし"}
                      </p>
                    </div>
                    <div className="ml-7 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <p className="text-[13px] font-semibold text-[#333]">
                        {p?.full_name || "名前未設定"}
                      </p>
                      {p?.background && (
                        <span className="text-[11px] bg-[#f0f2f5] text-[#555] px-2 py-0.5 rounded">
                          {p.background}
                        </span>
                      )}
                      <span className="text-[12px] text-[#888]">{p?.email}</span>
                      {p?.phone && (
                        <span className="text-[12px] text-[#888]">{p.phone}</span>
                      )}
                      <span className="text-[11px] text-[#aaa]">
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleString("ja-JP")
                          : ""}
                      </span>
                    </div>
                    {entry.message && (
                      <p className="ml-7 text-[12px] text-[#888] mt-1 line-clamp-1">
                        <Icon name="chat_bubble" className="text-[13px] align-middle mr-1" />
                        {entry.message}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={entry.status}
                      onChange={(e) => updateStatus(entry.id, e.target.value)}
                      className={`px-3 py-1.5 text-[12px] font-bold border outline-none rounded ${
                        entry.status === "accepted"
                          ? "text-[#10b981] border-[#10b981] bg-[#ecfdf5]"
                          : entry.status === "rejected"
                          ? "text-[#ef4444] border-[#ef4444] bg-[#fef2f2]"
                          : entry.status === "reviewing"
                          ? "text-[#8b5cf6] border-[#8b5cf6] bg-[#f5f3ff]"
                          : "text-blue border-blue bg-[#EBF7FD]"
                      }`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
                      {/* Left: Applicant Info */}
                      <div className="p-5">
                        <p className="text-[11px] font-bold text-blue tracking-[0.12em] uppercase mb-3">
                          応募者情報
                        </p>
                        <div className="flex flex-col gap-2">
                          <InfoRow label="氏名" value={p?.full_name} />
                          <InfoRow label="メール" value={p?.email} />
                          <InfoRow label="電話番号" value={p?.phone} />
                          <InfoRow label="ファーム" value={p?.background} />
                          <InfoRow label="所在地" value={p?.prefecture} />
                          <InfoRow
                            label="経験年数"
                            value={p?.years_experience != null ? `${p.years_experience}年` : null}
                          />
                          <InfoRow
                            label="稼働開始"
                            value={p?.available_from}
                          />
                          <InfoRow
                            label="案件探し"
                            value={p?.is_looking != null ? (p.is_looking ? "探している" : "探していない") : null}
                          />
                          <InfoRow
                            label="リモート"
                            value={p?.remote_preference ? REMOTE_LABELS[p.remote_preference] || p.remote_preference : null}
                          />
                          <InfoRow
                            label="希望単価"
                            value={
                              p?.hourly_rate_min || p?.hourly_rate_max
                                ? `${p.hourly_rate_min || "—"}〜${p.hourly_rate_max || "—"}万円/月`
                                : null
                            }
                          />
                          {p?.skills && p.skills.length > 0 && (
                            <div className="flex gap-2 text-[12px]">
                              <span className="text-[#999] shrink-0 w-[100px]">スキル</span>
                              <div className="flex flex-wrap gap-1">
                                {p.skills.map((s) => (
                                  <span
                                    key={s}
                                    className="bg-[#EBF7FD] text-blue px-2 py-0.5 text-[11px] font-medium rounded"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {p?.bio && (
                            <div className="mt-2">
                              <span className="text-[11px] text-[#999]">自己紹介</span>
                              <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg">
                                {p.bio}
                              </p>
                            </div>
                          )}
                          {entry.message && (
                            <div className="mt-2">
                              <span className="text-[11px] text-[#999]">エントリーメッセージ</span>
                              <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#fef9ee] p-3 rounded-lg border border-[#fde68a]">
                                {entry.message}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Case Info */}
                      <div className="p-5">
                        <p className="text-[11px] font-bold text-[#E15454] tracking-[0.12em] uppercase mb-3">
                          案件情報
                        </p>
                        <div className="flex flex-col gap-2">
                          <InfoRow label="案件名" value={c?.title} />
                          <InfoRow label="カテゴリ" value={c?.category} />
                          <InfoRow label="業界" value={c?.industry} />
                          <InfoRow label="単価" value={c?.fee} />
                          <InfoRow label="稼働率" value={c?.occupancy} />
                          <InfoRow label="開始時期" value={c?.start_date} />
                          <InfoRow label="勤務地" value={c?.location} />
                          <InfoRow label="出社日数" value={c?.office_days} />
                          {c?.background && (
                            <div className="mt-2">
                              <span className="text-[11px] text-[#999]">背景</span>
                              <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg">
                                {c.background}
                              </p>
                            </div>
                          )}
                          {c?.description && (
                            <div className="mt-2">
                              <span className="text-[11px] text-[#999]">案件詳細</span>
                              <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg max-h-[300px] overflow-y-auto">
                                {c.description}
                              </p>
                            </div>
                          )}
                          {c?.must_req && (
                            <div className="mt-2">
                              <span className="text-[11px] text-[#999]">必須要件</span>
                              <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#fef2f2] p-3 rounded-lg">
                                {c.must_req}
                              </p>
                            </div>
                          )}
                          {c?.nice_to_have && (
                            <div className="mt-2">
                              <span className="text-[11px] text-[#999]">歓迎要件</span>
                              <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f0faf5] p-3 rounded-lg">
                                {c.nice_to_have}
                              </p>
                            </div>
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
