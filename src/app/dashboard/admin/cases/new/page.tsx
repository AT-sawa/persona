"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const INITIAL_FORM = {
  case_no: "",
  title: "",
  category: "IT",
  background: "",
  description: "",
  industry: "",
  start_date: "",
  extendable: "",
  occupancy: "",
  fee: "",
  office_days: "",
  location: "",
  must_req: "",
  nice_to_have: "",
  flow: "",
  client_company: "",
  commercial_flow: "",
  is_active: true,
};

export default function AdminNewCasePage() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState(false);

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
      setAuthorized(true);
    }
    checkAdmin();
  }, [router]);

  function update(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) {
      setError("タイトルは必須です");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("cases").insert({
        case_no: form.case_no || null,
        title: form.title,
        category: form.category || null,
        background: form.background || null,
        description: form.description || null,
        industry: form.industry || null,
        start_date: form.start_date || null,
        extendable: form.extendable || null,
        occupancy: form.occupancy || null,
        fee: form.fee || null,
        office_days: form.office_days || null,
        location: form.location || null,
        must_req: form.must_req || null,
        nice_to_have: form.nice_to_have || null,
        flow: form.flow || null,
        client_company: form.client_company || null,
        commercial_flow: form.commercial_flow || null,
        is_active: form.is_active,
        status: "active",
      });

      if (insertError) throw insertError;

      // Trigger embedding generation for the new case
      fetch("/api/admin/embeddings", { method: "POST" }).catch(() => {});

      router.push("/dashboard/admin/cases");
    } catch {
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  if (!authorized) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <Link
          href="/dashboard/admin/cases"
          className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
        >
          ← 案件管理
        </Link>
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          ADMIN / NEW CASE
        </p>
        <h1 className="text-xl font-black text-navy">案件を追加</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 基本情報 */}
        <div className="bg-white border border-border p-6">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-[#E15454]">
            基本情報
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                タイトル <span className="text-[#E15454]">*必須</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="例: PMO支援｜大手金融機関のDX推進プロジェクト"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                案件番号
              </label>
              <input
                type="text"
                value={form.case_no}
                onChange={(e) => update("case_no", e.target.value)}
                placeholder="例: P-2026-001"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                元請け <span className="text-[10px] text-[#aaa] font-normal">※ユーザーには非公開</span>
              </label>
              <input
                type="text"
                value={form.client_company}
                onChange={(e) => update("client_company", e.target.value)}
                placeholder="例: 株式会社○○"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                商流 <span className="text-[10px] text-[#aaa] font-normal">※ユーザーには非公開</span>
              </label>
              <input
                type="text"
                value={form.commercial_flow}
                onChange={(e) => update("commercial_flow", e.target.value)}
                placeholder="例: エンド直 / 2次請け"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                カテゴリ
              </label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              >
                <option value="IT">IT</option>
                <option value="非IT">非IT</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                業界
              </label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
                placeholder="例: 金融・保険"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                報酬
              </label>
              <input
                type="text"
                value={form.fee}
                onChange={(e) => update("fee", e.target.value)}
                placeholder="例: 100~150万円/月"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                稼働率
              </label>
              <input
                type="text"
                value={form.occupancy}
                onChange={(e) => update("occupancy", e.target.value)}
                placeholder="例: 100%"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                勤務地
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="例: 東京都千代田区"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                出社日数
              </label>
              <input
                type="text"
                value={form.office_days}
                onChange={(e) => update("office_days", e.target.value)}
                placeholder="例: 週3日出社 / フルリモート"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                開始日
              </label>
              <input
                type="text"
                value={form.start_date}
                onChange={(e) => update("start_date", e.target.value)}
                placeholder="例: 2026年4月〜"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                延長可否
              </label>
              <input
                type="text"
                value={form.extendable}
                onChange={(e) => update("extendable", e.target.value)}
                placeholder="例: 延長可能"
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* 詳細 */}
        <div className="bg-white border border-border p-6">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-[#E15454]">
            詳細情報
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                案件背景
              </label>
              <textarea
                value={form.background}
                onChange={(e) => update("background", e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                業務内容
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                必須要件
              </label>
              <textarea
                value={form.must_req}
                onChange={(e) => update("must_req", e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                歓迎要件
              </label>
              <textarea
                value={form.nice_to_have}
                onChange={(e) => update("nice_to_have", e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                選考フロー
              </label>
              <textarea
                value={form.flow}
                onChange={(e) => update("flow", e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* 公開設定 */}
        <div className="bg-white border border-border p-6">
          <label className="flex items-center gap-2 text-[13px] font-bold text-navy cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update("is_active", e.target.checked)}
              className="w-4 h-4 accent-blue"
            />
            すぐに公開する
          </label>
        </div>

        {error && <p className="text-[12px] text-[#E15454]">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 bg-[#E15454] text-white text-[14px] font-bold hover:bg-[#d04343] transition-colors disabled:opacity-50"
        >
          {saving ? "保存中..." : "案件を登録"}
        </button>
      </form>
    </div>
  );
}
