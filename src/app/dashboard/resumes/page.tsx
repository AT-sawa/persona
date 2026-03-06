"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Resume } from "@/lib/types";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

interface ParseResult {
  skills: string[];
  experiences: {
    company_name: string;
    role: string;
    industry: string;
    start_date: string;
    end_date: string | null;
    is_current: boolean;
    description: string;
    skills_used: string[];
  }[];
  preview: string;
}

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
      .select("id, user_id, filename, file_path, file_size, mime_type, is_primary, uploaded_at")
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
    setSuccess("");
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
      setSuccess("アップロードが完了しました");
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
    await supabase
      .from("resumes")
      .update({ is_primary: false })
      .eq("user_id", user.id);
    await supabase
      .from("resumes")
      .update({ is_primary: true })
      .eq("id", id);
    await fetchResumes();
  }

  async function handleParse(resumeId: string) {
    setError("");
    setSuccess("");
    setParsing(resumeId);
    setParseResult(null);
    try {
      const res = await fetch("/api/resumes/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "解析に失敗しました");
        return;
      }
      setParseResult(data);
    } catch {
      setError("解析に失敗しました");
    } finally {
      setParsing(null);
    }
  }

  async function handleApply() {
    if (!parseResult) return;
    setApplying(true);
    setError("");
    try {
      const res = await fetch("/api/resumes/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: parseResult.skills,
          experiences: parseResult.experiences,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "反映に失敗しました");
        return;
      }
      setSuccess("スキルと職務経歴をプロフィールに反映しました");
      setParseResult(null);
    } catch {
      setError("反映に失敗しました");
    } finally {
      setApplying(false);
    }
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#999]">
          <Icon name="progress_activity" className="text-[24px] animate-spin" />
          <span className="text-sm">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-navy">レジュメ管理</h1>
        <p className="text-[13px] text-[#888] mt-1">
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
        className={`bg-white rounded-2xl border-2 border-dashed p-8 text-center mb-6 transition-all ${
          dragOver
            ? "border-blue bg-blue/5 scale-[1.01]"
            : "border-border hover:border-[#ccc]"
        }`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-3">
            <Icon name="progress_activity" className="text-[24px] text-blue animate-spin" />
            <p className="text-[14px] text-blue font-bold">アップロード中...</p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue/8 flex items-center justify-center mb-3">
              <Icon name="upload_file" className="text-[28px] text-blue" />
            </div>
            <p className="text-[14px] font-bold text-navy mb-1">
              ファイルをドラッグ＆ドロップ
            </p>
            <p className="text-[12px] text-[#888] mb-4">または</p>
            <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue text-white text-[13px] font-bold cursor-pointer rounded-xl hover:bg-blue-dark transition-colors">
              <Icon name="attach_file" className="text-[18px]" />
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
        <div className="flex items-center gap-2 text-[12px] text-[#E15454] mb-4 bg-[#fef2f2] rounded-xl p-3">
          <Icon name="error" className="text-[18px]" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-[12px] text-[#10b981] mb-4 bg-[#ecfdf5] rounded-xl p-3">
          <Icon name="check_circle" className="text-[18px]" />
          {success}
        </div>
      )}

      {/* Parse results */}
      {parseResult && (
        <div className="bg-white rounded-2xl border border-[#8b5cf6]/30 p-6 mb-6 shadow-[0_2px_8px_rgba(139,92,246,0.08)]">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="auto_awesome" className="text-[20px] text-[#8b5cf6]" />
            <h3 className="text-[15px] font-bold text-navy">解析結果</h3>
          </div>

          {parseResult.skills.length > 0 && (
            <div className="mb-4">
              <p className="text-[12px] font-bold text-[#888] mb-2">
                検出されたスキル ({parseResult.skills.length}件)
              </p>
              <div className="flex flex-wrap gap-2">
                {parseResult.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[12px] px-3 py-1 bg-blue/8 text-blue rounded-lg font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {parseResult.experiences.length > 0 && (
            <div className="mb-4">
              <p className="text-[12px] font-bold text-[#888] mb-2">
                検出された経歴 ({parseResult.experiences.length}件)
              </p>
              <div className="flex flex-col gap-2">
                {parseResult.experiences.map((exp, i) => (
                  <div key={i} className="text-[12px] p-3 bg-[#f5f7fa] rounded-xl">
                    <p className="font-bold text-navy">{exp.company_name}</p>
                    <p className="text-[#888]">
                      {exp.role}
                      {exp.is_current && (
                        <span className="text-[#10b981] ml-2">現職</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue text-white text-[13px] font-bold rounded-xl hover:bg-blue-dark transition-colors disabled:opacity-50"
            >
              <Icon name="check" className="text-[18px]" />
              {applying ? "反映中..." : "プロフィールに反映"}
            </button>
            <button
              onClick={() => setParseResult(null)}
              className="px-5 py-2.5 text-[13px] text-[#888] border border-border rounded-xl hover:bg-[#f5f5f5] transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Resume list */}
      {resumes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border/60 p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f5f7fa] flex items-center justify-center mb-3">
            <Icon name="description" className="text-[28px] text-[#ccc]" />
          </div>
          <p className="text-[13px] text-[#888]">
            レジュメがまだアップロードされていません
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="bg-white rounded-2xl border border-border/60 p-4 flex items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="w-11 h-11 rounded-xl bg-[#f5f7fa] flex items-center justify-center shrink-0">
                <Icon
                  name={
                    resume.mime_type === "application/pdf"
                      ? "picture_as_pdf"
                      : "article"
                  }
                  className={`text-[22px] ${
                    resume.mime_type === "application/pdf"
                      ? "text-[#E15454]"
                      : "text-blue"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-navy truncate">
                    {resume.filename}
                  </p>
                  {resume.is_primary && (
                    <span className="text-[10px] font-bold text-blue bg-blue/8 px-2 py-0.5 rounded shrink-0">
                      メイン
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#888] mt-0.5">
                  {formatSize(resume.file_size)}
                  {resume.uploaded_at &&
                    ` / ${new Date(resume.uploaded_at).toLocaleDateString("ja-JP")}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleParse(resume.id)}
                  disabled={parsing === resume.id}
                  className="flex items-center gap-1 text-[11px] text-[#8b5cf6] hover:bg-[#8b5cf6]/8 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  title="スキル・経歴を自動読み取り"
                >
                  <Icon name="auto_awesome" className="text-[16px]" />
                  {parsing === resume.id ? "解析中..." : "解析"}
                </button>
                {!resume.is_primary && (
                  <button
                    onClick={() => setPrimary(resume.id)}
                    className="text-[11px] text-blue hover:bg-blue/8 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    メインに設定
                  </button>
                )}
                <a
                  href={`/api/resumes/${resume.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-[11px] text-[#666] hover:bg-[#f5f5f5] px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Icon name="download" className="text-[16px]" />
                </a>
                <button
                  onClick={() => handleDelete(resume.id)}
                  className="flex items-center text-[11px] text-[#E15454] hover:bg-[#fef2f2] px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Icon name="delete" className="text-[16px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
