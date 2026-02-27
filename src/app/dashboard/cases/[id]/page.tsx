"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Case, MatchingResult, Resume, Entry } from "@/lib/types";

export default function AppCaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [matchResult, setMatchResult] = useState<MatchingResult | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [existingEntry, setExistingEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);

  // Entry form
  const [showEntry, setShowEntry] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedResume, setSelectedResume] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const [caseRes, matchRes, resumeRes, entryRes] = await Promise.all([
      supabase.from("cases").select("*").eq("id", caseId).single(),
      supabase
        .from("matching_results")
        .select("*")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("entries")
        .select("*")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
        .single(),
    ]);

    setCaseData(caseRes.data);
    setMatchResult(matchRes.data);
    setResumes(resumeRes.data ?? []);
    setExistingEntry(entryRes.data);

    // Default to primary resume
    const primary = (resumeRes.data ?? []).find((r: Resume) => r.is_primary);
    if (primary) setSelectedResume(primary.id);

    setLoading(false);
  }, [router, caseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleEntry() {
    setError("");
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error: insertError } = await supabase.from("entries").insert({
        case_id: caseId,
        user_id: user.id,
        message: message || null,
        resume_id: selectedResume || null,
      });

      if (insertError) throw insertError;
      setSubmitted(true);
    } catch {
      setError("エントリーに失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#E15454]">案件が見つかりません</div>
      </div>
    );
  }

  const score = matchResult?.score;

  return (
    <div className="py-6">
      <Link
        href="/dashboard/cases"
        className="text-[12px] text-blue hover:underline mb-4 inline-block"
      >
        ← 案件一覧に戻る
      </Link>

      {/* Match score banner */}
      {score !== undefined && (
        <div
          className={`p-3 mb-4 flex items-center gap-3 ${
            score >= 70
              ? "bg-[#ecfdf5] border border-[#10b981]/20"
              : score >= 40
              ? "bg-[#fffbeb] border border-[#f59e0b]/20"
              : "bg-[#f5f5f5] border border-border"
          }`}
        >
          <span
            className={`text-lg font-black ${
              score >= 70
                ? "text-[#10b981]"
                : score >= 40
                ? "text-[#f59e0b]"
                : "text-[#888]"
            }`}
          >
            {score}%
          </span>
          <span className="text-[12px] text-[#666]">
            あなたとのマッチ度
          </span>
        </div>
      )}

      {/* Case detail */}
      <div className="bg-white border border-border p-6 mb-5">
        <div className="flex items-center gap-2 mb-3">
          {caseData.category && (
            <span className="text-[10px] text-[#888] border border-border px-2 py-0.5">
              {caseData.category}
            </span>
          )}
          {caseData.case_no && (
            <span className="text-[10px] text-[#aaa]">
              {caseData.case_no}
            </span>
          )}
        </div>
        <h1 className="text-[18px] font-black text-navy mb-4">
          {caseData.title}
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[13px] mb-6">
          {[
            { label: "報酬", value: caseData.fee },
            { label: "稼働率", value: caseData.occupancy },
            { label: "勤務地", value: caseData.location },
            { label: "出社日数", value: caseData.office_days },
            { label: "業界", value: caseData.industry },
            { label: "開始日", value: caseData.start_date },
            { label: "延長", value: caseData.extendable },
          ]
            .filter((item) => item.value)
            .map((item) => (
              <div key={item.label}>
                <span className="text-[11px] font-bold text-[#888] block mb-0.5">
                  {item.label}
                </span>
                <span className="text-navy font-medium">{item.value}</span>
              </div>
            ))}
        </div>

        {caseData.background && (
          <div className="mb-4">
            <h2 className="text-[12px] font-bold text-[#888] mb-1">
              案件背景
            </h2>
            <p className="text-[13px] text-text whitespace-pre-line leading-[1.8]">
              {caseData.background}
            </p>
          </div>
        )}

        {caseData.description && (
          <div className="mb-4">
            <h2 className="text-[12px] font-bold text-[#888] mb-1">
              業務内容
            </h2>
            <p className="text-[13px] text-text whitespace-pre-line leading-[1.8]">
              {caseData.description}
            </p>
          </div>
        )}

        {caseData.must_req && (
          <div className="mb-4">
            <h2 className="text-[12px] font-bold text-[#888] mb-1">
              必須要件
            </h2>
            <p className="text-[13px] text-text whitespace-pre-line leading-[1.8]">
              {caseData.must_req}
            </p>
          </div>
        )}

        {caseData.nice_to_have && (
          <div className="mb-4">
            <h2 className="text-[12px] font-bold text-[#888] mb-1">
              歓迎要件
            </h2>
            <p className="text-[13px] text-text whitespace-pre-line leading-[1.8]">
              {caseData.nice_to_have}
            </p>
          </div>
        )}

        {caseData.flow && (
          <div>
            <h2 className="text-[12px] font-bold text-[#888] mb-1">
              選考フロー
            </h2>
            <p className="text-[13px] text-text whitespace-pre-line leading-[1.8]">
              {caseData.flow}
            </p>
          </div>
        )}
      </div>

      {/* Entry section */}
      {existingEntry || submitted ? (
        <div className="bg-white border border-border p-6 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue/10 flex items-center justify-center">
            <span className="text-blue text-2xl font-bold">✓</span>
          </div>
          <p className="text-[14px] font-bold text-navy mb-1">
            この案件にエントリー済みです
          </p>
          <p className="text-[12px] text-[#888]">
            ステータス:{" "}
            <span className="font-bold text-blue">
              {existingEntry?.status === "pending"
                ? "審査中"
                : existingEntry?.status === "reviewing"
                ? "書類選考中"
                : existingEntry?.status === "accepted"
                ? "承認済"
                : "送信完了"}
            </span>
          </p>
        </div>
      ) : showEntry ? (
        <div className="bg-white border border-border p-6">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            この案件にエントリーする
          </h2>
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              メッセージ（任意）
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="自己PRや質問等がございましたらご記入ください"
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
            />
          </div>
          {resumes.length > 0 && (
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                レジュメを添付
              </label>
              <select
                value={selectedResume}
                onChange={(e) => setSelectedResume(e.target.value)}
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              >
                <option value="">添付しない</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.filename}
                    {r.is_primary ? " (メイン)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && (
            <p className="text-[12px] text-[#E15454] mb-3">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleEntry}
              disabled={submitting}
              className="px-8 py-3 bg-blue text-white text-[14px] font-bold hover:bg-blue-dark transition-colors disabled:opacity-50"
            >
              {submitting ? "送信中..." : "エントリーする"}
            </button>
            <button
              onClick={() => setShowEntry(false)}
              className="px-6 py-3 border border-border text-[13px] text-[#888] hover:bg-[#f5f5f5] transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowEntry(true)}
          className="w-full py-4 bg-blue text-white text-[15px] font-bold hover:bg-blue-dark transition-colors"
        >
          この案件にエントリーする
        </button>
      )}
    </div>
  );
}
