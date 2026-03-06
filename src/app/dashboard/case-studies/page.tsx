"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Submission {
  id: string;
  title: string;
  industry: string | null;
  category: string | null;
  status: string;
  summary: string | null;
  created_at: string | null;
  updated_at: string | null;
  submitted_at: string | null;
  admin_notes: string | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  draft: { label: "下書き", bg: "bg-[#f0f2f5]", text: "text-[#666]" },
  submitted: { label: "提出済み", bg: "bg-[#EBF7FD]", text: "text-blue" },
  reviewing: { label: "審査中", bg: "bg-[#FEF9C3]", text: "text-[#A16207]" },
  approved: { label: "承認済み", bg: "bg-[#DCFCE7]", text: "text-[#16A34A]" },
  published: {
    label: "公開済み",
    bg: "bg-[#D1FAE5]",
    text: "text-[#059669]",
  },
  rejected: { label: "差し戻し", bg: "bg-[#FEE2E2]", text: "text-[#DC2626]" },
};

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

export default function CaseStudiesListPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

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

      try {
        const res = await fetch("/api/case-studies/submit");
        if (!res.ok) {
          router.push("/auth/login");
          return;
        }
        const data = await res.json();
        setSubmissions(data.submissions ?? []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1">
            CASE STUDIES
          </p>
          <h1 className="text-xl font-black text-navy">事例投稿</h1>
          <p className="text-[12px] text-[#888] mt-1">
            あなたのプロジェクト経験を事例として投稿できます
          </p>
        </div>
        <Link
          href="/dashboard/case-studies/new"
          className="shrink-0 flex items-center gap-1.5 px-5 py-2.5 bg-blue text-white text-[13px] font-bold rounded-lg hover:bg-blue-dark transition-colors"
        >
          <span className="material-symbols-rounded text-[18px]">add</span>
          新しい事例を書く
        </Link>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <span className="material-symbols-rounded text-[48px] text-[#ccc] mb-3 block">
            edit_note
          </span>
          <p className="text-[14px] font-bold text-navy mb-2">
            まだ事例がありません
          </p>
          <p className="text-[12px] text-[#888] mb-4">
            プロジェクト経験を事例として投稿してみましょう。
            <br />
            審査後、ブログ・事例コンテンツとして公開されます。
          </p>
          <Link
            href="/dashboard/case-studies/new"
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-blue text-white text-[13px] font-bold rounded-lg hover:bg-blue-dark transition-colors"
          >
            <span className="material-symbols-rounded text-[18px]">add</span>
            最初の事例を書く
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {submissions.map((sub) => (
            <Link
              key={sub.id}
              href={`/dashboard/case-studies/new?id=${sub.id}`}
              className="bg-white border border-border rounded-2xl p-5 hover:border-blue/40 hover:shadow-[0_2px_8px_rgba(31,171,233,0.08)] transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-[15px] font-bold text-navy group-hover:text-blue transition-colors line-clamp-1">
                  {sub.title || "無題"}
                </h3>
                <StatusBadge status={sub.status} />
              </div>

              {sub.summary && (
                <p className="text-[13px] text-[#666] line-clamp-2 mb-3">
                  {sub.summary}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
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
                <span className="text-[11px] text-[#aaa] ml-auto">
                  {sub.updated_at
                    ? `更新: ${new Date(sub.updated_at).toLocaleDateString("ja-JP")}`
                    : sub.created_at
                      ? `作成: ${new Date(sub.created_at).toLocaleDateString("ja-JP")}`
                      : ""}
                </span>
              </div>

              {/* Show admin notes for rejected submissions */}
              {sub.status === "rejected" && sub.admin_notes && (
                <div className="mt-3 p-3 bg-[#FEF2F2] rounded-lg border border-[#FECACA]">
                  <p className="text-[11px] font-bold text-[#DC2626] mb-1">
                    管理者からのコメント:
                  </p>
                  <p className="text-[12px] text-[#7F1D1D] whitespace-pre-wrap">
                    {sub.admin_notes}
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
