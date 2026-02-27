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
        .select("*")
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
    </div>
  );
}
