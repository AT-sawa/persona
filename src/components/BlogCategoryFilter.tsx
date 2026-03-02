"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const CATEGORY_COLORS: Record<string, string> = {
  キャリア: "bg-[#EBF5FF] text-blue",
  "業界トレンド": "bg-emerald-50 text-emerald-700",
  ノウハウ: "bg-amber-50 text-amber-700",
  "企業向け": "bg-purple-50 text-purple-700",
  "サービス紹介": "bg-red-50 text-[#E15454]",
};

const ACTIVE_RING: Record<string, string> = {
  キャリア: "ring-blue/40",
  "業界トレンド": "ring-emerald-500/40",
  ノウハウ: "ring-amber-500/40",
  "企業向け": "ring-purple-500/40",
  "サービス紹介": "ring-[#E15454]/40",
};

interface Props {
  categories: string[];
  counts: Record<string, number>;
  totalCount: number;
}

export default function BlogCategoryFilter({
  categories,
  counts,
  totalCount,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  const handleClick = useCallback(
    (category: string | null) => {
      if (category) {
        router.push(`/blog?category=${encodeURIComponent(category)}`, {
          scroll: false,
        });
      } else {
        router.push("/blog", { scroll: false });
      }
    },
    [router]
  );

  return (
    <div className="flex flex-wrap gap-2 mb-10 -mt-2">
      <button
        onClick={() => handleClick(null)}
        className={`inline-flex items-center text-[11px] font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
          !activeCategory
            ? "bg-navy text-white ring-2 ring-navy/30"
            : "bg-white text-navy border border-border hover:bg-[#f8f8f8]"
        }`}
      >
        すべて ({totalCount})
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => handleClick(cat)}
          className={`inline-flex items-center text-[11px] font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
            CATEGORY_COLORS[cat] || "bg-gray-50 text-gray-700"
          } ${
            activeCategory === cat
              ? `ring-2 ${ACTIVE_RING[cat] || "ring-gray-400/40"} shadow-sm`
              : "hover:shadow-sm"
          }`}
        >
          {cat} ({counts[cat] || 0})
        </button>
      ))}
    </div>
  );
}
