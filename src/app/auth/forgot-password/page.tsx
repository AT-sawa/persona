"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
      } else {
        setSent(true);
      }
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
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
            パスワードリセット
          </h1>
          <div className="bg-white border border-border p-8 rounded-2xl">
            {sent ? (
              <div className="text-center py-4">
                <span className="material-symbols-rounded text-[48px] text-[#10b981] block mb-3">
                  check_circle
                </span>
                <p className="text-[14px] font-bold text-navy mb-2">
                  メールを送信しました
                </p>
                <p className="text-[12px] text-[#888] mb-4">
                  {email} にパスワードリセット用のリンクを送信しました。
                  メールをご確認ください。
                </p>
                <Link
                  href="/auth/login"
                  className="inline-block text-[13px] font-bold text-blue hover:underline"
                >
                  ログインページに戻る
                </Link>
              </div>
            ) : (
              <>
                <p className="text-[12px] text-[#888] mb-5">
                  登録済みのメールアドレスを入力してください。
                  パスワードリセット用のリンクをお送りします。
                </p>
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-[#888] mb-1">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="example@email.com"
                      className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none rounded-xl bg-[#fafafa] focus:border-blue focus:bg-white"
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-[#E15454] mb-4">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-blue text-white border-none text-[15px] font-bold cursor-pointer rounded-xl transition-colors hover:bg-blue-dark disabled:opacity-50"
                  >
                    {loading ? "送信中..." : "リセットリンクを送信"}
                  </button>
                </form>
              </>
            )}
            <p className="text-xs text-[#888] text-center mt-4">
              <Link href="/auth/login" className="text-blue font-bold">
                ログインに戻る
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
