"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { analytics } from "@/lib/analytics";
import Header from "@/components/Header";
import SkillsInput from "@/components/dashboard/SkillsInput";

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

const STEPS = [
  { label: "基本情報", icon: "person" },
  { label: "スキル・希望条件", icon: "tune" },
  { label: "稼働状況", icon: "event_available" },
];

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [fullName, setFullName] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [background, setBackground] = useState("");
  const [bio, setBio] = useState("");

  // Step 2
  const [skills, setSkills] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [remotePref, setRemotePref] = useState("");
  const [rateMin, setRateMin] = useState("");
  const [rateMax, setRateMax] = useState("");

  // Step 3
  const [availableFrom, setAvailableFrom] = useState("");
  const [isLooking, setIsLooking] = useState(true);
  const [minOccupancy, setMinOccupancy] = useState("");
  const [maxOccupancy, setMaxOccupancy] = useState("");

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (p) {
        // Already completed onboarding
        if (p.bio && p.prefecture && p.years_experience) {
          router.push("/dashboard");
          return;
        }
        setFullName(p.full_name || "");
        if (p.prefecture) setPrefecture(p.prefecture);
        if (p.years_experience) setYearsExp(String(p.years_experience));
        if (p.background) setBackground(p.background);
        if (p.bio) setBio(p.bio);
        if (p.skills?.length) setSkills(p.skills);
        if (p.remote_preference) setRemotePref(p.remote_preference);
        if (p.hourly_rate_min) setRateMin(String(p.hourly_rate_min));
        if (p.hourly_rate_max) setRateMax(String(p.hourly_rate_max));
        if (p.available_from) setAvailableFrom(p.available_from);
        if (p.is_looking !== undefined) setIsLooking(p.is_looking);
      }

      const { data: pref } = await supabase.from("user_preferences").select("*").eq("user_id", user.id).single();
      if (pref) {
        if (pref.desired_categories?.length) setCategories(pref.desired_categories);
        if (pref.min_occupancy) setMinOccupancy(String(pref.min_occupancy));
        if (pref.max_occupancy) setMaxOccupancy(String(pref.max_occupancy));
      }

      setLoading(false);
    }
    init();
  }, [router]);

  async function saveStep1() {
    if (!fullName.trim()) { setError("氏名を入力してください"); return false; }
    setSaving(true); setError("");
    const supabase = createClient();
    const { error: e } = await supabase.from("profiles").update({
      full_name: fullName.trim(),
      prefecture: prefecture || null,
      years_experience: yearsExp ? parseInt(yearsExp) : null,
      background: background.trim() || null,
      bio: bio.trim() || null,
    }).eq("id", userId);
    setSaving(false);
    if (e) { setError("保存に失敗しました"); return false; }
    return true;
  }

  async function saveStep2() {
    setSaving(true); setError("");
    const supabase = createClient();
    const { error: e1 } = await supabase.from("profiles").update({
      skills: skills.length ? skills : null,
      remote_preference: remotePref || null,
      hourly_rate_min: rateMin ? parseInt(rateMin) : null,
      hourly_rate_max: rateMax ? parseInt(rateMax) : null,
    }).eq("id", userId);

    const prefData = {
      user_id: userId,
      desired_categories: categories.length ? categories : null,
      remote_preference: remotePref || null,
      desired_rate_min: rateMin ? parseInt(rateMin) : null,
      desired_rate_max: rateMax ? parseInt(rateMax) : null,
    };
    await supabase.from("user_preferences").upsert(prefData, { onConflict: "user_id" });

    setSaving(false);
    if (e1) { setError("保存に失敗しました"); return false; }
    return true;
  }

  async function saveStep3() {
    setSaving(true); setError("");
    const supabase = createClient();
    const { error: e1 } = await supabase.from("profiles").update({
      available_from: availableFrom || null,
      is_looking: isLooking,
      profile_complete: true,
    }).eq("id", userId);

    const prefData = {
      user_id: userId,
      min_occupancy: minOccupancy ? parseInt(minOccupancy) : null,
      max_occupancy: maxOccupancy ? parseInt(maxOccupancy) : null,
      available_from: availableFrom || null,
    };
    await supabase.from("user_preferences").upsert(prefData, { onConflict: "user_id" });

    setSaving(false);
    if (e1) { setError("保存に失敗しました"); return false; }
    return true;
  }

  async function handleNext() {
    let ok = false;
    if (step === 1) ok = await saveStep1();
    if (step === 2) ok = await saveStep2();
    if (ok) {
      analytics.onboardingStep(step + 1);
      setStep(step + 1);
    }
  }

  async function handleComplete() {
    const ok = await saveStep3();
    if (ok) {
      analytics.onboardingComplete();
      router.push("/dashboard");
    }
  }

  async function handleSkip() {
    const supabase = createClient();
    await supabase.from("profiles").update({ profile_complete: true }).eq("id", userId);
    router.push("/dashboard");
  }

  function quickDate(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setAvailableFrom(d.toISOString().split("T")[0]);
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-[72px] min-h-screen bg-gray-bg flex items-center justify-center">
          <div className="text-[#888] text-sm flex items-center gap-2">
            <Icon name="progress_activity" className="text-[20px] animate-spin" />
            読み込み中...
          </div>
        </main>
      </>
    );
  }

  const inputCls = "w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white rounded-lg";
  const labelCls = "block text-[11px] font-bold text-[#888] mb-1.5";

  return (
    <>
      <Header />
      <main className="pt-[72px] pb-16 px-4 min-h-screen bg-gray-bg">
        <div className="max-w-[680px] mx-auto">

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-0 my-8">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step > i + 1 ? "bg-[#10b981] text-white" :
                    step === i + 1 ? "bg-blue text-white" :
                    "bg-[#f0f2f5] text-[#999]"
                  }`}>
                    {step > i + 1 ? <Icon name="check" className="text-[20px]" /> : i + 1}
                  </div>
                  <span className={`text-[11px] font-bold ${step === i + 1 ? "text-navy" : "text-[#999]"}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && <div className={`w-16 h-[2px] mx-2 mb-5 ${step > i + 1 ? "bg-[#10b981]" : "bg-[#e0e0e0]"}`} />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-border/60 p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

            {step === 1 && (
              <>
                <h1 className="text-xl font-black text-navy mb-1">PERSONAへようこそ</h1>
                <p className="text-[13px] text-[#888] mb-6">基本情報を入力して、あなたに最適な案件をマッチングします。</p>

                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>氏名 <span className="text-[#E15454]">*</span></label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} placeholder="山田 太郎" />
                  </div>
                  <div>
                    <label className={labelCls}>都道府県</label>
                    <select value={prefecture} onChange={e => setPrefecture(e.target.value)} className={inputCls}>
                      <option value="">選択してください</option>
                      {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>コンサルティング経験年数</label>
                    <input type="number" min="0" max="50" value={yearsExp} onChange={e => setYearsExp(e.target.value)} className={inputCls} placeholder="例: 10" />
                  </div>
                  <div>
                    <label className={labelCls}>バックグラウンド</label>
                    <input value={background} onChange={e => setBackground(e.target.value)} className={inputCls} placeholder="例: Big4出身、IT業界15年" />
                  </div>
                  <div>
                    <label className={labelCls}>自己紹介・経歴概要</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className={inputCls} placeholder="これまでのご経験やご専門領域について記載ください" />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-lg font-black text-navy mb-1">スキル・希望条件</h2>
                <p className="text-[13px] text-[#888] mb-6">マッチング精度を高めるための情報です。</p>

                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>スキル・専門領域</label>
                    <SkillsInput value={skills} onChange={setSkills} />
                  </div>
                  <div>
                    <label className={labelCls}>希望カテゴリ</label>
                    <div className="flex gap-2">
                      {["IT", "非IT"].map(c => (
                        <button key={c} type="button" onClick={() => setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                          className={`px-5 py-2 text-[13px] font-bold rounded-lg border transition-colors ${categories.includes(c) ? "bg-blue text-white border-blue" : "bg-[#fafafa] text-[#666] border-border hover:border-blue"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>リモートワーク希望</label>
                    <select value={remotePref} onChange={e => setRemotePref(e.target.value)} className={inputCls}>
                      <option value="">選択してください</option>
                      <option value="remote_only">フルリモート希望</option>
                      <option value="hybrid">ハイブリッド可</option>
                      <option value="onsite">常駐可</option>
                      <option value="any">こだわりなし</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>希望報酬（万円/月）</label>
                    <div className="flex items-center gap-2">
                      <input type="number" step="10" min="0" value={rateMin} onChange={e => setRateMin(e.target.value)} className={inputCls} placeholder="下限" />
                      <span className="text-[#888] text-sm">〜</span>
                      <input type="number" step="10" min="0" value={rateMax} onChange={e => setRateMax(e.target.value)} className={inputCls} placeholder="上限" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-lg font-black text-navy mb-1">稼働状況</h2>
                <p className="text-[13px] text-[#888] mb-6">いつから稼働可能かを設定してください。</p>

                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>稼働開始可能日</label>
                    <input type="date" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} className={inputCls} />
                    <div className="flex gap-2 mt-2">
                      {[{ label: "即日", days: 0 }, { label: "1週間後", days: 7 }, { label: "1ヶ月後", days: 30 }, { label: "2ヶ月後", days: 60 }].map(q => (
                        <button key={q.days} type="button" onClick={() => quickDate(q.days)}
                          className="text-[11px] text-[#888] border border-border/60 px-2.5 py-1 rounded hover:border-blue hover:text-blue transition-colors">
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>案件を探していますか？</label>
                    <button type="button" onClick={() => setIsLooking(!isLooking)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${isLooking ? "bg-blue" : "bg-[#ccc]"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isLooking ? "left-[26px]" : "left-0.5"}`} />
                    </button>
                    <span className="ml-3 text-[13px] text-[#666]">{isLooking ? "探しています" : "今は探していません"}</span>
                  </div>
                  <div>
                    <label className={labelCls}>希望稼働率</label>
                    <div className="flex items-center gap-2">
                      <select value={minOccupancy} onChange={e => setMinOccupancy(e.target.value)} className={inputCls}>
                        <option value="">下限</option>
                        {[10,20,30,40,50,60,70,80,90,100].map(v => <option key={v} value={v}>{v}%</option>)}
                      </select>
                      <span className="text-[#888] text-sm">〜</span>
                      <select value={maxOccupancy} onChange={e => setMaxOccupancy(e.target.value)} className={inputCls}>
                        <option value="">上限</option>
                        {[10,20,30,40,50,60,70,80,90,100].map(v => <option key={v} value={v}>{v}%</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-xs text-[#E15454] mt-4">{error}</p>}

            {/* Actions */}
            <div className="flex items-center justify-between mt-8">
              <div>
                {step > 1 && (
                  <button onClick={() => { setStep(step - 1); setError(""); }}
                    className="px-6 py-2.5 text-[13px] font-bold text-[#888] border border-border rounded-xl hover:bg-[#fafafa] transition-colors">
                    戻る
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleSkip} className="text-[12px] text-[#999] hover:text-blue underline">スキップ</button>
                {step < 3 ? (
                  <button onClick={handleNext} disabled={saving}
                    className="px-8 py-2.5 bg-blue text-white text-[14px] font-bold rounded-xl hover:bg-blue-dark transition-colors disabled:opacity-50">
                    {saving ? "保存中..." : "次へ"}
                  </button>
                ) : (
                  <button onClick={handleComplete} disabled={saving}
                    className="px-8 py-2.5 bg-blue text-white text-[14px] font-bold rounded-xl hover:bg-blue-dark transition-colors disabled:opacity-50">
                    {saving ? "保存中..." : "完了"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
