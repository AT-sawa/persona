"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface TalentCard {
  id: string;
  display_label: string;
  sort_order: number;
  client_fee: number | null;
  summary_position: string | null;
  summary_experience: string | null;
  summary_skills: string[] | null;
  summary_background: string | null;
  summary_work_style: string | null;
  proposal_reactions: Array<{
    id: string;
    reaction: string;
    message: string | null;
    client_id: string;
  }>;
}

interface MessageItem {
  id: string;
  body: string;
  is_admin: boolean;
  created_at: string;
  profiles?: { full_name: string | null; company_name: string | null };
}

interface PortalProposal {
  id: string;
  title: string;
  message: string | null;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  cases: Record<string, unknown> | null;
  proposal_talents: TalentCard[];
  proposal_messages: MessageItem[];
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

export default function PortalProposalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [proposal, setProposal] = useState<PortalProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  // Reaction state
  const [reactingTalent, setReactingTalent] = useState<string | null>(null);
  const [reactionComment, setReactionComment] = useState("");

  // Message state
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchProposal = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/proposals/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProposal(data.proposal);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_client")
        .eq("id", user.id)
        .single();

      if (!profile?.is_client) {
        router.push("/dashboard");
        return;
      }

      fetchProposal();
    }
    init();
  }, [id, router, fetchProposal]);

  async function handleReaction(talentId: string, reaction: "interested" | "pass") {
    setReactingTalent(talentId);
    try {
      const res = await fetch(`/api/portal/proposals/${id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposal_talent_id: talentId,
          reaction,
          message: reactionComment || null,
        }),
      });
      if (res.ok) {
        setReactionComment("");
        fetchProposal();
      } else {
        const data = await res.json();
        alert(data.error || "エラーが発生しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setReactingTalent(null);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/portal/proposals/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchProposal();
      }
    } catch {
      alert("メッセージの送信に失敗しました");
    } finally {
      setSendingMessage(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">提案書が見つかりません</div>
      </div>
    );
  }

  const caseData = proposal.cases as {
    title?: string;
    category?: string;
    fee?: string;
    description?: string;
    industry?: string;
    work_style?: string;
    location?: string;
  } | null;
  const talents = [...(proposal.proposal_talents || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const messages = proposal.proposal_messages || [];

  return (
    <div className="py-6 max-w-[900px]">
      {/* Back link */}
      <Link
        href="/dashboard/portal"
        className="text-[13px] text-[#999] hover:text-navy transition-colors flex items-center gap-1 mb-4"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        提案一覧に戻る
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-black text-navy mb-1">{proposal.title}</h1>
        {proposal.sent_at && (
          <p className="text-[12px] text-[#aaa]">
            {new Date(proposal.sent_at).toLocaleDateString("ja-JP")} に送信
          </p>
        )}
      </div>

      {/* Coordinator message */}
      {proposal.message && (
        <div className="bg-[#fffbeb] border border-[#fef3c7] p-5 mb-5">
          <p className="text-[12px] font-bold text-[#92400e] mb-1 flex items-center gap-1.5">
            <Icon name="campaign" className="text-[16px]" />
            担当コーディネーターより
          </p>
          <p className="text-[14px] text-[#78350f] leading-[1.8]">
            {proposal.message}
          </p>
        </div>
      )}

      {/* Case info */}
      {caseData && (
        <div className="bg-white border border-border p-6 mb-5">
          <h2 className="text-[12px] font-bold text-blue tracking-[0.15em] uppercase mb-3">
            案件概要
          </h2>
          <h3 className="text-[16px] font-bold text-navy mb-3">
            {caseData.title}
          </h3>
          {caseData.description && (
            <p className="text-[13px] text-[#666] leading-[1.8] mb-3">
              {caseData.description.slice(0, 300)}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {caseData.category && (
              <span className="text-[12px] bg-[#f0f0f5] text-navy px-3 py-1 font-medium">
                {caseData.category}
              </span>
            )}
            {caseData.fee && (
              <span className="text-[12px] bg-[#f0f0f5] text-navy px-3 py-1 font-bold">
                {caseData.fee}
              </span>
            )}
            {caseData.industry && (
              <span className="text-[12px] bg-[#f0f0f5] text-[#888] px-3 py-1">
                {caseData.industry}
              </span>
            )}
            {caseData.work_style && (
              <span className="text-[12px] bg-[#f0f0f5] text-[#888] px-3 py-1">
                {caseData.work_style}
              </span>
            )}
            {caseData.location && (
              <span className="text-[12px] bg-[#f0f0f5] text-[#888] px-3 py-1">
                {caseData.location}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Talent cards */}
      <div className="mb-5">
        <h2 className="text-[12px] font-bold text-blue tracking-[0.15em] uppercase mb-3">
          候補人材（{talents.length}名）
        </h2>
        <div className="space-y-4">
          {talents.map((t) => {
            const myReaction = t.proposal_reactions?.find(
              (r) => r.client_id === userId
            );
            return (
              <div key={t.id} className="bg-white border border-border p-6">
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-[18px] font-black text-navy">
                      {t.display_label}
                    </h3>
                    {t.summary_position && (
                      <p className="text-[14px] text-[#666] mt-0.5">
                        {t.summary_position}
                      </p>
                    )}
                  </div>
                  {t.client_fee && (
                    <div className="text-right bg-blue/5 px-4 py-2">
                      <p className="text-[11px] text-blue font-bold">提案単価</p>
                      <p className="text-[20px] font-black text-navy">
                        {t.client_fee}
                        <span className="text-[12px] font-bold text-[#888]">万円/月</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {t.summary_experience && (
                    <div className="flex items-center gap-2">
                      <Icon name="work_history" className="text-[16px] text-[#aaa]" />
                      <span className="text-[13px] text-navy">
                        {t.summary_experience}
                      </span>
                    </div>
                  )}
                  {t.summary_work_style && (
                    <div className="flex items-center gap-2">
                      <Icon name="home" className="text-[16px] text-[#aaa]" />
                      <span className="text-[13px] text-navy">
                        {t.summary_work_style}
                      </span>
                    </div>
                  )}
                </div>

                {/* Skills */}
                {t.summary_skills && t.summary_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {t.summary_skills.map((s) => (
                      <span
                        key={s}
                        className="text-[12px] bg-blue/8 text-blue px-2.5 py-1 font-bold"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Background */}
                {t.summary_background && (
                  <p className="text-[13px] text-[#666] leading-[1.8] mb-4 bg-[#f8f9fb] p-4">
                    {t.summary_background}
                  </p>
                )}

                {/* Reaction section */}
                <div className="border-t border-border pt-4">
                  {myReaction ? (
                    <div
                      className={`flex items-center gap-3 p-3 ${
                        myReaction.reaction === "interested"
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <Icon
                        name={myReaction.reaction === "interested" ? "thumb_up" : "thumb_down"}
                        className={`text-[20px] ${
                          myReaction.reaction === "interested"
                            ? "text-green-600"
                            : "text-red-400"
                        }`}
                      />
                      <div>
                        <span
                          className={`text-[13px] font-bold ${
                            myReaction.reaction === "interested"
                              ? "text-green-700"
                              : "text-red-600"
                          }`}
                        >
                          {myReaction.reaction === "interested"
                            ? "興味あり"
                            : "見送り"}
                        </span>
                        {myReaction.message && (
                          <p className="text-[12px] text-[#666] mt-0.5">
                            {myReaction.message}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          // Allow changing reaction
                          handleReaction(
                            t.id,
                            myReaction.reaction === "interested" ? "pass" : "interested"
                          );
                        }}
                        className="ml-auto text-[12px] text-[#888] hover:text-navy transition-colors"
                      >
                        変更する
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-3">
                        <input
                          type="text"
                          placeholder="コメント（任意）"
                          value={reactingTalent === t.id ? reactionComment : ""}
                          onChange={(e) => {
                            setReactingTalent(t.id);
                            setReactionComment(e.target.value);
                          }}
                          onFocus={() => setReactingTalent(t.id)}
                          className="w-full px-4 py-2 border border-border text-[13px] text-navy focus:outline-none focus:border-blue"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReaction(t.id, "interested")}
                          disabled={reactingTalent === t.id && reactingTalent !== null && false}
                          className="flex-1 py-3 bg-green-600 text-white text-[14px] font-bold transition-colors hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                          <Icon name="thumb_up" className="text-[18px]" />
                          興味あり
                        </button>
                        <button
                          onClick={() => handleReaction(t.id, "pass")}
                          className="flex-1 py-3 bg-white text-[#888] border border-border text-[14px] font-bold transition-colors hover:bg-[#fafafa] flex items-center justify-center gap-2"
                        >
                          <Icon name="thumb_down" className="text-[18px]" />
                          見送り
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white border border-border p-6">
        <h2 className="text-[12px] font-bold text-blue tracking-[0.15em] uppercase mb-4">
          メッセージ
        </h2>

        {messages.length > 0 && (
          <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-4 ${
                  m.is_admin
                    ? "bg-blue/5 border border-blue/20"
                    : "bg-[#f8f9fb] border border-border/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12px] font-bold text-navy">
                    {m.is_admin ? "PERSONA" : "あなた"}
                  </span>
                  <span className="text-[11px] text-[#aaa]">
                    {new Date(m.created_at).toLocaleString("ja-JP")}
                  </span>
                </div>
                <p className="text-[13px] text-[#555] leading-[1.7] whitespace-pre-wrap">
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-2.5 border border-border text-[13px] text-navy focus:outline-none focus:border-blue"
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={sendingMessage || !newMessage.trim()}
            className="px-5 py-2.5 bg-blue text-white text-[13px] font-bold transition-colors hover:bg-blue-dark disabled:opacity-40 flex items-center gap-1.5"
          >
            <Icon name="send" className="text-[16px]" />
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
