"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Entry, MatchingResult } from "@/lib/types";

interface EntryWithCase extends Entry {
  cases?: { title: string; fee: string | null };
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<EntryWithCase[]>([]);
  const [matches, setMatches] = useState<(MatchingResult & { cases: { title: string; fee: string | null } })[]>([]);
  const [loading, setLoading] = useState(true);

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

      const [profileRes, entriesRes, matchesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("entries")
          .select("*, cases(title, fee)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("matching_results")
          .select("*, cases(title, fee)")
          .eq("user_id", user.id)
          .order("score", { ascending: false })
          .limit(3),
      ]);

      setProfile(profileRes.data);
      setEntries((entriesRes.data as EntryWithCase[]) ?? []);
      setMatches(matchesRes.data ?? []);
      setLoading(false);
    }
    fetchData();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function getCompleteness(): number {
    if (!profile) return 0;
    const fields = [
      profile.full_name,
      profile.email,
      profile.phone,
      profile.bio,
      profile.skills?.length,
      profile.years_experience,
      profile.prefecture,
      profile.remote_preference,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  const completeness = getCompleteness();

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1">
            DASHBOARD
          </p>
          <h1 className="text-xl font-black text-navy">マイページ</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-[#888] border border-border px-4 py-2 hover:bg-white transition-colors"
        >
          ログアウト
        </button>
      </div>

      {completeness < 100 && (
        <div className="bg-white border border-border p-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-bold text-navy">
              プロフィール完成度
            </p>
            <span className="text-sm font-bold text-blue">{completeness}%</span>
          </div>
          <div className="w-full h-2 bg-[#eee] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-blue rounded-full transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <p className="text-[11px] text-[#888] mb-2">
            プロフィールを充実させるとマッチング精度が向上します
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-block text-[12px] font-bold text-blue hover:underline"
          >
            プロフィールを編集する →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { href: "/dashboard/cases", label: "案件を探す", icon: "🔍" },
          { href: "/dashboard/matching", label: "マッチング", icon: "🎯" },
          { href: "/dashboard/preferences", label: "条件登録", icon: "⚙️" },
          { href: "/dashboard/resumes", label: "レジュメ", icon: "📄" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-white border border-border p-4 text-center hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow"
          >
            <span className="text-2xl block mb-1">{action.icon}</span>
            <span className="text-[12px] font-bold text-navy">{action.label}</span>
          </Link>
        ))}
      </div>

      <div className="bg-white border border-border p-6 mb-5">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
          おすすめ案件
        </h2>
        {matches.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-[13px] text-[#888] mb-3">
              まだマッチング結果がありません
            </p>
            <Link
              href="/dashboard/matching"
              className="inline-block text-[12px] font-bold text-blue hover:underline"
            >
              マッチングを実行する →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((match) => (
              <Link
                key={match.id}
                href={`/dashboard/cases/${match.case_id}`}
                className="p-4 border border-border flex items-center justify-between hover:bg-[#fafafa] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-navy truncate">
                    {match.cases?.title || "案件情報なし"}
                  </p>
                  <p className="text-[11px] text-[#888] mt-0.5">
                    {match.cases?.fee || "報酬未定"}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 shrink-0 ml-3 ${
                    match.score >= 70
                      ? "text-[#10b981] bg-[#ecfdf5]"
                      : match.score >= 40
                      ? "text-[#f59e0b] bg-[#fffbeb]"
                      : "text-[#888] bg-[#f5f5f5]"
                  }`}
                >
                  {match.score}%
                </span>
              </Link>
            ))}
            <Link
              href="/dashboard/matching"
              className="text-[12px] font-bold text-blue text-center hover:underline pt-2"
            >
              すべてのマッチングを見る →
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white border border-border p-6">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
          最近のエントリー
        </h2>
        {entries.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-[13px] text-[#888] mb-3">
              エントリー履歴はありません
            </p>
            <Link
              href="/dashboard/cases"
              className="inline-block text-[12px] font-bold text-blue hover:underline"
            >
              案件を探す →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 border border-border flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-navy truncate">
                    {entry.cases?.title || "案件情報なし"}
                  </p>
                  <p className="text-xs text-[#888] mt-0.5">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString("ja-JP")
                      : ""}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 shrink-0 ml-3 ${
                    entry.status === "accepted"
                      ? "text-[#10b981] bg-[#ecfdf5]"
                      : entry.status === "rejected"
                      ? "text-[#ef4444] bg-[#fef2f2]"
                      : "text-blue bg-[#EBF7FD]"
                  }`}
                >
                  {entry.status === "pending"
                    ? "審査中"
                    : entry.status === "reviewing"
                    ? "書類選考中"
                    : entry.status === "accepted"
                    ? "承認済"
                    : entry.status === "rejected"
                    ? "不採用"
                    : entry.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
