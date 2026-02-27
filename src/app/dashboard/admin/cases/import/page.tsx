"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminCaseImportPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
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

  function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    // Detect separator (tab or comma)
    const sep = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"/, "").replace(/"$/, ""));

    return lines.slice(1).map((line) => {
      const values = line.split(sep).map((v) => v.trim().replace(/^"/, "").replace(/"$/, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (h) row[h] = values[i] || "";
      });
      return row;
    });
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setPreview(parseCSV(text));
      setResult(null);
      setError("");
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleTextPaste() {
    setPreview(parseCSV(csvText));
    setResult(null);
    setError("");
  }

  async function handleImport() {
    if (preview.length === 0) {
      setError("インポートするデータがありません");
      return;
    }
    setError("");
    setImporting(true);

    try {
      const res = await fetch("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cases: preview }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "インポートに失敗しました");
        return;
      }
      setResult(data);
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
          ADMIN / IMPORT
        </p>
        <h1 className="text-xl font-black text-navy">CSV一括インポート</h1>
      </div>

      {/* Instructions */}
      <div className="bg-white border border-border p-6 mb-5">
        <h2 className="text-sm font-bold text-navy mb-3 pb-3 border-b-2 border-[#E15454]">
          対応フォーマット
        </h2>
        <p className="text-[12px] text-[#666] mb-3">
          CSV（カンマ区切り）またはTSV（タブ区切り）。Excelからのコピペも可能です。
        </p>
        <div className="bg-[#f5f5f5] p-3 text-[11px] text-[#666] font-mono overflow-x-auto">
          <p className="font-bold text-navy mb-1">ヘッダー例（日本語・英語どちらも対応）:</p>
          <p>タイトル, カテゴリ, 業界, 報酬, 稼働率, 勤務地, 出社日数, 開始日, 必須要件, 歓迎要件</p>
          <p className="mt-1">title, category, industry, fee, occupancy, location, office_days, start_date, must_req, nice_to_have</p>
        </div>
      </div>

      {/* File upload or paste */}
      <div className="bg-white border border-border p-6 mb-5">
        <h2 className="text-sm font-bold text-navy mb-3 pb-3 border-b-2 border-[#E15454]">
          データ入力
        </h2>
        <div className="mb-4">
          <label className="inline-block px-6 py-2.5 bg-[#E15454] text-white text-[13px] font-bold cursor-pointer hover:bg-[#d04343] transition-colors">
            CSVファイルを選択
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-[12px] text-[#888] mb-2">
          またはExcel等からデータを貼り付け:
        </p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={8}
          placeholder="ヘッダー行を含むCSV/TSVデータを貼り付けてください..."
          className="w-full px-3 py-2.5 border border-border text-[12px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none font-mono"
        />
        <button
          onClick={handleTextPaste}
          className="mt-2 px-4 py-2 border border-border text-[13px] font-bold text-navy hover:bg-[#f5f5f5] transition-colors"
        >
          プレビュー
        </button>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-white border border-border p-6 mb-5">
          <h2 className="text-sm font-bold text-navy mb-3 pb-3 border-b-2 border-[#E15454]">
            プレビュー（{preview.length}件）
          </h2>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-[#888] font-bold">#</th>
                  {Object.keys(preview[0]).slice(0, 8).map((key) => (
                    <th
                      key={key}
                      className="text-left py-2 px-2 text-[#888] font-bold whitespace-nowrap"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1.5 px-2 text-[#aaa]">{i + 1}</td>
                    {Object.values(row)
                      .slice(0, 8)
                      .map((val, j) => (
                        <td
                          key={j}
                          className="py-1.5 px-2 text-navy max-w-[200px] truncate"
                        >
                          {val}
                        </td>
                      ))}
                  </tr>
                ))}
                {preview.length > 20 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-2 px-2 text-[#888] text-center"
                    >
                      ... 他 {preview.length - 20} 件
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import button */}
      {preview.length > 0 && !result && (
        <div className="mb-5">
          {error && (
            <p className="text-[12px] text-[#E15454] mb-3">{error}</p>
          )}
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-8 py-3 bg-[#E15454] text-white text-[14px] font-bold hover:bg-[#d04343] transition-colors disabled:opacity-50"
          >
            {importing
              ? "インポート中..."
              : `${preview.length}件をインポート`}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-[#ecfdf5] border border-[#10b981]/20 p-6 text-center">
          <p className="text-[18px] font-black text-[#10b981] mb-2">
            インポート完了
          </p>
          <p className="text-[14px] text-navy">
            {result.imported}件 登録済み
            {result.skipped > 0 && (
              <span className="text-[#888]">
                （{result.skipped}件 スキップ）
              </span>
            )}
          </p>
          <Link
            href="/dashboard/admin/cases"
            className="inline-block mt-4 px-6 py-2 bg-[#10b981] text-white text-[13px] font-bold hover:bg-[#059669] transition-colors"
          >
            案件管理に戻る
          </Link>
        </div>
      )}
    </div>
  );
}
