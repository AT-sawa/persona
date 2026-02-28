"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Stats {
  users: number;
  activeCases: number;
  entries: number;
  inquiries: number;
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

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

      // Check admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        router.push("/dashboard");
        return;
      }

      // Fetch stats
      const [usersRes, casesRes, entriesRes, inquiriesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("cases")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase.from("entries").select("id", { count: "exact", head: true }),
        supabase.from("inquiries").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        users: usersRes.count ?? 0,
        activeCases: casesRes.count ?? 0,
        entries: entriesRes.count ?? 0,
        inquiries: inquiriesRes.count ?? 0,
      });
      setLoading(false);
    }
    fetchData();
  }, [router]);

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
          ADMIN
        </p>
        <h1 className="text-xl font-black text-navy">管理者ダッシュボード</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "登録ユーザー", value: stats?.users, href: "/dashboard/admin/users" },
          { label: "公開案件", value: stats?.activeCases, href: "/dashboard/admin/cases" },
          { label: "エントリー", value: stats?.entries, href: "/dashboard/admin/entries" },
          { label: "お問い合わせ", value: stats?.inquiries, href: "#" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="bg-white border border-border p-5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow"
          >
            <p className="text-[11px] font-bold text-[#888] mb-1">{item.label}</p>
            <p className="text-2xl font-black text-navy">{item.value}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white border border-border p-6 mb-5">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-[#E15454]">
          クイックアクション
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/dashboard/admin/cases/new"
            className="p-4 border border-border text-center hover:bg-[#fafafa] transition-colors"
          >
            <span className="text-2xl block mb-1"><Icon name="add" className="text-[24px]" /></span>
            <span className="text-[13px] font-bold text-navy">案件を追加</span>
          </Link>
          <Link
            href="/dashboard/admin/cases/import"
            className="p-4 border border-border text-center hover:bg-[#fafafa] transition-colors"
          >
            <span className="text-2xl block mb-1"><Icon name="download" className="text-[24px]" /></span>
            <span className="text-[13px] font-bold text-navy">CSV一括インポート</span>
          </Link>
          <Link
            href="/dashboard/admin/entries"
            className="p-4 border border-border text-center hover:bg-[#fafafa] transition-colors"
          >
            <span className="text-2xl block mb-1"><Icon name="forward_to_inbox" className="text-[24px]" /></span>
            <span className="text-[13px] font-bold text-navy">エントリー確認</span>
          </Link>
          <Link
            href="/dashboard/admin/analytics"
            className="p-4 border border-border text-center hover:bg-[#fafafa] transition-colors"
          >
            <span className="text-2xl block mb-1"><Icon name="analytics" className="text-[24px]" /></span>
            <span className="text-[13px] font-bold text-navy">アナリティクス</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
