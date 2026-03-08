"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ClientRow {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  created_at: string | null;
  proposal_count: number;
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formName, setFormName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{
    email: string;
    password: string;
    emailSent: boolean;
  } | null>(null);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  async function checkAdminAndFetch() {
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
    fetchClients();
  }

  async function fetchClients() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formEmail || !formCompany) return;
    setCreating(true);
    setCreatedInfo(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formEmail,
          company_name: formCompany,
          full_name: formName || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedInfo({
          email: formEmail,
          password: data.temporary_password,
          emailSent: data.email_sent,
        });
        setFormEmail("");
        setFormCompany("");
        setFormName("");
        fetchClients();
      } else {
        alert(data.error || "作成に失敗しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setCreating(false);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
            CLIENTS
          </p>
          <h1 className="text-xl font-black text-navy">クライアント管理</h1>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setCreatedInfo(null);
          }}
          className="px-5 py-2.5 bg-blue text-white text-[13px] font-bold transition-colors hover:bg-blue-dark flex items-center gap-1.5"
        >
          <Icon name="person_add" className="text-[18px]" />
          新規クライアント
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-border p-6 mb-5">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            クライアントアカウント作成
          </h2>

          {createdInfo ? (
            <div className="bg-green-50 border border-green-200 p-5">
              <p className="text-[14px] font-bold text-green-800 mb-3 flex items-center gap-2">
                <Icon name="check_circle" className="text-[20px]" />
                アカウントが作成されました
              </p>
              <div className="space-y-2 text-[13px] text-green-900">
                <p>
                  <span className="font-bold">メールアドレス:</span>{" "}
                  {createdInfo.email}
                </p>
                <p>
                  <span className="font-bold">初回パスワード:</span>{" "}
                  <code className="bg-green-100 px-2 py-0.5 rounded font-mono text-[12px]">
                    {createdInfo.password}
                  </code>
                </p>
                <p className="text-[12px] text-green-700">
                  {createdInfo.emailSent
                    ? "✓ 招待メールを送信しました"
                    : "⚠ 招待メールの送信に失敗しました。上記のパスワードを直接お伝えください。"}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#888] mb-1">
                    メールアドレス *
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    placeholder="client@example.com"
                    className="w-full px-4 py-2.5 border border-border text-[14px] text-navy focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/30"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#888] mb-1">
                    企業名 *
                  </label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    required
                    placeholder="株式会社〇〇"
                    className="w-full px-4 py-2.5 border border-border text-[14px] text-navy focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#888] mb-1">
                  担当者名（任意）
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="山田 太郎"
                  className="w-full px-4 py-2.5 border border-border text-[14px] text-navy focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/30 max-w-md"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 bg-blue text-white text-[13px] font-bold transition-colors hover:bg-blue-dark disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    作成中...
                  </>
                ) : (
                  <>
                    <Icon name="send" className="text-[16px]" />
                    アカウント作成＆招待メール送信
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Client list */}
      <div className="bg-white border border-border p-6">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-[#E15454]">
          クライアント一覧（{clients.length}件）
        </h2>

        {clients.length === 0 ? (
          <div className="text-center py-12 text-[#999]">
            <Icon name="group" className="text-[40px] block mx-auto mb-2 opacity-30" />
            <p className="text-[14px]">クライアントがまだ登録されていません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.id}
                className="border border-border/60 p-4 hover:bg-[#fafafa] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue/10 rounded-full flex items-center justify-center">
                      <Icon
                        name="apartment"
                        className="text-[20px] text-blue"
                      />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-navy">
                        {client.company_name || client.full_name || "不明"}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[12px] text-[#888]">
                          {client.email}
                        </span>
                        {client.full_name && client.company_name && (
                          <span className="text-[12px] text-[#aaa]">
                            担当: {client.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[18px] font-black text-navy">
                        {client.proposal_count}
                      </p>
                      <p className="text-[10px] text-[#999]">提案書</p>
                    </div>
                    <span className="text-[11px] text-[#aaa]">
                      {client.created_at
                        ? new Date(client.created_at).toLocaleDateString(
                            "ja-JP"
                          )
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
