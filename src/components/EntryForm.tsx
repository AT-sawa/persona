"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendNotification } from "@/lib/notify";

interface EntryFormProps {
  caseId: string;
}

export default function EntryForm({ caseId }: EntryFormProps) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser ? { id: currentUser.id } : null);
      setLoading(false);
    }
    checkAuth();
  }, []);

  async function handleEntry() {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setError("");
    const supabase = createClient();
    const supabaseUser = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("entries").insert({
      case_id: caseId,
      user_id: user.id,
      message,
    });
    if (insertError) {
      setError("エントリーの送信に失敗しました。もう一度お試しください。");
      return;
    }
    // Fetch profile for richer admin notification
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, background")
      .eq("id", user.id)
      .single();
    sendNotification("case_entry", {
      case_id: caseId,
      email: supabaseUser.data.user?.email || undefined,
      full_name: profile?.full_name || undefined,
      firm: profile?.background || undefined,
      message,
    });
    setSubmitted(true);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e8e8ed] p-6">
      <h2 className="text-[15px] font-semibold text-navy mb-5">
        この案件にエントリーする
      </h2>
      {submitted ? (
        <div className="bg-[#f0faf5] rounded-xl p-5 text-center">
          <p className="text-[14px] text-[#1a8a5c] font-semibold">
            エントリーを送信しました
          </p>
          <p className="text-[12px] text-[#888] mt-1">
            担当者よりご連絡いたします。
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5">
            <label className="block text-[12px] text-[#888] mb-2">
              メッセージ（任意）
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-[#e8e8ed] text-[13px] text-text outline-none rounded-xl bg-[#f9f9fc] focus:border-navy focus:bg-white resize-none transition-colors"
              placeholder="志望動機や自己PRをご記入ください"
            />
          </div>
          {error && (
            <p className="text-[12px] text-[#E15454] mb-4">{error}</p>
          )}
          <button
            onClick={handleEntry}
            disabled={loading}
            className="w-full py-3.5 bg-navy text-white border-none text-[14px] font-semibold cursor-pointer rounded-xl transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
          >
            {loading
              ? "読み込み中..."
              : user
              ? "エントリーする"
              : "ログインしてエントリー"}
          </button>
        </>
      )}
    </div>
  );
}
