"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { analytics } from "@/lib/analytics";
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
  const [isAdmin, setIsAdmin] = useState(false);

  // Similar cases (admin only)
  interface SimilarCase {
    id: string;
    title: string;
    fee: string | null;
    occupancy: string | null;
    location: string | null;
    must_req: string | null;
    industry: string | null;
    source: string | null;
    source_url: string | null;
    start_date: string | null;
    office_days: string | null;
    similarity: number;
  }
  const [similarCases, setSimilarCases] = useState<SimilarCase[]>([]);
  const [showSimilar, setShowSimilar] = useState(false);
  const [comparingId, setComparingId] = useState<string | null>(null);

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
      supabase.from("cases").select("id, case_no, title, category, background, description, industry, start_date, extendable, occupancy, fee, work_style, office_days, location, must_req, nice_to_have, flow, status, published_at, created_at, is_active, source, source_url, synced_at, title_normalized, source_hash").eq("id", caseId).single(),
      supabase
        .from("matching_results")
        .select("id, case_id, user_id, score, factors, is_notified, semantic_score, llm_reasoning, matched_at")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("resumes")
        .select("id, user_id, filename, file_path, file_size, mime_type, is_primary, uploaded_at")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("entries")
        .select("id, case_id, user_id, status, message, resume_id, created_at, updated_at")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
        .single(),
    ]);

    setCaseData(caseRes.data ? { ...caseRes.data, client_company: null, commercial_flow: null, email_intake_id: null } as Case : null);
    setMatchResult(matchRes.data);
    setResumes(resumeRes.data ?? []);
    setExistingEntry(entryRes.data);

    // Track case view
    if (caseRes.data) {
      analytics.caseView(caseId, caseRes.data.category || "");
    }

    // Default to primary resume
    const primary = (resumeRes.data ?? []).find((r: Resume) => r.is_primary);
    if (primary) setSelectedResume(primary.id);

    // Check admin
    const { data: profileData } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (profileData?.is_admin) {
      setIsAdmin(true);
      // Fetch admin-only fields (client_company, commercial_flow) + similar cases
      try {
        const [ccRes, simRes] = await Promise.all([
          supabase.from("cases").select("client_company, commercial_flow").eq("id", caseId).single(),
          fetch(`/api/admin/similar-cases?caseId=${caseId}`),
        ]);
        if (ccRes.data) {
          setCaseData((prev) => prev ? {
            ...prev,
            client_company: ccRes.data!.client_company || null,
            commercial_flow: ccRes.data!.commercial_flow || null,
          } : prev);
        }
        if (simRes.ok) {
          const simData = await simRes.json();
          setSimilarCases(simData.similar || []);
        }
      } catch {
        // Silent fail
      }
    }

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
      analytics.entrySubmit(caseId);
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

        {/* Admin-only: show client company & commercial flow */}
        {isAdmin && (caseData.client_company || caseData.commercial_flow) && (
          <div className="mb-4 p-3 bg-[#fef2f2] border border-[#E15454]/20 rounded-lg flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-bold text-[#E15454] tracking-wider uppercase">ADMIN</span>
            {caseData.client_company && (
              <span className="text-[13px] font-bold text-navy">元請け: {caseData.client_company}</span>
            )}
            {caseData.commercial_flow && (
              <span className="text-[13px] font-bold text-navy">商流: {caseData.commercial_flow}</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[13px] mb-6">
          {[
            { label: "報酬", value: caseData.fee },
            { label: "稼働率", value: caseData.occupancy },
            { label: "勤務地", value: caseData.location },
            { label: "勤務形態", value: caseData.work_style },
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

      {/* Similar cases (admin only) */}
      {isAdmin && similarCases.length > 0 && (
        <div className="bg-[#fffbeb] border border-[#f59e0b]/20 p-4 mb-5">
          <button
            onClick={() => setShowSimilar(!showSimilar)}
            className="w-full flex items-center justify-between text-left"
          >
            <p className="text-[13px] font-bold text-navy">
              <span className="material-symbols-rounded text-[16px] text-[#f59e0b] align-middle mr-1">
                compare_arrows
              </span>
              類似案件が{similarCases.length}件あります
              <span className="text-[11px] text-[#888] font-normal ml-2">
                （他事業者からの類似案件）
              </span>
            </p>
            <span className="material-symbols-rounded text-[16px] text-[#888]">
              {showSimilar ? "expand_less" : "expand_more"}
            </span>
          </button>

          {showSimilar && (
            <div className="mt-3 space-y-2">
              {similarCases.map((sim) => (
                <div key={sim.id}>
                  <div
                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white border border-border cursor-pointer hover:bg-[#fafafa]"
                    onClick={() =>
                      setComparingId(
                        comparingId === sim.id ? null : sim.id
                      )
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-navy truncate">
                        {sim.title}
                      </p>
                      <p className="text-[11px] text-[#aaa]">
                        {sim.source === "google_sheet"
                          ? "Google Sheets"
                          : sim.source === "notion"
                          ? "Notion"
                          : sim.source || "手動登録"}
                      </p>
                    </div>
                    <span className="text-[13px] font-bold text-[#f59e0b] shrink-0">
                      {Math.round(sim.similarity * 100)}% 類似
                    </span>
                    <span className="material-symbols-rounded text-[16px] text-[#888]">
                      {comparingId === sim.id
                        ? "expand_less"
                        : "expand_more"}
                    </span>
                  </div>

                  {/* Side-by-side comparison */}
                  {comparingId === sim.id && caseData && (
                    <div className="border border-t-0 border-border bg-white p-3">
                      <p className="text-[11px] font-bold text-[#888] mb-2 pb-1 border-b border-border/50">
                        条件比較
                      </p>
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="text-[11px] text-[#888]">
                            <th className="text-left py-1 w-[80px]">
                              項目
                            </th>
                            <th className="text-left py-1">この案件</th>
                            <th className="text-left py-1">
                              比較案件
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            {
                              label: "報酬",
                              a: caseData.fee,
                              b: sim.fee,
                            },
                            {
                              label: "稼働率",
                              a: caseData.occupancy,
                              b: sim.occupancy,
                            },
                            {
                              label: "勤務地",
                              a: caseData.location,
                              b: sim.location,
                            },
                            {
                              label: "出社",
                              a: caseData.office_days,
                              b: sim.office_days,
                            },
                            {
                              label: "業界",
                              a: caseData.industry,
                              b: sim.industry,
                            },
                            {
                              label: "開始日",
                              a: caseData.start_date,
                              b: sim.start_date,
                            },
                          ]
                            .filter((r) => r.a || r.b)
                            .map((r) => (
                              <tr
                                key={r.label}
                                className="border-t border-border/30"
                              >
                                <td className="py-1.5 text-[#888] font-bold">
                                  {r.label}
                                </td>
                                <td className="py-1.5 text-text">
                                  {r.a || (
                                    <span className="text-[#ccc]">
                                      &mdash;
                                    </span>
                                  )}
                                </td>
                                <td
                                  className={`py-1.5 ${
                                    r.a && r.b && r.a !== r.b
                                      ? "text-[#E15454] font-bold"
                                      : "text-text"
                                  }`}
                                >
                                  {r.b || (
                                    <span className="text-[#ccc]">
                                      &mdash;
                                    </span>
                                  )}
                                  {r.a && r.b && r.a !== r.b && (
                                    <span className="text-[10px] text-[#f59e0b] ml-1">
                                      差異あり
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          {/* Must req comparison */}
                          {(caseData.must_req || sim.must_req) && (
                            <tr className="border-t border-border/30">
                              <td className="py-1.5 text-[#888] font-bold align-top">
                                必須要件
                              </td>
                              <td className="py-1.5 text-text text-[11px] whitespace-pre-line">
                                {caseData.must_req || (
                                  <span className="text-[#ccc]">
                                    &mdash;
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 text-text text-[11px] whitespace-pre-line">
                                {sim.must_req || (
                                  <span className="text-[#ccc]">
                                    &mdash;
                                  </span>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <Link
                          href={`/dashboard/cases/${sim.id}`}
                          className="text-[12px] text-blue hover:underline"
                        >
                          この案件の詳細を見る &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
