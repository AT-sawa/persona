"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <>
      <Header />
      <main className="py-[72px] px-6 bg-gray-bg min-h-screen">
        <div className="max-w-[420px] mx-auto">
          <h1 className="text-xl font-black text-navy mb-6 text-center">
            ログイン
          </h1>
          <div className="bg-white border border-border p-8">
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-[#888] mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
                />
              </div>
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-[#888] mb-1">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
                />
              </div>
              {error && (
                <p className="text-xs text-[#E15454] mb-4">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue text-white border-none text-[15px] font-bold cursor-pointer transition-colors hover:bg-blue-dark disabled:opacity-50"
              >
                {loading ? "ログイン中..." : "ログイン"}
              </button>
            </form>
            <p className="text-xs text-[#888] text-center mt-4">
              アカウントをお持ちでない方は
              <Link href="/auth/register" className="text-blue font-bold">
                新規登録
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
