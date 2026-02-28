"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendNotification } from "@/lib/notify";
import { useHoneypot } from "@/lib/useHoneypot";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    companyName: "",
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hp = useHoneypot();

  function update(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hp.isFilled) { setSubmitted(true); return; }
    if (!formData.companyName || !formData.fullName || !formData.email) {
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
          type: "enterprise_inquiry",
          company_name: formData.companyName,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          message: formData.message || null,
        });
      if (insertError) throw insertError;
      sendNotification("enterprise_inquiry", {
        company_name: formData.companyName,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
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
      <div className="bg-white rounded-2xl border border-[#e8e8ed] p-8" id="contact">
        <div className="text-center py-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#34d399]/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-[16px] font-bold text-[#091747] mb-2">
            お問い合わせを受け付けました
          </p>
          <p className="text-[13px] text-[#888] leading-[1.8]">
            担当者より2営業日以内にご連絡いたします。
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-[#e8e8ed] p-8"
      id="contact"
    >
      <h3 className="text-[16px] font-bold text-[#091747] mb-6">
        お問い合わせフォーム
      </h3>
      {[
        {
          key: "companyName",
          label: "会社名",
          type: "text",
          placeholder: "株式会社〇〇",
          required: true,
        },
        {
          key: "fullName",
          label: "ご担当者名",
          type: "text",
          placeholder: "山田 太郎",
          required: true,
        },
        {
          key: "email",
          label: "メールアドレス",
          type: "email",
          placeholder: "example@company.com",
          required: true,
        },
        {
          key: "phone",
          label: "電話番号",
          type: "tel",
          placeholder: "03-0000-0000",
          required: false,
        },
      ].map((field) => (
        <div key={field.key} className="mb-4">
          <label className="block text-[12px] font-semibold text-[#555] mb-1.5">
            {field.label}
            {field.required && (
              <span className="text-[#E15454] text-[10px] ml-1">*必須</span>
            )}
          </label>
          <input
            type={field.type}
            value={formData[field.key as keyof typeof formData]}
            onChange={(e) => update(field.key, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-4 py-3 rounded-xl border border-[#e8e8ed] text-[13px] text-[#091747] outline-none bg-[#f8f9fb] focus:border-[#1FABE9] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,171,233,0.08)] transition-all placeholder:text-[#bbb]"
          />
        </div>
      ))}
      <div className="mb-5">
        <label className="block text-[12px] font-semibold text-[#555] mb-1.5">
          お問い合わせ内容
          <span className="text-[#E15454] text-[10px] ml-1">*必須</span>
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => update("message", e.target.value)}
          rows={5}
          required
          placeholder="ご相談内容をお聞かせください（例：DX推進プロジェクトへのコンサルタントアサインについて相談したい）"
          className="w-full px-4 py-3 rounded-xl border border-[#e8e8ed] text-[13px] text-[#091747] outline-none bg-[#f8f9fb] focus:border-[#1FABE9] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,171,233,0.08)] transition-all resize-none placeholder:text-[#bbb]"
        />
      </div>
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={hp.value}
        onChange={(e) => hp.setValue(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="absolute opacity-0 h-0 w-0 pointer-events-none"
        aria-hidden="true"
      />
      {error && <p className="text-[12px] text-[#E15454] mb-3">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-gradient-to-r from-[#1FABE9] to-[#34d399] text-white text-[15px] font-bold rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(31,171,233,0.3)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
      >
        {loading ? "送信中..." : "お問い合わせを送信する"}
      </button>
      <p className="text-[11px] text-[#aaa] text-center mt-3">
        2営業日以内に担当者よりご連絡いたします
      </p>
    </form>
  );
}
