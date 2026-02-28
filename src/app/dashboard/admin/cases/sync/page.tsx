"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

type SyncStep = "input" | "preview" | "result";

interface PreviewData {
  total: number;
  columnMapping: Record<string, string>;
  preview: Record<string, string>[];
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  columnMapping: Record<string, string>;
}

// Display labels for case fields
const FIELD_LABELS: Record<string, string> = {
  title: "タイトル",
  case_no: "案件番号",
  category: "カテゴリ",
  industry: "業界",
  fee: "報酬",
  occupancy: "稼働率",
  location: "勤務地",
  office_days: "出社日数",
  start_date: "開始日",
  extendable: "延長可否",
  background: "案件背景",
  description: "業務内容",
  must_req: "必須要件",
  nice_to_have: "歓迎要件",
  flow: "選考フロー",
  pdf_url: "PDF資料",
};

export default function AdminSheetSyncPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [step, setStep] = useState<SyncStep>("input");

  // Input state
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [publish, setPublish] = useState(false);
  const [downloadPdfs, setDownloadPdfs] = useState(true);

  // Loading / error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Preview / result
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

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

  async function handlePreview() {
    if (!sheetUrl.trim()) {
      setError("Google SheetsのURLを入力してください");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/sync-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetUrl: sheetUrl.trim(),
          sheetName: sheetName.trim() || undefined,
          mode: "preview",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "プレビューの取得に失敗しました");
      }

      setPreview(data);
      setStep("preview");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "エラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/sync-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetUrl: sheetUrl.trim(),
          sheetName: sheetName.trim() || undefined,
          mode: "import",
          publish,
          downloadPdfs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "インポートに失敗しました");
      }

      setResult(data);
      setStep("result");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "エラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep("input");
    setSheetUrl("");
    setSheetName("");
    setPreview(null);
    setResult(null);
    setError("");
    setPublish(false);
    setDownloadPdfs(true);
  }

  if (!authorized) {
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
          href="/dashboard/admin/cases"
          className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
        >
          ← 案件管理
        </Link>
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          ADMIN / SHEET SYNC
        </p>
        <h1 className="text-xl font-black text-navy">
          Google Sheets 同期
        </h1>
        <p className="text-[13px] text-[#888] mt-1">
          パートナーのGoogle
          Sheetsから案件を一括取得・登録します。PDF資料も自動ダウンロードできます。
        </p>
      </div>

      {/* ── Step 1: URL Input ── */}
      {step === "input" && (
        <div className="bg-white border border-border p-6 mb-5">
          <h2 className="text-sm font-bold text-navy mb-1 pb-3 border-b-2 border-[#E15454]">
            STEP 1 — スプレッドシートのURLを入力
          </h2>
          <p className="text-[12px] text-[#888] mb-4">
            「リンクを知っている全員が閲覧可」に設定されたGoogle
            SheetsのURLを入力してください。
          </p>

          <div className="flex flex-col gap-4">
            {/* Sheet URL */}
            <div>
              <label className="text-[11px] font-bold text-[#888] mb-1 block">
                Google Sheets URL <span className="text-[#E15454]">*必須</span>
              </label>
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>

            {/* Sheet name (optional) */}
            <div>
              <label className="text-[11px] font-bold text-[#888] mb-1 block">
                シート名（タブ名）
                <span className="text-[#aaa] font-normal ml-1">
                  省略時は最初のシート
                </span>
              </label>
              <input
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="例: 案件一覧"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>

            {/* Options */}
            <div className="flex flex-col sm:flex-row gap-4 p-3 bg-[#f9f9fb] border border-border/50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={downloadPdfs}
                  onChange={(e) => setDownloadPdfs(e.target.checked)}
                  className="w-4 h-4 accent-[#E15454]"
                />
                <span className="text-[12px] text-[#666]">
                  PDF資料を自動ダウンロード
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publish}
                  onChange={(e) => setPublish(e.target.checked)}
                  className="w-4 h-4 accent-[#E15454]"
                />
                <span className="text-[12px] text-[#666]">
                  インポート後すぐに公開
                </span>
              </label>
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-[#E15454] mt-3">{error}</p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handlePreview}
              disabled={loading}
              className="px-8 py-3 bg-[#E15454] text-white text-[14px] font-bold hover:bg-[#d04343] transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Icon name="progress_activity" className="text-[16px] animate-spin" />
                  取得中...
                </span>
              ) : (
                "プレビュー取得"
              )}
            </button>
          </div>

          {/* Help */}
          <details className="mt-6 text-[12px] text-[#888]">
            <summary className="cursor-pointer font-bold hover:text-navy">
              対応するカラム名について
            </summary>
            <div className="mt-2 p-3 bg-[#f9f9fb] border border-border/50">
              <p className="mb-2">
                以下の日本語・英語のカラム名を自動で認識します:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[11px]">
                {Object.entries(FIELD_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1">
                    <span className="text-[#E15454] font-mono">{key}</span>
                    <span className="text-[#aaa]">=</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#aaa]">
                例:「案件名」「タイトル」「title」→ すべて「タイトル」として取り込みます
              </p>
            </div>
          </details>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === "preview" && preview && (
        <>
          {/* Column mapping info */}
          <div className="bg-blue/[0.04] border border-blue/20 p-4 mb-5">
            <p className="text-[13px] font-bold text-navy mb-1">
              <Icon name="check_circle" className="text-[16px] text-[#10b981] align-middle mr-1" />
              {preview.total}件のデータを取得しました
            </p>
            <div className="mt-2">
              <p className="text-[11px] text-[#888] mb-1">
                認識されたカラム:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(preview.columnMapping).map(
                  ([raw, mapped]) => (
                    <span
                      key={raw}
                      className="px-2 py-0.5 text-[11px] bg-blue/10 text-blue rounded-full"
                    >
                      {raw} → {FIELD_LABELS[mapped] || mapped}
                    </span>
                  )
                )}
              </div>
            </div>
            {/* Unmapped fields warning */}
            {Object.keys(FIELD_LABELS).filter(
              (k) =>
                !Object.values(preview.columnMapping).includes(k)
            ).length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] text-[#aaa]">
                  未認識:
                  {Object.keys(FIELD_LABELS)
                    .filter(
                      (k) =>
                        !Object.values(preview.columnMapping).includes(k)
                    )
                    .map((k) => FIELD_LABELS[k])
                    .join("、")}
                </p>
              </div>
            )}
          </div>

          {/* Preview table */}
          <div className="bg-white border border-border mb-5 overflow-x-auto">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-bold text-navy">
                STEP 2 — データプレビュー
                <span className="text-[11px] text-[#888] font-normal ml-2">
                  先頭{Math.min(preview.preview.length, 20)}件を表示
                </span>
              </h2>
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#f9f9fb]">
                  <th className="text-left px-3 py-2 font-bold text-[#888] border-b border-border">
                    #
                  </th>
                  {Object.values(preview.columnMapping)
                    .filter(
                      (v, i, arr) => arr.indexOf(v) === i
                    )
                    .map((field) => (
                      <th
                        key={field}
                        className="text-left px-3 py-2 font-bold text-[#888] border-b border-border whitespace-nowrap"
                      >
                        {FIELD_LABELS[field] || field}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border/50 hover:bg-[#fafafa]"
                  >
                    <td className="px-3 py-2 text-[#aaa]">{idx + 1}</td>
                    {Object.values(preview.columnMapping)
                      .filter(
                        (v, i, arr) => arr.indexOf(v) === i
                      )
                      .map((field) => (
                        <td
                          key={field}
                          className="px-3 py-2 text-text max-w-[200px] truncate"
                          title={row[field] || ""}
                        >
                          {field === "pdf_url" && row[field] ? (
                            <span className="text-blue">
                              <Icon
                                name="picture_as_pdf"
                                className="text-[14px] align-middle"
                              />{" "}
                              あり
                            </span>
                          ) : (
                            row[field] || (
                              <span className="text-[#ccc]">—</span>
                            )
                          )}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import options */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-[#f9f9fb] border border-border/50 mb-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={downloadPdfs}
                onChange={(e) => setDownloadPdfs(e.target.checked)}
                className="w-4 h-4 accent-[#E15454]"
              />
              <span className="text-[12px] text-[#666]">
                PDF資料を自動ダウンロード
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                className="w-4 h-4 accent-[#E15454]"
              />
              <span className="text-[12px] text-[#666]">
                インポート後すぐに公開
              </span>
            </label>
          </div>

          {error && (
            <p className="text-[12px] text-[#E15454] mb-3">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-8 py-3 bg-[#E15454] text-white text-[14px] font-bold hover:bg-[#d04343] transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Icon name="progress_activity" className="text-[16px] animate-spin" />
                  インポート中...
                </span>
              ) : (
                `${preview.total}件をインポート`
              )}
            </button>
            <button
              onClick={() => {
                setStep("input");
                setPreview(null);
                setError("");
              }}
              className="px-4 py-3 text-[13px] text-[#888] hover:text-navy transition-colors"
            >
              やり直す
            </button>
          </div>
        </>
      )}

      {/* ── Step 3: Result ── */}
      {step === "result" && result && (
        <>
          {/* Success / partial success */}
          <div
            className={`p-5 mb-5 border ${
              result.errors.length > 0
                ? "bg-[#fffbeb] border-[#f59e0b]/20"
                : "bg-[#ecfdf5] border-[#10b981]/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <Icon
                name={
                  result.errors.length > 0 ? "warning" : "check_circle"
                }
                className={`text-[24px] ${
                  result.errors.length > 0
                    ? "text-[#f59e0b]"
                    : "text-[#10b981]"
                }`}
              />
              <div className="flex-1">
                <p className="text-[15px] font-bold text-navy">
                  インポート完了
                </p>
                <div className="flex flex-wrap gap-4 mt-2 text-[13px]">
                  <span className="text-[#10b981] font-bold">
                    <Icon
                      name="check"
                      className="text-[14px] align-middle"
                    />{" "}
                    登録: {result.imported}件
                  </span>
                  {result.skipped > 0 && (
                    <span className="text-[#888]">
                      <Icon
                        name="skip_next"
                        className="text-[14px] align-middle"
                      />{" "}
                      スキップ: {result.skipped}件
                      <span className="text-[11px] text-[#aaa] ml-1">
                        (重複・タイトルなし)
                      </span>
                    </span>
                  )}
                  {result.errors.length > 0 && (
                    <span className="text-[#E15454]">
                      <Icon
                        name="error"
                        className="text-[14px] align-middle"
                      />{" "}
                      エラー: {result.errors.length}件
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Error details */}
            {result.errors.length > 0 && (
              <div className="mt-3 p-3 bg-white/60 border border-[#E15454]/10">
                <p className="text-[11px] font-bold text-[#E15454] mb-1">
                  エラー詳細:
                </p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-[11px] text-[#666]">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Column mapping used */}
          {result.columnMapping &&
            Object.keys(result.columnMapping).length > 0 && (
              <div className="bg-[#f9f9fb] border border-border p-4 mb-5">
                <p className="text-[11px] font-bold text-[#888] mb-2">
                  使用されたカラムマッピング:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(result.columnMapping).map(
                    ([raw, mapped]) => (
                      <span
                        key={raw}
                        className="px-2 py-0.5 text-[11px] bg-blue/10 text-blue rounded-full"
                      >
                        {raw} → {FIELD_LABELS[mapped] || mapped}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/admin/cases"
              className="px-6 py-3 bg-[#E15454] text-white text-[14px] font-bold hover:bg-[#d04343] transition-colors"
            >
              案件管理へ
            </Link>
            <button
              onClick={handleReset}
              className="px-6 py-3 border border-border text-[14px] font-bold text-navy hover:bg-[#f5f5f5] transition-colors"
            >
              続けてインポート
            </button>
          </div>
        </>
      )}

      {/* Usage tips */}
      {step === "input" && (
        <div className="bg-[#f9f9fb] border border-border p-5 mt-5">
          <h3 className="text-[13px] font-bold text-navy mb-3">
            <Icon
              name="lightbulb"
              className="text-[16px] text-[#f59e0b] align-middle mr-1"
            />
            使い方のヒント
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 text-[12px] text-[#666]">
            <div>
              <p className="font-bold text-navy mb-1">
                1. スプレッドシートの共有設定
              </p>
              <p>
                「リンクを知っている全員」に「閲覧者」権限を付与してください。
                公開でなくてもリンク共有で読み取れます。
              </p>
            </div>
            <div>
              <p className="font-bold text-navy mb-1">
                2. カラム名の自動認識
              </p>
              <p>
                「案件名」「タイトル」「title」など、日本語・英語の多様なカラム名を自動マッピングします。
              </p>
            </div>
            <div>
              <p className="font-bold text-navy mb-1">3. PDF自動取得</p>
              <p>
                「PDF」「資料」「添付」列にGoogle
                DriveのURLがある場合、PDFを自動でダウンロードして保存します。
              </p>
            </div>
            <div>
              <p className="font-bold text-navy mb-1">4. 重複チェック</p>
              <p>
                同じタイトルの案件は自動でスキップされます。同じシートを繰り返し同期しても重複登録されません。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
