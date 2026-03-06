"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const INDUSTRIES = [
  "製造業",
  "金融・保険",
  "流通・小売",
  "ヘルスケア・製薬",
  "IT・通信",
  "エネルギー・インフラ",
  "その他",
];

const CATEGORIES = [
  "戦略",
  "DX",
  "PMO",
  "SAP/ERP",
  "BPR",
  "新規事業",
  "M&A",
  "ITシステム",
  "SCM",
  "人事・組織",
  "経理・財務",
  "マーケティング",
];

interface FormData {
  title: string;
  industry: string;
  category: string;
  duration: string;
  role: string;
  team_size: string;
  summary: string;
  background: string;
  challenge: string;
  approach: string;
  results: string;
  learnings: string;
}

const INITIAL_FORM: FormData = {
  title: "",
  industry: "",
  category: "",
  duration: "",
  role: "",
  team_size: "",
  summary: "",
  background: "",
  challenge: "",
  approach: "",
  results: "",
  learnings: "",
};

export default function CaseStudyNewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#888]">読み込み中...</div>}>
      <CaseStudyNewContent />
    </Suspense>
  );
}

function CaseStudyNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submissionId, setSubmissionId] = useState<string | null>(editId);
  const [currentStatus, setCurrentStatus] = useState<string>("draft");
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const loadSubmission = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/case-studies/submit");
        if (!res.ok) {
          router.push("/auth/login");
          return;
        }
        const data = await res.json();
        const submission = data.submissions?.find(
          (s: { id: string }) => s.id === id
        );
        if (submission) {
          setForm({
            title: submission.title || "",
            industry: submission.industry || "",
            category: submission.category || "",
            duration: submission.duration || "",
            role: submission.role || "",
            team_size: submission.team_size || "",
            summary: submission.summary || "",
            background: submission.background || "",
            challenge: submission.challenge || "",
            approach: submission.approach || "",
            results: submission.results || "",
            learnings: submission.learnings || "",
          });
          setSubmissionId(submission.id);
          setCurrentStatus(submission.status);
        }
      } catch {
        setError("事例の読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    // Check auth
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      if (editId) {
        loadSubmission(editId);
      } else {
        setLoading(false);
      }
    });
  }, [editId, router, loadSubmission]);

  function update(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(asStatus: "draft" | "submitted") {
    setError("");

    if (!form.title.trim()) {
      setError("タイトルは必須です");
      return;
    }

    if (asStatus === "submitted" && !form.summary.trim()) {
      setError("提出するには概要の入力が必要です");
      return;
    }

    const setLoadingFn = asStatus === "submitted" ? setSubmitting : setSaving;
    setLoadingFn(true);

    try {
      const res = await fetch("/api/case-studies/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(submissionId ? { id: submissionId } : {}),
          ...form,
          status: asStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "保存に失敗しました");
        return;
      }

      if (data.submission) {
        setSubmissionId(data.submission.id);
        setCurrentStatus(data.submission.status);
      }

      if (asStatus === "submitted") {
        router.push("/dashboard/case-studies");
      } else {
        setSaved(true);
        // Update URL with id if this was a new submission
        if (!editId && data.submission?.id) {
          window.history.replaceState(
            null,
            "",
            `/dashboard/case-studies/new?id=${data.submission.id}`
          );
        }
      }
    } catch {
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setLoadingFn(false);
    }
  }

  const isReadOnly = ["approved", "published"].includes(currentStatus);

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
          href="/dashboard/case-studies"
          className="text-[12px] text-blue hover:underline mb-2 inline-block"
        >
          &larr; 事例一覧に戻る
        </Link>
        <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1">
          CASE STUDY
        </p>
        <h1 className="text-xl font-black text-navy">
          {editId ? "事例を編集" : "新しい事例を投稿"}
        </h1>
        <p className="text-[12px] text-[#888] mt-1">
          プロジェクト経験を事例として投稿できます。審査後、ブログ・事例コンテンツとして公開されます。
        </p>
        {isReadOnly && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ecfdf5] text-[#10b981] text-[12px] font-bold rounded">
            <span className="material-symbols-rounded text-[16px]">lock</span>
            この事例は{currentStatus === "approved" ? "承認済み" : "公開済み"}のため編集できません
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {/* Section 1: 基本情報 */}
        <div className="bg-white border border-border rounded-2xl p-6 md:p-8">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            基本情報
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-bold text-navy mb-1.5">
                タイトル <span className="text-[#E15454]">*必須</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="例: 大手製造業における全社DX推進プロジェクト"
                disabled={isReadOnly}
                className="w-full border border-border rounded-lg px-4 py-3 text-[14px] text-text outline-none bg-white focus:border-blue disabled:bg-[#f5f5f5] disabled:text-[#999]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-bold text-navy mb-1.5">
                  業界
                </label>
                <select
                  value={form.industry}
                  onChange={(e) => update("industry", e.target.value)}
                  disabled={isReadOnly}
                  className="w-full border border-border rounded-lg px-4 py-3 text-[14px] text-text outline-none bg-white focus:border-blue disabled:bg-[#f5f5f5] disabled:text-[#999]"
                >
                  <option value="">選択してください</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-navy mb-1.5">
                  カテゴリ
                </label>
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  disabled={isReadOnly}
                  className="w-full border border-border rounded-lg px-4 py-3 text-[14px] text-text outline-none bg-white focus:border-blue disabled:bg-[#f5f5f5] disabled:text-[#999]"
                >
                  <option value="">選択してください</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[13px] font-bold text-navy mb-1.5">
                  期間
                </label>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(e) => update("duration", e.target.value)}
                  placeholder="例: 6ヶ月"
                  disabled={isReadOnly}
                  className="w-full border border-border rounded-lg px-4 py-3 text-[14px] text-text outline-none bg-white focus:border-blue disabled:bg-[#f5f5f5] disabled:text-[#999]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-navy mb-1.5">
                  役割
                </label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                  placeholder="例: プロジェクトマネージャー"
                  disabled={isReadOnly}
                  className="w-full border border-border rounded-lg px-4 py-3 text-[14px] text-text outline-none bg-white focus:border-blue disabled:bg-[#f5f5f5] disabled:text-[#999]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-navy mb-1.5">
                  チーム規模
                </label>
                <input
                  type="text"
                  value={form.team_size}
                  onChange={(e) => update("team_size", e.target.value)}
                  placeholder="例: 8名"
                  disabled={isReadOnly}
                  className="w-full border border-border rounded-lg px-4 py-3 text-[14px] text-text outline-none bg-white focus:border-blue disabled:bg-[#f5f5f5] disabled:text-[#999]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: プロジェクト概要 */}
        <div className="bg-white border border-border rounded-2xl p-6 md:p-8">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            プロジェクト概要
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-bold text-navy mb-1.5">
                概要 <span className="text-[#E15454]">*必須</span>
              </label>
              <textarea
                value={form.summary}
                onChange={(e) => update("summary", e.target.value)}
                rows={4}
                placeholder="プロジェクトの概要を簡潔に記載してください"
                disabled={isReadOnly}
                className="w-full border border-border rounded-lg px-4 py-3 text-[14px] text-text outline-none bg-white focus:border-blue resize-none disabled:bg-[#f5f5f5] disabled:text-[#999]"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-navy mb-1.5">
                背景
              </label>
              <textarea
                value={form.background}
                onChange={(e) => update("background", e.target.value)}
                rows={4}
                placeholder="クライアントの業界動向やプロジェクト開始の背景を記載してください"
                disabled={isReadOnly}
                className="w-full border border-border rounded-lg px-4 py-3 text-[14px] text-text outline-none bg-white focus:border-blue resize-none disabled:bg-[#f5f5f5] disabled:text-[#999]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-navy mb-1.5">
                課題
              </label>
              <textarea
                value={form.challenge}
                onChange={(e) => update("challenge", e.target.value)}
                rows={4}
                placeholder="クライアントが抱えていた課題を記載してください"
                disabled={isReadOnly}
                className="w-full border border-border rounded-lg px-4 py-3 text-[14px] text-text outline-none bg-white focus:border-blue resize-none disabled:bg-[#f5f5f5] disabled:text-[#999]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: 取り組み・成果 */}
        <div className="bg-white border border-border rounded-2xl p-6 md:p-8">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            取り組み・成果
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-bold text-navy mb-1.5">
                アプローチ
                <span className="text-[11px] font-normal text-[#999] ml-2">
                  Markdown記法が使えます
                </span>
              </label>
              <textarea
                value={form.approach}
                onChange={(e) => update("approach", e.target.value)}
                rows={6}
                placeholder="課題に対してどのようなアプローチで取り組んだかを記載してください（Markdown記法対応）"
                disabled={isReadOnly}
                className="w-full border border-border rounded-lg px-4 py-3 text-[14px] text-text outline-none bg-white focus:border-blue resize-none font-mono disabled:bg-[#f5f5f5] disabled:text-[#999]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-navy mb-1.5">
                成果
                <span className="text-[11px] font-normal text-[#999] ml-2">
                  Markdown記法が使えます
                </span>
              </label>
              <textarea
                value={form.results}
                onChange={(e) => update("results", e.target.value)}
                rows={6}
                placeholder="プロジェクトの成果・アウトプットを記載してください（Markdown記法対応）"
                disabled={isReadOnly}
                className="w-full border border-border rounded-lg px-4 py-3 text-[14px] text-text outline-none bg-white focus:border-blue resize-none font-mono disabled:bg-[#f5f5f5] disabled:text-[#999]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-navy mb-1.5">
                学び
              </label>
              <textarea
                value={form.learnings}
                onChange={(e) => update("learnings", e.target.value)}
                rows={4}
                placeholder="このプロジェクトから得た学びや気づきを記載してください"
                disabled={isReadOnly}
                className="w-full border border-border rounded-lg px-4 py-3 text-[14px] text-text outline-none bg-white focus:border-blue resize-none disabled:bg-[#f5f5f5] disabled:text-[#999]"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[12px] text-[#E15454] font-bold">{error}</p>
        )}

        {/* Actions */}
        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={saving || submitting}
              className="px-6 py-3 bg-[#f0f2f5] text-[#555] text-[14px] font-bold rounded-lg transition-colors hover:bg-[#e5e7eb] disabled:opacity-50"
            >
              {saving ? "保存中..." : "下書き保存"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("submitted")}
              disabled={saving || submitting}
              className="px-8 py-3 bg-blue text-white text-[14px] font-bold rounded-lg transition-colors hover:bg-blue-dark disabled:opacity-50"
            >
              {submitting ? "提出中..." : "提出する"}
            </button>
            {saved && (
              <span className="text-[13px] text-[#10b981] font-bold flex items-center gap-1">
                <span className="material-symbols-rounded text-[18px]">
                  check_circle
                </span>
                下書きを保存しました
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
