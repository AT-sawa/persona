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

interface QueueItem {
  id: string;
  trigger_type: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
  result: { processed?: number; totalMatches?: number; emailsSent?: number } | null;
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

const TRIGGER_LABELS: Record<string, string> = {
  sync: "同期後",
  manual: "手動実行",
  user_register: "ユーザー登録",
  user_update: "条件変更",
  daily_cron: "定時バッチ",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待機中",
  processing: "実行中",
  completed: "完了",
  failed: "失敗",
};

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchingRunning, setMatchingRunning] = useState(false);
  const [matchingResult, setMatchingResult] = useState<{
    processed: number;
    totalMatches: number;
    emailsSent: number;
  } | null>(null);
  const [recentQueue, setRecentQueue] = useState<QueueItem[]>([]);

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

      // Fetch stats & matching queue in parallel
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

      // Fetch matching queue
      fetchQueue();

      setLoading(false);
    }
    fetchData();
  }, [router]);

  async function fetchQueue() {
    try {
      const res = await fetch("/api/admin/matching");
      if (res.ok) {
        const data = await res.json();
        setRecentQueue(data.queue || []);
      }
    } catch {
      // Ignore — queue table may not exist yet
    }
  }

  async function handleRunMatching() {
    setMatchingRunning(true);
    setMatchingResult(null);
    try {
      const res = await fetch("/api/admin/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setMatchingResult(data);
        fetchQueue();
      } else {
        alert(data.error || "マッチング実行に失敗しました");
      }
    } catch {
      alert("マッチング実行に失敗しました");
    } finally {
      setMatchingRunning(false);
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

      {/* AI Matching Section */}
      <div className="bg-white border border-border p-6 mb-5">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-[#E15454]">
          AIマッチング
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <button
            onClick={handleRunMatching}
            disabled={matchingRunning}
            className="px-6 py-3 bg-blue text-white text-[14px] font-bold transition-colors hover:bg-blue-dark disabled:opacity-50 flex items-center gap-2"
          >
            {matchingRunning ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                実行中...
              </>
            ) : (
              <>
                <Icon name="psychology" className="text-[20px]" />
                AIマッチング実行
              </>
            )}
          </button>
          <p className="text-[12px] text-[#888]">
            全ユーザーに対して即時マッチングを実行します。定時バッチは毎日07:00(JST)に自動実行されます。
          </p>
        </div>

        {/* Result */}
        {matchingResult && (
          <div className="p-4 bg-green-50 border border-green-200 mb-4">
            <p className="text-[13px] font-bold text-green-800 mb-1">マッチング完了</p>
            <div className="flex flex-wrap gap-4 text-[12px] text-green-700">
              <span>処理ユーザー: {matchingResult.processed}人</span>
              <span>マッチ件数: {matchingResult.totalMatches}件</span>
              <span>通知送信: {matchingResult.emailsSent}件</span>
            </div>
          </div>
        )}

        {/* Queue History */}
        {recentQueue.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-[#888] mb-2">最近のマッチング履歴</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 font-bold text-[#888]">トリガー</th>
                    <th className="text-left py-2 pr-3 font-bold text-[#888]">ステータス</th>
                    <th className="text-left py-2 pr-3 font-bold text-[#888]">日時</th>
                    <th className="text-left py-2 font-bold text-[#888]">結果</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQueue.slice(0, 10).map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-2 pr-3">
                        {TRIGGER_LABELS[item.trigger_type] || item.trigger_type}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-bold border ${
                            STATUS_STYLES[item.status] || "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[#888]">
                        {new Date(item.requested_at).toLocaleString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 text-[#888]">
                        {item.result ? (
                          <span>
                            {item.result.processed ?? 0}人 / {item.result.totalMatches ?? 0}件
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
