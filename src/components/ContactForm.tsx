"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

  function update(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      setSubmitted(true);
    } catch {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white border border-border p-8" id="contact">
        <div className="text-center py-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue/10 flex items-center justify-center">
            <span className="text-blue text-2xl font-bold">✓</span>
          </div>
          <p className="text-[15px] font-bold text-navy mb-2">
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
      className="bg-white border border-border p-8"
      id="contact"
    >
      <p className="text-[15px] font-black text-navy pb-3 border-b-2 border-blue mb-5">
        お問い合わせフォーム
      </p>
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
      <div className="mb-4">
        <label className="block text-[11px] font-bold text-[#888] mb-1">
          お問い合わせ内容
          <span className="text-[#E15454] text-[10px] ml-0.5"> *必須</span>
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => update("message", e.target.value)}
          rows={5}
          required
          placeholder="ご相談内容をお聞かせください（例：DX推進プロジェクトへのコンサルタントアサインについて相談したい）"
          className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
        />
      </div>
      {error && <p className="text-[11px] text-[#E15454] mb-3">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-blue text-white border-none text-[15px] font-bold cursor-pointer transition-colors hover:bg-blue-dark disabled:opacity-50"
      >
        {loading ? "送信中..." : "お問い合わせを送信する"}
      </button>
      <p className="text-[10px] text-[#aaa] text-center mt-2">
        2営業日以内に担当者よりご連絡いたします
      </p>
    </form>
  );
}
