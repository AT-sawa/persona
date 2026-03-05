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
  resume_id: string | null;
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
    extendable: string | null;
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
  resumes?: {
    id: string;
    filename: string;
    file_size: number | null;
  }[];
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
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact_email: "メール一致",
  exact_phone: "電話番号一致",
  fuzzy_name: "名前類似",
  name_and_partial: "名前＋部分一致",
};

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
  color?: "gray" | "blue" | "green" | "navy";
}) {
  const cls = {
    gray: "bg-[#f0f2f5] text-[#555]",
    blue: "bg-[#EBF7FD] text-blue",
    green: "bg-[#ecfdf5] text-[#10b981]",
    navy: "bg-navy/8 text-navy",
  }[color];
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${cls}`}>
      {children}
    </span>
  );
}

/* ─── Resume Slide Panel ─── */
function ResumePanel({
  resumeId,
  onClose,
}: {
  resumeId: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/resumes/${resumeId}`);
        if (!res.ok) {
          setError("レジュメの取得に失敗しました");
          return;
        }
        const data = await res.json();
        setUrl(data.url);
        setFilename(data.filename || "resume.pdf");
      } catch {
        setError("エラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [resumeId]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[300] transition-opacity"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[700px] bg-white z-[301] shadow-[-4px_0_24px_rgba(0,0,0,0.12)] flex flex-col animate-[slideIn_0.25s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="description" className="text-[20px] text-navy" />
            <span className="text-[14px] font-bold text-navy truncate">
              {filename || "レジュメ"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold text-blue border border-blue rounded hover:bg-blue/5 transition-colors"
              >
                <Icon name="open_in_new" className="text-[16px]" />
                新規タブで開く
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#f5f5f5] rounded-lg transition-colors"
            >
              <Icon name="close" className="text-[22px] text-[#666]" />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-[#888] text-sm flex items-center gap-2">
                <Icon
                  name="progress_activity"
                  className="text-[20px] animate-spin"
                />
                読み込み中...
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full">
              <p className="text-[#E15454] text-sm">{error}</p>
            </div>
          )}
          {url && (
            <iframe
              src={url}
              className="w-full h-full border-none"
              title="Resume PDF"
            />
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Main Page ─── */
export default function AdminEntriesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resumePanelId, setResumePanelId] = useState<string | null>(null);
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

      // Fetch entries with all related data
      const { data } = await supabase
        .from("entries")
        .select(
          "*, cases(title, fee, category, industry, occupancy, start_date, location, office_days, description, must_req, nice_to_have, background, extendable), profiles!entries_user_id_fkey(full_name, email, phone, background, bio, skills, prefecture, years_experience, available_from, is_looking, hourly_rate_min, hourly_rate_max, remote_preference)"
        )
        .order("created_at", { ascending: false });

      const entriesData = (data as AdminEntry[]) ?? [];

      // Fetch resumes for each user
      const userIds = [
        ...new Set(entriesData.map((e) => e.user_id).filter(Boolean)),
      ];
      if (userIds.length > 0) {
        const { data: allResumes } = await supabase
          .from("resumes")
          .select("id, user_id, filename, file_size")
          .in("user_id", userIds);

        if (allResumes) {
          for (const entry of entriesData) {
            entry.resumes = allResumes.filter(
              (r) => r.user_id === entry.user_id
            );
          }
        }
      }

      setEntries(entriesData);
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
    <>
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>

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
                            {MATCH_TYPE_LABELS[match.matchType] ||
                              match.matchType}
                          </span>
                          <Icon
                            name="compare_arrows"
                            className="text-[14px] text-[#CBD5E1]"
                          />
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
          {[{ value: "all", label: "すべて" }, ...STATUS_OPTIONS].map(
            (opt) => (
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
            )
          )}
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
              const hasResume =
                entry.resumes && entry.resumes.length > 0;

              return (
                <div
                  key={entry.id}
                  className="bg-white border border-border rounded-lg overflow-hidden"
                >
                  {/* ── Summary Row ── */}
                  <div
                    className="p-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.id)
                    }
                  >
                    {/* Row 1: Case title + status */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon
                          name={isExpanded ? "expand_less" : "expand_more"}
                          className="text-[18px] text-[#999] shrink-0"
                        />
                        <p className="text-[14px] font-bold text-navy truncate">
                          {c?.title || "案件情報なし"}
                        </p>
                      </div>
                      <div
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={entry.status}
                          onChange={(e) =>
                            updateStatus(entry.id, e.target.value)
                          }
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

                    {/* Row 2: Case conditions */}
                    <div className="ml-7 flex flex-wrap gap-1.5 mb-2">
                      {c?.fee && <Tag color="navy">{c.fee}</Tag>}
                      {c?.occupancy && <Tag color="blue">{c.occupancy}</Tag>}
                      {c?.start_date && (
                        <Tag color="green">開始: {c.start_date}</Tag>
                      )}
                      {c?.location && <Tag>{c.location}</Tag>}
                      {c?.office_days && <Tag>{c.office_days}</Tag>}
                      {c?.extendable && <Tag>延長: {c.extendable}</Tag>}
                      {c?.category && <Tag>{c.category}</Tag>}
                      {c?.industry && <Tag>{c.industry}</Tag>}
                    </div>

                    {/* Row 3: Applicant info */}
                    <div className="ml-7 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-[13px] font-bold text-[#333]">
                        <Icon
                          name="person"
                          className="text-[16px] align-middle mr-0.5"
                        />
                        {p?.full_name || "名前未設定"}
                      </span>
                      {p?.background && (
                        <Tag color="navy">{p.background}</Tag>
                      )}
                      <span className="text-[12px] text-[#666]">
                        {p?.email}
                      </span>
                      {p?.phone && (
                        <span className="text-[12px] text-[#666]">
                          {p.phone}
                        </span>
                      )}
                      {p?.years_experience != null &&
                        p.years_experience > 0 && (
                          <span className="text-[11px] text-[#888]">
                            経験{p.years_experience}年
                          </span>
                        )}
                      {p?.available_from && (
                        <span className="text-[11px] text-[#888]">
                          稼働開始: {p.available_from}
                        </span>
                      )}
                      {hasResume && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setResumePanelId(entry.resumes![0].id);
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-blue hover:text-blue-dark transition-colors"
                        >
                          <Icon
                            name="description"
                            className="text-[14px]"
                          />
                          レジュメ
                        </button>
                      )}
                      <span className="text-[11px] text-[#aaa]">
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleString("ja-JP")
                          : ""}
                      </span>
                    </div>

                    {/* Row 4: Message (if any) */}
                    {entry.message && (
                      <p className="ml-7 text-[12px] text-[#888] mt-1.5 line-clamp-1">
                        <Icon
                          name="chat_bubble"
                          className="text-[13px] align-middle mr-1"
                        />
                        {entry.message}
                      </p>
                    )}
                  </div>

                  {/* ── Expanded Detail ── */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
                        {/* Left: Applicant Info */}
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[11px] font-bold text-blue tracking-[0.12em] uppercase">
                              応募者情報
                            </p>
                            {hasResume && (
                              <button
                                onClick={() =>
                                  setResumePanelId(entry.resumes![0].id)
                                }
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-blue rounded-lg hover:bg-blue-dark transition-colors"
                              >
                                <Icon
                                  name="description"
                                  className="text-[16px]"
                                />
                                レジュメを見る
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <InfoRow
                              label="氏名"
                              value={p?.full_name}
                              highlight
                            />
                            <InfoRow label="メール" value={p?.email} />
                            <InfoRow label="電話番号" value={p?.phone} />
                            <InfoRow
                              label="ファーム"
                              value={p?.background}
                              highlight
                            />
                            <InfoRow label="所在地" value={p?.prefecture} />
                            <InfoRow
                              label="経験年数"
                              value={
                                p?.years_experience != null
                                  ? `${p.years_experience}年`
                                  : null
                              }
                            />
                            <InfoRow
                              label="稼働開始"
                              value={p?.available_from}
                            />
                            <InfoRow
                              label="案件探し"
                              value={
                                p?.is_looking != null
                                  ? p.is_looking
                                    ? "探している"
                                    : "探していない"
                                  : null
                              }
                            />
                            <InfoRow
                              label="リモート"
                              value={
                                p?.remote_preference
                                  ? REMOTE_LABELS[p.remote_preference] ||
                                    p.remote_preference
                                  : null
                              }
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
                                <span className="text-[#999] shrink-0 w-[100px]">
                                  スキル
                                </span>
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
                            {/* All resumes for this user */}
                            {entry.resumes && entry.resumes.length > 0 && (
                              <div className="flex gap-2 text-[12px]">
                                <span className="text-[#999] shrink-0 w-[100px]">
                                  レジュメ
                                </span>
                                <div className="flex flex-col gap-1">
                                  {entry.resumes.map((r) => (
                                    <button
                                      key={r.id}
                                      onClick={() => setResumePanelId(r.id)}
                                      className="flex items-center gap-1.5 text-blue hover:text-blue-dark font-medium text-left"
                                    >
                                      <Icon
                                        name="description"
                                        className="text-[14px]"
                                      />
                                      {r.filename}
                                      {r.file_size && (
                                        <span className="text-[#aaa] text-[10px]">
                                          (
                                          {(r.file_size / 1024).toFixed(0)}
                                          KB)
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {p?.bio && (
                              <div className="mt-2">
                                <span className="text-[11px] text-[#999]">
                                  自己紹介
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg">
                                  {p.bio}
                                </p>
                              </div>
                            )}
                            {entry.message && (
                              <div className="mt-2">
                                <span className="text-[11px] text-[#999]">
                                  エントリーメッセージ
                                </span>
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
                            <InfoRow
                              label="案件名"
                              value={c?.title}
                              highlight
                            />
                            <InfoRow label="カテゴリ" value={c?.category} />
                            <InfoRow label="業界" value={c?.industry} />
                            <InfoRow
                              label="単価"
                              value={c?.fee}
                              highlight
                            />
                            <InfoRow
                              label="稼働率"
                              value={c?.occupancy}
                              highlight
                            />
                            <InfoRow
                              label="開始時期"
                              value={c?.start_date}
                              highlight
                            />
                            <InfoRow label="勤務地" value={c?.location} />
                            <InfoRow
                              label="出社日数"
                              value={c?.office_days}
                            />
                            <InfoRow
                              label="延長"
                              value={c?.extendable}
                            />
                            {c?.background && (
                              <div className="mt-2">
                                <span className="text-[11px] text-[#999]">
                                  背景
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg">
                                  {c.background}
                                </p>
                              </div>
                            )}
                            {c?.description && (
                              <div className="mt-2">
                                <span className="text-[11px] text-[#999]">
                                  案件詳細
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg max-h-[300px] overflow-y-auto">
                                  {c.description}
                                </p>
                              </div>
                            )}
                            {c?.must_req && (
                              <div className="mt-2">
                                <span className="text-[11px] text-[#999]">
                                  必須要件
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#fef2f2] p-3 rounded-lg">
                                  {c.must_req}
                                </p>
                              </div>
                            )}
                            {c?.nice_to_have && (
                              <div className="mt-2">
                                <span className="text-[11px] text-[#999]">
                                  歓迎要件
                                </span>
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

      {/* Resume Slide Panel */}
      {resumePanelId && (
        <ResumePanel
          resumeId={resumePanelId}
          onClose={() => setResumePanelId(null)}
        />
      )}
    </>
  );
}
