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

interface EmailIntakeLog {
  id: string;
  received_at: string;
  from_address: string | null;
  subject: string | null;
  body_preview: string | null;
  cases_extracted: number;
  cases_imported: number;
  duplicates_skipped: number;
  errors: string[];
  status: string;
  processing_time_ms: number | null;
  attachments_count: number;
  created_at: string | null;
}

interface Attachment {
  id: string;
  filename: string;
  file_size: number | null;
  mime_type: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  success: "bg-[#ecfdf5] text-[#10b981] border border-[#10b981]/20",
  partial: "bg-[#fffbeb] text-[#f59e0b] border border-[#f59e0b]/20",
  failed: "bg-[#fef2f2] text-[#E15454] border border-[#E15454]/20",
  no_cases: "bg-[#f5f5f5] text-[#888] border border-[#ddd]",
};

const STATUS_LABELS: Record<string, string> = {
  success: "成功",
  partial: "一部エラー",
  failed: "失敗",
  no_cases: "案件なし",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}時間前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}日前`;
  return formatDate(dateStr);
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function AdminEmailIntakeLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<EmailIntakeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [linkedCases, setLinkedCases] = useState<
    Record<string, { id: string; title: string }[]>
  >({});
  const [linkedAttachments, setLinkedAttachments] = useState<
    Record<string, Attachment[]>
  >({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
        .from("email_intake_logs")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(200);

      setLogs((data as EmailIntakeLog[]) ?? []);
      setLoading(false);
    }
    fetchData();
  }, [router]);

  async function loadExpandedData(logId: string) {
    const supabase = createClient();

    // Load linked cases and attachments in parallel
    const [casesRes, attRes] = await Promise.all([
      linkedCases[logId]
        ? Promise.resolve(null)
        : supabase
            .from("cases")
            .select("id, title")
            .eq("email_intake_id", logId)
            .order("created_at", { ascending: false }),
      linkedAttachments[logId]
        ? Promise.resolve(null)
        : supabase
            .from("email_attachments")
            .select("id, filename, file_size, mime_type")
            .eq("email_intake_id", logId)
            .order("created_at", { ascending: true }),
    ]);

    if (casesRes?.data) {
      setLinkedCases((prev) => ({
        ...prev,
        [logId]: casesRes.data as { id: string; title: string }[],
      }));
    }
    if (attRes?.data) {
      setLinkedAttachments((prev) => ({
        ...prev,
        [logId]: attRes.data as Attachment[],
      }));
    }
  }

  function toggleExpand(logId: string) {
    if (expandedId === logId) {
      setExpandedId(null);
    } else {
      setExpandedId(logId);
      loadExpandedData(logId);
    }
  }

  async function handleDownload(attachmentId: string) {
    setDownloadingId(attachmentId);
    try {
      const res = await fetch(
        `/api/admin/email-attachments/${attachmentId}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      // silently fail
    } finally {
      setDownloadingId(null);
    }
  }

  // Stats
  const totalLogs = logs.length;
  const successCount = logs.filter((l) => l.status === "success").length;
  const failedCount = logs.filter(
    (l) => l.status === "failed" || l.status === "no_cases"
  ).length;
  const totalImported = logs.reduce((sum, l) => sum + l.cases_imported, 0);

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#999]">
          <Icon
            name="progress_activity"
            className="text-[24px] animate-spin"
          />
          <span className="text-sm">読み込み中...</span>
        </div>
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
          ADMIN / EMAIL INTAKE LOG
        </p>
        <h1 className="text-xl font-black text-navy">メール受信ログ</h1>
        <p className="text-[12px] text-[#888] mt-1">
          転送メールの取込履歴・添付ファイルを確認できます
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-border p-4">
          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider">
            受信数
          </p>
          <p className="text-2xl font-black text-navy mt-1">{totalLogs}</p>
        </div>
        <div className="bg-white border border-border p-4">
          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider">
            成功
          </p>
          <p className="text-2xl font-black text-[#10b981] mt-1">
            {successCount}
          </p>
        </div>
        <div className="bg-white border border-border p-4">
          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider">
            失敗
          </p>
          <p className="text-2xl font-black text-[#E15454] mt-1">
            {failedCount}
          </p>
        </div>
        <div className="bg-white border border-border p-4">
          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider">
            登録案件数
          </p>
          <p className="text-2xl font-black text-blue mt-1">{totalImported}</p>
        </div>
      </div>

      {/* Log list */}
      {logs.length === 0 ? (
        <div className="bg-white border border-border p-10 text-center">
          <Icon name="inbox" className="text-[36px] text-[#ccc] block mb-2" />
          <p className="text-[13px] text-[#888]">
            メール受信ログはまだありません
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[140px_1fr_1fr_100px_60px_50px_90px] gap-2 px-4 py-3 border-b border-border bg-[#fafafa]">
            <span className="text-[11px] font-bold text-[#888]">受信日時</span>
            <span className="text-[11px] font-bold text-[#888]">送信元</span>
            <span className="text-[11px] font-bold text-[#888]">件名</span>
            <span className="text-[11px] font-bold text-[#888]">
              抽出→登録
            </span>
            <span className="text-[11px] font-bold text-[#888]">重複</span>
            <span className="text-[11px] font-bold text-[#888]">
              <Icon name="attach_file" className="text-[14px]" />
            </span>
            <span className="text-[11px] font-bold text-[#888]">
              ステータス
            </span>
          </div>

          {logs.map((log) => (
            <div key={log.id}>
              <button
                onClick={() => toggleExpand(log.id)}
                className={`w-full text-left grid grid-cols-1 md:grid-cols-[140px_1fr_1fr_100px_60px_50px_90px] gap-2 px-4 py-3 border-b border-border/50 hover:bg-[#f9f9fc] transition-colors ${
                  expandedId === log.id ? "bg-[#f9f9fc]" : ""
                }`}
              >
                {/* 受信日時 */}
                <span className="text-[12px] text-[#555]">
                  {relativeTime(log.received_at)}
                </span>
                {/* 送信元 */}
                <span className="text-[12px] text-[#333] truncate">
                  {log.from_address || "—"}
                </span>
                {/* 件名 */}
                <span className="text-[12px] text-navy font-medium truncate">
                  {log.subject || "（件名なし）"}
                </span>
                {/* 抽出→登録 */}
                <span className="text-[12px] text-[#555]">
                  <span className="text-[#888]">{log.cases_extracted}</span>
                  <span className="text-[#ccc] mx-1">→</span>
                  <span
                    className={
                      log.cases_imported > 0
                        ? "font-bold text-[#10b981]"
                        : "text-[#888]"
                    }
                  >
                    {log.cases_imported}
                  </span>
                </span>
                {/* 重複 */}
                <span className="text-[12px] text-[#888]">
                  {log.duplicates_skipped > 0
                    ? `${log.duplicates_skipped}件`
                    : "—"}
                </span>
                {/* 添付 */}
                <span className="text-[12px] text-[#888]">
                  {log.attachments_count > 0 ? (
                    <span className="flex items-center gap-0.5">
                      <Icon name="attach_file" className="text-[14px] text-blue" />
                      <span className="text-blue font-bold">{log.attachments_count}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </span>
                {/* ステータス */}
                <span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      STATUS_STYLES[log.status] || STATUS_STYLES.failed
                    }`}
                  >
                    {STATUS_LABELS[log.status] || log.status}
                  </span>
                </span>
              </button>

              {/* Expanded detail */}
              {expandedId === log.id && (
                <div className="px-4 py-4 bg-[#fafafa] border-b border-border/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 左: メタ情報 */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 text-[12px]">
                        <span className="text-[#999] shrink-0 w-[80px]">
                          受信日時
                        </span>
                        <span className="text-[#333]">
                          {formatDate(log.received_at)}
                        </span>
                      </div>
                      <div className="flex gap-2 text-[12px]">
                        <span className="text-[#999] shrink-0 w-[80px]">
                          送信元
                        </span>
                        <span className="text-[#333]">
                          {log.from_address || "—"}
                        </span>
                      </div>
                      <div className="flex gap-2 text-[12px]">
                        <span className="text-[#999] shrink-0 w-[80px]">
                          件名
                        </span>
                        <span className="text-[#333]">
                          {log.subject || "—"}
                        </span>
                      </div>
                      {log.processing_time_ms != null && (
                        <div className="flex gap-2 text-[12px]">
                          <span className="text-[#999] shrink-0 w-[80px]">
                            処理時間
                          </span>
                          <span className="text-[#333]">
                            {log.processing_time_ms < 1000
                              ? `${log.processing_time_ms}ms`
                              : `${(log.processing_time_ms / 1000).toFixed(1)}秒`}
                          </span>
                        </div>
                      )}

                      {/* 紐付き案件 */}
                      {linkedCases[log.id] &&
                        linkedCases[log.id].length > 0 && (
                          <div className="mt-2">
                            <p className="text-[11px] font-bold text-[#888] mb-1">
                              登録された案件
                            </p>
                            <div className="flex flex-col gap-1">
                              {linkedCases[log.id].map((c) => (
                                <Link
                                  key={c.id}
                                  href="/dashboard/admin/cases"
                                  className="text-[12px] text-blue hover:underline"
                                >
                                  {c.title}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* 添付ファイル */}
                      {linkedAttachments[log.id] &&
                        linkedAttachments[log.id].length > 0 && (
                          <div className="mt-2">
                            <p className="text-[11px] font-bold text-[#888] mb-1">
                              添付ファイル
                            </p>
                            <div className="flex flex-col gap-1.5">
                              {linkedAttachments[log.id].map((att) => (
                                <button
                                  key={att.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(att.id);
                                  }}
                                  disabled={downloadingId === att.id}
                                  className="flex items-center gap-2 text-[12px] text-blue hover:underline text-left disabled:opacity-50"
                                >
                                  <Icon
                                    name="description"
                                    className="text-[16px] shrink-0"
                                  />
                                  <span className="truncate">
                                    {att.filename}
                                  </span>
                                  <span className="text-[10px] text-[#888] shrink-0">
                                    ({formatFileSize(att.file_size)})
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>

                    {/* 右: 本文プレビュー */}
                    <div>
                      {log.body_preview && (
                        <div>
                          <p className="text-[11px] font-bold text-[#888] mb-1">
                            メール本文（先頭500文字）
                          </p>
                          <pre className="text-[11px] text-[#555] whitespace-pre-wrap font-mono bg-white border border-border/50 p-3 rounded-lg max-h-[200px] overflow-y-auto">
                            {log.body_preview}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* エラー */}
                  {log.errors && log.errors.length > 0 && (
                    <div className="mt-3 bg-[#fef2f2] border border-[#E15454]/10 p-3 rounded-lg">
                      <p className="text-[11px] font-bold text-[#E15454] mb-1">
                        エラー
                      </p>
                      <ul className="text-[11px] text-[#c0392b] list-disc list-inside">
                        {log.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
