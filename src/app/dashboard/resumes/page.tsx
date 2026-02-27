"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Resume } from "@/lib/types";

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fetchResumes = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    const { data } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });
    setResumes(data ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  async function uploadFile(file: File) {
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "アップロードに失敗しました");
        return;
      }
      await fetchResumes();
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleDelete(id: string) {
    if (!confirm("このレジュメを削除しますか？")) return;
    const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchResumes();
    }
  }

  async function setPrimary(id: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    // Unset all primary
    await supabase
      .from("resumes")
      .update({ is_primary: false })
      .eq("user_id", user.id);
    // Set new primary
    await supabase
      .from("resumes")
      .update({ is_primary: true })
      .eq("id", id);
    await fetchResumes();
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1">
          RESUMES
        </p>
        <h1 className="text-xl font-black text-navy">レジュメ管理</h1>
        <p className="text-[12px] text-[#888] mt-1">
          PDF または Word ファイル（最大10MB、5件まで）
        </p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`bg-white border-2 border-dashed p-8 text-center mb-5 transition-colors ${
          dragOver
            ? "border-blue bg-blue/5"
            : "border-border hover:border-[#ccc]"
        }`}
      >
        {uploading ? (
          <p className="text-[14px] text-blue font-bold">アップロード中...</p>
        ) : (
          <>
            <p className="text-[32px] mb-2">📄</p>
            <p className="text-[13px] font-bold text-navy mb-2">
              ファイルをドラッグ＆ドロップ
            </p>
            <p className="text-[11px] text-[#888] mb-3">
              または
            </p>
            <label className="inline-block px-6 py-2.5 bg-blue text-white text-[13px] font-bold cursor-pointer hover:bg-blue-dark transition-colors">
              ファイルを選択
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </>
        )}
      </div>

      {error && (
        <p className="text-[12px] text-[#E15454] mb-4">{error}</p>
      )}

      {/* Resume list */}
      {resumes.length === 0 ? (
        <div className="bg-white border border-border p-8 text-center">
          <p className="text-[13px] text-[#888]">
            レジュメがまだアップロードされていません
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="bg-white border border-border p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-[#f5f5f5] flex items-center justify-center shrink-0">
                <span className="text-lg">
                  {resume.mime_type === "application/pdf" ? "📕" : "📘"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-navy truncate">
                    {resume.filename}
                  </p>
                  {resume.is_primary && (
                    <span className="text-[10px] font-bold text-blue bg-blue/10 px-2 py-0.5 shrink-0">
                      メイン
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#888] mt-0.5">
                  {formatSize(resume.file_size)}
                  {resume.uploaded_at &&
                    ` ・ ${new Date(resume.uploaded_at).toLocaleDateString("ja-JP")}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!resume.is_primary && (
                  <button
                    onClick={() => setPrimary(resume.id)}
                    className="text-[11px] text-blue hover:underline"
                  >
                    メインに設定
                  </button>
                )}
                <a
                  href={`/api/resumes/${resume.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#666] hover:underline"
                >
                  ダウンロード
                </a>
                <button
                  onClick={() => handleDelete(resume.id)}
                  className="text-[11px] text-[#E15454] hover:underline"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
