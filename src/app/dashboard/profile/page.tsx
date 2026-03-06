"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import ProfileForm from "@/components/dashboard/ProfileForm";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, background, skills, avatar_url, bio, years_experience, hourly_rate_min, hourly_rate_max, linkedin_url, available_from, prefecture, remote_preference, profile_complete, is_admin, is_looking, created_at, updated_at")
        .eq("id", user.id)
        .single();
      setProfile(data);
      setLoading(false);
    }
    fetchProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#E15454]">
          プロフィールが見つかりません
        </div>
      </div>
    );
  }

  async function handleDeleteAccount() {
    if (!confirm("本当に退会しますか？すべてのデータが削除され、復元できません。")) return;
    if (!confirm("最終確認です。退会を実行してもよろしいですか？")) return;

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (res.ok) {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/?deleted=true");
      } else {
        alert("退会処理に失敗しました。");
      }
    } catch {
      alert("エラーが発生しました。");
    }
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1">
          PROFILE
        </p>
        <h1 className="text-xl font-black text-navy">プロフィール編集</h1>
        <p className="text-[12px] text-[#888] mt-1">
          情報を充実させるとマッチング精度が向上します
        </p>
      </div>
      <ProfileForm profile={profile} />

      {/* 退会セクション */}
      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-sm font-bold text-[#888] mb-2">アカウント削除</h2>
        <p className="text-[12px] text-[#999] mb-3">
          退会するとすべてのデータ（プロフィール、レジュメ、マッチング結果等）が完全に削除されます。この操作は取り消せません。
        </p>
        <button
          onClick={handleDeleteAccount}
          className="px-5 py-2 text-[12px] font-bold text-[#E15454] border border-[#E15454]/30 rounded-lg hover:bg-[#E15454]/5 transition-colors"
        >
          退会する
        </button>
      </div>
    </div>
  );
}
