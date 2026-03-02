"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Entry, MatchingResult } from "@/lib/types";

interface EntryWithCase extends Entry {
  cases?: { title: string; fee: string | null };
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<EntryWithCase[]>([]);
  const [matches, setMatches] = useState<
    (MatchingResult & { cases: { title: string; fee: string | null } })[]
  >([]);
  const [resumeCount, setResumeCount] = useState(0);
  const [expCount, setExpCount] = useState(0);
  const [prefExists, setPrefExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

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

      const [profileRes, entriesRes, matchesRes, resumesRes, expRes, prefRes] =
        await Promise.all([
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
            .limit(5),
          supabase
            .from("resumes")
            .select("id")
            .eq("user_id", user.id),
          supabase
            .from("user_experiences")
            .select("id")
            .eq("user_id", user.id),
          supabase
            .from("user_preferences")
            .select("id")
            .eq("user_id", user.id)
            .limit(1),
        ]);

      // Redirect to onboarding if profile is essentially empty
      if (profileRes.data) {
        const p = profileRes.data;
        const needsOnboarding = !p.profile_complete && !p.bio && !p.prefecture && !p.years_experience && (!p.skills || p.skills.length === 0);
        if (needsOnboarding && !p.is_admin) {
          router.push("/onboarding");
          return;
        }
      }

      setProfile(profileRes.data);
      setEntries((entriesRes.data as EntryWithCase[]) ?? []);
      setMatches(matchesRes.data ?? []);
      setResumeCount(resumesRes.data?.length ?? 0);
      setExpCount(expRes.data?.length ?? 0);
      setPrefExists((prefRes.data?.length ?? 0) > 0);
      setLoading(false);
    }
    fetchData();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function toggleLooking() {
    if (!profile) return;
    const supabase = createClient();
    const newVal = !profile.is_looking;
    await supabase
      .from("profiles")
      .update({ is_looking: newVal })
      .eq("id", profile.id);
    setProfile({ ...profile, is_looking: newVal });
  }

  async function saveAvailableFrom(date: string) {
    if (!profile) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ available_from: date, updated_at: new Date().toISOString() })
      .eq("id", profile.id);
    setProfile({ ...profile, available_from: date });
    setShowDatePicker(false);
  }

  // Close date picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(e.target as Node)
      ) {
        setShowDatePicker(false);
      }
    }
    if (showDatePicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDatePicker]);

  function getCompleteness(): number {
    if (!profile) return 0;
    const checks = [
      !!profile.full_name,
      !!profile.email,
      !!profile.bio,
      (profile.skills?.length ?? 0) > 0,
      !!profile.years_experience,
      !!profile.prefecture,
      resumeCount > 0,
      expCount > 0,
      prefExists,
      !!profile.available_from,
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }

  function getTodos(): {
    label: string;
    description: string;
    href: string;
    icon: string;
    done: boolean;
  }[] {
    if (!profile) return [];
    const todos = [
      {
        label: "レジュメをアップロード",
        description:
          "職務経歴書をアップロードするとスキルと経歴が自動で読み取られます",
        href: "/dashboard/resumes",
        icon: "upload_file",
        done: resumeCount > 0,
      },
      {
        label: "希望条件を設定",
        description: "希望単価・業界・稼働率を設定してマッチング精度を向上",
        href: "/dashboard/preferences",
        icon: "tune",
        done: prefExists,
      },
      {
        label: "プロフィールを充実させる",
        description: "経歴概要・スキル・稼働可能日を入力しましょう",
        href: "/dashboard/profile",
        icon: "edit_note",
        done:
          !!profile.bio &&
          (profile.skills?.length ?? 0) > 0 &&
          !!profile.available_from,
      },
    ];
    // Sort: incomplete first
    return todos.sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
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

  const completeness = getCompleteness();
  const todos = getTodos();
  const incompleteTodos = todos.filter((t) => !t.done);

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-navy">
            {profile?.full_name
              ? `${profile.full_name}さん`
              : "マイページ"}
          </h1>
          <p className="text-[13px] text-[#888] mt-1">
            ダッシュボード
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-[#888] border border-border rounded-lg px-4 py-2 hover:bg-white transition-colors"
        >
          <Icon name="logout" className="text-[16px]" />
          ログアウト
        </button>
      </div>

      {/* Status bar: availability + start date */}
      <div className="bg-white rounded-2xl border border-border/60 p-5 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={toggleLooking}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                profile?.is_looking ? "bg-[#10b981]" : "bg-[#d1d5db]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  profile?.is_looking ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
            <div>
              <p className="text-[13px] font-bold text-navy">
                {profile?.is_looking ? "案件を探しています" : "現在は案件を探していません"}
              </p>
              <p className="text-[11px] text-[#888]">
                {profile?.is_looking
                  ? "エージェントからのオファーを受け取れます"
                  : "オファーの受信を停止中"}
              </p>
            </div>
          </div>

          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 text-[13px] px-4 py-2.5 rounded-xl border border-border/60 hover:border-blue/40 hover:bg-blue/4 transition-all cursor-pointer"
            >
              <Icon name="calendar_today" className="text-[18px] text-blue" />
              <div className="text-left">
                <p className="text-[10px] text-[#888] leading-tight">稼働開始可能日</p>
                <p className="font-bold text-navy leading-tight">
                  {profile?.available_from
                    ? new Date(profile.available_from).toLocaleDateString(
                        "ja-JP",
                        { year: "numeric", month: "long", day: "numeric" }
                      )
                    : "未設定"}
                </p>
              </div>
              <Icon
                name="expand_more"
                className={`text-[18px] text-[#888] transition-transform ${showDatePicker ? "rotate-180" : ""}`}
              />
            </button>

            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-border/60 shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-5 w-[300px]">
                <p className="text-[12px] font-bold text-navy mb-3">
                  稼働開始可能日を選択
                </p>
                <input
                  type="date"
                  value={profile?.available_from ?? ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      saveAvailableFrom(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-border/60 text-[13px] text-text outline-none rounded-xl bg-[#fafafa] focus:border-blue focus:bg-white transition-colors"
                />
                <div className="flex gap-2 mt-3">
                  {["即日", "1週間後", "1ヶ月後", "2ヶ月後"].map((label) => {
                    const d = new Date();
                    if (label === "1週間後") d.setDate(d.getDate() + 7);
                    else if (label === "1ヶ月後") d.setMonth(d.getMonth() + 1);
                    else if (label === "2ヶ月後") d.setMonth(d.getMonth() + 2);
                    const val = d.toISOString().split("T")[0];
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => saveAvailableFrom(val)}
                        className="flex-1 text-[11px] font-bold py-2 rounded-lg bg-[#f5f7fa] text-[#666] hover:bg-blue/8 hover:text-blue transition-colors"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile completeness + TODO cards */}
      {completeness < 100 && (
        <div className="bg-white rounded-2xl border border-border/60 p-6 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue/8 flex items-center justify-center">
                <Icon name="checklist" className="text-[22px] text-blue" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-navy">
                  プロフィール完成度
                </p>
                <p className="text-[11px] text-[#888]">
                  完成度が高いほどマッチング精度が向上します
                </p>
              </div>
            </div>
            <span className="text-xl font-black text-blue">{completeness}%</span>
          </div>

          <div className="w-full h-2.5 bg-[#f0f2f5] rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-gradient-to-r from-blue to-[#34d399] rounded-full transition-all duration-500"
              style={{ width: `${completeness}%` }}
            />
          </div>

          {incompleteTodos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {incompleteTodos.slice(0, 3).map((todo) => (
                <Link
                  key={todo.href}
                  href={todo.href}
                  className="group flex items-start gap-3 p-4 rounded-xl border border-border/60 hover:border-blue/30 hover:shadow-[0_2px_8px_rgba(31,171,233,0.08)] transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#f5f7fa] flex items-center justify-center shrink-0 group-hover:bg-blue/8 transition-colors">
                    <Icon
                      name={todo.icon}
                      className="text-[20px] text-[#888] group-hover:text-blue transition-colors"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-navy group-hover:text-blue transition-colors">
                      {todo.label}
                    </p>
                    <p className="text-[11px] text-[#888] mt-0.5 leading-relaxed">
                      {todo.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Section — only visible to admin users */}
      {profile?.is_admin && (
        <div className="bg-gradient-to-r from-[#0f1c3f] to-[#1a2d5c] rounded-2xl p-5 mb-6 shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="admin_panel_settings" className="text-[20px] text-[#E15454]" />
            <h2 className="text-[14px] font-bold text-white">管理者メニュー</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { href: "/dashboard/admin", label: "管理者TOP", icon: "dashboard" },
              { href: "/dashboard/admin/cases", label: "案件管理", icon: "work" },
              { href: "/dashboard/admin/entries", label: "エントリー", icon: "forward_to_inbox" },
              { href: "/dashboard/admin/talents", label: "外部人材DB", icon: "group" },
              { href: "/dashboard/admin/analytics", label: "分析", icon: "analytics" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Icon name={item.icon} className="text-[18px] text-white/70" />
                <span className="text-[12px] font-bold text-white">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            href: "/dashboard/cases",
            label: "案件を探す",
            icon: "search",
            color: "text-blue",
            bg: "bg-blue/8",
          },
          {
            href: "/dashboard/matching",
            label: "AIマッチング",
            icon: "auto_awesome",
            color: "text-[#8b5cf6]",
            bg: "bg-[#8b5cf6]/8",
          },
          {
            href: "/dashboard/preferences",
            label: "希望条件",
            icon: "tune",
            color: "text-[#10b981]",
            bg: "bg-[#10b981]/8",
          },
          {
            href: "/dashboard/resumes",
            label: "レジュメ",
            icon: "description",
            color: "text-[#f59e0b]",
            bg: "bg-[#f59e0b]/8",
          },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group bg-white rounded-2xl border border-border/60 p-5 text-center hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all"
          >
            <div
              className={`w-11 h-11 mx-auto rounded-xl ${action.bg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}
            >
              <Icon name={action.icon} className={`text-[24px] ${action.color}`} />
            </div>
            <span className="text-[13px] font-bold text-navy">
              {action.label}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Matching Cases */}
        <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-5">
            <Icon name="auto_awesome" className="text-[20px] text-[#8b5cf6]" />
            <h2 className="text-[15px] font-bold text-navy">AIマッチング案件</h2>
          </div>
          {matches.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f5f7fa] flex items-center justify-center mb-3">
                <Icon
                  name="auto_awesome"
                  className="text-[28px] text-[#ccc]"
                />
              </div>
              <p className="text-[13px] text-[#888] mb-3">
                まだマッチング結果がありません
              </p>
              <Link
                href="/dashboard/matching"
                className="inline-flex items-center gap-1 text-[12px] font-bold text-blue hover:underline"
              >
                マッチングを実行する
                <Icon name="arrow_forward" className="text-[14px]" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {matches.map((match) => (
                <Link
                  key={match.id}
                  href={`/dashboard/cases/${match.case_id}`}
                  className="group p-3.5 rounded-xl border border-border/60 flex items-center justify-between hover:border-blue/30 hover:shadow-[0_2px_6px_rgba(31,171,233,0.06)] transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-navy truncate group-hover:text-blue transition-colors">
                      {match.cases?.title || "案件情報なし"}
                    </p>
                    <p className="text-[11px] text-[#888] mt-0.5">
                      {match.cases?.fee || "報酬未定"}
                    </p>
                  </div>
                  <div
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 ml-3 ${
                      match.score >= 70
                        ? "text-[#10b981] bg-[#ecfdf5]"
                        : match.score >= 40
                        ? "text-[#f59e0b] bg-[#fffbeb]"
                        : "text-[#888] bg-[#f5f5f5]"
                    }`}
                  >
                    {match.score}%
                  </div>
                </Link>
              ))}
              <Link
                href="/dashboard/matching"
                className="flex items-center justify-center gap-1 text-[12px] font-bold text-blue hover:underline pt-2"
              >
                すべてのマッチングを見る
                <Icon name="arrow_forward" className="text-[14px]" />
              </Link>
            </div>
          )}
        </div>

        {/* Recent Entries */}
        <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-5">
            <Icon name="send" className="text-[20px] text-blue" />
            <h2 className="text-[15px] font-bold text-navy">
              最近のエントリー
            </h2>
          </div>
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f5f7fa] flex items-center justify-center mb-3">
                <Icon name="send" className="text-[28px] text-[#ccc]" />
              </div>
              <p className="text-[13px] text-[#888] mb-3">
                エントリー履歴はありません
              </p>
              <Link
                href="/dashboard/cases"
                className="inline-flex items-center gap-1 text-[12px] font-bold text-blue hover:underline"
              >
                案件を探す
                <Icon name="arrow_forward" className="text-[14px]" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-xl border border-border/60 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-navy truncate">
                      {entry.cases?.title || "案件情報なし"}
                    </p>
                    <p className="text-[11px] text-[#888] mt-0.5">
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleDateString("ja-JP")
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 ml-3 ${
                      entry.status === "accepted"
                        ? "text-[#10b981] bg-[#ecfdf5]"
                        : entry.status === "rejected"
                        ? "text-[#ef4444] bg-[#fef2f2]"
                        : "text-blue bg-blue/8"
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
    </div>
  );
}
