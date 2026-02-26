"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Entry } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface EntryWithCase extends Entry {
  cases?: { title: string; fee: string | null };
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<EntryWithCase[]>([]);
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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const { data: entriesData } = await supabase
        .from("entries")
        .select("*, cases(title, fee)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setEntries((entriesData as EntryWithCase[]) ?? []);
      setLoading(false);
    }
    fetchData();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="py-[72px] px-6 min-h-screen bg-gray-bg">
          <div className="max-w-[800px] mx-auto text-sm text-[#888]">
            読み込み中...
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="py-[72px] px-6 min-h-screen bg-gray-bg">
        <div className="max-w-[800px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
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

          {/* Profile */}
          <div className="bg-white border border-border p-8 mb-6">
            <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
              プロフィール
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#888] text-xs">氏名</span>
                <p className="font-bold text-navy">
                  {profile?.full_name || "未設定"}
                </p>
              </div>
              <div>
                <span className="text-[#888] text-xs">メールアドレス</span>
                <p className="font-bold text-navy">
                  {profile?.email || "未設定"}
                </p>
              </div>
              <div>
                <span className="text-[#888] text-xs">電話番号</span>
                <p className="font-bold text-navy">
                  {profile?.phone || "未設定"}
                </p>
              </div>
            </div>
          </div>

          {/* Entries */}
          <div className="bg-white border border-border p-8">
            <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
              エントリー履歴
            </h2>
            {entries.length === 0 ? (
              <p className="text-sm text-[#888]">
                エントリー履歴はありません。
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 border border-border flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[13px] font-bold text-navy">
                        {entry.cases?.title || "案件情報なし"}
                      </p>
                      <p className="text-xs text-[#888] mt-1">
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleDateString(
                              "ja-JP"
                            )
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-blue bg-[#EBF7FD] px-3 py-1">
                      {entry.status === "pending"
                        ? "審査中"
                        : entry.status === "accepted"
                        ? "承認済"
                        : entry.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
