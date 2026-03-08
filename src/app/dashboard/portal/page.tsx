"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface PortalProposal {
  id: string;
  title: string;
  message: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
  cases: { id: string; title: string; category: string | null; fee: string | null; industry: string | null } | null;
  proposal_talents: Array<{
    id: string;
    display_label: string;
    client_fee: number | null;
    summary_position: string | null;
    summary_skills: string[] | null;
  }>;
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  sent: { label: "新着", color: "bg-blue-50 text-blue-700 border-blue-200" },
  viewed: { label: "確認済", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  responded: { label: "回答済", color: "bg-green-50 text-green-700 border-green-200" },
  closed: { label: "クローズ", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function PortalPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<PortalProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    init();
  }, []);

  async function init() {
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
      .select("is_client, company_name")
      .eq("id", user.id)
      .single();

    if (!profile?.is_client) {
      router.push("/dashboard");
      return;
    }

    setCompanyName(profile.company_name || "");
    fetchProposals();
  }

  async function fetchProposals() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/proposals");
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
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
        <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1">
          PROPOSAL PORTAL
        </p>
        <h1 className="text-xl font-black text-navy">
          人材提案ポータル
          {companyName && (
            <span className="text-[14px] font-medium text-[#888] ml-3">
              {companyName}様
            </span>
          )}
        </h1>
      </div>

      {proposals.length === 0 ? (
        <div className="bg-white border border-border p-12 text-center">
          <Icon name="description" className="text-[48px] text-[#ddd] block mx-auto mb-3" />
          <p className="text-[15px] font-bold text-navy mb-1">
            まだ提案書がありません
          </p>
          <p className="text-[13px] text-[#888]">
            PERSONAからの人材提案が届くとこちらに表示されます。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => {
            const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.sent;
            return (
              <Link
                key={p.id}
                href={`/dashboard/portal/${p.id}`}
                className="block bg-white border border-border p-6 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all group"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-[2px] border ${sc.color}`}
                      >
                        {sc.label}
                      </span>
                      {p.sent_at && (
                        <span className="text-[11px] text-[#aaa]">
                          {new Date(p.sent_at).toLocaleDateString("ja-JP")}
                        </span>
                      )}
                    </div>
                    <h2 className="text-[17px] font-bold text-navy group-hover:text-blue transition-colors">
                      {p.title}
                    </h2>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[20px] font-black text-blue">
                      {p.proposal_talents.length}
                      <span className="text-[12px] font-bold text-[#888] ml-0.5">名</span>
                    </p>
                    <p className="text-[10px] text-[#aaa]">候補人材</p>
                  </div>
                </div>

                {/* Case info */}
                {p.cases && (
                  <div className="bg-[#f8f9fb] p-3 mb-3">
                    <p className="text-[12px] text-[#888] mb-0.5">案件</p>
                    <p className="text-[13px] font-bold text-navy">{p.cases.title}</p>
                    <div className="flex gap-2 mt-1 text-[11px] text-[#999]">
                      {p.cases.category && <span>{p.cases.category}</span>}
                      {p.cases.fee && <span>{p.cases.fee}</span>}
                      {p.cases.industry && <span>{p.cases.industry}</span>}
                    </div>
                  </div>
                )}

                {/* Talent preview */}
                <div className="flex flex-wrap gap-2">
                  {p.proposal_talents.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      className="bg-[#f0f0f5] px-3 py-1.5 text-[12px]"
                    >
                      <span className="font-bold text-navy">{t.display_label}</span>
                      {t.summary_position && (
                        <span className="text-[#888] ml-1">{t.summary_position}</span>
                      )}
                      {t.client_fee && (
                        <span className="text-blue font-bold ml-2">
                          {t.client_fee}万円
                        </span>
                      )}
                    </div>
                  ))}
                  {p.proposal_talents.length > 4 && (
                    <span className="text-[12px] text-[#999] py-1.5">
                      ...他{p.proposal_talents.length - 4}名
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
