"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Case } from "@/lib/types";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

export default function AdminCasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");

  useEffect(() => {
    async function fetchData() {
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

      // Admin can see all cases (active + inactive)
      const { data } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false });
      setCases(data ?? []);
      setLoading(false);
    }
    fetchData();
  }, [router]);

  async function toggleActive(id: string, currentActive: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from("cases")
      .update({ is_active: !currentActive })
      .eq("id", id);
    if (!error) {
      setCases((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, is_active: !currentActive } : c
        )
      );
    }
  }

  const filtered =
    filter === "all"
      ? cases
      : filter === "active"
      ? cases.filter((c) => c.is_active)
      : cases.filter((c) => !c.is_active);

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/dashboard/admin"
            className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
          >
            ← 管理者TOP
          </Link>
          <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
            ADMIN / CASES
          </p>
          <h1 className="text-xl font-black text-navy">案件管理</h1>
          <p className="text-[12px] text-[#888] mt-1">
            {cases.length}件（公開: {cases.filter((c) => c.is_active).length} /
            非公開: {cases.filter((c) => !c.is_active).length}）
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/admin/cases/email"
            className="px-4 py-2 border border-[#E15454] text-[#E15454] text-[13px] font-bold hover:bg-[#fef2f2] transition-colors"
          >
            メールから登録
          </Link>
          <Link
            href="/dashboard/admin/cases/import"
            className="px-4 py-2 border border-[#E15454] text-[#E15454] text-[13px] font-bold hover:bg-[#fef2f2] transition-colors"
          >
            CSV一括
          </Link>
          <Link
            href="/dashboard/admin/cases/new"
            className="px-4 py-2 bg-[#E15454] text-white text-[13px] font-bold hover:bg-[#d04343] transition-colors"
          >
            + 案件追加
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[
          { value: "active", label: "公開中" },
          { value: "inactive", label: "非公開" },
          { value: "all", label: "すべて" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 text-[12px] font-bold border transition-colors ${
              filter === opt.value
                ? "bg-[#E15454] text-white border-[#E15454]"
                : "bg-white text-[#666] border-border hover:border-[#E15454]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Cases list */}
      <div className="flex flex-col gap-2">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {c.case_no && (
                    <span className="text-[10px] text-[#aaa]">{c.case_no}</span>
                  )}
                  {c.category && (
                    <span className="text-[10px] text-[#888] border border-border px-1.5 py-0.5">
                      {c.category}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 ${
                      c.is_active
                        ? "text-[#10b981] bg-[#ecfdf5]"
                        : "text-[#888] bg-[#f5f5f5]"
                    }`}
                  >
                    {c.is_active ? "公開中" : "非公開"}
                  </span>
                </div>
                <p className="text-[14px] font-bold text-navy mb-1">
                  {c.title}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#888]">
                  {c.fee && <span><Icon name="payments" className="text-[14px] align-middle" /> {c.fee}</span>}
                  {c.location && <span><Icon name="location_on" className="text-[14px] align-middle" /> {c.location}</span>}
                  {c.industry && <span><Icon name="business" className="text-[14px] align-middle" /> {c.industry}</span>}
                  {c.created_at && (
                    <span>
                      <Icon name="calendar_today" className="text-[14px] align-middle" /> {new Date(c.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(c.id, c.is_active)}
                  className={`text-[11px] px-3 py-1 border font-bold ${
                    c.is_active
                      ? "text-[#888] border-border hover:text-[#E15454]"
                      : "text-[#10b981] border-[#10b981] hover:bg-[#ecfdf5]"
                  }`}
                >
                  {c.is_active ? "非公開にする" : "公開する"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
