"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { analytics } from "@/lib/analytics";
import type { MatchingResult, Case } from "@/lib/types";

type CaseSummary = Pick<Case, "id" | "title" | "fee" | "location" | "occupancy" | "category">;
type MatchWithCase = MatchingResult & { cases: CaseSummary };

/** Check how complete the user's profile is for matching purposes */
async function checkProfileCompleteness(): Promise<{
  filled: string[];
  missing: string[];
  ratio: number;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { filled: [], missing: [], ratio: 0 };

  const [profileRes, prefsRes, expsRes] = await Promise.all([
    supabase.from("profiles").select("skills, hourly_rate_min, hourly_rate_max, remote_preference").eq("id", user.id).single(),
    supabase.from("user_preferences").select("desired_categories, desired_industries, desired_rate_min, desired_rate_max, preferred_locations, remote_preference, min_occupancy, max_occupancy").eq("user_id", user.id).single(),
    supabase.from("user_experiences").select("id").eq("user_id", user.id).limit(1),
  ]);

  const profile = profileRes.data;
  const prefs = prefsRes.data;
  const hasExperience = (expsRes.data?.length ?? 0) > 0;

  const checks = [
    { label: "スキル", ok: (profile?.skills?.length ?? 0) > 0 || hasExperience },
    { label: "希望カテゴリ", ok: (prefs?.desired_categories?.length ?? 0) > 0 },
    { label: "希望業界", ok: (prefs?.desired_industries?.length ?? 0) > 0 },
    { label: "希望報酬", ok: !!(prefs?.desired_rate_min || prefs?.desired_rate_max || profile?.hourly_rate_min || profile?.hourly_rate_max) },
    { label: "勤務地・リモート", ok: !!(prefs?.remote_preference || profile?.remote_preference || (prefs?.preferred_locations?.length ?? 0) > 0) },
    { label: "稼働率", ok: prefs?.min_occupancy != null || prefs?.max_occupancy != null },
  ];

  const filled = checks.filter((c) => c.ok).map((c) => c.label);
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);
  return { filled, missing, ratio: filled.length / checks.length };
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

export default function MatchingPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchWithCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [profileMissing, setProfileMissing] = useState<string[]>([]);
  const [profileRatio, setProfileRatio] = useState(1);

  const fetchMatches = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    const { data } = await supabase
      .from("matching_results")
      .select("id, case_id, user_id, score, factors, is_notified, semantic_score, llm_reasoning, matched_at, cases(id, title, fee, location, occupancy, category)")
      .eq("user_id", user.id)
      .order("score", { ascending: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setMatches((data as any as MatchWithCase[]) ?? []);
    if (data && data.length > 0) {
      setLastRun(data[0].matched_at);
    }
    analytics.matchingView();
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchMatches();
    checkProfileCompleteness().then(({ missing, ratio }) => {
      setProfileMissing(missing);
      setProfileRatio(ratio);
    });
  }, [fetchMatches]);

  async function runMatching() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/matching/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "マッチングに失敗しました");
        return;
      }
      await fetchMatches();
    } catch {
      setError("マッチングに失敗しました");
    } finally {
      setRunning(false);
    }
  }

  function getScoreColor(score: number) {
    if (score >= 70) return "text-[#10b981] bg-[#ecfdf5]";
    if (score >= 40) return "text-[#f59e0b] bg-[#fffbeb]";
    return "text-[#888] bg-[#f5f5f5]";
  }

  function getScoreLabel(score: number) {
    if (score >= 70) return "高マッチ";
    if (score >= 40) return "中マッチ";
    return "低マッチ";
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1">
            MATCHING
          </p>
          <h1 className="text-xl font-black text-navy">自動マッチング</h1>
          {lastRun && (
            <p className="text-[11px] text-[#888] mt-1">
              最終更新:{" "}
              {new Date(lastRun).toLocaleString("ja-JP", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <button
          onClick={runMatching}
          disabled={running}
          className="px-5 py-2.5 bg-blue text-white text-[13px] font-bold hover:bg-blue-dark transition-colors disabled:opacity-50"
        >
          {running ? "計算中..." : "マッチングを更新"}
        </button>
      </div>

      {error && (
        <p className="text-[12px] text-[#E15454] mb-4">{error}</p>
      )}

      {/* Profile completeness banner */}
      {profileRatio < 1 && (
        <div className="bg-[#fffbeb] border border-[#fde68a] p-4 mb-5">
          <div className="flex items-start gap-2.5">
            <Icon name="info" className="text-[20px] text-[#f59e0b] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-navy mb-1">
                プロフィールを完成させてマッチング精度を向上
              </p>
              <p className="text-[11.5px] text-[#888] leading-[1.6] mb-2">
                未設定の項目はマッチング計算に使用されません。設定するほど精度が上がります。
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {profileMissing.map((item) => (
                  <span
                    key={item}
                    className="text-[10px] text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded-full"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Link
                  href="/dashboard/preferences"
                  className="text-[11.5px] font-bold text-blue hover:underline"
                >
                  希望条件を設定 →
                </Link>
                <Link
                  href="/dashboard/profile"
                  className="text-[11.5px] font-bold text-blue hover:underline"
                >
                  プロフィール編集 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="bg-white border border-border p-8 text-center">
          <p className="text-[40px] mb-3"><Icon name="auto_awesome" className="text-[40px]" /></p>
          <p className="text-[14px] font-bold text-navy mb-2">
            マッチング結果がありません
          </p>
          {profileRatio < 0.5 ? (
            <>
              <p className="text-[12px] text-[#888] mb-4">
                マッチングにはプロフィール・希望条件の入力が必要です
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/dashboard/profile"
                  className="px-4 py-2 bg-blue text-white text-[13px] font-bold hover:bg-blue-dark transition-colors"
                >
                  プロフィールを入力
                </Link>
                <Link
                  href="/dashboard/preferences"
                  className="px-4 py-2 border border-blue text-blue text-[13px] font-bold hover:bg-blue/5 transition-colors"
                >
                  希望条件を設定
                </Link>
              </div>
            </>
          ) : (
            <p className="text-[12px] text-[#888] mb-4">
              「マッチングを更新」ボタンを押して、あなたに合った案件を見つけましょう
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((match) => {
            const factors = match.factors as Record<string, { score: number; max: number; matched?: string[] | boolean | string | null }>;
            return (
              <Link
                key={match.id}
                href={`/dashboard/cases/${match.case_id}`}
                className="bg-white border border-border p-5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 ${getScoreColor(match.score)}`}
                      >
                        {getScoreLabel(match.score)} {match.score}%
                      </span>
                      {match.semantic_score != null && (
                        <span className="text-[10px] font-bold text-[#7c3aed] bg-[#f5f3ff] px-1.5 py-0.5">
                          <Icon name="auto_awesome" className="text-[12px] align-middle mr-0.5" />
                          AI分析
                        </span>
                      )}
                      {match.cases?.category && (
                        <span className="text-[10px] text-[#888] border border-border px-1.5 py-0.5">
                          {match.cases.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] font-bold text-navy mb-1 truncate">
                      {match.cases?.title || "案件情報なし"}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#888]">
                      {match.cases?.fee && (
                        <span><Icon name="payments" className="text-[14px] align-middle" /> {match.cases.fee}</span>
                      )}
                      {match.cases?.location && (
                        <span><Icon name="location_on" className="text-[14px] align-middle" /> {match.cases.location}</span>
                      )}
                      {match.cases?.occupancy && (
                        <span><Icon name="schedule" className="text-[14px] align-middle" /> {match.cases.occupancy}</span>
                      )}
                    </div>
                    {/* Factor breakdown */}
                    {factors && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {factors.skills?.matched && Array.isArray(factors.skills.matched) && factors.skills.matched.length > 0 && (
                          <span className="text-[10px] text-blue bg-blue/10 px-1.5 py-0.5">
                            スキル: {(factors.skills.matched as string[]).slice(0, 3).join(", ")}
                          </span>
                        )}
                        {factors.industry?.matched && (
                          <span className="text-[10px] text-[#10b981] bg-[#ecfdf5] px-1.5 py-0.5">
                            業界マッチ
                          </span>
                        )}
                        {factors.rate?.score === factors.rate?.max && (
                          <span className="text-[10px] text-[#f59e0b] bg-[#fffbeb] px-1.5 py-0.5">
                            報酬マッチ
                          </span>
                        )}
                      </div>
                    )}
                    {match.llm_reasoning && (
                      <p className="text-[11px] text-[#666] mt-1.5 flex items-start gap-1">
                        <Icon name="psychology" className="text-[14px] text-[#7c3aed] shrink-0 mt-px" />
                        <span>{match.llm_reasoning}</span>
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 w-14 h-14 flex flex-col items-center justify-center">
                    <div
                      className="w-12 h-12 rounded-full border-3 flex items-center justify-center"
                      style={{
                        borderColor:
                          match.score >= 70
                            ? "#10b981"
                            : match.score >= 40
                            ? "#f59e0b"
                            : "#ddd",
                      }}
                    >
                      <span className="text-[14px] font-black text-navy">
                        {match.score}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
