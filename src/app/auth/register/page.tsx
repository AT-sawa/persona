"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendNotification } from "@/lib/notify";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();

    const { data, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      });
      if (profileError) {
        console.error("Profile insert error:", profileError);
      }
      sendNotification("consultant_lead", {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      });
    }

    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <>
      <Header />
      <main className="py-[72px] px-6 bg-gray-bg min-h-screen">
        <div className="max-w-[420px] mx-auto">
          <h1 className="text-xl font-black text-navy mb-6 text-center">
            新規会員登録
          </h1>
          <div className="bg-white border border-border p-8">
            <form onSubmit={handleRegister}>
              {[
                {
                  key: "fullName",
                  label: "氏名",
                  type: "text",
                  placeholder: "山田 太郎",
                },
                {
                  key: "email",
                  label: "メールアドレス",
                  type: "email",
                  placeholder: "example@email.com",
                },
                {
                  key: "phone",
                  label: "電話番号",
                  type: "tel",
                  placeholder: "090-0000-0000",
                },
                {
                  key: "password",
                  label: "パスワード",
                  type: "password",
                  placeholder: "8文字以上",
                },
              ].map((field) => (
                <div key={field.key} className="mb-4">
                  <label className="block text-[11px] font-bold text-[#888] mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={formData[field.key as keyof typeof formData]}
                    onChange={(e) => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required
                    className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
                  />
                </div>
              ))}
              {error && (
                <p className="text-xs text-[#E15454] mb-4">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue text-white border-none text-[15px] font-bold cursor-pointer transition-colors hover:bg-blue-dark disabled:opacity-50"
              >
                {loading ? "登録中..." : "登録する"}
              </button>
            </form>
            <p className="text-xs text-[#888] text-center mt-4">
              すでにアカウントをお持ちの方は
              <Link href="/auth/login" className="text-blue font-bold">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
