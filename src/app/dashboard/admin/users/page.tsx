"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setUsers(data ?? []);
      setLoading(false);
    }
    fetchData();
  }, [router]);

  const filtered = search
    ? users.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()))
      )
    : users;

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
        <p className="text-[12px] text-[#888] mt-1">{users.length}名の登録ユーザー</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="氏名、メール、スキルで検索..."
          className="w-full md:w-[400px] px-3 py-2 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
        />
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((u) => (
          <div
            key={u.id}
            className="bg-white border border-border p-4"
          >
            <div className="flex items-start justify-between gap-3">
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
                </div>
                <p className="text-[12px] text-[#888]">
                  {u.email || "メール未設定"}
                  {u.phone && ` ・ ${u.phone}`}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#888] mt-1">
                  {u.prefecture && <span><Icon name="location_on" className="text-[14px] align-middle" /> {u.prefecture}</span>}
                  {u.years_experience && <span><Icon name="calendar_today" className="text-[14px] align-middle" /> 経験{u.years_experience}年</span>}
                  {u.remote_preference && (
                    <span>
                      <Icon name="home" className="text-[14px] align-middle" />{" "}
                      {{
                        remote_only: "フルリモート",
                        hybrid: "ハイブリッド",
                        onsite: "常駐",
                        any: "こだわりなし",
                      }[u.remote_preference]}
                    </span>
                  )}
                  {u.created_at && (
                    <span>
                      登録: {new Date(u.created_at).toLocaleDateString("ja-JP")}
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
              <div className="text-right shrink-0">
                {u.hourly_rate_min || u.hourly_rate_max ? (
                  <p className="text-[12px] font-bold text-navy">
                    {u.hourly_rate_min ?? "?"}〜{u.hourly_rate_max ?? "?"}万円
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
