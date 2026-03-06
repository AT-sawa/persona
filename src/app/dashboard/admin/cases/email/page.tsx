"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { parseEmailCases, type ParsedCase, type ParseResult } from "@/lib/parse-email-cases";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

export default function AdminCaseEmailPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    duplicates?: number;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAdmin() {
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
      setAuthorized(true);
    }
    checkAdmin();
  }, [router]);

  function handleParse() {
    if (!emailText.trim()) {
      setError("メール本文を貼り付けてください");
      return;
    }
    setError("");
    setImportResult(null);
    const result = parseEmailCases(emailText);
    setParseResult(result);
    // 全案件を選択状態にする
    setSelected(new Set(result.cases.map((_, i) => i)));
    setEditingIdx(null);
    setEditForm({});

    if (result.cases.length === 0) {
      setError("案件を抽出できませんでした。メールのフォーマットをご確認ください。");
    }
  }

  function toggleSelect(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (!parseResult) return;
    if (selected.size === parseResult.cases.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(parseResult.cases.map((_, i) => i)));
    }
  }

  function startEdit(idx: number) {
    if (!parseResult) return;
    const c = parseResult.cases[idx];
    setEditingIdx(idx);
    setEditForm({
      title: c.title,
      case_no: c.case_no,
      category: c.category,
      industry: c.industry,
      fee: c.fee,
      occupancy: c.occupancy,
      location: c.location,
      office_days: c.office_days,
      start_date: c.start_date,
      background: c.background,
      description: c.description,
      must_req: c.must_req,
      nice_to_have: c.nice_to_have,
      flow: c.flow,
      client_company: c.client_company,
      commercial_flow: c.commercial_flow,
    });
  }

  function saveEdit() {
    if (editingIdx === null || !parseResult) return;
    const updated = [...parseResult.cases];
    updated[editingIdx] = {
      ...updated[editingIdx],
      title: editForm.title || updated[editingIdx].title,
      case_no: editForm.case_no || "",
      category: editForm.category || "IT",
      industry: editForm.industry || "",
      fee: editForm.fee || "",
      occupancy: editForm.occupancy || "",
      location: editForm.location || "",
      office_days: editForm.office_days || "",
      start_date: editForm.start_date || "",
      background: editForm.background || "",
      description: editForm.description || "",
      must_req: editForm.must_req || "",
      nice_to_have: editForm.nice_to_have || "",
      flow: editForm.flow || "",
      client_company: editForm.client_company || "",
      commercial_flow: editForm.commercial_flow || "",
    };
    setParseResult({ ...parseResult, cases: updated });
    setEditingIdx(null);
    setEditForm({});
  }

  async function handleImport() {
    if (!parseResult) return;
    const selectedCases = parseResult.cases.filter((_, i) => selected.has(i));
    if (selectedCases.length === 0) {
      setError("インポートする案件を選択してください");
      return;
    }
    setError("");
    setImporting(true);

    try {
      // ParsedCase → API用のRecord形式に変換
      const casesForApi = selectedCases.map((c) => ({
        case_no: c.case_no || null,
        title: c.title,
        category: c.category || null,
        industry: c.industry || null,
        background: c.background || null,
        description: c.description || null,
        must_req: c.must_req || null,
        nice_to_have: c.nice_to_have || null,
        start_date: c.start_date || null,
        fee: c.fee || null,
        occupancy: c.occupancy || null,
        location: c.location || null,
        office_days: c.office_days || null,
        flow: c.flow || null,
        client_company: c.client_company || null,
        commercial_flow: c.commercial_flow || null,
        source: "email",
        source_url: c.source_url || null,
      }));

      const res = await fetch("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cases: casesForApi }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "インポートに失敗しました");
        return;
      }
      setImportResult(data);
    } catch {
      setError("インポートに失敗しました");
    } finally {
      setImporting(false);
    }
  }

  if (!authorized) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  const FIELD_LABELS: Record<string, string> = {
    title: "タイトル",
    case_no: "案件番号",
    category: "カテゴリ",
    industry: "業界",
    fee: "報酬",
    occupancy: "稼働率",
    location: "勤務地",
    office_days: "勤務形態",
    start_date: "期間",
    background: "案件背景",
    description: "業務内容",
    must_req: "必須要件",
    nice_to_have: "歓迎要件",
    flow: "選考フロー",
    client_company: "元請け",
    commercial_flow: "商流",
  };

  return (
    <div className="py-6">
      <div className="mb-6">
        <Link
          href="/dashboard/admin/cases"
          className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
        >
          ← 案件管理
        </Link>
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          ADMIN / EMAIL IMPORT
        </p>
        <h1 className="text-xl font-black text-navy">メールから案件一括登録</h1>
        <p className="text-[13px] text-[#888] mt-1">
          パートナーからの案件メールを貼り付けると、複数案件を自動抽出して一括登録できます。
        </p>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className="bg-[#ecfdf5] border border-[#10b981]/20 p-6 mb-5 text-center">
          <p className="text-[18px] font-black text-[#10b981] mb-2">
            インポート完了
          </p>
          <p className="text-[14px] text-navy">
            {importResult.imported}件 登録済み
            {(importResult.skipped ?? 0) > 0 && (
              <span className="text-[#888] ml-2">
                （{importResult.skipped}件 スキップ）
              </span>
            )}
            {(importResult.duplicates ?? 0) > 0 && (
              <span className="text-[#888] ml-2">
                （{importResult.duplicates}件 重複）
              </span>
            )}
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <Link
              href="/dashboard/admin/cases"
              className="px-6 py-2 bg-[#10b981] text-white text-[13px] font-bold hover:bg-[#059669] transition-colors"
            >
              案件管理に戻る
            </Link>
            <button
              onClick={() => {
                setParseResult(null);
                setImportResult(null);
                setEmailText("");
                setSelected(new Set());
                setError("");
              }}
              className="px-6 py-2 border border-border text-[13px] font-bold text-navy hover:bg-[#f5f5f5] transition-colors"
            >
              続けてインポート
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Paste email */}
      {!importResult && (
        <div className="bg-white border border-border p-6 mb-5">
          <h2 className="text-sm font-bold text-navy mb-1 pb-3 border-b-2 border-[#E15454]">
            STEP 1 — メール本文を貼り付け
          </h2>
          <p className="text-[12px] text-[#888] mb-1">
            案件情報が含まれるメール（XIENZ / LASINVA 形式など）をそのまま貼り付けてください。
          </p>
          <p className="text-[11px] text-[#aaa] mb-3">
            対応フォーマット: 「****」区切り + 「【業種】【案件内容】【人材要件】...」形式
          </p>
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            rows={14}
            placeholder={`パートナーから受信した案件メールの本文を貼り付けてください。\n\n例:\n*****\n案件タイトル：1695_官公庁向け生成AIアプリ開発プロジェクト\n担当営業：新井\n*****\n【業種】公共\n【案件内容】...\n【人材要件】\n（MUST）...\n（NTH）...\n【月額報酬】100～180万円\n【勤務地】東京\n...`}
            className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none font-mono leading-[1.7]"
          />
          {error && !parseResult && <p className="text-[12px] text-[#E15454] mt-2">{error}</p>}
          <div className="mt-3 flex gap-3">
            <button
              onClick={handleParse}
              className="px-8 py-3 bg-[#E15454] text-white text-[14px] font-bold hover:bg-[#d04343] transition-colors flex items-center gap-2"
            >
              <Icon name="auto_awesome" className="text-[18px]" />
              解析する
            </button>
            {parseResult && (
              <button
                onClick={() => {
                  setParseResult(null);
                  setSelected(new Set());
                  setEditingIdx(null);
                  setError("");
                }}
                className="px-4 py-3 text-[13px] text-[#888] hover:text-navy transition-colors"
              >
                リセット
              </button>
            )}
          </div>
        </div>
      )}

      {/* Parse errors */}
      {parseResult && parseResult.errors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 mb-5">
          <p className="text-[12px] font-bold text-yellow-800 mb-1">
            一部パースできなかった項目があります
          </p>
          {parseResult.errors.map((err, i) => (
            <p key={i} className="text-[11px] text-yellow-700">{err}</p>
          ))}
        </div>
      )}

      {/* Step 2: Review parsed cases */}
      {parseResult && parseResult.cases.length > 0 && !importResult && (
        <div className="bg-white border border-border p-6 mb-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-[#E15454]">
            <h2 className="text-sm font-bold text-navy">
              STEP 2 — 抽出結果を確認（{parseResult.cases.length}件）
            </h2>
            <label className="flex items-center gap-2 text-[12px] text-[#666] cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === parseResult.cases.length}
                onChange={toggleSelectAll}
                className="accent-[#E15454]"
              />
              全選択
            </label>
          </div>

          <div className="flex flex-col gap-3">
            {parseResult.cases.map((c, idx) => (
              <div
                key={idx}
                className={`border p-4 transition-colors ${
                  selected.has(idx)
                    ? "border-blue/40 bg-blue/[0.02]"
                    : "border-border bg-[#fafafa] opacity-60"
                }`}
              >
                {/* Case header */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(idx)}
                    onChange={() => toggleSelect(idx)}
                    className="accent-[#E15454] mt-1 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {c.case_no && (
                        <span className="text-[10px] font-mono bg-[#f0f0f5] px-2 py-0.5 text-[#666]">
                          #{c.case_no}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 font-bold ${
                        c.category === "IT"
                          ? "bg-blue/10 text-blue"
                          : "bg-orange-50 text-orange-700"
                      }`}>
                        {c.category}
                      </span>
                      {c.industry && (
                        <span className="text-[10px] bg-[#f0f0f5] px-2 py-0.5 text-[#888]">
                          {c.industry}
                        </span>
                      )}
                      {c._sales_rep && (
                        <span className="text-[10px] text-[#aaa]">
                          担当: {c._sales_rep}
                        </span>
                      )}
                    </div>
                    <h3 className="text-[14px] font-bold text-navy mb-2 leading-snug">
                      {c.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#666]">
                      {c.fee && <span>💰 {c.fee}</span>}
                      {c.occupancy && <span>📊 {c.occupancy}</span>}
                      {c.location && <span>📍 {c.location}</span>}
                      {c.office_days && <span>🏢 {c.office_days}</span>}
                      {c.start_date && <span>📅 {c.start_date}</span>}
                      {c._headcount && <span>👥 {c._headcount}</span>}
                    </div>
                    {c.source_url && (
                      <a
                        href={c.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue hover:underline mt-1 inline-block"
                      >
                        {c.source_url}
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => editingIdx === idx ? setEditingIdx(null) : startEdit(idx)}
                    className="flex-shrink-0 px-3 py-1.5 text-[11px] font-bold border border-border text-[#888] hover:text-navy hover:border-navy/30 transition-colors"
                  >
                    {editingIdx === idx ? "閉じる" : "編集"}
                  </button>
                </div>

                {/* Expandable detail */}
                {editingIdx === idx && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(FIELD_LABELS).map(([key, label]) => (
                        <div key={key} className={key === "description" || key === "must_req" || key === "nice_to_have" || key === "background" ? "md:col-span-2" : ""}>
                          <label className="text-[10px] font-bold text-[#888] mb-0.5 block">
                            {label}
                          </label>
                          {(key === "description" || key === "must_req" || key === "nice_to_have" || key === "background") ? (
                            <textarea
                              value={editForm[key] || ""}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                              rows={4}
                              className="w-full px-2 py-1.5 border border-border text-[12px] text-text outline-none bg-white focus:border-blue resize-none"
                            />
                          ) : key === "category" ? (
                            <select
                              value={editForm[key] || "IT"}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-border text-[12px] text-text outline-none bg-white focus:border-blue"
                            >
                              <option value="IT">IT</option>
                              <option value="非IT">非IT</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={editForm[key] || ""}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-border text-[12px] text-text outline-none bg-white focus:border-blue"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="px-4 py-2 bg-navy text-white text-[12px] font-bold hover:bg-navy/90 transition-colors"
                      >
                        変更を反映
                      </button>
                      <button
                        onClick={() => setEditingIdx(null)}
                        className="px-4 py-2 text-[12px] text-[#888] hover:text-navy transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import button */}
      {parseResult && parseResult.cases.length > 0 && !importResult && (
        <div className="mb-5">
          {error && parseResult && <p className="text-[12px] text-[#E15454] mb-3">{error}</p>}
          <div className="flex items-center gap-4">
            <button
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className="px-8 py-3 bg-[#E15454] text-white text-[14px] font-bold hover:bg-[#d04343] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  インポート中...
                </>
              ) : (
                <>
                  <Icon name="upload" className="text-[18px]" />
                  {selected.size}件をインポート
                </>
              )}
            </button>
            <p className="text-[12px] text-[#888]">
              選択した案件を公開状態で登録します
            </p>
          </div>
        </div>
      )}

      {/* Original email (collapsible) */}
      {parseResult && !importResult && (
        <details className="bg-[#f9f9fb] border border-border p-4 mb-5">
          <summary className="text-[12px] font-bold text-[#888] cursor-pointer">
            元のメール本文を表示
          </summary>
          <pre className="mt-3 text-[11px] text-[#666] whitespace-pre-wrap leading-[1.7] font-mono max-h-[300px] overflow-y-auto">
            {emailText}
          </pre>
        </details>
      )}
    </div>
  );
}
