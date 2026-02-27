"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Entry } from "@/lib/types";

interface EntryWithCase extends Entry {
  cases?: {
    title: string;
    fee: string | null;
    category: string | null;
    location: string | null;
  };
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`}>{name}</span>;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "審査中", color: "text-blue bg-[#EBF7FD]" },
  reviewing: { label: "書類選考中", color: "text-[#8b5cf6] bg-[#f5f3ff]" },
  accepted: { label: "承認済", color: "text-[#10b981] bg-[#ecfdf5]" },
  rejected: { label: "不採用", color: "text-[#ef4444] bg-[#fef2f2]" },
};

export default function EntriesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<EntryWithCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEntries() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data } = await supabase
        .from("entries")
        .select("*, cases(title, fee, category, location)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setEntries((data as EntryWithCase[]) ?? []);
      setLoading(false);
    }
    fetchEntries();
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
        <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1">
          ENTRIES
        </p>
        <h1 className="text-xl font-black text-navy">エントリー履歴</h1>
        <p className="text-[12px] text-[#888] mt-1">
          {entries.length}件のエントリー
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white border border-border p-8 text-center">
          <p className="text-[40px] mb-3"><Icon name="mail" className="text-[40px]" /></p>
          <p className="text-[14px] font-bold text-navy mb-2">
            エントリー履歴がありません
          </p>
          <p className="text-[12px] text-[#888] mb-4">
            案件を検索してエントリーしてみましょう
          </p>
          <Link
            href="/dashboard/cases"
            className="inline-block px-6 py-2.5 bg-blue text-white text-[13px] font-bold hover:bg-blue-dark transition-colors"
          >
            案件を探す
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => {
            const status = STATUS_MAP[entry.status] || {
              label: entry.status,
              color: "text-[#888] bg-[#f5f5f5]",
            };
            return (
              <Link
                key={entry.id}
                href={`/dashboard/cases/${entry.case_id}`}
                className="bg-white border border-border p-5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-navy mb-1 truncate">
                      {entry.cases?.title || "案件情報なし"}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#888]">
                      {entry.cases?.fee && (
                        <span><Icon name="payments" className="text-[14px] align-middle" /> {entry.cases.fee}</span>
                      )}
                      {entry.cases?.location && (
                        <span><Icon name="location_on" className="text-[14px] align-middle" /> {entry.cases.location}</span>
                      )}
                      {entry.created_at && (
                        <span>
                          <Icon name="calendar_today" className="text-[14px] align-middle" />{" "}
                          {new Date(entry.created_at).toLocaleDateString(
                            "ja-JP"
                          )}
                        </span>
                      )}
                    </div>
                    {entry.message && (
                      <p className="text-[12px] text-[#666] mt-2 line-clamp-1">
                        <Icon name="chat_bubble" className="text-[14px] align-middle" /> {entry.message}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-bold px-3 py-1 shrink-0 ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
