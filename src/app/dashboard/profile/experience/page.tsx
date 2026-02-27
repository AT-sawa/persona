"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserExperience } from "@/lib/types";

const EMPTY_FORM = {
  company_name: "",
  role: "",
  industry: "",
  start_date: "",
  end_date: "",
  is_current: false,
  description: "",
  skills_used: [] as string[],
};

export default function ExperiencePage() {
  const router = useRouter();
  const [experiences, setExperiences] = useState<UserExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // experience id or "new"
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const fetchExperiences = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setUserId(user.id);
    const { data } = await supabase
      .from("user_experiences")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });
    setExperiences(data ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchExperiences();
  }, [fetchExperiences]);

  function startNew() {
    setEditing("new");
    setForm(EMPTY_FORM);
    setError("");
  }

  function startEdit(exp: UserExperience) {
    setEditing(exp.id);
    setForm({
      company_name: exp.company_name,
      role: exp.role,
      industry: exp.industry || "",
      start_date: exp.start_date,
      end_date: exp.end_date || "",
      is_current: exp.is_current,
      description: exp.description || "",
      skills_used: exp.skills_used || [],
    });
    setError("");
  }

  function cancel() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function handleSave() {
    if (!form.company_name || !form.role || !form.start_date) {
      setError("会社名、役職、開始日は必須です");
      return;
    }
    if (!userId) return;
    setError("");
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        user_id: userId,
        company_name: form.company_name,
        role: form.role,
        industry: form.industry || null,
        start_date: form.start_date,
        end_date: form.is_current ? null : form.end_date || null,
        is_current: form.is_current,
        description: form.description || null,
        skills_used: form.skills_used.length > 0 ? form.skills_used : null,
        updated_at: new Date().toISOString(),
      };
      if (editing === "new") {
        const { error: insertError } = await supabase
          .from("user_experiences")
          .insert(payload);
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from("user_experiences")
          .update(payload)
          .eq("id", editing);
        if (updateError) throw updateError;
      }
      setEditing(null);
      setForm(EMPTY_FORM);
      await fetchExperiences();
    } catch {
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この職務経歴を削除しますか？")) return;
    const supabase = createClient();
    await supabase.from("user_experiences").delete().eq("id", id);
    await fetchExperiences();
  }

  function updateSkills(value: string) {
    const skills = value.split(",").map((s) => s.trim()).filter(Boolean);
    setForm((prev) => ({ ...prev, skills_used: skills }));
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
          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1">
            EXPERIENCE
          </p>
          <h1 className="text-xl font-black text-navy">職務経歴</h1>
        </div>
        {!editing && (
          <button
            onClick={startNew}
            className="px-4 py-2 bg-blue text-white text-[13px] font-bold hover:bg-blue-dark transition-colors"
          >
            + 経歴を追加
          </button>
        )}
      </div>

      {/* Edit/New Form */}
      {editing && (
        <div className="bg-white border border-border p-6 mb-5">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-blue">
            {editing === "new" ? "経歴を追加" : "経歴を編集"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                会社名 <span className="text-[#E15454]">*必須</span>
              </label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, company_name: e.target.value }))
                }
                placeholder="例: デロイトトーマツコンサルティング"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                役職・ポジション <span className="text-[#E15454]">*必須</span>
              </label>
              <input
                type="text"
                value={form.role}
                onChange={(e) =>
                  setForm((p) => ({ ...p, role: e.target.value }))
                }
                placeholder="例: シニアコンサルタント"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                業界
              </label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) =>
                  setForm((p) => ({ ...p, industry: e.target.value }))
                }
                placeholder="例: IT・通信"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-[13px] text-text cursor-pointer pb-2.5">
                <input
                  type="checkbox"
                  checked={form.is_current}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, is_current: e.target.checked }))
                  }
                  className="w-4 h-4 accent-blue"
                />
                現在在籍中
              </label>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                開始日 <span className="text-[#E15454]">*必須</span>
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, start_date: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            {!form.is_current && (
              <div>
                <label className="block text-[11px] font-bold text-[#888] mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, end_date: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
                />
              </div>
            )}
          </div>
          <div className="mt-4">
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              業務内容
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={3}
              placeholder="担当業務の内容を記載してください"
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
            />
          </div>
          <div className="mt-4">
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              使用スキル（カンマ区切り）
            </label>
            <input
              type="text"
              value={form.skills_used.join(", ")}
              onChange={(e) => updateSkills(e.target.value)}
              placeholder="例: PMO, SAP, 業務改善"
              className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            />
          </div>
          {error && (
            <p className="text-[12px] text-[#E15454] mt-3">{error}</p>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-blue text-white text-[13px] font-bold hover:bg-blue-dark transition-colors disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={cancel}
              className="px-6 py-2.5 border border-border text-[13px] text-[#888] hover:bg-[#f5f5f5] transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Experience List */}
      {experiences.length === 0 && !editing ? (
        <div className="bg-white border border-border p-8 text-center">
          <p className="text-[40px] mb-3">📋</p>
          <p className="text-[14px] font-bold text-navy mb-2">
            職務経歴がまだ登録されていません
          </p>
          <p className="text-[12px] text-[#888] mb-4">
            経歴を追加するとマッチング精度が向上します
          </p>
          <button
            onClick={startNew}
            className="px-6 py-2.5 bg-blue text-white text-[13px] font-bold hover:bg-blue-dark transition-colors"
          >
            + 経歴を追加
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {experiences.map((exp) => (
            <div
              key={exp.id}
              className="bg-white border border-border p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-navy">
                    {exp.company_name}
                  </p>
                  <p className="text-[13px] text-text mt-0.5">{exp.role}</p>
                  <p className="text-[11px] text-[#888] mt-1">
                    {exp.start_date}
                    {" 〜 "}
                    {exp.is_current ? "現在" : exp.end_date || ""}
                    {exp.industry && ` ・ ${exp.industry}`}
                  </p>
                  {exp.description && (
                    <p className="text-[12px] text-[#666] mt-2 line-clamp-2">
                      {exp.description}
                    </p>
                  )}
                  {exp.skills_used && exp.skills_used.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {exp.skills_used.map((skill) => (
                        <span
                          key={skill}
                          className="text-[10px] text-blue bg-blue/10 px-2 py-0.5 font-bold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-3 shrink-0">
                  <button
                    onClick={() => startEdit(exp)}
                    className="text-[11px] text-blue hover:underline"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="text-[11px] text-[#E15454] hover:underline"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
