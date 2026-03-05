"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    firm: "",
    password: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (formData.password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }

    setLoading(true);

    try {
      // Register via server API (bypasses email confirmation)
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone,
          firm: formData.firm,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登録に失敗しました");
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (loginError) {
        // Registration succeeded but auto-login failed - redirect to login page
        router.push("/auth/login?registered=true");
        return;
      }

      router.push("/onboarding");
    } catch {
      setError("登録に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
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
                  key: "firm",
                  label: "在籍/出身ファーム",
                  type: "text",
                  placeholder: "例: マッキンゼー、BCG、デロイト",
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
                    required={field.key !== "phone" && field.key !== "firm"}
                    className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
                  />
                </div>
              ))}
              <label className="flex items-start gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 accent-blue"
                />
                <span className="text-[11px] text-[#666] leading-[1.6]">
                  <Link href="/terms" target="_blank" className="text-blue hover:underline">利用規約</Link>
                  および
                  <Link href="/privacy" target="_blank" className="text-blue hover:underline">プライバシーポリシー</Link>
                  に同意します
                </span>
              </label>
              {error && (
                <p className="text-xs text-[#E15454] mb-4">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !agreed}
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
