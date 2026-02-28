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

type SyncSource = "sheets" | "notion";
type SyncStep = "input" | "preview" | "result";

interface PreviewData {
  total: number;
  columnMapping: Record<string, string>;
  preview: Record<string, string>[];
}

interface DuplicateFlag {
  incomingTitle: string;
  existingTitle: string;
  existingId: string;
  similarity: number;
  matchType: string;
  sameSource: boolean;
}

interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  flagged: number;
  errors: string[];
  columnMapping: Record<string, string>;
  duplicateFlags?: DuplicateFlag[];
}

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

export default function AdminSyncPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [source, setSource] = useState<SyncSource>("sheets");
  const [step, setStep] = useState<SyncStep>("input");

  // Input state
  const [url, setUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [publish, setPublish] = useState(false);
  const [downloadPdfs, setDownloadPdfs] = useState(true);
  const [onConflict, setOnConflict] = useState<"skip" | "update">("skip");

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

  function switchSource(s: SyncSource) {
    setSource(s);
    setStep("input");
    setUrl("");
    setSheetName("");
    setPreview(null);
    setResult(null);
    setError("");
  }

  async function handlePreview() {
    const label = source === "sheets" ? "Google Sheets" : "Notion";
    if (!url.trim()) {
      setError(`${label}のURLを入力してください`);
      return;
    }
    setError("");
    setLoading(true);

    try {
      const apiPath =
        source === "sheets"
          ? "/api/admin/sync-sheet"
          : "/api/admin/sync-notion";

      const body: Record<string, unknown> =
        source === "sheets"
          ? {
              sheetUrl: url.trim(),
              sheetName: sheetName.trim() || undefined,
              mode: "preview",
            }
          : {
              databaseUrl: url.trim(),
              mode: "preview",
            };

      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "プレビューの取得に失敗しました");
      }

      setPreview(data);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setError("");
    setLoading(true);

    try {
      const apiPath =
        source === "sheets"
          ? "/api/admin/sync-sheet"
          : "/api/admin/sync-notion";

      const body: Record<string, unknown> =
        source === "sheets"
          ? {
              sheetUrl: url.trim(),
              sheetName: sheetName.trim() || undefined,
              mode: "import",
              publish,
              downloadPdfs,
              onConflict,
            }
          : {
              databaseUrl: url.trim(),
              mode: "import",
              publish,
              downloadPdfs,
              onConflict,
            };

      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "インポートに失敗しました");
      }

      setResult(data);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep("input");
    setUrl("");
    setSheetName("");
    setPreview(null);
    setResult(null);
    setError("");
    setPublish(false);
    setDownloadPdfs(true);
    setOnConflict("skip");
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
          &larr; 案件管理
        </Link>
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          ADMIN / EXTERNAL SYNC
        </p>
        <h1 className="text-xl font-black text-navy">外部データ同期</h1>
        <p className="text-[13px] text-[#888] mt-1">
          パートナーのGoogle Sheets・Notionから案件を一括取得・登録します。
        </p>
      </div>

      {/* ── Source Tabs ── */}
      {step === "input" && (
        <div className="flex gap-0 mb-5">
          <button
            onClick={() => switchSource("sheets")}
            className={`px-5 py-2.5 text-[13px] font-bold border transition-colors ${
              source === "sheets"
                ? "bg-[#E15454] text-white border-[#E15454]"
                : "bg-white text-[#888] border-border hover:text-navy"
            }`}
          >
            <Icon
              name="table_chart"
              className="text-[16px] align-middle mr-1"
            />
            Google Sheets
          </button>
          <button
            onClick={() => switchSource("notion")}
            className={`px-5 py-2.5 text-[13px] font-bold border border-l-0 transition-colors ${
              source === "notion"
                ? "bg-[#E15454] text-white border-[#E15454]"
                : "bg-white text-[#888] border-border hover:text-navy"
            }`}
          >
            <Icon
              name="article"
              className="text-[16px] align-middle mr-1"
            />
            Notion
          </button>
        </div>
      )}

      {/* ── Step 1: URL Input ── */}
      {step === "input" && (
        <div className="bg-white border border-border p-6 mb-5">
          {source === "sheets" ? (
            <>
              <h2 className="text-sm font-bold text-navy mb-1 pb-3 border-b-2 border-[#E15454]">
                STEP 1 &mdash; スプレッドシートのURLを入力
              </h2>
              <p className="text-[12px] text-[#888] mb-4">
                「リンクを知っている全員が閲覧可」に設定されたGoogle
                SheetsのURLを入力してください。
              </p>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#888] mb-1 block">
                    Google Sheets URL{" "}
                    <span className="text-[#E15454]">*必須</span>
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit"
                    className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
                  />
                </div>

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
              </div>
            </>
          ) : (
            <>
              <h2 className="text-sm font-bold text-navy mb-1 pb-3 border-b-2 border-[#E15454]">
                STEP 1 &mdash; NotionデータベースのURLを入力
              </h2>
              <p className="text-[12px] text-[#888] mb-4">
                PERSONAインテグレーションと共有されたNotionデータベースのURLを入力してください。
              </p>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#888] mb-1 block">
                    Notion Database URL{" "}
                    <span className="text-[#E15454]">*必須</span>
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.notion.so/workspace/xxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
                  />
                </div>

                {/* Notion setup guide */}
                <div className="p-3 bg-[#fffbeb] border border-[#f59e0b]/20 text-[12px] text-[#666]">
                  <p className="font-bold text-navy mb-1">
                    <Icon
                      name="info"
                      className="text-[14px] text-[#f59e0b] align-middle mr-1"
                    />
                    Notionの事前設定
                  </p>
                  <ol className="list-decimal ml-4 space-y-1 text-[11px]">
                    <li>
                      Notionの
                      <a
                        href="https://www.notion.so/my-integrations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue underline"
                      >
                        インテグレーション設定
                      </a>
                      でPERSONA用のインテグレーションを作成
                    </li>
                    <li>
                      取得したAPIトークンをVercelの環境変数
                      <code className="bg-[#f5f5f5] px-1 text-[#E15454]">
                        NOTION_API_KEY
                      </code>
                      に設定
                    </li>
                    <li>
                      対象のNotionデータベースで「コネクトを追加」→
                      PERSONAインテグレーションを選択
                    </li>
                  </ol>
                </div>
              </div>
            </>
          )}

          {/* Common options */}
          <div className="flex flex-col gap-3 p-3 bg-[#f9f9fb] border border-border/50 mt-4">
            <div className="flex flex-col sm:flex-row gap-4">
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

            {/* Dedup options */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-[11px] font-bold text-[#888] mb-2">
                同じソースの重複案件
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="onConflict"
                    checked={onConflict === "skip"}
                    onChange={() => setOnConflict("skip")}
                    className="w-4 h-4 accent-[#E15454]"
                  />
                  <span className="text-[12px] text-[#666]">
                    スキップ（既存を維持）
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="onConflict"
                    checked={onConflict === "update"}
                    onChange={() => setOnConflict("update")}
                    className="w-4 h-4 accent-[#E15454]"
                  />
                  <span className="text-[12px] text-[#666]">
                    上書き更新（最新データで更新）
                  </span>
                </label>
              </div>
              <p className="text-[10px] text-[#aaa] mt-1">
                別の事業者からの類似案件は両方保持され、管理画面で比較できます。
              </p>
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
                  <Icon
                    name="progress_activity"
                    className="text-[16px] animate-spin"
                  />
                  取得中...
                </span>
              ) : (
                "プレビュー取得"
              )}
            </button>
          </div>

          {/* Column mapping help */}
          <details className="mt-6 text-[12px] text-[#888]">
            <summary className="cursor-pointer font-bold hover:text-navy">
              対応するカラム名・プロパティ名について
            </summary>
            <div className="mt-2 p-3 bg-[#f9f9fb] border border-border/50">
              <p className="mb-2">
                以下の日本語・英語の{source === "sheets" ? "カラム" : "プロパティ"}名を自動で認識します:
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
                例:「案件名」「タイトル」「title」「Name」&rarr; すべて「タイトル」として取り込みます
              </p>
            </div>
          </details>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === "preview" && preview && (
        <>
          <div className="bg-blue/[0.04] border border-blue/20 p-4 mb-5">
            <p className="text-[13px] font-bold text-navy mb-1">
              <Icon
                name="check_circle"
                className="text-[16px] text-[#10b981] align-middle mr-1"
              />
              {preview.total}件のデータを
              {source === "sheets" ? "Google Sheets" : "Notion"}
              から取得しました
            </p>
            <div className="mt-2">
              <p className="text-[11px] text-[#888] mb-1">
                認識された{source === "sheets" ? "カラム" : "プロパティ"}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(preview.columnMapping).map(
                  ([raw, mapped]) => (
                    <span
                      key={raw}
                      className="px-2 py-0.5 text-[11px] bg-blue/10 text-blue rounded-full"
                    >
                      {raw} &rarr; {FIELD_LABELS[mapped] || mapped}
                    </span>
                  )
                )}
              </div>
            </div>
            {Object.keys(FIELD_LABELS).filter(
              (k) => !Object.values(preview.columnMapping).includes(k)
            ).length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] text-[#aaa]">
                  未認識:{" "}
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
                STEP 2 &mdash; データプレビュー
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
                    .filter((v, i, arr) => arr.indexOf(v) === i)
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
                      .filter((v, i, arr) => arr.indexOf(v) === i)
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
                              <span className="text-[#ccc]">&mdash;</span>
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

          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-8 py-3 bg-[#E15454] text-white text-[14px] font-bold hover:bg-[#d04343] transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Icon
                    name="progress_activity"
                    className="text-[16px] animate-spin"
                  />
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
                  {source === "sheets" ? "Google Sheets" : "Notion"}
                  からのインポート完了
                </p>
                <div className="flex flex-wrap gap-4 mt-2 text-[13px]">
                  <span className="text-[#10b981] font-bold">
                    <Icon
                      name="add_circle"
                      className="text-[14px] align-middle"
                    />{" "}
                    新規登録: {result.imported}件
                  </span>
                  {result.updated > 0 && (
                    <span className="text-blue font-bold">
                      <Icon
                        name="sync"
                        className="text-[14px] align-middle"
                      />{" "}
                      更新: {result.updated}件
                    </span>
                  )}
                  {result.skipped > 0 && (
                    <span className="text-[#888]">
                      <Icon
                        name="skip_next"
                        className="text-[14px] align-middle"
                      />{" "}
                      スキップ: {result.skipped}件
                    </span>
                  )}
                  {result.flagged > 0 && (
                    <span className="text-[#f59e0b] font-bold">
                      <Icon
                        name="compare_arrows"
                        className="text-[14px] align-middle"
                      />{" "}
                      類似案件検出: {result.flagged}件
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

          {/* Duplicate flags: similar cases from different sources */}
          {result.duplicateFlags && result.duplicateFlags.length > 0 && (
            <div className="bg-[#fffbeb] border border-[#f59e0b]/20 p-4 mb-5">
              <p className="text-[13px] font-bold text-navy mb-2">
                <Icon
                  name="compare_arrows"
                  className="text-[16px] text-[#f59e0b] align-middle mr-1"
                />
                別事業者に類似案件あり（両方保持済み）
              </p>
              <p className="text-[11px] text-[#888] mb-3">
                以下の案件は既存の案件と類似しています。管理画面の案件詳細で条件を比較できます。
              </p>
              <div className="space-y-2">
                {result.duplicateFlags.map((dup, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-white/60 border border-[#f59e0b]/10 text-[12px]"
                  >
                    <div className="flex-1">
                      <span className="text-[#10b981] font-bold mr-1">
                        NEW
                      </span>
                      <span className="text-text">{dup.incomingTitle}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#f59e0b] font-bold shrink-0">
                      <Icon
                        name="swap_horiz"
                        className="text-[14px]"
                      />
                      {Math.round(dup.similarity * 100)}%
                    </div>
                    <div className="flex-1">
                      <span className="text-[#888] font-bold mr-1">
                        EXISTING
                      </span>
                      <Link
                        href={`/dashboard/cases/${dup.existingId}`}
                        className="text-blue hover:underline"
                      >
                        {dup.existingTitle}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.columnMapping &&
            Object.keys(result.columnMapping).length > 0 && (
              <div className="bg-[#f9f9fb] border border-border p-4 mb-5">
                <p className="text-[11px] font-bold text-[#888] mb-2">
                  使用されたマッピング:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(result.columnMapping).map(
                    ([raw, mapped]) => (
                      <span
                        key={raw}
                        className="px-2 py-0.5 text-[11px] bg-blue/10 text-blue rounded-full"
                      >
                        {raw} &rarr; {FIELD_LABELS[mapped] || mapped}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

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

      {/* Usage tips (source-specific) */}
      {step === "input" && (
        <div className="bg-[#f9f9fb] border border-border p-5 mt-5">
          <h3 className="text-[13px] font-bold text-navy mb-3">
            <Icon
              name="lightbulb"
              className="text-[16px] text-[#f59e0b] align-middle mr-1"
            />
            使い方のヒント
          </h3>

          {source === "sheets" ? (
            <div className="grid sm:grid-cols-2 gap-4 text-[12px] text-[#666]">
              <div>
                <p className="font-bold text-navy mb-1">
                  1. スプレッドシートの共有設定
                </p>
                <p>
                  「リンクを知っている全員」に「閲覧者」権限を付与してください。
                  APIキーは不要で、リンク共有だけで読み取れます。
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
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 text-[12px] text-[#666]">
              <div>
                <p className="font-bold text-navy mb-1">
                  1. インテグレーション作成
                </p>
                <p>
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue underline"
                  >
                    notion.so/my-integrations
                  </a>
                  で新しいインテグレーションを作成し、APIトークンをコピーします。
                </p>
              </div>
              <div>
                <p className="font-bold text-navy mb-1">
                  2. データベース共有
                </p>
                <p>
                  対象のNotionデータベースを開き、右上の「...」&rarr;「コネクトを追加」&rarr;
                  作成したインテグレーションを選択します。
                </p>
              </div>
              <div>
                <p className="font-bold text-navy mb-1">
                  3. プロパティ自動認識
                </p>
                <p>
                  title, rich_text, select, number, date, url,
                  filesなど主要なNotionプロパティタイプに対応しています。
                </p>
              </div>
              <div>
                <p className="font-bold text-navy mb-1">
                  4. 相手への影響
                </p>
                <p>
                  APIアクセスはNotionの「インテグレーション」として記録されますが、
                  読み取りのみのため相手のデータには影響しません。
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
