"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { analytics } from "@/lib/analytics";
import type { UserPreferences } from "@/lib/types";

const INDUSTRIES = [
  "IT・通信", "金融・保険", "製造業", "小売・流通",
  "ヘルスケア・医薬", "エネルギー", "不動産・建設",
  "メディア・エンタメ", "官公庁・公共", "コンサルティング", "その他",
];

const CATEGORIES = ["IT", "非IT"];

const ROLES = [
  "PMO", "戦略コンサルタント", "DX推進", "業務改善/BPR",
  "SAP導入", "新規事業", "M&A", "データ分析",
  "IT戦略", "組織改革", "SCM", "マーケティング", "財務",
];

const LOCATIONS = [
  "東京都", "大阪府", "愛知県", "福岡県", "北海道",
  "神奈川県", "埼玉県", "千葉県", "リモート",
];

export default function PreferencesPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Partial<UserPreferences>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [hasExisting, setHasExisting] = useState(false);

  const fetchPrefs = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setUserId(user.id);
    const { data } = await supabase
      .from("user_preferences")
      .select("id, user_id, desired_rate_min, desired_rate_max, desired_industries, desired_categories, desired_roles, preferred_locations, remote_preference, min_occupancy, max_occupancy, available_from, notes, notify_matching_email")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setPrefs(data);
      setHasExisting(true);
    }
    setLoading(false);
    analytics.preferencesView();
  }, [router]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  function toggleArray(key: string, value: string) {
    setPrefs((prev) => {
      const arr = (prev[key as keyof UserPreferences] as string[]) || [];
      const updated = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      return { ...prev, [key]: updated };
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!userId) return;
    setError("");
    setSaving(true);

    try {
      const supabase = createClient();
      const payload = {
        user_id: userId,
        desired_rate_min: prefs.desired_rate_min || null,
        desired_rate_max: prefs.desired_rate_max || null,
        desired_industries:
          (prefs.desired_industries?.length ?? 0) > 0
            ? prefs.desired_industries
            : null,
        desired_categories:
          (prefs.desired_categories?.length ?? 0) > 0
            ? prefs.desired_categories
            : null,
        desired_roles:
          (prefs.desired_roles?.length ?? 0) > 0 ? prefs.desired_roles : null,
        preferred_locations:
          (prefs.preferred_locations?.length ?? 0) > 0
            ? prefs.preferred_locations
            : null,
        remote_preference: prefs.remote_preference || null,
        min_occupancy: prefs.min_occupancy || null,
        max_occupancy: prefs.max_occupancy || null,
        available_from: prefs.available_from || null,
        notes: prefs.notes || null,
        notify_matching_email: prefs.notify_matching_email !== false, // default true
        updated_at: new Date().toISOString(),
      };

      if (hasExisting) {
        const { error: updateError } = await supabase
          .from("user_preferences")
          .update(payload)
          .eq("user_id", userId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("user_preferences")
          .insert(payload);
        if (insertError) throw insertError;
        setHasExisting(true);
      }
      setSaved(true);
      analytics.preferencesUpdate();

      // Trigger matching recalculation in the background
      fetch("/api/matching/trigger", { method: "POST" }).catch(() => {
        // Silent fail — matching will run on next cron anyway
      });
    } catch {
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
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
      <div className="mb-6">
        <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1">
          PREFERENCES
        </p>
        <h1 className="text-xl font-black text-navy">条件登録</h1>
        <p className="text-[12px] text-[#888] mt-1">
          希望条件を設定するとマッチング精度が向上します
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* 報酬 */}
        <div className="bg-white border border-border p-6">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            希望報酬（万円/月）
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                下限
              </label>
              <input
                type="number"
                value={prefs.desired_rate_min ?? ""}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    desired_rate_min: e.target.value
                      ? Math.round(parseInt(e.target.value) / 10) * 10
                      : null,
                  }))
                }
                placeholder="例: 100"
                min="0"
                step="10"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                上限
              </label>
              <input
                type="number"
                value={prefs.desired_rate_max ?? ""}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    desired_rate_max: e.target.value
                      ? Math.round(parseInt(e.target.value) / 10) * 10
                      : null,
                  }))
                }
                placeholder="例: 200"
                min="0"
                step="10"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* カテゴリ */}
        <div className="bg-white border border-border p-6">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            カテゴリ
          </h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleArray("desired_categories", cat)}
                className={`px-4 py-2 text-[13px] font-bold border transition-colors ${
                  (prefs.desired_categories || []).includes(cat)
                    ? "bg-blue text-white border-blue"
                    : "bg-white text-[#666] border-border hover:border-blue hover:text-blue"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 業界 */}
        <div className="bg-white border border-border p-6">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            希望業界
          </h2>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => toggleArray("desired_industries", ind)}
                className={`px-3 py-1.5 text-[12px] font-bold border transition-colors ${
                  (prefs.desired_industries || []).includes(ind)
                    ? "bg-blue text-white border-blue"
                    : "bg-white text-[#666] border-border hover:border-blue hover:text-blue"
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        {/* 職種 */}
        <div className="bg-white border border-border p-6">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            希望職種・領域
          </h2>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => toggleArray("desired_roles", role)}
                className={`px-3 py-1.5 text-[12px] font-bold border transition-colors ${
                  (prefs.desired_roles || []).includes(role)
                    ? "bg-blue text-white border-blue"
                    : "bg-white text-[#666] border-border hover:border-blue hover:text-blue"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* 勤務地 */}
        <div className="bg-white border border-border p-6">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            希望勤務地
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => toggleArray("preferred_locations", loc)}
                className={`px-3 py-1.5 text-[12px] font-bold border transition-colors ${
                  (prefs.preferred_locations || []).includes(loc)
                    ? "bg-blue text-white border-blue"
                    : "bg-white text-[#666] border-border hover:border-blue hover:text-blue"
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              リモートワーク希望
            </label>
            <select
              value={prefs.remote_preference ?? ""}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  remote_preference: (e.target.value || null) as UserPreferences["remote_preference"],
                }))
              }
              className="w-full md:w-[300px] px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            >
              <option value="">選択してください</option>
              <option value="remote_only">フルリモート希望</option>
              <option value="hybrid">ハイブリッド可</option>
              <option value="onsite">常駐可</option>
              <option value="any">こだわりなし</option>
            </select>
          </div>
        </div>

        {/* 稼働率 + 開始日 */}
        <div className="bg-white border border-border p-6">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            稼働条件
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                最低稼働率
              </label>
              <select
                value={prefs.min_occupancy ?? ""}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    min_occupancy: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  }))
                }
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              >
                <option value="">指定なし</option>
                <option value="0.1">10%</option>
                <option value="0.2">20%</option>
                <option value="0.3">30%</option>
                <option value="0.4">40%</option>
                <option value="0.5">50%</option>
                <option value="0.6">60%</option>
                <option value="0.7">70%</option>
                <option value="0.8">80%</option>
                <option value="0.9">90%</option>
                <option value="1.0">100%</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                最大稼働率
              </label>
              <select
                value={prefs.max_occupancy ?? ""}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    max_occupancy: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  }))
                }
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              >
                <option value="">指定なし</option>
                <option value="0.1">10%</option>
                <option value="0.2">20%</option>
                <option value="0.3">30%</option>
                <option value="0.4">40%</option>
                <option value="0.5">50%</option>
                <option value="0.6">60%</option>
                <option value="0.7">70%</option>
                <option value="0.8">80%</option>
                <option value="0.9">90%</option>
                <option value="1.0">100%</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                稼働開始可能日
              </label>
              <input
                type="date"
                value={prefs.available_from ?? ""}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    available_from: e.target.value || null,
                  }))
                }
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* 通知設定 */}
        <div className="bg-white border border-border p-6">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            メール通知設定
          </h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.notify_matching_email !== false}
              onChange={(e) => {
                setPrefs((p) => ({
                  ...p,
                  notify_matching_email: e.target.checked,
                }));
                setSaved(false);
              }}
              className="mt-0.5 w-4 h-4 accent-blue cursor-pointer"
            />
            <div>
              <p className="text-[13px] font-bold text-navy">
                マッチング案件の通知メールを受け取る
              </p>
              <p className="text-[11px] text-[#888] mt-0.5">
                AIマッチングで高スコアの案件が見つかった場合、週1回までメールでお知らせします。
                オフにするとマッチング通知メールは送信されません。
              </p>
            </div>
          </label>
        </div>

        {/* 備考 */}
        <div className="bg-white border border-border p-6">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            その他
          </h2>
          <textarea
            value={prefs.notes ?? ""}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, notes: e.target.value }))
            }
            rows={3}
            placeholder="その他ご希望がございましたらご記入ください"
            className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
          />
        </div>

        {error && <p className="text-[12px] text-[#E15454]">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-blue text-white text-[14px] font-bold transition-colors hover:bg-blue-dark disabled:opacity-50"
          >
            {saving ? "保存中..." : "条件を保存"}
          </button>
          {saved && (
            <span className="text-[13px] text-[#10b981] font-bold">
              保存しました
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
