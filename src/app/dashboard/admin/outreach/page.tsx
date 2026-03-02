"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

export default function OutreachPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [emailsText, setEmailsText] = useState("");
  const [subject, setSubject] = useState(
    "【PERSONA】AI導入効果アセスメントのご案内",
  );
  const [utmSource, setUtmSource] = useState("email");
  const [utmCampaign, setUtmCampaign] = useState("assessment_launch");
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    total: number;
    errors?: string[];
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.is_admin) {
        router.push("/dashboard");
        return;
      }
      setLoading(false);
    }
    checkAdmin();
  }, [router]);

  // Parse emails from text
  const parsedEmails = emailsText
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const uniqueEmails = [...new Set(parsedEmails)];

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (uniqueEmails.length === 0) return;

    const confirmed = window.confirm(
      `${uniqueEmails.length}件のメールアドレスに送信します。よろしいですか？`,
    );
    if (!confirmed) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: uniqueEmails,
          subject,
          utmSource,
          utmCampaign,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setResult({
          sent: 0,
          failed: uniqueEmails.length,
          total: uniqueEmails.length,
          errors: [data.error || "送信に失敗しました"],
        });
      }
    } catch {
      setResult({
        sent: 0,
        failed: uniqueEmails.length,
        total: uniqueEmails.length,
        errors: ["ネットワークエラーが発生しました"],
      });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          OUTREACH
        </p>
        <h1 className="text-xl font-black text-navy">
          AIアセスメント営業メール送信
        </h1>
        <p className="text-[13px] text-[#888] mt-1">
          見込み顧客にAI導入効果アセスメントの案内メールを一括送信します
        </p>
      </div>

      <form onSubmit={handleSend}>
        {/* Email addresses input */}
        <div className="bg-white border border-border p-6 mb-4">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-[#E15454]">
            宛先メールアドレス
          </h2>
          <textarea
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            placeholder={
              "メールアドレスを入力してください\n（改行・カンマ・セミコロン区切り対応）\n\n例:\ntanaka@example.com\nsato@company.co.jp, suzuki@firm.jp"
            }
            className="w-full h-48 p-4 border border-border text-[13px] font-mono resize-y focus:outline-none focus:border-[#E15454] placeholder:text-[#ccc]"
          />
          <div className="mt-3 flex items-center gap-4">
            <span className="text-[12px] text-[#888]">
              有効なアドレス:{" "}
              <strong className="text-navy">{uniqueEmails.length}件</strong>
            </span>
            {parsedEmails.length !== uniqueEmails.length && (
              <span className="text-[11px] text-[#E15454]">
                （重複{parsedEmails.length - uniqueEmails.length}
                件を除外）
              </span>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white border border-border p-6 mb-4">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-[#E15454]">
            送信設定
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-[#888] mb-1">
                件名
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3 border border-border text-[13px] focus:outline-none focus:border-[#E15454]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-[#888] mb-1">
                  UTM Source
                </label>
                <input
                  type="text"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                  placeholder="email"
                  className="w-full p-3 border border-border text-[13px] focus:outline-none focus:border-[#E15454]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#888] mb-1">
                  UTM Campaign
                </label>
                <input
                  type="text"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="assessment_launch"
                  className="w-full p-3 border border-border text-[13px] focus:outline-none focus:border-[#E15454]"
                />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[#aaa] mt-3">
            送信元: PERSONA &lt;{process.env.NEXT_PUBLIC_FROM_EMAIL || "noreply@persona-consultant.com"}&gt;
            &nbsp;/&nbsp; LP URL に UTM パラメータが自動付与されます
          </p>
        </div>

        {/* Preview */}
        <div className="bg-white border border-border p-6 mb-4">
          <button
            type="button"
            onClick={() => setPreviewOpen(!previewOpen)}
            className="flex items-center gap-2 text-sm font-bold text-navy hover:text-[#E15454] transition-colors"
          >
            <Icon
              name={previewOpen ? "expand_less" : "expand_more"}
              className="text-[20px]"
            />
            メールプレビュー
          </button>
          {previewOpen && (
            <div className="mt-4 border border-border rounded overflow-hidden">
              <iframe
                src="/api/admin/outreach"
                className="w-full h-[700px] border-0"
                title="Email preview"
              />
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div
            className={`p-5 mb-4 border ${
              result.failed === 0
                ? "bg-green-50 border-green-200"
                : result.sent === 0
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon
                name={result.failed === 0 ? "check_circle" : "warning"}
                className={`text-[22px] ${
                  result.failed === 0 ? "text-green-600" : "text-yellow-600"
                }`}
              />
              <p className="text-[14px] font-bold text-navy">
                {result.failed === 0
                  ? "送信完了"
                  : result.sent === 0
                    ? "送信失敗"
                    : "一部送信完了"}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-[13px]">
              <span>
                成功: <strong className="text-green-700">{result.sent}件</strong>
              </span>
              {result.failed > 0 && (
                <span>
                  失敗:{" "}
                  <strong className="text-red-600">{result.failed}件</strong>
                </span>
              )}
              <span className="text-[#888]">合計: {result.total}件</span>
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-3 text-[12px] text-red-600">
                {result.errors.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Send button */}
        <button
          type="submit"
          disabled={sending || uniqueEmails.length === 0}
          className="w-full py-4 bg-[#E15454] text-white text-[15px] font-bold transition-all hover:bg-[#c94444] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              送信中...
            </>
          ) : (
            <>
              <Icon name="send" className="text-[20px]" />
              {uniqueEmails.length}件に送信する
            </>
          )}
        </button>
      </form>
    </div>
  );
}
