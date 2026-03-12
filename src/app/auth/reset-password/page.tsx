"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Listen for PASSWORD_RECOVERY event (implicit flow / hash-based)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if user already has a session
    // (PKCE flow: callback route already exchanged the code)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }

    if (password !== confirm) {
      setError("パスワードが一致しません");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 2000);
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
            新しいパスワードを設定
          </h1>
          <div className="bg-white border border-border p-8 rounded-2xl">
            {success ? (
              <div className="text-center py-4">
                <span className="material-symbols-rounded text-[48px] text-[#10b981] block mb-3">
                  check_circle
                </span>
                <p className="text-[14px] font-bold text-navy mb-2">
                  パスワードを更新しました
                </p>
                <p className="text-[12px] text-[#888]">
                  ダッシュボードに移動します...
                </p>
              </div>
            ) : !ready ? (
              <div className="text-center py-4">
                <span className="material-symbols-rounded text-[48px] text-[#f59e0b] block mb-3">
                  hourglass_empty
                </span>
                <p className="text-[14px] font-bold text-navy mb-2">
                  リンクを確認中...
                </p>
                <p className="text-[12px] text-[#888] mb-4">
                  リセットリンクが無効または期限切れの可能性があります。
                </p>
                <Link
                  href="/auth/forgot-password"
                  className="inline-block text-[13px] font-bold text-blue hover:underline"
                >
                  リセットリンクを再送信
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-[11px] font-bold text-[#888] mb-1">
                    新しいパスワード
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="8文字以上"
                    className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none rounded-xl bg-[#fafafa] focus:border-blue focus:bg-white"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-[11px] font-bold text-[#888] mb-1">
                    パスワード確認
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="もう一度入力"
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
                  {loading ? "更新中..." : "パスワードを更新"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
