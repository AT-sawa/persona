"use client";

import { useState, FormEvent } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  // Feature flag — hide entirely if disabled
  if (process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED !== "true") {
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("ご登録ありがとうございます。最新情報をお届けします。");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "登録に失敗しました");
      }
    } catch {
      setStatus("error");
      setMessage("通信エラーが発生しました。しばらくしてからお試しください。");
    }
  }

  return (
    <div className="bg-[#f0f8ff] border border-blue/10 rounded-xl p-6 sm:p-8">
      <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1.5">
        NEWSLETTER
      </p>
      <h3 className="text-[clamp(16px,2vw,20px)] font-black text-navy leading-[1.4] mb-2">
        最新記事をメールでお届け
      </h3>
      <p className="text-[13px] text-[#666] leading-[1.8] mb-5">
        フリーコンサルのキャリア・案件・業界トレンドなど、
        実務に役立つ情報を定期的にお届けします。
      </p>

      {status === "success" ? (
        <div className="bg-white border border-emerald-200 rounded-lg px-4 py-3">
          <p className="text-[13px] text-emerald-700 font-medium">{message}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="メールアドレスを入力"
            required
            className="flex-1 px-4 py-2.5 text-[13px] bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all placeholder:text-[#bbb]"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="bg-blue text-white px-6 py-2.5 text-[13px] font-bold rounded-lg transition-colors hover:bg-blue-dark disabled:opacity-60 shrink-0"
          >
            {status === "loading" ? "登録中..." : "登録する"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="text-[12px] text-red-500 mt-2">{message}</p>
      )}

      <p className="text-[11px] text-[#999] mt-3 leading-[1.7]">
        配信停止はメール内のリンクからいつでも可能です。
      </p>
    </div>
  );
}
