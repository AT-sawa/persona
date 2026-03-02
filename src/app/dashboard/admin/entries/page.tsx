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
  cases?: { title: string; fee: string | null };
  profiles?: { full_name: string | null; email: string | null };
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

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact_email: "メール一致",
  exact_phone: "電話番号一致",
  fuzzy_name: "名前類似",
  name_and_partial: "名前＋部分一致",
};

export default function AdminEntriesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
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
        .select("*, cases(title, fee), profiles(full_name, email)")
        .order("created_at", { ascending: false });
      setEntries((data as AdminEntry[]) ?? []);
      setLoading(false);

      // Fetch duplicates in background
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
          ← 管理者TOP
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
        <div className="flex flex-col gap-2">
          {filtered.map((entry) => (
            <div key={entry.id} className="bg-white border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-navy mb-1 truncate">
                    {entry.cases?.title || "案件情報なし"}
                  </p>
                  <p className="text-[12px] text-[#666]">
                    応募者: {entry.profiles?.full_name || "名前未設定"} (
                    {maskEmail(entry.profiles?.email)})
                  </p>
                  {entry.message && (
                    <p className="text-[12px] text-[#888] mt-1 line-clamp-2">
                      <Icon name="chat_bubble" className="text-[14px] align-middle" /> {entry.message}
                    </p>
                  )}
                  <p className="text-[11px] text-[#aaa] mt-1">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleString("ja-JP")
                      : ""}
                  </p>
                </div>
                <div className="shrink-0">
                  <select
                    value={entry.status}
                    onChange={(e) => updateStatus(entry.id, e.target.value)}
                    className={`px-3 py-1.5 text-[12px] font-bold border outline-none ${
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
