"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface FavoriteButtonProps {
  caseId: string;
}

export default function FavoriteButton({ caseId }: FavoriteButtonProps) {
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const checkFavoriteStatus = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("case_id", caseId)
      .maybeSingle();

    setIsFavorited(!!data);
    setLoading(false);
  }, [caseId]);

  useEffect(() => {
    checkFavoriteStatus();
  }, [checkFavoriteStatus]);

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (toggling) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    setToggling(true);

    // Optimistic update
    const previousState = isFavorited;
    setIsFavorited(!isFavorited);

    try {
      if (previousState) {
        // Remove from favorites
        const res = await fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ case_id: caseId }),
        });
        if (!res.ok) {
          // Revert on failure
          setIsFavorited(previousState);
        }
      } else {
        // Add to favorites
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ case_id: caseId }),
        });
        if (!res.ok) {
          // Revert on failure
          setIsFavorited(previousState);
        }
      }
    } catch {
      // Revert on error
      setIsFavorited(previousState);
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <button
        className="p-1.5 rounded-lg text-[#ccc]"
        disabled
        aria-label="読み込み中"
      >
        <span className="material-symbols-rounded text-[20px]">bookmark</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={toggling}
      className={`p-1.5 rounded-lg transition-all hover:bg-[#f5f7fa] ${
        isFavorited
          ? "text-blue"
          : "text-[#ccc] hover:text-[#999]"
      } ${toggling ? "opacity-50" : ""}`}
      aria-label={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
      title={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
    >
      <span
        className={`material-symbols-rounded text-[20px] ${
          isFavorited ? "filled" : ""
        }`}
      >
        bookmark
      </span>
    </button>
  );
}
