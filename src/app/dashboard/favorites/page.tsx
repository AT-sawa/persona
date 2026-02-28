"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Favorite, Case } from "@/lib/types";

type FavoriteWithCase = Favorite & { cases: Case };

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteWithCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      const res = await fetch("/api/favorites");
      const data = await res.json();
      if (res.ok) {
        setFavorites(data.favorites ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch favorites:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  async function removeFavorite(caseId: string) {
    setRemoving(caseId);

    // Optimistic removal
    const previousFavorites = favorites;
    setFavorites((prev) => prev.filter((f) => f.case_id !== caseId));

    try {
      const res = await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      });
      if (!res.ok) {
        // Revert on failure
        setFavorites(previousFavorites);
      }
    } catch {
      // Revert on error
      setFavorites(previousFavorites);
    } finally {
      setRemoving(null);
    }
  }

  function getStatusBadge(c: Case) {
    if (!c.is_active) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded text-[#aaa] bg-[#f5f5f5]">
          クローズ
        </span>
      );
    }
    if (c.status === "最注力") {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded text-[#c0392b] bg-[#fef2f2]">
          最注力
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded text-[#1a8a5c] bg-[#ecfdf5]">
        募集中
      </span>
    );
  }

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#999]">
          <Icon name="progress_activity" className="text-[24px] animate-spin" />
          <span className="text-sm">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1">
            FAVORITES
          </p>
          <h1 className="text-xl font-black text-navy">お気に入り</h1>
          <p className="text-[13px] text-[#888] mt-1">
            {favorites.length}件の案件をブックマーク中
          </p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border/60 p-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#f5f7fa] flex items-center justify-center mb-4">
            <Icon name="bookmark" className="text-[32px] text-[#ccc]" />
          </div>
          <p className="text-[15px] font-bold text-navy mb-2">
            案件をお気に入りに追加しましょう
          </p>
          <p className="text-[12px] text-[#888] mb-5">
            気になる案件をブックマークして、あとからまとめて確認できます
          </p>
          <Link
            href="/dashboard/cases"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue text-white text-[13px] font-bold rounded-xl hover:bg-blue-dark transition-colors"
          >
            <Icon name="search" className="text-[18px]" />
            案件を探す
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {favorites.map((fav) => {
            const c = fav.cases;
            if (!c) return null;
            return (
              <div
                key={fav.id}
                className="group bg-white rounded-2xl border border-border/60 p-5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-blue/20 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/dashboard/cases/${c.id}`}
                    className="flex-1 min-w-0 block"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {getStatusBadge(c)}
                      {c.category && (
                        <span className="text-[10px] text-[#888] bg-[#f5f7fa] px-2 py-0.5 rounded">
                          {c.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] font-bold text-navy mb-2 group-hover:text-blue transition-colors">
                      {c.title}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#888]">
                      {c.fee && (
                        <span className="flex items-center gap-1">
                          <Icon name="payments" className="text-[14px]" />
                          {c.fee}
                        </span>
                      )}
                      {c.location && (
                        <span className="flex items-center gap-1">
                          <Icon name="location_on" className="text-[14px]" />
                          {c.location}
                        </span>
                      )}
                      {c.occupancy && (
                        <span className="flex items-center gap-1">
                          <Icon name="schedule" className="text-[14px]" />
                          {c.occupancy}
                        </span>
                      )}
                      {c.industry && (
                        <span className="flex items-center gap-1">
                          <Icon name="business" className="text-[14px]" />
                          {c.industry}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className="flex items-center gap-1 text-[12px] text-blue font-bold opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1.5 rounded-lg hover:bg-blue/5"
                    >
                      詳細
                      <Icon name="arrow_forward" className="text-[16px]" />
                    </Link>
                    <button
                      onClick={() => removeFavorite(c.id)}
                      disabled={removing === c.id}
                      className={`p-1.5 rounded-lg transition-all text-blue hover:bg-[#fef2f2] hover:text-[#E15454] ${
                        removing === c.id ? "opacity-50" : ""
                      }`}
                      title="お気に入りから削除"
                      aria-label="お気に入りから削除"
                    >
                      <Icon
                        name="bookmark"
                        className="text-[20px] filled"
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
