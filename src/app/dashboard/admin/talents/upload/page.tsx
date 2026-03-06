"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface FileEntry {
  file: File;
  hash: string;
  status: "pending" | "hashing" | "uploading" | "success" | "duplicate" | "error";
  message?: string;
  talentName?: string;
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function AdminTalentUploadPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [sourceName, setSourceName] = useState("PDF Upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldContinueRef = useRef(true);
  const processingRef = useRef(false);

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

  const addFiles = useCallback(async (newFiles: File[]) => {
    const pdfFiles = newFiles.filter((f) => f.type === "application/pdf");
    if (pdfFiles.length === 0) return;

    // Add files with hashing status
    const entries: FileEntry[] = pdfFiles.map((f) => ({
      file: f,
      hash: "",
      status: "hashing" as const,
    }));

    setFiles((prev) => [...prev, ...entries]);

    // Compute hashes one by one
    for (let i = 0; i < pdfFiles.length; i++) {
      try {
        const hash = await computeFileHash(pdfFiles[i]);
        setFiles((prev) => {
          const updated = [...prev];
          // Find the entry for this file (matching by File object reference)
          const idx = updated.findIndex(
            (e) => e.file === pdfFiles[i] && e.status === "hashing"
          );
          if (idx !== -1) {
            // Check for duplicate in existing entries
            const isDup = updated.some(
              (e, j) => j !== idx && e.hash === hash && e.status !== "error"
            );
            if (isDup) {
              updated[idx] = {
                ...updated[idx],
                hash,
                status: "duplicate",
                message: "同一ファイルが既にリストにあります",
              };
            } else {
              updated[idx] = { ...updated[idx], hash, status: "pending" };
            }
          }
          return updated;
        });
      } catch {
        setFiles((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex(
            (e) => e.file === pdfFiles[i] && e.status === "hashing"
          );
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              status: "error",
              message: "ハッシュ計算に失敗",
            };
          }
          return updated;
        });
      }
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files));
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const uploadOneFile = useCallback(
    async (entry: FileEntry, index: number) => {
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: "uploading" };
        return updated;
      });

      try {
        const formData = new FormData();
        formData.append("file", entry.file);
        formData.append("fileHash", entry.hash);
        formData.append("sourceName", sourceName);

        const res = await fetch("/api/admin/talents/upload-resume", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setFiles((prev) => {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              status: "error",
              message: data.error || "アップロード失敗",
            };
            return updated;
          });
          return;
        }

        if (data.status === "duplicate") {
          setFiles((prev) => {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              status: "duplicate",
              message: data.message,
              talentName: data.existingName,
            };
            return updated;
          });
          return;
        }

        setFiles((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status: "success",
            message: data.message,
            talentName: data.talent?.name || null,
          };
          return updated;
        });
      } catch {
        setFiles((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status: "error",
            message: "ネットワークエラー",
          };
          return updated;
        });
      }
    },
    [sourceName]
  );

  const startProcessing = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setIsPaused(false);
    shouldContinueRef.current = true;

    const CONCURRENCY = 3;
    let nextIndex = 0;

    // Get current files snapshot for index tracking
    const getNextPendingIndex = (): number => {
      // Need to read from state directly
      let idx = -1;
      setFiles((prev) => {
        for (let i = nextIndex; i < prev.length; i++) {
          if (prev[i].status === "pending") {
            idx = i;
            nextIndex = i + 1;
            break;
          }
        }
        return prev; // no mutation
      });
      return idx;
    };

    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (shouldContinueRef.current) {
        const idx = getNextPendingIndex();
        if (idx === -1) break;

        // Read entry from state
        let entry: FileEntry | null = null;
        setFiles((prev) => {
          entry = prev[idx];
          return prev;
        });

        if (entry && (entry as FileEntry).status === "pending") {
          await uploadOneFile(entry as FileEntry, idx);
        }
      }
    });

    await Promise.all(workers);

    processingRef.current = false;
    setIsProcessing(false);
    setIsPaused(false);
  }, [uploadOneFile]);

  const pauseProcessing = useCallback(() => {
    shouldContinueRef.current = false;
    setIsPaused(true);
  }, []);

  const removeFile = useCallback(
    (index: number) => {
      if (isProcessing) return;
      setFiles((prev) => prev.filter((_, i) => i !== index));
    },
    [isProcessing]
  );

  const clearCompleted = useCallback(() => {
    setFiles((prev) =>
      prev.filter(
        (f) =>
          f.status !== "success" &&
          f.status !== "duplicate" &&
          f.status !== "error"
      )
    );
  }, []);

  const retryErrors = useCallback(() => {
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "error" ? { ...f, status: "pending" as const, message: undefined } : f
      )
    );
  }, []);

  // Stats
  const stats = {
    total: files.length,
    pending: files.filter((f) => f.status === "pending" || f.status === "hashing").length,
    uploading: files.filter((f) => f.status === "uploading").length,
    success: files.filter((f) => f.status === "success").length,
    duplicate: files.filter((f) => f.status === "duplicate").length,
    error: files.filter((f) => f.status === "error").length,
  };
  const processed = stats.success + stats.duplicate + stats.error;
  const progressPct =
    stats.total > 0 ? Math.round((processed / stats.total) * 100) : 0;

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
          href="/dashboard/admin/talents"
          className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
        >
          ← 外部人材DB
        </Link>
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          ADMIN / TALENTS / UPLOAD
        </p>
        <h1 className="text-xl font-black text-navy">
          PDF一括アップロード
        </h1>
        <p className="text-[12px] text-[#888] mt-1">
          職務経歴書（PDF）をドラッグ＆ドロップで一括登録。AIが自動でプロフィールを生成します。
        </p>
      </div>

      {/* Source Name */}
      <div className="bg-white border border-border p-4 mb-4">
        <label className="block text-[11px] font-bold text-[#888] mb-1">
          ソース名（分類用）
        </label>
        <input
          type="text"
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          placeholder="例: 自社DB、パートナーA"
          className="w-full max-w-xs px-3 py-2 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
          disabled={isProcessing}
        />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`border-2 border-dashed p-12 text-center cursor-pointer transition-colors mb-4 ${
          isDragOver
            ? "border-blue bg-blue/5"
            : "border-[#ccc] bg-[#fafafa] hover:border-blue hover:bg-blue/3"
        } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Icon
          name="upload_file"
          className="text-[48px] text-[#bbb] block mx-auto mb-2"
        />
        <p className="text-[14px] font-bold text-navy mb-1">
          PDFファイルをドラッグ＆ドロップ
        </p>
        <p className="text-[12px] text-[#888]">
          またはクリックしてファイルを選択（複数選択可）
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Progress Bar & Stats */}
      {files.length > 0 && (
        <>
          <div className="bg-white border border-border p-4 mb-4">
            {/* Progress bar */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-2 bg-[#eee] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue transition-all duration-300 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[13px] font-bold text-navy shrink-0">
                {progressPct}%
              </span>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 text-[12px]">
              <span className="text-[#888]">
                全体: <span className="font-bold text-navy">{stats.total}</span>件
              </span>
              {stats.uploading > 0 && (
                <span className="text-blue">
                  <Icon name="sync" className="text-[14px] align-middle animate-spin mr-0.5" />
                  処理中: {stats.uploading}
                </span>
              )}
              {stats.success > 0 && (
                <span className="text-[#10b981]">
                  <Icon name="check_circle" className="text-[14px] align-middle mr-0.5" />
                  成功: {stats.success}
                </span>
              )}
              {stats.duplicate > 0 && (
                <span className="text-[#f59e0b]">
                  <Icon name="content_copy" className="text-[14px] align-middle mr-0.5" />
                  重複: {stats.duplicate}
                </span>
              )}
              {stats.error > 0 && (
                <span className="text-[#E15454]">
                  <Icon name="error" className="text-[14px] align-middle mr-0.5" />
                  エラー: {stats.error}
                </span>
              )}
              {stats.pending > 0 && (
                <span className="text-[#888]">
                  待機: {stats.pending}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              {!isProcessing && stats.pending > 0 && (
                <button
                  onClick={startProcessing}
                  className="px-5 py-2 bg-[#E15454] text-white text-[13px] font-bold hover:bg-[#d04343] transition-colors flex items-center gap-1.5"
                >
                  <Icon name="play_arrow" className="text-[18px]" />
                  {processed > 0 ? "再開" : "アップロード開始"}
                </button>
              )}
              {isProcessing && !isPaused && (
                <button
                  onClick={pauseProcessing}
                  className="px-5 py-2 bg-[#f59e0b] text-white text-[13px] font-bold hover:bg-[#d97706] transition-colors flex items-center gap-1.5"
                >
                  <Icon name="pause" className="text-[18px]" />
                  一時停止
                </button>
              )}
              {isPaused && (
                <button
                  onClick={startProcessing}
                  className="px-5 py-2 bg-[#E15454] text-white text-[13px] font-bold hover:bg-[#d04343] transition-colors flex items-center gap-1.5"
                >
                  <Icon name="play_arrow" className="text-[18px]" />
                  再開
                </button>
              )}
              {stats.error > 0 && !isProcessing && (
                <button
                  onClick={retryErrors}
                  className="px-4 py-2 bg-white text-[#E15454] text-[12px] font-bold border border-[#E15454] hover:bg-[#fef2f2] transition-colors flex items-center gap-1"
                >
                  <Icon name="refresh" className="text-[16px]" />
                  エラーを再試行
                </button>
              )}
              {processed > 0 && !isProcessing && (
                <button
                  onClick={clearCompleted}
                  className="px-4 py-2 bg-white text-[#666] text-[12px] font-bold border border-border hover:bg-[#f5f5f5] transition-colors"
                >
                  完了分をクリア
                </button>
              )}
            </div>
          </div>

          {/* File List */}
          <div className="flex flex-col gap-1">
            {files.map((entry, i) => (
              <div
                key={`${entry.file.name}-${i}`}
                className={`bg-white border p-3 flex items-center gap-3 text-[13px] ${
                  entry.status === "success"
                    ? "border-[#10b981]/30 bg-[#f0fdf4]"
                    : entry.status === "duplicate"
                      ? "border-[#f59e0b]/30 bg-[#fffbeb]"
                      : entry.status === "error"
                        ? "border-[#E15454]/30 bg-[#fef2f2]"
                        : entry.status === "uploading"
                          ? "border-blue/30 bg-blue/5"
                          : "border-border"
                }`}
              >
                {/* Status icon */}
                <div className="shrink-0 w-6 text-center">
                  {entry.status === "hashing" && (
                    <span className="inline-block w-4 h-4 border-2 border-[#aaa] border-t-transparent rounded-full animate-spin" />
                  )}
                  {entry.status === "pending" && (
                    <Icon name="schedule" className="text-[18px] text-[#aaa]" />
                  )}
                  {entry.status === "uploading" && (
                    <span className="inline-block w-4 h-4 border-2 border-blue border-t-transparent rounded-full animate-spin" />
                  )}
                  {entry.status === "success" && (
                    <Icon name="check_circle" className="text-[18px] text-[#10b981]" />
                  )}
                  {entry.status === "duplicate" && (
                    <Icon name="content_copy" className="text-[18px] text-[#f59e0b]" />
                  )}
                  {entry.status === "error" && (
                    <Icon name="error" className="text-[18px] text-[#E15454]" />
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-navy truncate">
                    {entry.file.name}
                  </p>
                  <p className="text-[11px] text-[#888]">
                    {(entry.file.size / 1024).toFixed(0)} KB
                    {entry.talentName && (
                      <span className="ml-2 text-[#10b981] font-bold">
                        → {entry.talentName}
                      </span>
                    )}
                    {entry.message && (
                      <span
                        className={`ml-2 ${
                          entry.status === "error"
                            ? "text-[#E15454]"
                            : entry.status === "duplicate"
                              ? "text-[#f59e0b]"
                              : "text-[#888]"
                        }`}
                      >
                        {entry.message}
                      </span>
                    )}
                  </p>
                </div>

                {/* Remove button */}
                {!isProcessing && entry.status !== "uploading" && (
                  <button
                    onClick={() => removeFile(i)}
                    className="shrink-0 p-1 text-[#aaa] hover:text-[#E15454] transition-colors"
                    title="削除"
                  >
                    <Icon name="close" className="text-[18px]" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {files.length === 0 && (
        <div className="bg-white border border-border p-8 text-center">
          <Icon
            name="description"
            className="text-[48px] text-[#ddd] block mb-2"
          />
          <p className="text-[13px] text-[#888]">
            PDFファイルをドロップするか、上のエリアをクリックして選択してください
          </p>
          <p className="text-[11px] text-[#aaa] mt-1">
            1ファイルずつAIで解析するため、大量のファイルでもタイムアウトしません
          </p>
        </div>
      )}
    </div>
  );
}
