"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { maskEmail, maskPhone } from "@/lib/mask";
import type { Profile } from "@/lib/types";

interface ResumeInfo {
  id: string;
  user_id: string;
  filename: string;
  file_size: number | null;
  mime_type: string | null;
  is_primary: boolean;
  uploaded_at: string | null;
}

interface OnboardingField {
  key: string;
  label: string;
  icon: string;
  check: (u: Profile, resumes: ResumeInfo[]) => boolean;
}

const ONBOARDING_FIELDS: OnboardingField[] = [
  { key: "skills", label: "スキル", icon: "code", check: (u) => (u.skills?.length ?? 0) > 0 },
  { key: "bio", label: "自己紹介", icon: "person", check: (u) => !!u.bio },
  { key: "prefecture", label: "所在地", icon: "location_on", check: (u) => !!u.prefecture },
  { key: "years_experience", label: "経験年数", icon: "calendar_today", check: (u) => u.years_experience != null },
  { key: "rate", label: "希望単価", icon: "payments", check: (u) => u.hourly_rate_min != null || u.hourly_rate_max != null },
  { key: "remote", label: "勤務形態", icon: "home", check: (u) => !!u.remote_preference },
  { key: "resume", label: "レジュメ", icon: "description", check: (_u, resumes) => resumes.length > 0 },
];

function getOnboardingProgress(u: Profile, resumes: ResumeInfo[]) {
  const filled = ONBOARDING_FIELDS.filter((f) => f.check(u, resumes)).length;
  return { filled, total: ONBOARDING_FIELDS.length, pct: Math.round((filled / ONBOARDING_FIELDS.length) * 100) };
}

function OnboardingBadge({ pct }: { pct: number }) {
  if (pct === 100) return <span className="text-[10px] font-bold text-[#10b981] bg-[#f0fdf4] px-2 py-0.5">完了</span>;
  if (pct >= 50) return <span className="text-[10px] font-bold text-[#f59e0b] bg-[#fffbeb] px-2 py-0.5">{pct}%</span>;
  return <span className="text-[10px] font-bold text-[#ef4444] bg-[#fef2f2] px-2 py-0.5">{pct}%</span>;
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

/* ─── Resume Slide Panel ─── */
function ResumePanel({
  resumeId,
  filename: initialFilename,
  onClose,
}: {
  resumeId: string;
  filename?: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState(initialFilename || "");
  const [mimeType, setMimeType] = useState("");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/resumes/${resumeId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setError(
            errData.error || `レジュメの取得に失敗しました (${res.status})`
          );
          return;
        }
        const data = await res.json();
        setUrl(data.url);
        setFilename(data.filename || initialFilename || "resume.pdf");
        setMimeType(data.mime_type || "");
        setFileSize(data.file_size || null);
      } catch {
        setError("ネットワークエラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [resumeId, initialFilename]);

  const isPdf =
    mimeType === "application/pdf" ||
    filename.toLowerCase().endsWith(".pdf");

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[300] transition-opacity"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[700px] bg-white z-[301] shadow-[-4px_0_24px_rgba(0,0,0,0.12)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="description" className="text-[20px] text-navy" />
            <span className="text-[14px] font-bold text-navy truncate">
              {filename || "レジュメ"}
            </span>
            {fileSize && (
              <span className="text-[11px] text-[#999] shrink-0">
                ({formatFileSize(fileSize)})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <>
                <a
                  href={url}
                  download={filename}
                  className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold text-[#555] border border-border hover:bg-[#f5f5f5] transition-colors"
                >
                  <Icon name="download" className="text-[16px]" />
                  DL
                </a>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold text-[#555] border border-border hover:bg-[#f5f5f5] transition-colors"
                >
                  <Icon name="open_in_new" className="text-[16px]" />
                  別タブ
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[#999] hover:text-navy transition-colors"
            >
              <Icon name="close" className="text-[22px]" />
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <span className="inline-block w-6 h-6 border-2 border-blue border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-[13px] text-[#E15454] p-8 text-center">
              {error}
            </div>
          )}
          {!loading && !error && url && isPdf && (
            <iframe
              src={`${url}#toolbar=1`}
              className="w-full h-full border-none"
              title="Resume Preview"
            />
          )}
          {!loading && !error && url && !isPdf && (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <Icon
                name="description"
                className="text-[64px] text-[#ddd]"
              />
              <p className="text-[13px] text-[#888]">
                このファイル形式はプレビューできません
              </p>
              <a
                href={url}
                download={filename}
                className="px-5 py-2 bg-blue text-white text-[13px] font-bold hover:bg-blue-dark transition-colors"
              >
                ダウンロード
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resumeMap, setResumeMap] = useState<Record<string, ResumeInfo[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewResumeId, setPreviewResumeId] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"all" | "with_resume" | "no_resume" | "onboarding_complete" | "onboarding_partial" | "onboarding_new">("all");

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

      // Fetch users and resumes in parallel
      const [usersRes, resumesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, background, skills, avatar_url, bio, years_experience, hourly_rate_min, hourly_rate_max, linkedin_url, available_from, prefecture, remote_preference, profile_complete, is_admin, is_looking, created_at, updated_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("resumes")
          .select("id, user_id, filename, file_size, mime_type, is_primary, uploaded_at")
          .order("uploaded_at", { ascending: false }),
      ]);

      setUsers(usersRes.data ?? []);

      // Build resume map: user_id -> resumes[]
      const rMap: Record<string, ResumeInfo[]> = {};
      for (const r of (resumesRes.data ?? []) as ResumeInfo[]) {
        if (!rMap[r.user_id]) rMap[r.user_id] = [];
        rMap[r.user_id].push(r);
      }
      setResumeMap(rMap);
      setLoading(false);
    }
    fetchData();
  }, [router]);

  const filtered = users
    .filter((u) => {
      if (filterMode === "with_resume") return (resumeMap[u.id]?.length ?? 0) > 0;
      if (filterMode === "no_resume") return (resumeMap[u.id]?.length ?? 0) === 0;
      if (filterMode === "onboarding_complete") {
        return getOnboardingProgress(u, resumeMap[u.id] ?? []).pct === 100;
      }
      if (filterMode === "onboarding_partial") {
        const p = getOnboardingProgress(u, resumeMap[u.id] ?? []).pct;
        return p > 0 && p < 100;
      }
      if (filterMode === "onboarding_new") {
        return getOnboardingProgress(u, resumeMap[u.id] ?? []).pct === 0;
      }
      return true;
    })
    .filter((u) =>
      search
        ? u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.skills?.some((s) =>
            s.toLowerCase().includes(search.toLowerCase())
          )
        : true
    );

  const usersWithResume = users.filter(
    (u) => (resumeMap[u.id]?.length ?? 0) > 0
  ).length;

  // Onboarding stats
  const onboardingStats = users.reduce(
    (acc, u) => {
      const p = getOnboardingProgress(u, resumeMap[u.id] ?? []);
      if (p.pct === 100) acc.complete++;
      else if (p.pct > 0) acc.partial++;
      else acc.new++;
      return acc;
    },
    { complete: 0, partial: 0, new: 0 }
  );

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
        <Link
          href="/dashboard/admin"
          className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
        >
          ← 管理者TOP
        </Link>
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          ADMIN / USERS
        </p>
        <h1 className="text-xl font-black text-navy">ユーザー管理</h1>
        <p className="text-[12px] text-[#888] mt-1">
          {users.length}名の登録ユーザー（レジュメ登録: {usersWithResume}名）
        </p>

        {/* Onboarding aggregate stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { label: "登録者数", value: users.length, color: "text-navy" },
            { label: "オンボーディング完了", value: onboardingStats.complete, color: "text-[#10b981]" },
            { label: "入力途中", value: onboardingStats.partial, color: "text-[#f59e0b]" },
            { label: "未入力", value: onboardingStats.new, color: "text-[#ef4444]" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-border p-3 text-center">
              <p className={`text-[20px] font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-[#888] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="氏名、メール、スキルで検索..."
          className="w-full md:w-[400px] px-3 py-2 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
        />
        <div className="flex flex-wrap gap-2 ml-auto">
          {(["all", "with_resume", "no_resume", "onboarding_complete", "onboarding_partial", "onboarding_new"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterMode(f)}
              className={`px-3 py-1.5 text-[12px] font-bold border transition-colors ${
                filterMode === f
                  ? "bg-[#E15454] text-white border-[#E15454]"
                  : "bg-white text-[#666] border-border hover:border-[#E15454] hover:text-[#E15454]"
              }`}
            >
              {f === "all" ? "全員"
                : f === "with_resume" ? "レジュメあり"
                : f === "no_resume" ? "レジュメなし"
                : f === "onboarding_complete" ? "OB完了"
                : f === "onboarding_partial" ? "OB途中"
                : "OB未入力"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((u) => {
          const resumes = resumeMap[u.id] ?? [];
          const isExpanded = expandedId === u.id;
          const obProgress = getOnboardingProgress(u, resumes);

          return (
            <div
              key={u.id}
              className="bg-white border border-border p-4"
            >
              <div
                className="flex items-start justify-between gap-3 cursor-pointer"
                onClick={() =>
                  setExpandedId(isExpanded ? null : u.id)
                }
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[14px] font-bold text-navy">
                      {u.full_name || "名前未設定"}
                    </p>
                    {u.is_admin && (
                      <span className="text-[10px] font-bold text-[#E15454] bg-[#fef2f2] px-2 py-0.5">
                        管理者
                      </span>
                    )}
                    <OnboardingBadge pct={obProgress.pct} />
                    {resumes.length > 0 ? (
                      <span className="text-[10px] font-bold text-[#10b981] bg-[#f0fdf4] px-2 py-0.5 flex items-center gap-0.5">
                        <Icon
                          name="description"
                          className="text-[12px]"
                        />
                        レジュメ {resumes.length}件
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#aaa] bg-[#f5f5f5] px-2 py-0.5">
                        レジュメ未登録
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#888]">
                    {maskEmail(u.email)}
                    {u.phone && ` ・ ${maskPhone(u.phone)}`}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#888] mt-1">
                    {u.prefecture && (
                      <span>
                        <Icon
                          name="location_on"
                          className="text-[14px] align-middle"
                        />{" "}
                        {u.prefecture}
                      </span>
                    )}
                    {u.years_experience && (
                      <span>
                        <Icon
                          name="calendar_today"
                          className="text-[14px] align-middle"
                        />{" "}
                        経験{u.years_experience}年
                      </span>
                    )}
                    {u.remote_preference && (
                      <span>
                        <Icon
                          name="home"
                          className="text-[14px] align-middle"
                        />{" "}
                        {
                          {
                            remote_only: "フルリモート",
                            hybrid: "ハイブリッド",
                            onsite: "常駐",
                            any: "こだわりなし",
                          }[u.remote_preference]
                        }
                      </span>
                    )}
                    {u.created_at && (
                      <span>
                        登録:{" "}
                        {new Date(u.created_at).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                  </div>
                  {u.skills && u.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {u.skills.slice(0, 8).map((skill) => (
                        <span
                          key={skill}
                          className="text-[10px] text-blue bg-blue/10 px-2 py-0.5 font-bold"
                        >
                          {skill}
                        </span>
                      ))}
                      {u.skills.length > 8 && (
                        <span className="text-[10px] text-[#888]">
                          +{u.skills.length - 8}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {(u.hourly_rate_min || u.hourly_rate_max) && (
                    <p className="text-[12px] font-bold text-navy">
                      {u.hourly_rate_min ?? "?"}〜{u.hourly_rate_max ?? "?"}
                      万円
                    </p>
                  )}
                  <Icon
                    name={isExpanded ? "expand_less" : "expand_more"}
                    className="text-[20px] text-[#aaa]"
                  />
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border">
                  {/* Background */}
                  {u.background && (
                    <div className="mb-3">
                      <p className="text-[11px] font-bold text-[#888] mb-1">
                        バックグラウンド
                      </p>
                      <p className="text-[13px] text-navy">{u.background}</p>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <p className="text-[11px] font-bold text-[#888] mb-0.5">
                        メール
                      </p>
                      <p className="text-[13px] text-navy">{u.email}</p>
                    </div>
                    {u.phone && (
                      <div>
                        <p className="text-[11px] font-bold text-[#888] mb-0.5">
                          電話
                        </p>
                        <p className="text-[13px] text-navy">{u.phone}</p>
                      </div>
                    )}
                    {u.linkedin_url && (
                      <div>
                        <p className="text-[11px] font-bold text-[#888] mb-0.5">
                          LinkedIn
                        </p>
                        <a
                          href={u.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] text-blue hover:underline"
                        >
                          プロフィール
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  {u.bio && (
                    <div className="mb-3">
                      <p className="text-[11px] font-bold text-[#888] mb-1">
                        自己紹介
                      </p>
                      <p className="text-[13px] text-navy whitespace-pre-wrap">
                        {u.bio}
                      </p>
                    </div>
                  )}

                  {/* Resumes */}
                  <div className="mb-3">
                    <p className="text-[11px] font-bold text-[#888] mb-1">
                      レジュメ
                    </p>
                    {resumes.length === 0 ? (
                      <p className="text-[12px] text-[#aaa]">
                        レジュメが登録されていません
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {resumes.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => {
                              setPreviewResumeId(r.id);
                              setPreviewFilename(r.filename);
                            }}
                            className="flex items-center gap-2 p-2 bg-[#f8f8f8] hover:bg-blue/5 transition-colors text-left group"
                          >
                            <Icon
                              name={
                                r.mime_type === "application/pdf"
                                  ? "picture_as_pdf"
                                  : "description"
                              }
                              className="text-[18px] text-[#E15454] group-hover:text-blue"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-navy truncate group-hover:text-blue">
                                {r.filename}
                              </p>
                              <p className="text-[11px] text-[#888]">
                                {r.file_size
                                  ? `${(r.file_size / 1024).toFixed(0)} KB`
                                  : ""}
                                {r.is_primary && (
                                  <span className="ml-1 text-[#10b981] font-bold">
                                    プライマリ
                                  </span>
                                )}
                                {r.uploaded_at && (
                                  <span className="ml-2">
                                    {new Date(
                                      r.uploaded_at
                                    ).toLocaleDateString("ja-JP")}
                                  </span>
                                )}
                              </p>
                            </div>
                            <Icon
                              name="visibility"
                              className="text-[16px] text-[#aaa] group-hover:text-blue"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Onboarding Detail Checklist */}
                  <div className="mb-3">
                    <p className="text-[11px] font-bold text-[#888] mb-2">
                      オンボーディング進捗 ({obProgress.filled}/{obProgress.total})
                    </p>
                    <div className="w-full bg-[#f0f0f0] h-1.5 mb-2">
                      <div
                        className={`h-full transition-all ${
                          obProgress.pct === 100 ? "bg-[#10b981]" : obProgress.pct >= 50 ? "bg-[#f59e0b]" : "bg-[#ef4444]"
                        }`}
                        style={{ width: `${obProgress.pct}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ONBOARDING_FIELDS.map((f) => {
                        const done = f.check(u, resumes);
                        return (
                          <span
                            key={f.key}
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 ${
                              done
                                ? "text-[#10b981] bg-[#f0fdf4] font-bold"
                                : "text-[#bbb] bg-[#f8f8f8]"
                            }`}
                          >
                            <Icon name={done ? "check_circle" : f.icon} className="text-[13px]" />
                            {f.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="flex flex-wrap gap-4 text-[11px] text-[#aaa]">
                    {u.available_from && (
                      <span>
                        稼働可能:{" "}
                        {new Date(u.available_from).toLocaleDateString(
                          "ja-JP"
                        )}
                      </span>
                    )}
                    <span>案件探し中: {u.is_looking ? "はい" : "いいえ"}</span>
                    {u.updated_at && (
                      <span>
                        最終更新:{" "}
                        {new Date(u.updated_at).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resume Preview Panel */}
      {previewResumeId && (
        <ResumePanel
          resumeId={previewResumeId}
          filename={previewFilename}
          onClose={() => {
            setPreviewResumeId(null);
            setPreviewFilename("");
          }}
        />
      )}
    </div>
  );
}
