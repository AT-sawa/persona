"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Case } from "@/lib/types";

interface ClientOption {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
}

interface ProposalRow {
  id: string;
  title: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  cases: { id: string; title: string; category: string | null; fee: string | null } | null;
  profiles: { id: string; full_name: string | null; company_name: string | null } | null;
  talent_count: number;
  reaction_counts: { interested: number; pass: number };
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "下書き", color: "bg-gray-100 text-gray-600 border-gray-200" },
  sent: { label: "送信済", color: "bg-blue-50 text-blue-700 border-blue-200" },
  viewed: { label: "閲覧済", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  responded: { label: "回答あり", color: "bg-green-50 text-green-700 border-green-200" },
  closed: { label: "クローズ", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function AdminProposalsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  // Inline create form
  const [showForm, setShowForm] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [caseSearch, setCaseSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  async function checkAdminAndFetch() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    const { data: profile } = await supabase
      .from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) { router.push("/dashboard"); return; }
    fetchProposals();
  }

  async function fetchProposals() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/proposals");
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals || []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  async function openForm() {
    setShowForm(true);
    setSelectedCaseId("");
    setSelectedClientId("");
    setCaseSearch("");
    setClientSearch("");
    // Load data
    const [casesRes, clientsRes] = await Promise.all([
      supabase.from("cases").select("id, title, category, fee, is_active")
        .eq("is_active", true).order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("id, full_name, email, company_name")
        .eq("is_client", true).order("created_at", { ascending: false }),
    ]);
    setCases((casesRes.data as Case[]) || []);
    setClients((clientsRes.data as ClientOption[]) || []);
  }

  async function handleCreate() {
    if (!selectedCaseId || !selectedClientId) return;
    setCreating(true);
    const selectedCase = cases.find((c) => c.id === selectedCaseId);
    const title = selectedCase?.title || "提案";
    try {
      const res = await fetch("/api/admin/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: selectedCaseId,
          client_id: selectedClientId,
          title,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/dashboard/admin/proposals/${data.proposal.id}`);
      } else {
        alert(data.error || "作成に失敗しました");
      }
    } catch { alert("エラーが発生しました"); }
    finally { setCreating(false); }
  }

  const filteredCases = caseSearch
    ? cases.filter((c) =>
        c.title.toLowerCase().includes(caseSearch.toLowerCase()) ||
        (c.category || "").toLowerCase().includes(caseSearch.toLowerCase()))
    : cases;

  const filteredClients = clientSearch
    ? clients.filter((c) =>
        (c.company_name || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.full_name || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.email || "").toLowerCase().includes(clientSearch.toLowerCase()))
    : clients;

  const filtered = filter === "all" ? proposals : proposals.filter((p) => p.status === filter);

  if (loading) {
    return <div className="py-8"><div className="text-sm text-[#888]">読み込み中...</div></div>;
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
            PROPOSALS
          </p>
          <h1 className="text-xl font-black text-navy">提案管理</h1>
        </div>
        <button
          onClick={() => showForm ? setShowForm(false) : openForm()}
          className="px-5 py-2.5 bg-blue text-white text-[13px] font-bold transition-colors hover:bg-blue-dark flex items-center gap-1.5"
        >
          <Icon name={showForm ? "close" : "add"} className="text-[18px]" />
          {showForm ? "閉じる" : "新規提案"}
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="bg-white border border-border p-6 mb-5">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            案件にクライアントを紐付ける
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Case select */}
            <div>
              <label className="block text-[12px] font-bold text-[#888] mb-1.5">案件 *</label>
              <input
                type="text"
                placeholder="案件名で検索..."
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
                className="w-full px-3 py-2 border border-border text-[13px] text-navy mb-2 focus:outline-none focus:border-blue"
              />
              <div className="max-h-[200px] overflow-y-auto border border-border/50 rounded">
                {filteredCases.slice(0, 30).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCaseId(c.id)}
                    className={`w-full text-left px-3 py-2 text-[13px] border-b border-border/30 last:border-0 transition-colors ${
                      selectedCaseId === c.id
                        ? "bg-blue/5 text-navy font-bold"
                        : "text-[#555] hover:bg-[#fafafa]"
                    }`}
                  >
                    <span className="truncate block">{c.title}</span>
                    <span className="text-[11px] text-[#999]">
                      {c.category} {c.fee && `/ ${c.fee}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Client select */}
            <div>
              <label className="block text-[12px] font-bold text-[#888] mb-1.5">クライアント *</label>
              {clients.length === 0 ? (
                <p className="text-[13px] text-[#999] py-4">
                  先に<a href="/dashboard/admin/clients" className="text-blue font-bold ml-1">クライアント管理</a>から作成してください。
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="企業名で検索..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-border text-[13px] text-navy mb-2 focus:outline-none focus:border-blue"
                  />
                  <div className="max-h-[200px] overflow-y-auto border border-border/50 rounded">
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClientId(c.id)}
                        className={`w-full text-left px-3 py-2 text-[13px] border-b border-border/30 last:border-0 transition-colors ${
                          selectedClientId === c.id
                            ? "bg-blue/5 text-navy font-bold"
                            : "text-[#555] hover:bg-[#fafafa]"
                        }`}
                      >
                        {c.company_name || c.full_name}
                        <span className="text-[11px] text-[#999] ml-2">{c.email}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleCreate}
              disabled={!selectedCaseId || !selectedClientId || creating}
              className="px-6 py-2.5 bg-blue text-white text-[13px] font-bold transition-colors hover:bg-blue-dark disabled:opacity-40 flex items-center gap-2"
            >
              {creating ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  作成中...
                </>
              ) : (
                <>
                  <Icon name="arrow_forward" className="text-[16px]" />
                  作成して人材を追加
                </>
              )}
            </button>
            <p className="text-[12px] text-[#aaa]">
              作成後、人材の追加・金額設定を行えます
            </p>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { value: "all", label: "すべて" },
          { value: "draft", label: "下書き" },
          { value: "sent", label: "送信済" },
          { value: "viewed", label: "閲覧済" },
          { value: "responded", label: "回答あり" },
          { value: "closed", label: "クローズ" },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setFilter(item.value)}
            className={`px-4 py-1.5 text-[12px] font-bold border transition-colors ${
              filter === item.value
                ? "bg-navy text-white border-navy"
                : "bg-white text-[#888] border-border hover:bg-[#fafafa]"
            }`}
          >
            {item.label}
            {item.value === "all"
              ? ` (${proposals.length})`
              : ` (${proposals.filter((p) => p.status === item.value).length})`}
          </button>
        ))}
      </div>

      {/* Proposal list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-border p-12 text-center text-[#999]">
            <Icon name="handshake" className="text-[40px] block mx-auto mb-2 opacity-30" />
            <p className="text-[14px]">提案がありません</p>
          </div>
        ) : (
          filtered.map((p) => {
            const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
            return (
              <Link
                key={p.id}
                href={`/dashboard/admin/proposals/${p.id}`}
                className="block bg-white border border-border p-5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold px-2.5 py-[2px] border ${sc.color}`}>
                        {sc.label}
                      </span>
                      <span className="text-[12px] text-[#aaa]">
                        {p.profiles?.company_name || p.profiles?.full_name || "不明"}
                      </span>
                    </div>
                    {p.cases && (
                      <h3 className="text-[15px] font-bold text-navy truncate mb-1">
                        {p.cases.title}
                      </h3>
                    )}
                    {p.cases && (
                      <p className="text-[12px] text-[#888] truncate">
                        {p.cases.category}{p.cases.fee && ` / ${p.cases.fee}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-center">
                      <p className="text-[16px] font-black text-navy">{p.talent_count}</p>
                      <p className="text-[10px] text-[#999]">人材</p>
                    </div>
                    {(p.reaction_counts.interested > 0 || p.reaction_counts.pass > 0) && (
                      <div className="flex items-center gap-2 text-[12px]">
                        {p.reaction_counts.interested > 0 && (
                          <span className="text-green-600 font-bold flex items-center gap-0.5">
                            <Icon name="thumb_up" className="text-[14px]" />{p.reaction_counts.interested}
                          </span>
                        )}
                        {p.reaction_counts.pass > 0 && (
                          <span className="text-red-400 font-bold flex items-center gap-0.5">
                            <Icon name="thumb_down" className="text-[14px]" />{p.reaction_counts.pass}
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-[11px] text-[#aaa]">
                      {new Date(p.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
