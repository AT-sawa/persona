"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sendNotification } from "@/lib/notify";

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    firm: "",
    experience: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.firm ||
      formData.firm === "選択してください"
    ) {
      setError("必須項目をすべて入力してください");
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
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          firm: formData.firm,
          experience: formData.experience || null,
        });
      if (insertError) throw insertError;
      sendNotification("consultant_lead", {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        firm: formData.firm,
        experience: formData.experience,
      });
      setSubmitted(true);
    } catch {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white border border-border p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <p className="text-[15px] font-black text-navy pb-3 border-b-2 border-blue mb-5">
          登録完了
        </p>
        <div className="text-center py-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue/10 flex items-center justify-center">
            <span className="text-blue text-2xl font-bold">✓</span>
          </div>
          <p className="text-[15px] font-bold text-navy mb-2">
            ご登録ありがとうございます
          </p>
          <p className="text-[13px] text-[#888] leading-[1.8]">
            専門コーディネーターより面談の日程調整について
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
      className="bg-white border border-border p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
    >
      <p className="text-[15px] font-black text-navy pb-3 border-b-2 border-blue mb-5">
        フリーコンサル登録フォーム
      </p>
      {[
        {
          key: "fullName",
          label: "氏名",
          type: "text",
          placeholder: "山田 太郎",
          required: true,
        },
        {
          key: "phone",
          label: "電話番号",
          type: "tel",
          placeholder: "090-0000-0000",
          required: true,
        },
        {
          key: "email",
          label: "メールアドレス",
          type: "email",
          placeholder: "example@email.com",
          required: true,
        },
      ].map((field) => (
        <div key={field.key} className="mb-3">
          <label className="block text-[11px] font-bold text-[#888] mb-1">
            {field.label}
            {field.required && (
              <span className="text-[#E15454] text-[10px] ml-0.5">
                {" "}
                *必須
              </span>
            )}
          </label>
          <input
            type={field.type}
            value={formData[field.key as keyof typeof formData]}
            onChange={(e) => update(field.key, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
          />
        </div>
      ))}
      <div className="mb-3">
        <label className="block text-[11px] font-bold text-[#888] mb-1">
          お勤め経験のあるコンサルファーム
          <span className="text-[#E15454] text-[10px] ml-0.5"> *必須</span>
        </label>
        <select
          value={formData.firm}
          onChange={(e) => update("firm", e.target.value)}
          required
          className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
        >
          <option value="">選択してください</option>
          <option>McKinsey &amp; Company</option>
          <option>BCG</option>
          <option>Deloitte</option>
          <option>PwC</option>
          <option>アクセンチュア</option>
          <option>A.T. Kearney</option>
          <option>Roland Berger</option>
          <option>EY</option>
          <option>KPMG</option>
          <option>その他</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="block text-[11px] font-bold text-[#888] mb-1">
          フリーコンサル経験
        </label>
        <select
          value={formData.experience}
          onChange={(e) => update("experience", e.target.value)}
          className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
        >
          <option value="">選択してください</option>
          <option>業務改革/業務改善/BPR</option>
          <option>戦略</option>
          <option>DX推進</option>
          <option>PMO</option>
          <option>SAP</option>
          <option>新規事業</option>
          <option>その他</option>
        </select>
      </div>
      {error && <p className="text-[11px] text-[#E15454] mb-2">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-blue text-white border-none text-[15px] font-bold cursor-pointer transition-colors hover:bg-blue-dark mt-1 disabled:opacity-50"
      >
        {loading ? "送信中..." : "登録する"}
      </button>
      <p className="text-[10px] text-[#aaa] text-center mt-2">
        ご登録いただきますと
        <Link href="/privacy" className="text-blue">
          プライバシーポリシー
        </Link>
        に同意したものとみなします
      </p>
    </form>
  );
}
