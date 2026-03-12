"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EmailCampaign, EmailSend } from "@/lib/types";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

type View = "list" | "create" | "detail";

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string | null;
}

export default function OutreachPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");

  // Campaign list
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // Create form
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formHtml, setFormHtml] = useState("");
  const [formUtmSource, setFormUtmSource] = useState("outreach");
  const [formUtmCampaign, setFormUtmCampaign] = useState("");
  const [creating, setCreating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Detail view
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [sends, setSends] = useState<EmailSend[]>([]);
  const [allUsers, setAllUsers] = useState<UserRow[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    total: number;
    errors?: string[];
  } | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unsent" | "sent" | "failed">("all");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPreviewOpen, setDetailPreviewOpen] = useState(false);

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

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await fetch("/api/admin/outreach");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch {
      console.error("Failed to fetch campaigns");
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) fetchCampaigns();
  }, [loading, fetchCampaigns]);

  // Open campaign detail
  async function openDetail(campaignId: string) {
    setDetailLoading(true);
    setView("detail");
    setSendResult(null);
    setSelectedUserIds(new Set());
    setUserSearch("");
    setStatusFilter("all");
    setDetailPreviewOpen(false);

    try {
      // Fetch campaign detail + sends
      const res = await fetch(`/api/admin/outreach?id=${campaignId}`);
      const data = await res.json();
      setSelectedCampaign(data.campaign);
      setSends(data.sends || []);

      // Fetch all users with emails
      const supabase = createClient();
      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .not("email", "is", null)
        .eq("is_client", false)
        .order("created_at", { ascending: false });

      setAllUsers(users || []);
    } catch {
      console.error("Failed to load campaign detail");
    } finally {
      setDetailLoading(false);
    }
  }

  // Create campaign
  async function handleCreate() {
    if (!formName || !formSubject || !formHtml) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_campaign",
          name: formName,
          subject: formSubject,
          html_body: formHtml,
          utm_source: formUtmSource,
          utm_campaign: formUtmCampaign,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFormName("");
        setFormSubject("");
        setFormHtml("");
        setFormUtmCampaign("");
        setView("list");
        fetchCampaigns();
      }
    } catch {
      console.error("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  // Delete campaign
  async function handleDelete(campaignId: string) {
    if (!window.confirm("このキャンペーンを削除しますか？送信履歴も全て削除されます。")) return;
    try {
      await fetch("/api/admin/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_campaign", campaign_id: campaignId }),
      });
      setView("list");
      fetchCampaigns();
    } catch {
      console.error("Failed to delete campaign");
    }
  }

  // Send emails
  async function handleSend() {
    if (selectedUserIds.size === 0 || !selectedCampaign) return;
    if (!window.confirm(`${selectedUserIds.size}名にメールを送信します。よろしいですか？`)) return;

    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/admin/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_emails",
          campaign_id: selectedCampaign.id,
          user_ids: Array.from(selectedUserIds),
        }),
      });
      const data = await res.json();
      setSendResult(data);

      // Refresh sends data
      const detailRes = await fetch(`/api/admin/outreach?id=${selectedCampaign.id}`);
      const detailData = await detailRes.json();
      setSends(detailData.sends || []);
      setSelectedCampaign(detailData.campaign);
      setSelectedUserIds(new Set());
    } catch {
      setSendResult({
        sent: 0,
        failed: selectedUserIds.size,
        total: selectedUserIds.size,
        errors: ["ネットワークエラーが発生しました"],
      });
    } finally {
      setSending(false);
    }
  }

  // Helper: get send status for a user
  function getSendStatus(userId: string): EmailSend | undefined {
    return sends.find((s) => s.user_id === userId);
  }

  // Filtered users
  const filteredUsers = allUsers.filter((u) => {
    // Search filter
    if (userSearch) {
      const q = userSearch.toLowerCase();
      const matchesName = u.full_name?.toLowerCase().includes(q);
      const matchesEmail = u.email?.toLowerCase().includes(q);
      if (!matchesName && !matchesEmail) return false;
    }
    // Status filter
    if (statusFilter !== "all") {
      const send = getSendStatus(u.id);
      if (statusFilter === "unsent" && send?.status === "sent") return false;
      if (statusFilter === "sent" && send?.status !== "sent") return false;
      if (statusFilter === "failed" && send?.status !== "failed") return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  // ═══════════════ CAMPAIGN LIST ═══════════════
  if (view === "list") {
    return (
      <div className="py-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
              EMAIL CAMPAIGNS
            </p>
            <h1 className="text-xl font-black text-navy">
              メールキャンペーン管理
            </h1>
            <p className="text-[13px] text-[#888] mt-1">
              メールキャンペーンの作成・送信・追跡を管理します
            </p>
          </div>
          <button
            onClick={() => {
              setFormName("");
              setFormSubject("");
              setFormHtml("");
              setFormUtmCampaign("");
              setPreviewOpen(false);
              setView("create");
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#E15454] text-white text-[13px] font-bold hover:bg-[#c94444] transition-colors"
          >
            <Icon name="add" className="text-[18px]" />
            新規キャンペーン
          </button>
        </div>

        {campaignsLoading ? (
          <div className="text-sm text-[#888]">読み込み中...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white border border-border p-12 text-center">
            <Icon name="campaign" className="text-[48px] text-[#ddd] mb-4" />
            <p className="text-[14px] text-[#888]">キャンペーンがまだありません</p>
            <p className="text-[12px] text-[#aaa] mt-1">「新規キャンペーン」ボタンから作成してください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => (
              <button
                key={c.id}
                onClick={() => openDetail(c.id)}
                className="bg-white border border-border p-5 text-left hover:border-[#E15454] transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-[14px] font-bold text-navy group-hover:text-[#E15454] transition-colors line-clamp-1">
                    {c.name}
                  </h3>
                  <Icon name="chevron_right" className="text-[18px] text-[#ccc] group-hover:text-[#E15454]" />
                </div>
                <p className="text-[12px] text-[#888] line-clamp-1 mb-3">{c.subject}</p>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Icon name="check_circle" className="text-[14px] text-green-500" />
                    <span className="text-[#666]">{c.sent_count || 0}送信済</span>
                  </span>
                  {(c.failed_count || 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Icon name="error" className="text-[14px] text-red-400" />
                      <span className="text-red-500">{c.failed_count}失敗</span>
                    </span>
                  )}
                  <span className="text-[#aaa] ml-auto">
                    {new Date(c.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════ CREATE CAMPAIGN ═══════════════
  if (view === "create") {
    return (
      <div className="py-6">
        <div className="mb-6">
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-1 text-[12px] text-[#888] hover:text-[#E15454] mb-3"
          >
            <Icon name="arrow_back" className="text-[16px]" />
            キャンペーン一覧に戻る
          </button>
          <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
            NEW CAMPAIGN
          </p>
          <h1 className="text-xl font-black text-navy">
            新規キャンペーン作成
          </h1>
        </div>

        <div className="space-y-4">
          {/* Name & Subject */}
          <div className="bg-white border border-border p-6">
            <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-[#E15454]">
              基本情報
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#888] mb-1">
                  キャンペーン名（管理用）
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: AI導入効果アセスメント案内 第1弾"
                  className="w-full p-3 border border-border text-[13px] focus:outline-none focus:border-[#E15454]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#888] mb-1">
                  メール件名
                </label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="例: 【PERSONA】AI導入効果アセスメントのご案内"
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
                    value={formUtmSource}
                    onChange={(e) => setFormUtmSource(e.target.value)}
                    className="w-full p-3 border border-border text-[13px] focus:outline-none focus:border-[#E15454]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#888] mb-1">
                    UTM Campaign
                  </label>
                  <input
                    type="text"
                    value={formUtmCampaign}
                    onChange={(e) => setFormUtmCampaign(e.target.value)}
                    placeholder="例: assessment_2026q1"
                    className="w-full p-3 border border-border text-[13px] focus:outline-none focus:border-[#E15454]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* HTML Body */}
          <div className="bg-white border border-border p-6">
            <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-[#E15454]">
              メール本文（HTML）
            </h2>
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/admin/outreach?preview=default");
                    const html = await res.text();
                    setFormHtml(html);
                  } catch {
                    console.error("Failed to load default template");
                  }
                }}
                className="text-[12px] text-[#E15454] hover:underline font-bold"
              >
                デフォルトテンプレートを挿入
              </button>
              <span className="text-[11px] text-[#aaa]">
                URLに <code className="bg-gray-100 px-1">{"{{UTM}}"}</code> を含めるとUTMパラメータが自動付与されます
              </span>
            </div>
            <textarea
              value={formHtml}
              onChange={(e) => setFormHtml(e.target.value)}
              placeholder="HTMLメールの本文を入力..."
              className="w-full h-64 p-4 border border-border text-[12px] font-mono resize-y focus:outline-none focus:border-[#E15454] placeholder:text-[#ccc]"
            />
          </div>

          {/* Preview */}
          <div className="bg-white border border-border p-6">
            <button
              type="button"
              onClick={() => setPreviewOpen(!previewOpen)}
              className="flex items-center gap-2 text-sm font-bold text-navy hover:text-[#E15454] transition-colors"
            >
              <Icon
                name={previewOpen ? "expand_less" : "expand_more"}
                className="text-[20px]"
              />
              プレビュー
            </button>
            {previewOpen && formHtml && (
              <div className="mt-4 border border-border rounded overflow-hidden">
                <iframe
                  srcDoc={formHtml}
                  className="w-full h-[600px] border-0"
                  title="Email preview"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={() => setView("list")}
              className="px-6 py-3 border border-border text-[13px] text-[#888] hover:border-[#E15454] hover:text-[#E15454] transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !formName || !formSubject || !formHtml}
              className="flex-1 py-3 bg-[#E15454] text-white text-[14px] font-bold hover:bg-[#c94444] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {creating ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Icon name="save" className="text-[18px]" />
                  キャンペーンを保存
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════ CAMPAIGN DETAIL ═══════════════
  if (view === "detail") {
    if (detailLoading) {
      return (
        <div className="py-8">
          <div className="text-sm text-[#888]">読み込み中...</div>
        </div>
      );
    }

    if (!selectedCampaign) {
      return (
        <div className="py-8">
          <div className="text-sm text-red-500">キャンペーンが見つかりません</div>
        </div>
      );
    }

    const sentUserIds = new Set(
      sends.filter((s) => s.status === "sent").map((s) => s.user_id),
    );

    // Select/deselect helpers
    function toggleUser(userId: string) {
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return next;
      });
    }

    function selectAllUnsent() {
      const unsent = filteredUsers
        .filter((u) => !sentUserIds.has(u.id))
        .map((u) => u.id);
      setSelectedUserIds(new Set(unsent));
    }

    function selectNone() {
      setSelectedUserIds(new Set());
    }

    return (
      <div className="py-6">
        <div className="mb-6">
          <button
            onClick={() => {
              setView("list");
              fetchCampaigns();
            }}
            className="flex items-center gap-1 text-[12px] text-[#888] hover:text-[#E15454] mb-3"
          >
            <Icon name="arrow_back" className="text-[16px]" />
            キャンペーン一覧に戻る
          </button>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
                CAMPAIGN DETAIL
              </p>
              <h1 className="text-xl font-black text-navy">
                {selectedCampaign.name}
              </h1>
              <p className="text-[13px] text-[#888] mt-1">
                件名: {selectedCampaign.subject}
              </p>
            </div>
            <button
              onClick={() => handleDelete(selectedCampaign.id)}
              className="text-[12px] text-[#aaa] hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <Icon name="delete" className="text-[16px]" />
              削除
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-border p-4 text-center">
            <div className="text-[22px] font-black text-navy">{selectedCampaign.sent_count || 0}</div>
            <div className="text-[11px] text-[#888]">送信済み</div>
          </div>
          <div className="bg-white border border-border p-4 text-center">
            <div className="text-[22px] font-black text-red-500">{selectedCampaign.failed_count || 0}</div>
            <div className="text-[11px] text-[#888]">失敗</div>
          </div>
          <div className="bg-white border border-border p-4 text-center">
            <div className="text-[22px] font-black text-[#888]">{allUsers.length}</div>
            <div className="text-[11px] text-[#888]">対象ユーザー</div>
          </div>
        </div>

        {/* HTML Preview */}
        <div className="bg-white border border-border p-6 mb-4">
          <button
            type="button"
            onClick={() => setDetailPreviewOpen(!detailPreviewOpen)}
            className="flex items-center gap-2 text-sm font-bold text-navy hover:text-[#E15454] transition-colors"
          >
            <Icon
              name={detailPreviewOpen ? "expand_less" : "expand_more"}
              className="text-[20px]"
            />
            メールプレビュー
          </button>
          {detailPreviewOpen && (
            <div className="mt-4 border border-border rounded overflow-hidden">
              <iframe
                srcDoc={selectedCampaign.html_body}
                className="w-full h-[600px] border-0"
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>

        {/* Send result */}
        {sendResult && (
          <div
            className={`p-5 mb-4 border ${
              sendResult.failed === 0
                ? "bg-green-50 border-green-200"
                : sendResult.sent === 0
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon
                name={sendResult.failed === 0 ? "check_circle" : "warning"}
                className={`text-[22px] ${
                  sendResult.failed === 0 ? "text-green-600" : "text-yellow-600"
                }`}
              />
              <p className="text-[14px] font-bold text-navy">
                {sendResult.failed === 0
                  ? "送信完了"
                  : sendResult.sent === 0
                    ? "送信失敗"
                    : "一部送信完了"}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-[13px]">
              <span>
                成功: <strong className="text-green-700">{sendResult.sent}件</strong>
              </span>
              {sendResult.failed > 0 && (
                <span>
                  失敗: <strong className="text-red-600">{sendResult.failed}件</strong>
                </span>
              )}
            </div>
            {sendResult.errors && sendResult.errors.length > 0 && (
              <div className="mt-3 text-[12px] text-red-600">
                {sendResult.errors.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User selection */}
        <div className="bg-white border border-border p-6">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-[#E15454]">
            送信先ユーザー
          </h2>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="名前・メールで検索..."
                className="w-full p-2.5 border border-border text-[13px] focus:outline-none focus:border-[#E15454]"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "unsent", "sent", "failed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2 text-[11px] font-bold border transition-colors ${
                    statusFilter === s
                      ? "border-[#E15454] text-[#E15454] bg-red-50"
                      : "border-border text-[#888] hover:border-[#E15454]"
                  }`}
                >
                  {s === "all" ? "全て" : s === "unsent" ? "未送信" : s === "sent" ? "送信済" : "失敗"}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={selectAllUnsent}
              className="text-[12px] text-[#E15454] hover:underline font-bold"
            >
              未送信を全選択
            </button>
            <button
              onClick={selectNone}
              className="text-[12px] text-[#888] hover:underline"
            >
              選択解除
            </button>
            <span className="text-[12px] text-[#aaa] ml-auto">
              {selectedUserIds.size}名選択中 / {filteredUsers.length}名表示
            </span>
          </div>

          {/* User list */}
          <div className="border border-border max-h-[400px] overflow-y-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 sticky top-0">
                  <th className="w-10 p-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.size > 0 && selectedUserIds.size === filteredUsers.filter((u) => !sentUserIds.has(u.id)).length}
                      onChange={(e) => {
                        if (e.target.checked) selectAllUnsent();
                        else selectNone();
                      }}
                      className="accent-[#E15454]"
                    />
                  </th>
                  <th className="p-2 text-left text-[11px] font-bold text-[#888]">名前</th>
                  <th className="p-2 text-left text-[11px] font-bold text-[#888]">メール</th>
                  <th className="p-2 text-center text-[11px] font-bold text-[#888] w-24">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const send = getSendStatus(u.id);
                  const isSent = send?.status === "sent";
                  const isFailed = send?.status === "failed";
                  const isSelected = selectedUserIds.has(u.id);

                  return (
                    <tr
                      key={u.id}
                      className={`border-t border-border hover:bg-gray-50 ${
                        isSent ? "bg-green-50/30" : ""
                      } ${isFailed ? "bg-red-50/30" : ""}`}
                    >
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isSent}
                          onChange={() => toggleUser(u.id)}
                          className="accent-[#E15454] disabled:opacity-30"
                        />
                      </td>
                      <td className="p-2 text-[#333]">
                        {u.full_name || <span className="text-[#ccc]">未設定</span>}
                      </td>
                      <td className="p-2 text-[#666] font-mono text-[12px]">
                        {u.email}
                      </td>
                      <td className="p-2 text-center">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-bold">
                            <Icon name="check_circle" className="text-[14px]" />
                            送信済
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-red-500 font-bold" title={send?.error || ""}>
                            <Icon name="error" className="text-[14px]" />
                            失敗
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#aaa]">未送信</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[13px] text-[#aaa]">
                      該当するユーザーがいません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || selectedUserIds.size === 0}
            className="w-full mt-4 py-4 bg-[#E15454] text-white text-[15px] font-bold transition-all hover:bg-[#c94444] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                送信中...
              </>
            ) : (
              <>
                <Icon name="send" className="text-[20px]" />
                {selectedUserIds.size}名に送信する
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
