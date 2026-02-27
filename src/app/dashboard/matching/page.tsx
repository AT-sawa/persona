"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { MatchingResult, Case } from "@/lib/types";

type MatchWithCase = MatchingResult & { cases: Case };

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
      .select("*, cases(*)")
      .eq("user_id", user.id)
      .order("score", { ascending: false });
    setMatches((data as MatchWithCase[]) ?? []);
    if (data && data.length > 0) {
      setLastRun(data[0].matched_at);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchMatches();
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

      {matches.length === 0 ? (
        <div className="bg-white border border-border p-8 text-center">
          <p className="text-[40px] mb-3"><Icon name="auto_awesome" className="text-[40px]" /></p>
          <p className="text-[14px] font-bold text-navy mb-2">
            マッチング結果がありません
          </p>
          <p className="text-[12px] text-[#888] mb-4">
            「マッチングを更新」ボタンを押して、あなたに合った案件を見つけましょう
          </p>
          <p className="text-[11px] text-[#aaa]">
            プロフィールと条件を充実させると精度が向上します
          </p>
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
