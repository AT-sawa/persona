"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface ExternalTalent {
  id: string;
  source_name: string;
  source_row_key: string;
  name: string | null;
  availability_date: string | null;
  project_type: string | null;
  personnel_info: string | null;
  resume_url: string | null;
  raw_data: Record<string, string>;
  is_active: boolean;
  first_synced_at: string | null;
  last_synced_at: string | null;
}

interface PartnerSource {
  id: string;
  name: string;
  sheet_url: string;
  sync_enabled: boolean;
  last_synced_at: string | null;
  last_sync_result: {
    total?: number;
    inserted?: number;
    updated?: number;
    errors?: string[];
  } | null;
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

export default function AdminTalentsPage() {
  const router = useRouter();
  const [talents, setTalents] = useState<ExternalTalent[]>([]);
  const [sources, setSources] = useState<PartnerSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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

    const [talentsRes, sourcesRes] = await Promise.all([
      supabase
        .from("external_talents")
        .select("*")
        .order("last_synced_at", { ascending: false }),
      supabase
        .from("partner_sheet_sources")
        .select("*")
        .order("name"),
    ]);

    setTalents((talentsRes.data as ExternalTalent[]) ?? []);
    setSources((sourcesRes.data as PartnerSource[]) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/cron/sync-talents", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET_PREVIEW || ""}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSyncMessage(
          `同期完了: ${data.totalInserted}件追加, ${data.totalUpdated}件更新, ${data.totalErrors}件エラー`
        );
        fetchData();
      } else {
        setSyncMessage("同期に失敗しました");
      }
    } catch {
      setSyncMessage("同期リクエストに失敗しました");
    } finally {
      setSyncing(false);
    }
  };

  const filtered =
    filter === "active"
      ? talents.filter((t) => t.is_active)
      : talents;

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
        <Link
          href="/dashboard/admin"
          className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
        >
          ← 管理者TOP
        </Link>
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          ADMIN / EXTERNAL TALENTS
        </p>
        <h1 className="text-xl font-black text-navy">外部人材DB</h1>
        <p className="text-[12px] text-[#888] mt-1">
          パートナー企業の人材リスト（読み取り専用）
        </p>
      </div>

      {/* Partner Sources Summary */}
      {sources.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {sources.map((src) => (
            <div
              key={src.id}
              className="bg-white border border-border p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Icon
                  name={src.sync_enabled ? "sync" : "sync_disabled"}
                  className={`text-[18px] ${src.sync_enabled ? "text-[#10b981]" : "text-[#aaa]"}`}
                />
                <div>
                  <p className="text-[13px] font-bold text-navy">{src.name}</p>
                  <p className="text-[11px] text-[#888]">
                    最終同期:{" "}
                    {src.last_synced_at
                      ? new Date(src.last_synced_at).toLocaleString("ja-JP")
                      : "未実施"}
                    {src.last_sync_result && (
                      <span className="ml-2">
                        (取得: {src.last_sync_result.total ?? 0}件)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <a
                href={src.sheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-blue hover:underline flex items-center gap-1"
              >
                <Icon name="open_in_new" className="text-[14px]" />
                シート
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Sync Status & Manual Trigger */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="px-4 py-2 bg-navy text-white text-[12px] font-bold hover:bg-navy/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <Icon name="sync" className={`text-[16px] ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "同期中..." : "手動同期"}
        </button>
        {syncMessage && (
          <p className="text-[12px] text-[#666]">{syncMessage}</p>
        )}

        <div className="ml-auto flex gap-2">
          {(["active", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[12px] font-bold border transition-colors ${
                filter === f
                  ? "bg-[#E15454] text-white border-[#E15454]"
                  : "bg-white text-[#666] border-border hover:border-[#E15454] hover:text-[#E15454]"
              }`}
            >
              {f === "active" ? "有効のみ" : "すべて"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="bg-white border border-border p-3 text-center">
          <p className="text-[24px] font-black text-navy">
            {talents.filter((t) => t.is_active).length}
          </p>
          <p className="text-[11px] text-[#888]">有効人材</p>
        </div>
        <div className="bg-white border border-border p-3 text-center">
          <p className="text-[24px] font-black text-navy">{sources.length}</p>
          <p className="text-[11px] text-[#888]">パートナー</p>
        </div>
        <div className="bg-white border border-border p-3 text-center">
          <p className="text-[24px] font-black text-navy">
            {talents.filter((t) => !t.is_active).length}
          </p>
          <p className="text-[11px] text-[#888]">非アクティブ</p>
        </div>
      </div>

      {/* Talent List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-border p-8 text-center">
          <Icon name="person_search" className="text-[48px] text-[#ddd] block mb-2" />
          <p className="text-[13px] text-[#888]">
            {talents.length === 0
              ? "外部人材データがまだありません。パートナーのシートにデータが追加されると自動で取り込まれます。"
              : "条件に一致する人材がいません"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((talent) => (
            <div
              key={talent.id}
              className={`bg-white border p-4 transition-colors ${
                talent.is_active ? "border-border" : "border-[#fecaca] bg-[#fef2f2]"
              }`}
            >
              <div
                className="flex items-start justify-between gap-3 cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === talent.id ? null : talent.id)
                }
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[14px] font-bold text-navy">
                      {talent.name || "名前未設定"}
                    </p>
                    {!talent.is_active && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626]">
                        非アクティブ
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 text-[10px] bg-[#EBF7FD] text-blue font-bold">
                      {talent.source_name}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#666]">
                    {talent.availability_date && (
                      <span>
                        <Icon name="calendar_month" className="text-[14px] align-middle mr-0.5" />
                        {talent.availability_date}
                      </span>
                    )}
                    {talent.project_type && (
                      <span>
                        <Icon name="work" className="text-[14px] align-middle mr-0.5" />
                        {talent.project_type}
                      </span>
                    )}
                    {talent.resume_url && (
                      <a
                        href={talent.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon name="description" className="text-[14px] align-middle mr-0.5" />
                        レジュメ
                      </a>
                    )}
                  </div>
                </div>
                <Icon
                  name={expandedId === talent.id ? "expand_less" : "expand_more"}
                  className="text-[20px] text-[#aaa] shrink-0"
                />
              </div>

              {/* Expanded details */}
              {expandedId === talent.id && (
                <div className="mt-3 pt-3 border-t border-border">
                  {talent.personnel_info && (
                    <div className="mb-3">
                      <p className="text-[11px] font-bold text-[#888] mb-1">人員情報</p>
                      <p className="text-[13px] text-navy whitespace-pre-wrap">
                        {talent.personnel_info}
                      </p>
                    </div>
                  )}

                  {/* Raw data */}
                  {Object.keys(talent.raw_data).length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-bold text-[#888] mb-1">
                        シート原データ
                      </p>
                      <div className="bg-[#f8f8f8] p-2 text-[12px]">
                        {Object.entries(talent.raw_data).map(([key, val]) => (
                          <div key={key} className="flex gap-2 py-0.5">
                            <span className="text-[#888] shrink-0 w-24">{key}:</span>
                            <span className="text-navy">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 text-[11px] text-[#aaa]">
                    <span>
                      初回取り込み:{" "}
                      {talent.first_synced_at
                        ? new Date(talent.first_synced_at).toLocaleString("ja-JP")
                        : "-"}
                    </span>
                    <span>
                      最終同期:{" "}
                      {talent.last_synced_at
                        ? new Date(talent.last_synced_at).toLocaleString("ja-JP")
                        : "-"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
