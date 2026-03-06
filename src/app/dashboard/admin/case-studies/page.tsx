"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Submission {
  id: string;
  user_id: string;
  title: string;
  industry: string | null;
  category: string | null;
  duration: string | null;
  role: string | null;
  team_size: string | null;
  summary: string | null;
  background: string | null;
  challenge: string | null;
  approach: string | null;
  results: string | null;
  learnings: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  draft: {
    label: "下書き",
    bg: "bg-[#f0f2f5]",
    text: "text-[#666]",
    border: "border-[#d1d5db]",
  },
  submitted: {
    label: "提出済み",
    bg: "bg-[#EBF7FD]",
    text: "text-blue",
    border: "border-blue",
  },
  reviewing: {
    label: "審査中",
    bg: "bg-[#FEF9C3]",
    text: "text-[#A16207]",
    border: "border-[#F59E0B]",
  },
  approved: {
    label: "承認済み",
    bg: "bg-[#DCFCE7]",
    text: "text-[#16A34A]",
    border: "border-[#22C55E]",
  },
  published: {
    label: "公開済み",
    bg: "bg-[#D1FAE5]",
    text: "text-[#059669]",
    border: "border-[#10B981]",
  },
  rejected: {
    label: "差し戻し",
    bg: "bg-[#FEE2E2]",
    text: "text-[#DC2626]",
    border: "border-[#EF4444]",
  },
};

const FILTER_TABS = [
  { value: "all", label: "すべて" },
  { value: "submitted", label: "提出済み" },
  { value: "reviewing", label: "審査中" },
  { value: "approved", label: "承認済み" },
  { value: "published", label: "公開済み" },
  { value: "rejected", label: "差し戻し" },
  { value: "draft", label: "下書き" },
];

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-full ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

function DetailSection({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-bold text-[#999] mb-1">{label}</p>
      <div className="text-[13px] text-[#333] whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg">
        {value}
      </div>
    </div>
  );
}

function InfoTag({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[12px]">
      <span className="text-[#999] shrink-0">{label}:</span>
      <span className="text-[#333] font-medium">{value}</span>
    </div>
  );
}

export default function AdminCaseStudiesPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);

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

      try {
        const res = await fetch("/api/admin/case-studies");
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.submissions ?? []);

          // Initialize admin notes
          const notes: Record<string, string> = {};
          for (const sub of data.submissions ?? []) {
            notes[sub.id] = sub.admin_notes || "";
          }
          setAdminNotes(notes);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  async function updateSubmission(id: string, status: string) {
    setUpdating(id);
    try {
      const res = await fetch("/api/admin/case-studies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status,
          admin_notes: adminNotes[id] || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? data.submission : s))
        );
      }
    } catch {
      // silently fail
    } finally {
      setUpdating(null);
    }
  }

  const filtered =
    filter === "all"
      ? submissions
      : submissions.filter((s) => s.status === filter);

  const counts = submissions.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

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
          &larr; 管理者TOP
        </Link>
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          ADMIN / CASE STUDIES
        </p>
        <h1 className="text-xl font-black text-navy">事例管理</h1>
        <p className="text-[12px] text-[#888] mt-1">
          {submissions.length}件の事例投稿
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? submissions.length
              : counts[tab.value] || 0;
          return (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 text-[12px] font-bold border transition-colors rounded ${
                filter === tab.value
                  ? "bg-[#E15454] text-white border-[#E15454]"
                  : "bg-white text-[#666] border-border hover:border-[#E15454] hover:text-[#E15454]"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1 text-[10px] opacity-70">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Submissions list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-lg p-8 text-center">
          <p className="text-[13px] text-[#888]">事例がありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((sub) => {
            const isExpanded = expandedId === sub.id;
            const config = STATUS_CONFIG[sub.status] || STATUS_CONFIG.draft;

            return (
              <div
                key={sub.id}
                className="bg-white border border-border rounded-lg overflow-hidden"
              >
                {/* Summary Row */}
                <div
                  className="p-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : sub.id)
                  }
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-rounded text-[18px] text-[#999] shrink-0">
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                      <p className="text-[14px] font-bold text-navy truncate">
                        {sub.title || "無題"}
                      </p>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>

                  <div className="ml-7 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[13px] font-bold text-[#333]">
                      <span className="material-symbols-rounded text-[16px] align-middle mr-0.5">
                        person
                      </span>
                      {sub.profiles?.full_name || "名前未設定"}
                    </span>
                    <span className="text-[12px] text-[#666]">
                      {sub.profiles?.email || ""}
                    </span>
                    {sub.industry && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-navy/8 text-navy">
                        {sub.industry}
                      </span>
                    )}
                    {sub.category && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#EBF7FD] text-blue">
                        {sub.category}
                      </span>
                    )}
                    {sub.duration && (
                      <span className="text-[11px] text-[#888]">
                        期間: {sub.duration}
                      </span>
                    )}
                    <span className="text-[11px] text-[#aaa]">
                      {sub.submitted_at
                        ? `提出: ${new Date(sub.submitted_at).toLocaleDateString("ja-JP")}`
                        : sub.created_at
                          ? `作成: ${new Date(sub.created_at).toLocaleDateString("ja-JP")}`
                          : ""}
                    </span>
                  </div>

                  {sub.summary && (
                    <p className="ml-7 text-[12px] text-[#888] mt-1.5 line-clamp-2">
                      {sub.summary}
                    </p>
                  )}
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="p-5">
                      {/* Meta info */}
                      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 pb-4 border-b border-border">
                        <InfoTag label="投稿者" value={sub.profiles?.full_name} />
                        <InfoTag label="メール" value={sub.profiles?.email} />
                        <InfoTag label="業界" value={sub.industry} />
                        <InfoTag label="カテゴリ" value={sub.category} />
                        <InfoTag label="期間" value={sub.duration} />
                        <InfoTag label="役割" value={sub.role} />
                        <InfoTag label="チーム規模" value={sub.team_size} />
                      </div>

                      {/* Content sections */}
                      <div className="flex flex-col gap-4 mb-6">
                        <DetailSection label="概要" value={sub.summary} />
                        <DetailSection label="背景" value={sub.background} />
                        <DetailSection label="課題" value={sub.challenge} />
                        <DetailSection label="アプローチ" value={sub.approach} />
                        <DetailSection label="成果" value={sub.results} />
                        <DetailSection label="学び" value={sub.learnings} />
                      </div>

                      {/* Admin actions */}
                      <div className="border-t border-border pt-4">
                        <p className="text-[11px] font-bold text-[#E15454] tracking-[0.12em] uppercase mb-3">
                          管理者アクション
                        </p>

                        <div className="mb-4">
                          <label className="block text-[12px] font-bold text-[#666] mb-1.5">
                            管理者メモ
                          </label>
                          <textarea
                            value={adminNotes[sub.id] || ""}
                            onChange={(e) =>
                              setAdminNotes((prev) => ({
                                ...prev,
                                [sub.id]: e.target.value,
                              }))
                            }
                            rows={3}
                            placeholder="差し戻し理由や修正依頼など..."
                            className="w-full border border-border rounded-lg px-4 py-3 text-[13px] text-text outline-none bg-white focus:border-[#E15454] resize-none"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {sub.status !== "reviewing" && (
                            <button
                              onClick={() =>
                                updateSubmission(sub.id, "reviewing")
                              }
                              disabled={updating === sub.id}
                              className={`px-4 py-2 text-[12px] font-bold rounded-lg border transition-colors disabled:opacity-50 ${STATUS_CONFIG.reviewing.text} ${STATUS_CONFIG.reviewing.border} hover:${STATUS_CONFIG.reviewing.bg}`}
                            >
                              審査中にする
                            </button>
                          )}
                          {sub.status !== "approved" && (
                            <button
                              onClick={() =>
                                updateSubmission(sub.id, "approved")
                              }
                              disabled={updating === sub.id}
                              className="px-4 py-2 text-[12px] font-bold rounded-lg border border-[#22C55E] text-[#16A34A] hover:bg-[#DCFCE7] transition-colors disabled:opacity-50"
                            >
                              承認する
                            </button>
                          )}
                          {sub.status !== "published" && (
                            <button
                              onClick={() =>
                                updateSubmission(sub.id, "published")
                              }
                              disabled={updating === sub.id}
                              className="px-4 py-2 text-[12px] font-bold rounded-lg bg-[#059669] text-white hover:bg-[#047857] transition-colors disabled:opacity-50"
                            >
                              公開する
                            </button>
                          )}
                          {sub.status !== "rejected" && (
                            <button
                              onClick={() =>
                                updateSubmission(sub.id, "rejected")
                              }
                              disabled={updating === sub.id}
                              className="px-4 py-2 text-[12px] font-bold rounded-lg border border-[#EF4444] text-[#DC2626] hover:bg-[#FEE2E2] transition-colors disabled:opacity-50"
                            >
                              差し戻す
                            </button>
                          )}
                          {sub.status !== "draft" && (
                            <button
                              onClick={() =>
                                updateSubmission(sub.id, "draft")
                              }
                              disabled={updating === sub.id}
                              className="px-4 py-2 text-[12px] font-bold rounded-lg border border-border text-[#666] hover:bg-[#f0f2f5] transition-colors disabled:opacity-50"
                            >
                              下書きに戻す
                            </button>
                          )}
                        </div>

                        {/* Timestamps */}
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#aaa]">
                          {sub.created_at && (
                            <span>
                              作成:{" "}
                              {new Date(sub.created_at).toLocaleString("ja-JP")}
                            </span>
                          )}
                          {sub.submitted_at && (
                            <span>
                              提出:{" "}
                              {new Date(sub.submitted_at).toLocaleString(
                                "ja-JP"
                              )}
                            </span>
                          )}
                          {sub.reviewed_at && (
                            <span>
                              審査:{" "}
                              {new Date(sub.reviewed_at).toLocaleString(
                                "ja-JP"
                              )}
                            </span>
                          )}
                          {sub.published_at && (
                            <span>
                              公開:{" "}
                              {new Date(sub.published_at).toLocaleString(
                                "ja-JP"
                              )}
                            </span>
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
