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
    const supabase = createClient();
    const supabaseUser = await supabase.auth.getUser();
    await supabase.from("entries").insert({
      case_id: caseId,
      user_id: user.id,
      message,
    });
    sendNotification("case_entry", {
      case_id: caseId,
      email: supabaseUser.data.user?.email || undefined,
      message,
    });
    setSubmitted(true);
  }

  return (
    <div className="bg-white border border-border p-8">
      <h2 className="text-[15px] font-black text-navy pb-3 border-b-2 border-blue mb-5">
        この案件にエントリーする
      </h2>
      {submitted ? (
        <p className="text-sm text-blue font-bold">
          エントリーを送信しました。担当者よりご連絡いたします。
        </p>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              メッセージ（任意）
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
              placeholder="志望動機や自己PRをご記入ください"
            />
          </div>
          <button
            onClick={handleEntry}
            disabled={loading}
            className="w-full py-3.5 bg-blue text-white border-none text-[15px] font-bold cursor-pointer transition-colors hover:bg-blue-dark disabled:opacity-50"
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
