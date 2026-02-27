"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendNotification } from "@/lib/notify";

export default function HeroForm() {
  const [email, setEmail] = useState("");
  const [firm, setFirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !firm || firm === "選択してください") {
      setError("メールアドレスとコンサルファームを入力してください");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("inquiries")
        .insert({
          type: "consultant_lead",
          email,
          firm,
        });
      if (insertError) throw insertError;
      sendNotification("consultant_lead", { email, firm });
      setSubmitted(true);
    } catch {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-border p-6 shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
        <p className="text-[13px] font-bold text-navy mb-4 pb-2.5 border-b-2 border-blue flex items-center gap-1.5">
          <span className="w-1 h-4 bg-blue shrink-0" />
          登録完了
        </p>
        <div className="text-center py-4">
          <p className="text-2xl mb-2">✓</p>
          <p className="text-sm font-bold text-blue mb-2">
            ご登録ありがとうございます
          </p>
          <p className="text-[12px] text-[#888] leading-[1.8]">
            専門コーディネーターより
            <br />
            ご連絡をさせていただきます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/95 backdrop-blur-sm border border-border p-6 shadow-[0_4px_24px_rgba(0,0,0,0.07)]"
    >
      <p className="text-[13px] font-bold text-navy mb-4 pb-2.5 border-b-2 border-blue flex items-center gap-1.5">
        <span className="w-1 h-4 bg-blue shrink-0" />
        フリーコンサル登録フォーム
      </p>
      <div className="mb-2.5">
        <label className="block text-[11px] font-bold text-[#888] mb-0.5">
          メールアドレス
          <span className="text-[#E15454] text-[10px] ml-0.5">*必須</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          required
          className="w-full px-[11px] py-[9px] border border-border text-[13px] text-text outline-none bg-[#fafafa] transition-colors focus:border-blue focus:bg-white"
        />
      </div>
      <div className="mb-2.5">
        <label className="block text-[11px] font-bold text-[#888] mb-0.5">
          お勤め経験のあるコンサルファーム
          <span className="text-[#E15454] text-[10px] ml-0.5">*必須</span>
        </label>
        <select
          value={firm}
          onChange={(e) => setFirm(e.target.value)}
          required
          className="w-full px-[11px] py-[9px] border border-border text-[13px] text-text outline-none bg-[#fafafa] transition-colors focus:border-blue focus:bg-white"
        >
          <option value="">選択してください</option>
          <option>McKinsey &amp; Company</option>
          <option>BCG</option>
          <option>Deloitte</option>
          <option>PwC</option>
          <option>アクセンチュア</option>
          <option>A.T. Kearney</option>
          <option>Roland Berger</option>
          <option>その他</option>
        </select>
      </div>
      {error && (
        <p className="text-[11px] text-[#E15454] mb-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue text-white border-none text-sm font-bold cursor-pointer transition-colors hover:bg-blue-dark disabled:opacity-50"
      >
        {loading ? "送信中..." : "無料で登録する"}
      </button>
      <p className="text-[10px] text-[#aaa] text-center mt-1.5">
        登録無料・専門コーディネーターよりご連絡します
      </p>
    </form>
  );
}
