"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateDisplayLabel } from "@/lib/anonymize";
import type { ProposalTalent, ProposalMessage, Profile } from "@/lib/types";

interface ProposalDetail {
  id: string;
  title: string;
  message: string | null;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  created_at: string;
  updated_at: string;
  cases?: Record<string, unknown>;
  profiles?: Record<string, unknown>;
  proposal_talents?: ProposalTalent[];
  proposal_messages?: ProposalMessage[];
}

interface ExternalTalent {
  id: string;
  name: string | null;
  project_type: string | null;
  personnel_info: string | null;
  resume_file_path: string | null;
}

interface ResumeInfo {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  is_primary: boolean;
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

export default function AdminProposalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Send panel
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [sendToEmail, setSendToEmail] = useState("");
  const [sendMessage, setSendMessage] = useState("");

  // Talent add panel
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [talentTab, setTalentTab] = useState<"profile" | "external">("profile");
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allExternals, setAllExternals] = useState<ExternalTalent[]>([]);
  const [talentSearch, setTalentSearch] = useState("");
  const [addingTalentId, setAddingTalentId] = useState<string | null>(null);

  // Inline edit
  const [editingTalent, setEditingTalent] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, unknown>>({});

  // Resume data
  const [resumeMap, setResumeMap] = useState<Record<string, ResumeInfo[]>>({});
  const [externalResumeMap, setExternalResumeMap] = useState<Record<string, string>>({});
  const [loadingResume, setLoadingResume] = useState<string | null>(null);

  useEffect(() => { init(); }, [id]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    const { data: profile } = await supabase
      .from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) { router.push("/dashboard"); return; }
    fetchProposal();
  }

  async function fetchProposal() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/proposals/${id}`);
      if (res.ok) {
        const p = (await res.json()).proposal;
        setProposal(p);
        if (p?.proposal_talents?.length) {
          fetchResumes(p.proposal_talents);
        }
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  async function fetchResumes(talents: ProposalTalent[]) {
    // Fetch resumes for profile-linked talents
    const profileIds = talents.filter((t) => t.profile_id).map((t) => t.profile_id!);
    const externalIds = talents.filter((t) => t.external_talent_id).map((t) => t.external_talent_id!);

    if (profileIds.length > 0) {
      const { data } = await supabase
        .from("resumes")
        .select("id, user_id, filename, file_path, file_size, mime_type, is_primary")
        .in("user_id", profileIds)
        .order("is_primary", { ascending: false });
      if (data) {
        const map: Record<string, ResumeInfo[]> = {};
        for (const r of data as ResumeInfo[]) {
          if (!map[r.user_id]) map[r.user_id] = [];
          map[r.user_id].push(r);
        }
        setResumeMap(map);
      }
    }

    if (externalIds.length > 0) {
      const { data } = await supabase
        .from("external_talents")
        .select("id, resume_file_path")
        .in("id", externalIds);
      if (data) {
        const map: Record<string, string> = {};
        for (const et of data as { id: string; resume_file_path: string | null }[]) {
          if (et.resume_file_path) map[et.id] = et.resume_file_path;
        }
        setExternalResumeMap(map);
      }
    }
  }

  async function handleResumeDownload(type: "profile" | "external", resumeIdOrPath: string) {
    setLoadingResume(resumeIdOrPath);
    try {
      let url: string;
      if (type === "profile") {
        const res = await fetch(`/api/admin/resumes/${resumeIdOrPath}`);
        if (!res.ok) { alert("レジュメの取得に失敗しました"); return; }
        const data = await res.json();
        url = data.url;
      } else {
        const res = await fetch(`/api/admin/talents/resume-url?path=${encodeURIComponent(resumeIdOrPath)}`);
        if (!res.ok) { alert("レジュメの取得に失敗しました"); return; }
        const data = await res.json();
        url = data.url;
      }
      window.open(url, "_blank");
    } catch {
      alert("レジュメの取得に失敗しました");
    } finally {
      setLoadingResume(null);
    }
  }

  async function loadTalentSources() {
    const [pRes, eRes] = await Promise.all([
      supabase.from("profiles")
        .select("id, full_name, email, skills, bio, years_experience, hourly_rate_min, hourly_rate_max, remote_preference, prefecture")
        .eq("is_admin", false).eq("is_client", false)
        .order("created_at", { ascending: false }).limit(200),
      supabase.from("external_talents")
        .select("id, name, project_type, personnel_info, resume_file_path")
        .eq("is_active", true)
        .order("last_synced_at", { ascending: false }).limit(200),
    ]);
    setAllProfiles((pRes.data as Profile[]) || []);
    setAllExternals((eRes.data as ExternalTalent[]) || []);
  }

  function openAddPanel() {
    setShowAddPanel(true);
    setTalentSearch("");
    if (allProfiles.length === 0) loadTalentSources();
  }

  async function addTalent(source: "profile" | "external", sourceId: string, name: string, p?: Profile, et?: ExternalTalent) {
    setAddingTalentId(sourceId);
    const talentCount = proposal?.proposal_talents?.length || 0;
    try {
      const res = await fetch(`/api/admin/proposals/${id}/talents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: source === "profile" ? sourceId : null,
          external_talent_id: source === "external" ? sourceId : null,
          display_label: generateDisplayLabel(talentCount),
          sort_order: talentCount,
          client_fee: null,
          internal_cost: p?.hourly_rate_min || null,
          summary_position: et?.project_type || "",
          summary_experience: p?.years_experience ? `${p.years_experience}年` : "",
          summary_skills: p?.skills || [],
          summary_background: p?.bio || et?.personnel_info || "",
          summary_work_style: p?.remote_preference || "",
        }),
      });
      if (res.ok) fetchProposal();
      else { const d = await res.json(); alert(d.error || "追加に失敗しました"); }
    } catch { alert("エラーが発生しました"); }
    finally { setAddingTalentId(null); }
  }

  async function removeTalent(talentId: string) {
    if (!confirm("この人材を削除しますか？")) return;
    await fetch(`/api/admin/proposals/${id}/talents`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ talent_id: talentId }),
    });
    fetchProposal();
  }

  function startEdit(t: ProposalTalent) {
    setEditingTalent(t.id);
    setEditFields({
      display_label: t.display_label,
      client_fee: t.client_fee,
      internal_cost: t.internal_cost,
      internal_note: t.internal_note || "",
      summary_position: t.summary_position || "",
      summary_experience: t.summary_experience || "",
      summary_skills: (t.summary_skills || []).join(", "),
      summary_background: t.summary_background || "",
    });
  }

  async function saveEdit(talentId: string) {
    // We use the talents API with PATCH-style (re-create would be complex, so we use direct DB update)
    const skills = (editFields.summary_skills as string || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    await supabase.from("proposal_talents").update({
      display_label: editFields.display_label,
      client_fee: editFields.client_fee || null,
      internal_cost: editFields.internal_cost || null,
      internal_note: editFields.internal_note || null,
      summary_position: editFields.summary_position || null,
      summary_experience: editFields.summary_experience || null,
      summary_skills: skills.length > 0 ? skills : null,
      summary_background: editFields.summary_background || null,
      updated_at: new Date().toISOString(),
    }).eq("id", talentId);
    setEditingTalent(null);
    fetchProposal();
  }

  function openSendPanel() {
    // Pre-fill with client email and proposal message
    const client = proposal?.profiles as { email?: string } | null;
    setSendToEmail(client?.email || "");
    setSendMessage(proposal?.message || "");
    setShowSendPanel(true);
  }

  async function handleSend() {
    if (!sendToEmail.trim()) { alert("宛先メールアドレスを入力してください"); return; }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/proposals/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: sendToEmail.trim(),
          message: sendMessage.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowSendPanel(false);
        fetchProposal();
      } else {
        alert(data.error || "送信に失敗しました");
      }
    } catch { alert("送信に失敗しました"); }
    finally { setSending(false); }
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("proposal_messages").insert({
        proposal_id: id, sender_id: user.id, body: newMessage.trim(), is_admin: true,
      });
      setNewMessage("");
      fetchProposal();
    } catch { alert("メッセージの送信に失敗しました"); }
    finally { setSendingMessage(false); }
  }

  async function handleClose() {
    if (!confirm("クローズしますか？")) return;
    await fetch(`/api/admin/proposals/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    fetchProposal();
  }

  async function handleDelete() {
    if (!confirm("完全に削除しますか？")) return;
    await fetch(`/api/admin/proposals/${id}`, { method: "DELETE" });
    router.push("/dashboard/admin/proposals");
  }

  if (loading) return <div className="py-8"><div className="text-sm text-[#888]">読み込み中...</div></div>;
  if (!proposal) return <div className="py-8"><div className="text-sm text-[#888]">見つかりません</div></div>;

  const sc = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
  const talents = (proposal.proposal_talents || []) as (ProposalTalent & {
    proposal_reactions?: Array<{ reaction: string; message: string | null; client_id: string }>;
  })[];
  const messages = (proposal.proposal_messages || []) as (ProposalMessage & {
    profiles?: { full_name: string | null; company_name: string | null };
  })[];
  const caseData = proposal.cases as { title?: string; category?: string; fee?: string; industry?: string } | null;
  const clientData = proposal.profiles as { company_name?: string; full_name?: string } | null;

  const existingProfileIds = new Set(talents.filter((t) => t.profile_id).map((t) => t.profile_id));
  const existingExternalIds = new Set(talents.filter((t) => t.external_talent_id).map((t) => t.external_talent_id));

  const searchLower = talentSearch.toLowerCase();
  const filteredProfiles = talentSearch
    ? allProfiles.filter((p) =>
        (p.full_name || "").toLowerCase().includes(searchLower) ||
        (p.skills || []).some((s) => s.toLowerCase().includes(searchLower)) ||
        (p.bio || "").toLowerCase().includes(searchLower))
    : allProfiles;
  const filteredExternals = talentSearch
    ? allExternals.filter((e) =>
        (e.name || "").toLowerCase().includes(searchLower) ||
        (e.personnel_info || "").toLowerCase().includes(searchLower) ||
        (e.project_type || "").toLowerCase().includes(searchLower))
    : allExternals;

  const isDraft = proposal.status === "draft";

  return (
    <div className="py-6">
      {/* Header */}
      <Link
        href="/dashboard/admin/proposals"
        className="text-[13px] text-[#999] hover:text-navy transition-colors flex items-center gap-1 mb-4"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        提案一覧
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2.5 py-[2px] border ${sc.color}`}>{sc.label}</span>
            <span className="text-[12px] text-[#aaa]">{clientData?.company_name || clientData?.full_name || ""}</span>
          </div>
          {caseData && <h1 className="text-xl font-black text-navy">{caseData.title}</h1>}
          {caseData && (
            <p className="text-[12px] text-[#888] mt-0.5">
              {caseData.category}{caseData.fee && ` / ${caseData.fee}`}{caseData.industry && ` / ${caseData.industry}`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <button onClick={openSendPanel} disabled={talents.length === 0}
              className="px-5 py-2 bg-green-600 text-white text-[13px] font-bold transition-colors hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5">
              <Icon name="mail" className="text-[16px]" />招待メール送信
            </button>
          )}
          {proposal.status !== "closed" && !isDraft && (
            <button onClick={handleClose}
              className="px-4 py-2 bg-white text-[#888] border border-border text-[13px] font-bold transition-colors hover:bg-[#fafafa]">
              クローズ
            </button>
          )}
          {isDraft && (
            <button onClick={handleDelete}
              className="px-4 py-2 bg-white text-red-500 border border-red-200 text-[13px] font-bold transition-colors hover:bg-red-50">
              削除
            </button>
          )}
        </div>
      </div>

      {/* Send Panel */}
      {showSendPanel && isDraft && (
        <div className="bg-white border-2 border-green-300 p-6 mb-4">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-green-500">
            <Icon name="mail" className="text-[20px] text-green-600" />
            <h2 className="text-sm font-bold text-navy">招待メール送信</h2>
          </div>

          <div className="space-y-4">
            {/* From (display only) */}
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">送信元（From）</label>
              <div className="px-4 py-2.5 bg-[#f8f9fb] border border-border text-[13px] text-[#666]">
                PERSONA &lt;noreply@persona-consultant.com&gt;
                <span className="text-[11px] text-blue ml-2">※ 返信はあなたのアドレスに届きます</span>
              </div>
            </div>

            {/* To (editable) */}
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">宛先（To）<span className="text-red-500 ml-0.5">*</span></label>
              <input
                type="email"
                value={sendToEmail}
                onChange={(e) => setSendToEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full px-4 py-2.5 border border-border text-[13px] text-navy focus:outline-none focus:border-blue"
              />
            </div>

            {/* Subject (auto-generated, display only) */}
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">件名</label>
              <div className="px-4 py-2.5 bg-[#f8f9fb] border border-border text-[13px] text-[#666]">
                【PERSONA】新しい人材提案が届きました｜{proposal.title}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">メッセージ（コーディネーターから一言）</label>
              <textarea
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                rows={4}
                placeholder="例: ご要望いただいたスキルセットに近い候補者をご提案いたします。ぜひご確認ください。"
                className="w-full px-4 py-2.5 border border-border text-[13px] text-navy resize-none focus:outline-none focus:border-blue"
              />
            </div>

            {/* Summary */}
            <div className="bg-[#f8f9fb] border border-border p-4">
              <p className="text-[12px] text-[#888] mb-1">送信内容</p>
              <div className="flex gap-6 text-[13px]">
                <span className="text-navy font-bold">{proposal.title}</span>
                <span className="text-blue font-bold">{talents.length}名の候補人材</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSend}
                disabled={sending || !sendToEmail.trim()}
                className="px-6 py-2.5 bg-green-600 text-white text-[13px] font-bold transition-colors hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {sending ? (
                  "送信中..."
                ) : (
                  <>
                    <Icon name="send" className="text-[16px]" />
                    メールを送信する
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSendPanel(false)}
                className="px-4 py-2.5 bg-white text-[#888] border border-border text-[13px] font-bold transition-colors hover:bg-[#fafafa]"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Talent section */}
      <div className="bg-white border border-border p-6 mb-4">
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-blue">
          <h2 className="text-sm font-bold text-navy">
            提案人材（{talents.length}名）
          </h2>
          {isDraft && (
            <button onClick={() => showAddPanel ? setShowAddPanel(false) : openAddPanel()}
              className="px-4 py-1.5 bg-blue text-white text-[12px] font-bold transition-colors hover:bg-blue-dark flex items-center gap-1">
              <Icon name={showAddPanel ? "close" : "person_add"} className="text-[16px]" />
              {showAddPanel ? "閉じる" : "人材を追加"}
            </button>
          )}
        </div>

        {/* Add talent panel */}
        {showAddPanel && isDraft && (
          <div className="border border-blue/30 bg-blue/3 p-4 mb-4">
            <div className="flex gap-0 mb-3">
              <button onClick={() => setTalentTab("profile")}
                className={`px-4 py-1.5 text-[12px] font-bold border-b-2 ${talentTab === "profile" ? "border-blue text-blue" : "border-transparent text-[#999]"}`}>
                登録ユーザー ({allProfiles.length})
              </button>
              <button onClick={() => setTalentTab("external")}
                className={`px-4 py-1.5 text-[12px] font-bold border-b-2 ${talentTab === "external" ? "border-blue text-blue" : "border-transparent text-[#999]"}`}>
                外部人材DB ({allExternals.length})
              </button>
            </div>
            <input type="text" placeholder="名前・スキルで検索..." value={talentSearch}
              onChange={(e) => setTalentSearch(e.target.value)}
              className="w-full px-3 py-2 border border-border text-[13px] text-navy mb-2 focus:outline-none focus:border-blue" />

            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {talentTab === "profile" && filteredProfiles.slice(0, 30).map((p) => {
                const added = existingProfileIds.has(p.id);
                return (
                  <div key={p.id} className={`flex items-center justify-between p-2.5 border transition-colors ${added ? "border-green-200 bg-green-50" : "border-transparent hover:bg-white"}`}>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-bold text-navy">{p.full_name || "名前未設定"}</span>
                      <span className="text-[11px] text-[#888] ml-2">
                        {p.years_experience && `${p.years_experience}年`}
                        {p.hourly_rate_min && ` / ${p.hourly_rate_min}万〜`}
                      </span>
                      {p.skills && p.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {p.skills.slice(0, 4).map((s) => (
                            <span key={s} className="text-[10px] bg-[#f0f0f5] text-[#666] px-1.5 py-0.5">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => !added && addTalent("profile", p.id, p.full_name || "", p)}
                      disabled={added || addingTalentId === p.id}
                      className={`px-3 py-1 text-[12px] font-bold shrink-0 ${added ? "text-green-600" : addingTalentId === p.id ? "text-[#aaa]" : "text-blue hover:bg-blue/10"}`}>
                      {added ? <Icon name="check" className="text-[16px]" /> : addingTalentId === p.id ? "..." : "+ 追加"}
                    </button>
                  </div>
                );
              })}
              {talentTab === "external" && filteredExternals.slice(0, 30).map((et) => {
                const added = existingExternalIds.has(et.id);
                return (
                  <div key={et.id} className={`flex items-center justify-between p-2.5 border transition-colors ${added ? "border-green-200 bg-green-50" : "border-transparent hover:bg-white"}`}>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-bold text-navy">{et.name || "名前不明"}</span>
                      {et.project_type && <span className="text-[11px] text-[#888] ml-2">{et.project_type}</span>}
                      {et.personnel_info && <p className="text-[11px] text-[#aaa] truncate mt-0.5">{et.personnel_info.slice(0, 80)}</p>}
                    </div>
                    <button onClick={() => !added && addTalent("external", et.id, et.name || "", undefined, et)}
                      disabled={added || addingTalentId === et.id}
                      className={`px-3 py-1 text-[12px] font-bold shrink-0 ${added ? "text-green-600" : addingTalentId === et.id ? "text-[#aaa]" : "text-blue hover:bg-blue/10"}`}>
                      {added ? <Icon name="check" className="text-[16px]" /> : addingTalentId === et.id ? "..." : "+ 追加"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Talent list */}
        {talents.length === 0 ? (
          <p className="text-[13px] text-[#999] py-4 text-center">
            {isDraft ? "「人材を追加」ボタンから候補者を追加してください" : "人材が追加されていません"}
          </p>
        ) : (
          <div className="space-y-3">
            {talents.map((t) => {
              const reaction = t.proposal_reactions?.[0];
              const isEditing = editingTalent === t.id;

              return (
                <div key={t.id} className="border border-border p-4">
                  {isEditing ? (
                    /* Edit mode */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#888] mb-0.5">表示名</label>
                          <input type="text" value={(editFields.display_label as string) || ""}
                            onChange={(e) => setEditFields({ ...editFields, display_label: e.target.value })}
                            className="w-full px-3 py-1.5 border border-border text-[13px] text-navy focus:outline-none focus:border-blue" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#888] mb-0.5">提案単価（万円/月）<span className="text-blue ml-0.5">クライアント表示</span></label>
                          <input type="number" value={(editFields.client_fee as number) ?? ""}
                            onChange={(e) => setEditFields({ ...editFields, client_fee: e.target.value ? Number(e.target.value) : null })}
                            className="w-full px-3 py-1.5 border border-border text-[13px] text-navy focus:outline-none focus:border-blue" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#888] mb-0.5">仕入単価（万円/月）<span className="text-[#E15454] ml-0.5">内部のみ</span></label>
                          <input type="number" value={(editFields.internal_cost as number) ?? ""}
                            onChange={(e) => setEditFields({ ...editFields, internal_cost: e.target.value ? Number(e.target.value) : null })}
                            className="w-full px-3 py-1.5 border border-border text-[13px] text-navy focus:outline-none focus:border-blue" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#888] mb-0.5">ポジション</label>
                          <input type="text" value={(editFields.summary_position as string) || ""}
                            onChange={(e) => setEditFields({ ...editFields, summary_position: e.target.value })}
                            className="w-full px-3 py-1.5 border border-border text-[13px] text-navy focus:outline-none focus:border-blue" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#888] mb-0.5">経験</label>
                          <input type="text" value={(editFields.summary_experience as string) || ""}
                            onChange={(e) => setEditFields({ ...editFields, summary_experience: e.target.value })}
                            className="w-full px-3 py-1.5 border border-border text-[13px] text-navy focus:outline-none focus:border-blue" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#888] mb-0.5">スキル（カンマ区切り）</label>
                        <input type="text" value={(editFields.summary_skills as string) || ""}
                          onChange={(e) => setEditFields({ ...editFields, summary_skills: e.target.value })}
                          className="w-full px-3 py-1.5 border border-border text-[13px] text-navy focus:outline-none focus:border-blue" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#888] mb-0.5">経歴サマリー</label>
                          <textarea value={(editFields.summary_background as string) || ""} rows={2}
                            onChange={(e) => setEditFields({ ...editFields, summary_background: e.target.value })}
                            className="w-full px-3 py-1.5 border border-border text-[13px] text-navy resize-none focus:outline-none focus:border-blue" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#888] mb-0.5">内部メモ <span className="text-[#E15454]">内部のみ</span></label>
                          <textarea value={(editFields.internal_note as string) || ""} rows={2}
                            onChange={(e) => setEditFields({ ...editFields, internal_note: e.target.value })}
                            className="w-full px-3 py-1.5 border border-border text-[13px] text-navy resize-none focus:outline-none focus:border-blue bg-red-50/30" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(t.id)}
                          className="px-4 py-1.5 bg-blue text-white text-[12px] font-bold hover:bg-blue-dark">保存</button>
                        <button onClick={() => setEditingTalent(null)}
                          className="px-4 py-1.5 bg-white text-[#888] border border-border text-[12px] font-bold hover:bg-[#fafafa]">キャンセル</button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-[15px] font-black text-blue">{t.display_label}</span>
                          {t.summary_position && <span className="text-[13px] text-[#888] ml-2">{t.summary_position}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          {t.client_fee != null && (
                            <div className="text-right">
                              <p className="text-[14px] font-bold text-navy">{t.client_fee}万円/月</p>
                              <p className="text-[10px] text-[#aaa]">提案単価</p>
                            </div>
                          )}
                          {t.internal_cost != null && (
                            <div className="text-right bg-red-50/50 px-2 py-1">
                              <p className="text-[13px] font-bold text-[#E15454]">{t.internal_cost}万円</p>
                              <p className="text-[10px] text-[#E15454]/60">仕入</p>
                            </div>
                          )}
                          {isDraft && (
                            <div className="flex gap-1">
                              <button onClick={() => startEdit(t)} className="p-1 text-[#aaa] hover:text-blue transition-colors">
                                <Icon name="edit" className="text-[16px]" />
                              </button>
                              <button onClick={() => removeTalent(t.id)} className="p-1 text-[#aaa] hover:text-red-500 transition-colors">
                                <Icon name="delete" className="text-[16px]" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[12px] text-[#888] mb-2">
                        {t.summary_experience && <span>経験: {t.summary_experience}</span>}
                        {t.summary_work_style && <span>勤務: {t.summary_work_style}</span>}
                      </div>

                      {t.summary_skills && t.summary_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {t.summary_skills.map((s) => (
                            <span key={s} className="text-[11px] bg-blue/8 text-blue px-2 py-0.5 font-bold">{s}</span>
                          ))}
                        </div>
                      )}

                      {t.summary_background && (
                        <p className="text-[12px] text-[#666] leading-[1.6] mb-2">{t.summary_background}</p>
                      )}

                      {/* Resume links */}
                      {(() => {
                        const profileResumes = t.profile_id ? resumeMap[t.profile_id] : undefined;
                        const externalResumePath = t.external_talent_id ? externalResumeMap[t.external_talent_id] : undefined;
                        if (!profileResumes?.length && !externalResumePath) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Icon name="description" className="text-[14px] text-[#aaa]" />
                            <span className="text-[11px] text-[#888] font-bold">レジュメ:</span>
                            {profileResumes?.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => handleResumeDownload("profile", r.id)}
                                disabled={loadingResume === r.id}
                                className="inline-flex items-center gap-1 text-[11px] text-blue font-bold hover:underline disabled:opacity-50"
                              >
                                <Icon name="open_in_new" className="text-[13px]" />
                                {r.filename}
                                {r.is_primary && <span className="text-[9px] bg-blue/10 text-blue px-1 py-0.5">主</span>}
                                {r.file_size && <span className="text-[10px] text-[#aaa] font-normal">({(r.file_size / 1024).toFixed(0)}KB)</span>}
                              </button>
                            ))}
                            {externalResumePath && (
                              <button
                                onClick={() => handleResumeDownload("external", externalResumePath)}
                                disabled={loadingResume === externalResumePath}
                                className="inline-flex items-center gap-1 text-[11px] text-blue font-bold hover:underline disabled:opacity-50"
                              >
                                <Icon name="open_in_new" className="text-[13px]" />
                                レジュメを開く
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {t.internal_note && (
                        <div className="bg-red-50/30 border border-red-100 px-3 py-1.5 mb-2">
                          <p className="text-[10px] font-bold text-[#E15454]">内部メモ</p>
                          <p className="text-[12px] text-[#888]">{t.internal_note}</p>
                        </div>
                      )}

                      {t.client_fee != null && t.internal_cost != null && (
                        <p className="text-[11px] text-[#aaa] mb-2">
                          マージン: {t.client_fee - t.internal_cost}万円（{Math.round(((t.client_fee - t.internal_cost) / t.client_fee) * 100)}%）
                        </p>
                      )}

                      {reaction && (
                        <div className={`px-3 py-2 mt-2 ${reaction.reaction === "interested" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                          <div className="flex items-center gap-2">
                            <Icon name={reaction.reaction === "interested" ? "thumb_up" : "thumb_down"}
                              className={`text-[16px] ${reaction.reaction === "interested" ? "text-green-600" : "text-red-400"}`} />
                            <span className={`text-[13px] font-bold ${reaction.reaction === "interested" ? "text-green-700" : "text-red-600"}`}>
                              {reaction.reaction === "interested" ? "興味あり" : "見送り"}
                            </span>
                          </div>
                          {reaction.message && <p className="text-[12px] text-[#666] mt-0.5">{reaction.message}</p>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="bg-white border border-border p-6">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">メッセージ</h2>
        {messages.length > 0 && (
          <div className="space-y-3 mb-4">
            {messages.map((m) => (
              <div key={m.id} className={`p-4 ${m.is_admin ? "bg-blue/5 border border-blue/20" : "bg-[#f8f9fb] border border-border/50"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12px] font-bold text-navy">
                    {m.is_admin ? "管理者" : m.profiles?.company_name || m.profiles?.full_name || "クライアント"}
                  </span>
                  <span className="text-[11px] text-[#aaa]">{new Date(m.created_at).toLocaleString("ja-JP")}</span>
                </div>
                <p className="text-[13px] text-[#555] leading-[1.7] whitespace-pre-wrap">{m.body}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..." onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 px-4 py-2.5 border border-border text-[13px] text-navy focus:outline-none focus:border-blue" />
          <button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}
            className="px-5 py-2.5 bg-blue text-white text-[13px] font-bold transition-colors hover:bg-blue-dark disabled:opacity-40 flex items-center gap-1.5">
            <Icon name="send" className="text-[16px]" />送信
          </button>
        </div>
      </div>

      <div className="mt-4 text-[11px] text-[#aaa] flex gap-4">
        <span>作成: {new Date(proposal.created_at).toLocaleString("ja-JP")}</span>
        {proposal.sent_at && <span>送信: {new Date(proposal.sent_at).toLocaleString("ja-JP")}</span>}
        {proposal.viewed_at && <span>閲覧: {new Date(proposal.viewed_at).toLocaleString("ja-JP")}</span>}
      </div>
    </div>
  );
}
