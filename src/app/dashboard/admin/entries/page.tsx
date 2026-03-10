"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { maskEmail } from "@/lib/mask";
import { calculateScore } from "@/lib/matching/calculateScore";
import type { Case, Profile, UserPreferences, UserExperience } from "@/lib/types";

interface AdminEntry {
  id: string;
  case_id: string;
  user_id: string;
  status: string;
  message: string | null;
  resume_id: string | null;
  created_at: string | null;
  cases?: {
    title: string;
    fee: string | null;
    category: string | null;
    industry: string | null;
    occupancy: string | null;
    start_date: string | null;
    location: string | null;
    office_days: string | null;
    description: string | null;
    must_req: string | null;
    nice_to_have: string | null;
    background: string | null;
    extendable: string | null;
  };
  profiles?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    background: string | null;
    bio: string | null;
    skills: string[] | null;
    prefecture: string | null;
    years_experience: number | null;
    available_from: string | null;
    is_looking: boolean | null;
    hourly_rate_min: number | null;
    hourly_rate_max: number | null;
    remote_preference: string | null;
  };
  resumes?: {
    id: string;
    filename: string;
    file_size: number | null;
  }[];
}

interface DuplicateMatch {
  existingId: string;
  existingName: string | null;
  existingEmail: string | null;
  similarity: number;
  matchType: string;
  matchedFields: string[];
  created_at: string | null;
}

interface DuplicateGroup {
  person: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string | null;
  };
  matches: DuplicateMatch[];
}

const STATUS_OPTIONS = [
  { value: "pending", label: "審査中" },
  { value: "reviewing", label: "書類選考中" },
  { value: "accepted", label: "承認済" },
  { value: "rejected", label: "不採用" },
];

const REMOTE_LABELS: Record<string, string> = {
  remote_only: "フルリモート",
  hybrid: "ハイブリッド",
  onsite: "常駐",
  any: "こだわりなし",
};

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact_email: "メール一致",
  exact_phone: "電話番号一致",
  fuzzy_name: "名前類似",
  name_and_partial: "名前＋部分一致",
};

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[12px]">
      <span className="text-[#999] shrink-0 w-[100px]">{label}</span>
      <span className={highlight ? "text-navy font-bold" : "text-[#333]"}>
        {value}
      </span>
    </div>
  );
}

function Tag({
  children,
  color = "gray",
}: {
  children: React.ReactNode;
  color?: "gray" | "blue" | "green" | "navy";
}) {
  const cls = {
    gray: "bg-[#f0f2f5] text-[#555]",
    blue: "bg-[#EBF7FD] text-blue",
    green: "bg-[#ecfdf5] text-[#10b981]",
    navy: "bg-navy/8 text-navy",
  }[color];
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${cls}`}>
      {children}
    </span>
  );
}

/* ─── Resume Slide Panel ─── */
function ResumePanel({
  resumeId,
  onClose,
}: {
  resumeId: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [iframeFailed, setIframeFailed] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/resumes/${resumeId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || `レジュメの取得に失敗しました (${res.status})`);
          return;
        }
        const data = await res.json();
        setUrl(data.url);
        setFilename(data.filename || "resume.pdf");
        setMimeType(data.mime_type || "");
        setFileSize(data.file_size || null);
      } catch {
        setError("ネットワークエラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [resumeId]);

  const isPdf = mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  const isImage = mimeType?.startsWith("image/");
  const canPreview = isPdf || isImage;

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
      <div className="fixed top-0 right-0 h-full w-full max-w-[700px] bg-white z-[301] shadow-[-4px_0_24px_rgba(0,0,0,0.12)] flex flex-col animate-[slideIn_0.25s_ease-out]">
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
                  className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold text-[#555] border border-border rounded hover:bg-[#f5f5f5] transition-colors"
                >
                  <Icon name="download" className="text-[16px]" />
                  DL
                </a>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold text-blue border border-blue rounded hover:bg-blue/5 transition-colors"
                >
                  <Icon name="open_in_new" className="text-[16px]" />
                  新規タブ
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#f5f5f5] rounded-lg transition-colors"
            >
              <Icon name="close" className="text-[22px] text-[#666]" />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-hidden bg-[#f5f5f5]">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-[#888] text-sm flex items-center gap-2">
                <Icon
                  name="progress_activity"
                  className="text-[20px] animate-spin"
                />
                読み込み中...
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Icon name="error" className="text-[32px] text-[#E15454] mb-2" />
                <p className="text-[#E15454] text-sm">{error}</p>
              </div>
            </div>
          )}
          {url && !error && !loading && (
            <>
              {/* PDF: try iframe, show fallback if it fails */}
              {isPdf && !iframeFailed && (
                <iframe
                  src={`${url}#toolbar=1&navpanes=0`}
                  className="w-full h-full border-none bg-white"
                  title="Resume PDF"
                  onError={() => setIframeFailed(true)}
                />
              )}
              {/* Image: show directly */}
              {isImage && (
                <div className="flex items-center justify-center h-full p-4 overflow-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={filename}
                    className="max-w-full max-h-full object-contain rounded shadow"
                  />
                </div>
              )}
              {/* Fallback for PDF iframe failure or non-previewable files */}
              {(iframeFailed || !canPreview) && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center bg-white p-8 rounded-xl shadow-sm max-w-sm">
                    <Icon name="description" className="text-[48px] text-navy/40 mb-3" />
                    <p className="text-[14px] font-bold text-navy mb-1">{filename}</p>
                    {fileSize && (
                      <p className="text-[12px] text-[#999] mb-4">
                        {formatFileSize(fileSize)}
                      </p>
                    )}
                    <p className="text-[12px] text-[#888] mb-4">
                      {iframeFailed
                        ? "ブラウザでのプレビューに対応していません"
                        : "このファイル形式はプレビューできません"}
                    </p>
                    <div className="flex gap-2 justify-center">
                      <a
                        href={url}
                        download={filename}
                        className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-navy rounded-lg hover:bg-navy/90 transition-colors"
                      >
                        <Icon name="download" className="text-[18px]" />
                        ダウンロード
                      </a>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-blue border border-blue rounded-lg hover:bg-blue/5 transition-colors"
                      >
                        <Icon name="open_in_new" className="text-[18px]" />
                        新規タブで開く
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Main Page ─── */
export default function AdminEntriesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resumePanelId, setResumePanelId] = useState<string | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [dedupLoading, setDedupLoading] = useState(false);
  const [showDedup, setShowDedup] = useState(false);
  const [userPrefs, setUserPrefs] = useState<Record<string, UserPreferences>>({});
  const [userExps, setUserExps] = useState<Record<string, UserExperience[]>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clients, setClients] = useState<{ id: string; full_name: string | null; company_name: string | null }[]>([]);
  const [proposalTarget, setProposalTarget] = useState<AdminEntry | null>(null);
  const [proposalCreating, setProposalCreating] = useState(false);
  // Manual matching state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [allCases, setAllCases] = useState<{ id: string; title: string; fee: string | null; category: string | null }[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; full_name: string | null; email: string | null; background: string | null }[]>([]);
  const [manualCaseId, setManualCaseId] = useState("");
  const [manualUserId, setManualUserId] = useState("");
  const [manualMessage, setManualMessage] = useState("");
  const [manualCreating, setManualCreating] = useState(false);
  const [caseSearch, setCaseSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const fetchDuplicates = useCallback(async () => {
    setDedupLoading(true);
    try {
      const res = await fetch("/api/admin/dedup");
      if (res.ok) {
        const data = await res.json();
        setDuplicateGroups(data.groups ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setDedupLoading(false);
    }
  }, []);

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

      // Fetch entries with all related data
      const { data } = await supabase
        .from("entries")
        .select(
          "*, cases(title, fee, category, industry, occupancy, start_date, location, office_days, description, must_req, nice_to_have, background, extendable), profiles!entries_user_id_fkey(full_name, email, phone, background, bio, skills, prefecture, years_experience, available_from, is_looking, hourly_rate_min, hourly_rate_max, remote_preference)"
        )
        .order("created_at", { ascending: false });

      const entriesData = (data as AdminEntry[]) ?? [];

      // Fetch resumes for each user
      const userIds = [
        ...new Set(entriesData.map((e) => e.user_id).filter(Boolean)),
      ];
      if (userIds.length > 0) {
        const [{ data: allResumes }, { data: allPrefs }, { data: allExps }] = await Promise.all([
          supabase
            .from("resumes")
            .select("id, user_id, filename, file_size")
            .in("user_id", userIds),
          supabase
            .from("user_preferences")
            .select("*")
            .in("user_id", userIds),
          supabase
            .from("user_experiences")
            .select("*")
            .in("user_id", userIds)
            .order("sort_order", { ascending: true }),
        ]);

        if (allResumes) {
          for (const entry of entriesData) {
            entry.resumes = allResumes.filter(
              (r) => r.user_id === entry.user_id
            );
          }
        }

        // Build lookup maps
        const prefsMap: Record<string, UserPreferences> = {};
        if (allPrefs) {
          for (const p of allPrefs) prefsMap[p.user_id] = p as UserPreferences;
        }
        setUserPrefs(prefsMap);

        const expsMap: Record<string, UserExperience[]> = {};
        if (allExps) {
          for (const e of allExps as UserExperience[]) {
            if (!expsMap[e.user_id]) expsMap[e.user_id] = [];
            expsMap[e.user_id].push(e);
          }
        }
        setUserExps(expsMap);
      }

      // Fetch client profiles for proposal creation
      const [{ data: clientData }, { data: casesData }, { data: usersData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, company_name")
          .eq("is_client", true)
          .order("company_name", { ascending: true }),
        supabase
          .from("cases")
          .select("id, title, fee, category")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("profiles")
          .select("id, full_name, email, background")
          .eq("is_admin", false)
          .order("full_name", { ascending: true })
          .limit(500),
      ]);
      setClients(clientData ?? []);
      setAllCases(casesData ?? []);
      setAllUsers(usersData ?? []);

      setEntries(entriesData);
      setLoading(false);
      fetchDuplicates();
    }
    fetchData();
  }, [router, fetchDuplicates]);

  async function updateStatus(entryId: string, newStatus: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("entries")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", entryId);
    if (!error) {
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, status: newStatus } : e))
      );
    }
  }

  // Extract alphabetical initials from email (e.g., taro.yamada@... → TY)
  function extractInitials(email: string | null, fullName: string | null): string {
    if (email) {
      const local = email.split("@")[0];
      const cleaned = local.replace(/[0-9]/g, "");
      // Try patterns: first.last, first_last, first-last
      const parts = cleaned.split(/[._-]+/).filter((p) => p.length > 0);
      if (parts.length >= 2) {
        // Given name initial + Family name initial
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      if (cleaned.length >= 2) {
        return cleaned.slice(0, 2).toUpperCase();
      }
    }
    // Fallback: sequential letter from name hash
    if (fullName) {
      const code = fullName.charCodeAt(0) + (fullName.charCodeAt(1) || 0);
      return String.fromCharCode(65 + (code % 26)) + String.fromCharCode(65 + ((code * 7) % 26));
    }
    return "XX";
  }

  // Generate anonymized client submission text
  function generateClientText(entry: AdminEntry, index: number): string {
    const p = entry.profiles;
    const c = entry.cases;
    if (!p) return "";

    // Initials from email (e.g., taro.yamada@... → TY)
    const initials = extractInitials(p.email, p.full_name);

    const header = `○${initials}さん`;

    // Bio / background description
    const bio = p.bio || "";

    // 報酬: fee + occupancy combined (e.g., "150~200万円/月・100%")
    const fee = c?.fee || "要確認";
    const occupancy = c?.occupancy || "";
    const feeDisplay = occupancy ? `${fee}・${occupancy}` : fee;

    // 常駐: work style from office_days, remote_preference, or location
    let workStyle = "";
    if (c?.office_days) {
      workStyle = c.office_days;
    } else if (p.remote_preference) {
      workStyle = REMOTE_LABELS[p.remote_preference] || p.remote_preference;
    } else if (c?.location) {
      workStyle = c.location;
    } else {
      workStyle = "要確認";
    }

    // 稼働開始日: user's available_from or case start_date
    const startDate = p.available_from || c?.start_date || "要確認";

    return [
      header,
      bio,
      `・報酬:${feeDisplay}`,
      `・稼働率:${occupancy || "要確認"}`,
      `・常駐:${workStyle}`,
      `・稼働開始日:${startDate}`,
    ].join("\n");
  }

  async function copyClientText(entry: AdminEntry, index: number) {
    const text = generateClientText(entry, index);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  // Create proposal from entry: create draft, add talent, navigate
  async function createProposalFromEntry(entry: AdminEntry, clientId: string) {
    setProposalCreating(true);
    try {
      const caseTitle = entry.cases?.title || "提案";
      // 1. Create draft proposal
      const res = await fetch("/api/admin/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: entry.case_id,
          client_id: clientId,
          title: caseTitle,
        }),
      });
      if (!res.ok) throw new Error("提案作成に失敗しました");
      const { proposal } = await res.json();

      // 2. Add user as talent
      const p = entry.profiles;
      if (p) {
        await fetch(`/api/admin/proposals/${proposal.id}/talents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile_id: entry.user_id,
            display_label: p.full_name ? `${p.full_name?.[0] || "A"}氏` : "A氏",
            summary_background: p.bio || p.background || "",
            summary_skills: p.skills || [],
            summary_work_style: p.remote_preference
              ? REMOTE_LABELS[p.remote_preference] || p.remote_preference
              : "",
          }),
        });
      }

      // 3. Navigate to proposal detail
      setProposalTarget(null);
      router.push(`/dashboard/admin/proposals/${proposal.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setProposalCreating(false);
    }
  }

  // Manual entry creation
  async function createManualEntry() {
    if (!manualCaseId || !manualUserId) return;
    setManualCreating(true);
    try {
      const supabase = createClient();
      // Check if entry already exists
      const { data: existing } = await supabase
        .from("entries")
        .select("id")
        .eq("case_id", manualCaseId)
        .eq("user_id", manualUserId)
        .maybeSingle();
      if (existing) {
        alert("このユーザーは既にこの案件にエントリー済みです");
        return;
      }
      const { error } = await supabase.from("entries").insert({
        case_id: manualCaseId,
        user_id: manualUserId,
        status: "reviewing",
        message: manualMessage || "管理者による手動マッチング",
      });
      if (error) throw error;
      // Reload page to show new entry
      setShowManualEntry(false);
      setManualCaseId("");
      setManualUserId("");
      setManualMessage("");
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エントリー作成に失敗しました");
    } finally {
      setManualCreating(false);
    }
  }

  // Calculate matching scores for each entry
  const entryScores = useMemo(() => {
    const map: Record<string, { score: number; mustHaveFulfillment: number; mustHaveMatched: string[]; mustHaveRequired: string[]; skillsMatched: string[] }> = {};
    for (const entry of entries) {
      if (!entry.cases || !entry.profiles) continue;
      try {
        const c = entry.cases;
        const p = entry.profiles;
        const caseData: Case = {
          id: entry.case_id,
          case_no: null,
          title: c.title,
          category: c.category,
          background: c.background ?? null,
          description: c.description,
          industry: c.industry,
          start_date: c.start_date,
          extendable: c.extendable ?? null,
          occupancy: c.occupancy,
          fee: c.fee,
          office_days: c.office_days,
          work_style: null,
          location: c.location,
          must_req: c.must_req ?? null,
          nice_to_have: c.nice_to_have ?? null,
          flow: null,
          status: null,
          published_at: null,
          created_at: null,
          is_active: true,
          client_company: null,
          commercial_flow: null,
          source: null,
          source_url: null,
          synced_at: null,
          title_normalized: null,
          source_hash: null,
          email_intake_id: null,
        };
        const profileData: Profile = {
          id: entry.user_id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          background: p.background,
          skills: p.skills,
          avatar_url: null,
          bio: p.bio,
          years_experience: p.years_experience,
          hourly_rate_min: p.hourly_rate_min,
          hourly_rate_max: p.hourly_rate_max,
          linkedin_url: null,
          available_from: p.available_from,
          prefecture: p.prefecture,
          remote_preference: p.remote_preference as Profile["remote_preference"],
          profile_complete: true,
          is_admin: false,
          is_looking: p.is_looking ?? true,
          is_client: false,
          company_name: null,
          created_at: null,
          updated_at: null,
        };
        const prefs = userPrefs[entry.user_id] ?? null;
        const exps = userExps[entry.user_id] ?? [];
        const result = calculateScore(caseData, profileData, prefs, exps);
        map[entry.id] = {
          score: result.score,
          mustHaveFulfillment: result.factors.must_have.fulfillment,
          mustHaveMatched: result.factors.must_have.matched,
          mustHaveRequired: result.factors.must_have.required,
          skillsMatched: result.factors.skills.matched,
        };
      } catch {
        // Skip if calculation fails
      }
    }
    return map;
  }, [entries, userPrefs, userExps]);

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.status === filter);

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>

      <div className="py-6">
        <div className="mb-6">
          <Link
            href="/dashboard/admin"
            className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
          >
            &larr; 管理者TOP
          </Link>
          <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
            ADMIN / ENTRIES
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-navy">エントリー管理</h1>
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-navy rounded-lg hover:bg-navy/90 transition-colors"
            >
              <Icon name="add" className="text-[16px]" />
              手動マッチング
            </button>
          </div>
          <p className="text-[12px] text-[#888] mt-1">{entries.length}件</p>
        </div>

        {/* Manual Entry Creation */}
        {showManualEntry && (
          <div className="mb-4 bg-white border-2 border-navy/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="link" className="text-[20px] text-navy" />
              <h3 className="text-[14px] font-black text-navy">手動マッチング（エントリー作成）</h3>
            </div>
            <p className="text-[12px] text-[#888] mb-4">
              管理者が案件とユーザーを手動で紐付けてエントリーを作成します。ステータスは「書類選考中」で作成されます。
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Case selector */}
              <div>
                <label className="text-[11px] font-bold text-[#888] tracking-wide uppercase block mb-1.5">
                  案件を選択
                </label>
                <input
                  type="text"
                  placeholder="案件名で検索..."
                  value={caseSearch}
                  onChange={(e) => setCaseSearch(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] border border-border rounded-lg outline-none focus:border-navy mb-2"
                />
                <div className="max-h-[200px] overflow-y-auto border border-border rounded-lg">
                  {allCases
                    .filter((c) =>
                      !caseSearch || c.title.toLowerCase().includes(caseSearch.toLowerCase()) ||
                      (c.category?.toLowerCase().includes(caseSearch.toLowerCase()))
                    )
                    .slice(0, 30)
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setManualCaseId(c.id)}
                        className={`w-full text-left px-3 py-2 text-[12px] border-b border-border/50 last:border-0 transition-colors ${
                          manualCaseId === c.id
                            ? "bg-navy/8 text-navy font-bold"
                            : "hover:bg-[#f5f7fa]"
                        }`}
                      >
                        <p className="font-medium truncate">{c.title}</p>
                        <p className="text-[10px] text-[#999]">
                          {[c.fee, c.category].filter(Boolean).join(" / ")}
                        </p>
                      </button>
                    ))}
                </div>
              </div>
              {/* User selector */}
              <div>
                <label className="text-[11px] font-bold text-[#888] tracking-wide uppercase block mb-1.5">
                  ユーザーを選択
                </label>
                <input
                  type="text"
                  placeholder="名前・メールで検索..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] border border-border rounded-lg outline-none focus:border-navy mb-2"
                />
                <div className="max-h-[200px] overflow-y-auto border border-border rounded-lg">
                  {allUsers
                    .filter((u) =>
                      !userSearch ||
                      (u.full_name?.toLowerCase().includes(userSearch.toLowerCase())) ||
                      (u.email?.toLowerCase().includes(userSearch.toLowerCase())) ||
                      (u.background?.toLowerCase().includes(userSearch.toLowerCase()))
                    )
                    .slice(0, 30)
                    .map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setManualUserId(u.id)}
                        className={`w-full text-left px-3 py-2 text-[12px] border-b border-border/50 last:border-0 transition-colors ${
                          manualUserId === u.id
                            ? "bg-navy/8 text-navy font-bold"
                            : "hover:bg-[#f5f7fa]"
                        }`}
                      >
                        <p className="font-medium">{u.full_name || "名前未設定"}</p>
                        <p className="text-[10px] text-[#999]">
                          {[u.email, u.background].filter(Boolean).join(" / ")}
                        </p>
                      </button>
                    ))}
                </div>
              </div>
            </div>
            {/* Message */}
            <div className="mb-4">
              <label className="text-[11px] font-bold text-[#888] tracking-wide uppercase block mb-1.5">
                メモ（任意）
              </label>
              <input
                type="text"
                placeholder="例: 営業からの紹介、社内推薦 等"
                value={manualMessage}
                onChange={(e) => setManualMessage(e.target.value)}
                className="w-full px-3 py-2 text-[12px] border border-border rounded-lg outline-none focus:border-navy"
              />
            </div>
            {/* Selection summary + submit */}
            <div className="flex items-center justify-between">
              <div className="text-[12px] text-[#888]">
                {manualCaseId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-navy/8 text-navy font-bold rounded mr-2">
                    <Icon name="folder_open" className="text-[14px]" />
                    {allCases.find((c) => c.id === manualCaseId)?.title?.slice(0, 30) || "案件選択済"}
                  </span>
                )}
                {manualUserId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue/8 text-blue font-bold rounded">
                    <Icon name="person" className="text-[14px]" />
                    {allUsers.find((u) => u.id === manualUserId)?.full_name || "ユーザー選択済"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowManualEntry(false)}
                  className="px-4 py-2 text-[12px] font-bold text-[#666] hover:text-navy transition-colors"
                >
                  閉じる
                </button>
                <button
                  disabled={!manualCaseId || !manualUserId || manualCreating}
                  onClick={createManualEntry}
                  className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-white bg-[#E15454] rounded-lg hover:bg-[#d14545] transition-colors disabled:opacity-40"
                >
                  <Icon name="add_link" className="text-[16px]" />
                  {manualCreating ? "作成中..." : "エントリー作成"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Alert Banner */}
        {duplicateGroups.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowDedup(!showDedup)}
              className="w-full flex items-center justify-between bg-[#FFF7ED] border border-[#FB923C] px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <Icon name="warning" className="text-[20px] text-[#F97316]" />
                <span className="text-[13px] font-bold text-[#9A3412]">
                  重複の可能性がある人材: {duplicateGroups.length}グループ
                </span>
              </div>
              <Icon
                name={showDedup ? "expand_less" : "expand_more"}
                className="text-[20px] text-[#F97316]"
              />
            </button>
            {showDedup && (
              <div className="border border-t-0 border-[#FB923C] bg-white divide-y divide-[#FED7AA]">
                {duplicateGroups.map((group, gi) => (
                  <div key={gi} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="person" className="text-[16px] text-navy" />
                      <span className="text-[13px] font-bold text-navy">
                        {group.person.full_name || "名前未設定"}
                      </span>
                      <span className="text-[11px] text-[#888]">
                        ({maskEmail(group.person.email)})
                      </span>
                    </div>
                    <div className="ml-6 flex flex-col gap-1.5">
                      {group.matches.map((match, mi) => (
                        <div
                          key={mi}
                          className="flex items-center gap-2 text-[12px]"
                        >
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 font-bold ${
                              match.similarity >= 0.95
                                ? "bg-[#FEE2E2] text-[#DC2626]"
                                : match.similarity >= 0.85
                                ? "bg-[#FEF3C7] text-[#D97706]"
                                : "bg-[#F3F4F6] text-[#6B7280]"
                            }`}
                          >
                            {Math.round(match.similarity * 100)}%
                          </span>
                          <span className="text-[#888]">
                            {MATCH_TYPE_LABELS[match.matchType] ||
                              match.matchType}
                          </span>
                          <Icon
                            name="compare_arrows"
                            className="text-[14px] text-[#CBD5E1]"
                          />
                          <span className="font-medium text-navy">
                            {match.existingName || "名前未設定"}
                          </span>
                          <span className="text-[#aaa]">
                            ({maskEmail(match.existingEmail)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="px-4 py-2 bg-[#FFF7ED] text-[11px] text-[#9A3412]">
                  <button
                    onClick={fetchDuplicates}
                    disabled={dedupLoading}
                    className="text-[#F97316] hover:underline font-bold"
                  >
                    {dedupLoading ? "チェック中..." : "再チェック"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[{ value: "all", label: "すべて" }, ...STATUS_OPTIONS].map(
            (opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 text-[12px] font-bold border transition-colors ${
                  filter === opt.value
                    ? "bg-[#E15454] text-white border-[#E15454]"
                    : "bg-white text-[#666] border-border hover:border-[#E15454] hover:text-[#E15454]"
                }`}
              >
                {opt.label}
              </button>
            )
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white border border-border p-8 text-center">
            <p className="text-[13px] text-[#888]">エントリーがありません</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((entry, entryIndex) => {
              const isExpanded = expandedId === entry.id;
              const p = entry.profiles;
              const c = entry.cases;
              const hasResume =
                entry.resumes && entry.resumes.length > 0;

              const scoreData = entryScores[entry.id];

              return (
                <div
                  key={entry.id}
                  className="bg-white border border-border rounded-lg overflow-hidden"
                >
                  {/* ── Summary Row ── */}
                  <div
                    className="p-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.id)
                    }
                  >
                    {/* Row 1: Case title + score + status */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon
                          name={isExpanded ? "expand_less" : "expand_more"}
                          className="text-[18px] text-[#999] shrink-0"
                        />
                        <p className="text-[14px] font-bold text-navy truncate">
                          {c?.title || "案件情報なし"}
                        </p>
                        {/* Matching Score Badge */}
                        {scoreData && (
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${
                              scoreData.score >= 70
                                ? "bg-[#ecfdf5] text-[#10b981]"
                                : scoreData.score >= 40
                                ? "bg-[#fffbeb] text-[#f59e0b]"
                                : "bg-[#fef2f2] text-[#ef4444]"
                            }`}
                            title={`マッチングスコア: ${scoreData.score}点`}
                          >
                            <Icon name="auto_awesome" className="text-[12px]" />
                            {scoreData.score}点
                          </span>
                        )}
                        {/* Must-have fulfillment badge */}
                        {scoreData && scoreData.mustHaveRequired.length > 0 && (
                          <span
                            className={`shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              scoreData.mustHaveFulfillment >= 0.8
                                ? "bg-[#ecfdf5] text-[#10b981]"
                                : "bg-[#fef2f2] text-[#ef4444]"
                            }`}
                            title={`必須条件充足率: ${Math.round(scoreData.mustHaveFulfillment * 100)}% (${scoreData.mustHaveMatched.length}/${scoreData.mustHaveRequired.length})`}
                          >
                            必須{Math.round(scoreData.mustHaveFulfillment * 100)}%
                          </span>
                        )}
                      </div>
                      <div
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={entry.status}
                          onChange={(e) =>
                            updateStatus(entry.id, e.target.value)
                          }
                          className={`px-3 py-1.5 text-[12px] font-bold border outline-none rounded ${
                            entry.status === "accepted"
                              ? "text-[#10b981] border-[#10b981] bg-[#ecfdf5]"
                              : entry.status === "rejected"
                              ? "text-[#ef4444] border-[#ef4444] bg-[#fef2f2]"
                              : entry.status === "reviewing"
                              ? "text-[#8b5cf6] border-[#8b5cf6] bg-[#f5f3ff]"
                              : "text-blue border-blue bg-[#EBF7FD]"
                          }`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 2: Case conditions */}
                    <div className="ml-7 flex flex-wrap gap-1.5 mb-2">
                      {c?.fee && <Tag color="navy">{c.fee}</Tag>}
                      {c?.occupancy && <Tag color="blue">{c.occupancy}</Tag>}
                      {c?.start_date && (
                        <Tag color="green">開始: {c.start_date}</Tag>
                      )}
                      {c?.location && <Tag>{c.location}</Tag>}
                      {c?.office_days && <Tag>{c.office_days}</Tag>}
                      {c?.extendable && <Tag>延長: {c.extendable}</Tag>}
                      {c?.category && <Tag>{c.category}</Tag>}
                      {c?.industry && <Tag>{c.industry}</Tag>}
                    </div>

                    {/* Row 3: Applicant info */}
                    <div className="ml-7 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-[13px] font-bold text-[#333]">
                        <Icon
                          name="person"
                          className="text-[16px] align-middle mr-0.5"
                        />
                        {p?.full_name || "名前未設定"}
                      </span>
                      {p?.background && (
                        <Tag color="navy">{p.background}</Tag>
                      )}
                      <span className="text-[12px] text-[#666]">
                        {p?.email}
                      </span>
                      {p?.phone && (
                        <span className="text-[12px] text-[#666]">
                          {p.phone}
                        </span>
                      )}
                      {p?.years_experience != null &&
                        p.years_experience > 0 && (
                          <span className="text-[11px] text-[#888]">
                            経験{p.years_experience}年
                          </span>
                        )}
                      {p?.available_from && (
                        <span className="text-[11px] text-[#888]">
                          稼働開始: {p.available_from}
                        </span>
                      )}
                      {hasResume && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setResumePanelId(entry.resumes![0].id);
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-blue hover:text-blue-dark transition-colors"
                        >
                          <Icon
                            name="description"
                            className="text-[14px]"
                          />
                          レジュメ
                        </button>
                      )}
                      <span className="text-[11px] text-[#aaa]">
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleString("ja-JP")
                          : ""}
                      </span>
                    </div>

                    {/* Row 4: Message (if any) */}
                    {entry.message && (
                      <p className="ml-7 text-[12px] text-[#888] mt-1.5 line-clamp-1">
                        <Icon
                          name="chat_bubble"
                          className="text-[13px] align-middle mr-1"
                        />
                        {entry.message}
                      </p>
                    )}
                  </div>

                  {/* ── Expanded Detail ── */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {/* Score detail bar */}
                      {scoreData && (
                        <div className="px-5 py-3 bg-[#f9f9fc] border-b border-border">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-[#888] tracking-wide uppercase">マッチスコア</span>
                              <span className={`text-[16px] font-black ${
                                scoreData.score >= 70 ? "text-[#10b981]" : scoreData.score >= 40 ? "text-[#f59e0b]" : "text-[#ef4444]"
                              }`}>{scoreData.score}点</span>
                            </div>
                            {scoreData.mustHaveRequired.length > 0 && (
                              <div className="flex items-center gap-2 border-l border-border pl-3">
                                <span className="text-[11px] font-bold text-[#888]">必須条件</span>
                                <span className={`text-[13px] font-black ${
                                  scoreData.mustHaveFulfillment >= 0.8 ? "text-[#10b981]" : "text-[#ef4444]"
                                }`}>{Math.round(scoreData.mustHaveFulfillment * 100)}%</span>
                                <span className="text-[11px] text-[#999]">
                                  ({scoreData.mustHaveMatched.length}/{scoreData.mustHaveRequired.length})
                                </span>
                              </div>
                            )}
                            {scoreData.skillsMatched.length > 0 && (
                              <div className="flex items-center gap-1.5 border-l border-border pl-3">
                                <span className="text-[11px] font-bold text-[#888]">スキル合致</span>
                                <div className="flex flex-wrap gap-1">
                                  {scoreData.skillsMatched.slice(0, 5).map((s) => (
                                    <span key={s} className="px-1.5 py-0.5 bg-[#1FABE9]/10 text-[#1FABE9] text-[10px] font-bold rounded">
                                      {s}
                                    </span>
                                  ))}
                                  {scoreData.skillsMatched.length > 5 && (
                                    <span className="text-[10px] text-[#999]">+{scoreData.skillsMatched.length - 5}</span>
                                  )}
                                </div>
                              </div>
                            )}
                            {scoreData.mustHaveRequired.length > 0 && scoreData.mustHaveFulfillment < 1 && (
                              <div className="flex items-center gap-1.5 border-l border-border pl-3">
                                <span className="text-[11px] font-bold text-[#ef4444]">未充足</span>
                                <div className="flex flex-wrap gap-1">
                                  {scoreData.mustHaveRequired
                                    .filter((r) => !scoreData.mustHaveMatched.includes(r))
                                    .slice(0, 3)
                                    .map((r) => (
                                      <span key={r} className="px-1.5 py-0.5 bg-[#fef2f2] text-[#ef4444] text-[10px] font-bold rounded">
                                        {r}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
                        {/* Left: Applicant Info */}
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[11px] font-bold text-blue tracking-[0.12em] uppercase">
                              応募者情報
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyClientText(entry, entryIndex)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${
                                  copiedId === entry.id
                                    ? "text-white bg-[#10b981]"
                                    : "text-navy border border-navy/30 hover:bg-navy/5"
                                }`}
                              >
                                <Icon
                                  name={copiedId === entry.id ? "check" : "content_copy"}
                                  className="text-[16px]"
                                />
                                {copiedId === entry.id ? "コピーしました" : "クライアント提出用コピー"}
                              </button>
                              <button
                                onClick={() => setProposalTarget(entry)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-[#E15454] rounded-lg hover:bg-[#d14545] transition-colors"
                              >
                                <Icon
                                  name="handshake"
                                  className="text-[16px]"
                                />
                                提案作成
                              </button>
                              {hasResume && (
                                <button
                                  onClick={() =>
                                    setResumePanelId(entry.resumes![0].id)
                                  }
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-blue rounded-lg hover:bg-blue-dark transition-colors"
                                >
                                  <Icon
                                    name="description"
                                    className="text-[16px]"
                                  />
                                  レジュメを見る
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <InfoRow
                              label="氏名"
                              value={p?.full_name}
                              highlight
                            />
                            <InfoRow label="メール" value={p?.email} />
                            <InfoRow label="電話番号" value={p?.phone} />
                            <InfoRow
                              label="ファーム"
                              value={p?.background}
                              highlight
                            />
                            <InfoRow label="所在地" value={p?.prefecture} />
                            <InfoRow
                              label="経験年数"
                              value={
                                p?.years_experience != null
                                  ? `${p.years_experience}年`
                                  : null
                              }
                            />
                            <InfoRow
                              label="稼働開始"
                              value={p?.available_from}
                            />
                            <InfoRow
                              label="案件探し"
                              value={
                                p?.is_looking != null
                                  ? p.is_looking
                                    ? "探している"
                                    : "探していない"
                                  : null
                              }
                            />
                            <InfoRow
                              label="リモート"
                              value={
                                p?.remote_preference
                                  ? REMOTE_LABELS[p.remote_preference] ||
                                    p.remote_preference
                                  : null
                              }
                            />
                            <InfoRow
                              label="希望単価"
                              value={
                                p?.hourly_rate_min || p?.hourly_rate_max
                                  ? `${p.hourly_rate_min || "—"}〜${p.hourly_rate_max || "—"}万円/月`
                                  : null
                              }
                            />
                            {p?.skills && p.skills.length > 0 && (
                              <div className="flex gap-2 text-[12px]">
                                <span className="text-[#999] shrink-0 w-[100px]">
                                  スキル
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {p.skills.map((s) => (
                                    <span
                                      key={s}
                                      className="bg-[#EBF7FD] text-blue px-2 py-0.5 text-[11px] font-medium rounded"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* All resumes for this user */}
                            {entry.resumes && entry.resumes.length > 0 && (
                              <div className="flex gap-2 text-[12px]">
                                <span className="text-[#999] shrink-0 w-[100px]">
                                  レジュメ
                                </span>
                                <div className="flex flex-col gap-1">
                                  {entry.resumes.map((r) => (
                                    <button
                                      key={r.id}
                                      onClick={() => setResumePanelId(r.id)}
                                      className="flex items-center gap-1.5 text-blue hover:text-blue-dark font-medium text-left"
                                    >
                                      <Icon
                                        name="description"
                                        className="text-[14px]"
                                      />
                                      {r.filename}
                                      {r.file_size && (
                                        <span className="text-[#aaa] text-[10px]">
                                          (
                                          {(r.file_size / 1024).toFixed(0)}
                                          KB)
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {p?.bio && (
                              <div className="mt-2">
                                <span className="text-[11px] text-[#999]">
                                  自己紹介
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg">
                                  {p.bio}
                                </p>
                              </div>
                            )}
                            {entry.message && (
                              <div className="mt-2">
                                <span className="text-[11px] text-[#999]">
                                  エントリーメッセージ
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#fef9ee] p-3 rounded-lg border border-[#fde68a]">
                                  {entry.message}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Case Info */}
                        <div className="p-5">
                          <p className="text-[11px] font-bold text-[#E15454] tracking-[0.12em] uppercase mb-3">
                            案件情報
                          </p>
                          <div className="flex flex-col gap-2">
                            <InfoRow
                              label="案件名"
                              value={c?.title}
                              highlight
                            />
                            <InfoRow label="カテゴリ" value={c?.category} />
                            <InfoRow label="業界" value={c?.industry} />
                            <InfoRow
                              label="単価"
                              value={c?.fee}
                              highlight
                            />
                            <InfoRow
                              label="稼働率"
                              value={c?.occupancy}
                              highlight
                            />
                            <InfoRow
                              label="開始時期"
                              value={c?.start_date}
                              highlight
                            />
                            <InfoRow label="勤務地" value={c?.location} />
                            <InfoRow
                              label="出社日数"
                              value={c?.office_days}
                            />
                            <InfoRow
                              label="延長"
                              value={c?.extendable}
                            />
                            {c?.background && (
                              <div className="mt-2">
                                <span className="text-[11px] text-[#999]">
                                  背景
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg">
                                  {c.background}
                                </p>
                              </div>
                            )}
                            {c?.description && (
                              <div className="mt-2">
                                <span className="text-[11px] text-[#999]">
                                  案件詳細
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg max-h-[300px] overflow-y-auto">
                                  {c.description}
                                </p>
                              </div>
                            )}
                            {c?.must_req && (
                              <div className="mt-2">
                                <span className="text-[11px] text-[#999]">
                                  必須要件
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#fef2f2] p-3 rounded-lg">
                                  {c.must_req}
                                </p>
                              </div>
                            )}
                            {c?.nice_to_have && (
                              <div className="mt-2">
                                <span className="text-[11px] text-[#999]">
                                  歓迎要件
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f0faf5] p-3 rounded-lg">
                                  {c.nice_to_have}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resume Slide Panel */}
      {resumePanelId && (
        <ResumePanel
          resumeId={resumePanelId}
          onClose={() => setResumePanelId(null)}
        />
      )}

      {/* Proposal Client Picker Modal */}
      {proposalTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-[200]"
            onClick={() => !proposalCreating && setProposalTarget(null)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-[15px] font-black text-navy">提案作成</h3>
                <p className="text-[12px] text-[#888] mt-1">
                  クライアントを選択して提案を作成します
                </p>
                <div className="mt-2 text-[12px] bg-[#f9f9fc] rounded-lg p-2.5">
                  <p className="font-bold text-navy truncate">{proposalTarget.cases?.title}</p>
                  <p className="text-[#888] mt-0.5">
                    人材: {proposalTarget.profiles?.full_name || "名前未設定"}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-3">
                {clients.length === 0 ? (
                  <p className="text-[13px] text-[#888] text-center py-4">
                    クライアントが登録されていません。
                    <br />
                    <Link href="/dashboard/admin/clients" className="text-blue hover:underline">
                      クライアント管理
                    </Link>
                    で追加してください。
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {clients.map((client) => (
                      <button
                        key={client.id}
                        disabled={proposalCreating}
                        onClick={() => createProposalFromEntry(proposalTarget, client.id)}
                        className="flex items-center gap-3 px-4 py-3 text-left rounded-xl hover:bg-[#f5f7fa] transition-colors border border-transparent hover:border-border disabled:opacity-50"
                      >
                        <Icon name="apartment" className="text-[20px] text-[#999]" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-navy truncate">
                            {client.company_name || client.full_name || "名前未設定"}
                          </p>
                          {client.company_name && client.full_name && (
                            <p className="text-[11px] text-[#888] truncate">{client.full_name}</p>
                          )}
                        </div>
                        <Icon name="arrow_forward" className="text-[16px] text-[#ccc] ml-auto shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-3 border-t border-border flex justify-end">
                <button
                  onClick={() => setProposalTarget(null)}
                  disabled={proposalCreating}
                  className="px-4 py-2 text-[12px] font-bold text-[#666] hover:text-navy transition-colors"
                >
                  キャンセル
                </button>
              </div>
              {proposalCreating && (
                <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
                  <div className="flex items-center gap-2 text-[13px] text-navy font-bold">
                    <Icon name="progress_activity" className="text-[20px] animate-spin" />
                    提案を作成中...
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
