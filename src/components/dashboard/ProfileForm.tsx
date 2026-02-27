"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import SkillsInput from "./SkillsInput";

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

interface ProfileFormProps {
  profile: Profile;
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [form, setForm] = useState({
    full_name: profile.full_name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    bio: profile.bio || "",
    skills: profile.skills || [],
    years_experience: profile.years_experience?.toString() || "",
    hourly_rate_min: profile.hourly_rate_min?.toString() || "",
    hourly_rate_max: profile.hourly_rate_max?.toString() || "",
    linkedin_url: profile.linkedin_url || "",
    available_from: profile.available_from || "",
    prefecture: profile.prefecture || "",
    remote_preference: profile.remote_preference || "",
    background: profile.background || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function update(key: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.email) {
      setError("氏名とメールアドレスは必須です");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || null,
          bio: form.bio || null,
          skills: form.skills.length > 0 ? form.skills : null,
          years_experience: form.years_experience
            ? parseInt(form.years_experience)
            : null,
          hourly_rate_min: form.hourly_rate_min
            ? parseInt(form.hourly_rate_min)
            : null,
          hourly_rate_max: form.hourly_rate_max
            ? parseInt(form.hourly_rate_max)
            : null,
          linkedin_url: form.linkedin_url || null,
          available_from: form.available_from || null,
          prefecture: form.prefecture || null,
          remote_preference: form.remote_preference || null,
          background: form.background || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;
      setSaved(true);
    } catch {
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* 基本情報 */}
      <div className="bg-white border border-border p-6">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
          基本情報
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              氏名 <span className="text-[#E15454]">*必須</span>
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              メールアドレス <span className="text-[#E15454]">*必須</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              電話番号
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="090-0000-0000"
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              お住まいの都道府県
            </label>
            <select
              value={form.prefecture}
              onChange={(e) => update("prefecture", e.target.value)}
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            >
              <option value="">選択してください</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-[11px] font-bold text-[#888] mb-1">
            自己紹介・経歴概要
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            rows={4}
            placeholder="これまでのご経験やご専門領域について記載ください"
            className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
          />
        </div>
        <div className="mt-4">
          <label className="block text-[11px] font-bold text-[#888] mb-1">
            バックグラウンド
          </label>
          <input
            type="text"
            value={form.background}
            onChange={(e) => update("background", e.target.value)}
            placeholder="例: Big4出身、IT業界15年"
            className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
          />
        </div>
      </div>

      {/* スキル */}
      <div className="bg-white border border-border p-6">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
          スキル・専門領域
        </h2>
        <SkillsInput
          value={form.skills}
          onChange={(skills) => update("skills", skills)}
        />
      </div>

      {/* 稼働条件 */}
      <div className="bg-white border border-border p-6">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
          稼働条件
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              コンサルティング経験年数
            </label>
            <input
              type="number"
              value={form.years_experience}
              onChange={(e) => update("years_experience", e.target.value)}
              placeholder="例: 10"
              min="0"
              max="50"
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              リモートワーク希望
            </label>
            <select
              value={form.remote_preference}
              onChange={(e) => update("remote_preference", e.target.value)}
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            >
              <option value="">選択してください</option>
              <option value="remote_only">フルリモート希望</option>
              <option value="hybrid">ハイブリッド可</option>
              <option value="onsite">常駐可</option>
              <option value="any">こだわりなし</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              希望報酬（万円/月）下限
            </label>
            <input
              type="number"
              value={form.hourly_rate_min}
              onChange={(e) => update("hourly_rate_min", e.target.value)}
              placeholder="例: 100"
              min="0"
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              希望報酬（万円/月）上限
            </label>
            <input
              type="number"
              value={form.hourly_rate_max}
              onChange={(e) => update("hourly_rate_max", e.target.value)}
              placeholder="例: 200"
              min="0"
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              稼働可能日
            </label>
            <input
              type="date"
              value={form.available_from}
              onChange={(e) => update("available_from", e.target.value)}
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={(e) => update("linkedin_url", e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      {error && <p className="text-[12px] text-[#E15454]">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 bg-blue text-white text-[14px] font-bold transition-colors hover:bg-blue-dark disabled:opacity-50"
        >
          {saving ? "保存中..." : "プロフィールを保存"}
        </button>
        {saved && (
          <span className="text-[13px] text-[#10b981] font-bold">
            保存しました
          </span>
        )}
      </div>
    </form>
  );
}
