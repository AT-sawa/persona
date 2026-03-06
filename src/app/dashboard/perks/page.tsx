"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Perk, PerkCategory } from "@/lib/types";

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  gold: { label: "Gold", color: "text-[#b45309]", bg: "bg-[#fef3c7]" },
  platinum: { label: "Platinum", color: "text-[#7c3aed]", bg: "bg-[#ede9fe]" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PerksPage() {
  const router = useRouter();
  const [perks, setPerks] = useState<Perk[]>([]);
  const [categories, setCategories] = useState<PerkCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);

  const fetchPerks = useCallback(async () => {
    try {
      const res = await fetch("/api/perks");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        return;
      }
      const data = await res.json();
      setPerks(data.perks ?? []);
      setCategories(data.categories ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPerks();
  }, [fetchPerks]);

  const featuredPerks = perks.filter((p) => p.is_featured);
  const filteredPerks =
    activeCategory === "all"
      ? perks
      : perks.filter((p) => p.category_id === activeCategory);

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Hero section */}
      <div className="bg-gradient-to-br from-navy via-[#0d1f5c] to-[#1a3a8f] rounded-2xl p-8 md:p-10 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-rounded text-blue text-[28px]">
              redeem
            </span>
            <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase">
              PERKS & BENEFITS
            </p>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
            特典・優待プログラム
          </h1>
          <p className="text-[13px] text-white/70 leading-relaxed max-w-xl">
            PERSONA登録コンサルタント限定の特別優待をご利用いただけます
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 text-[13px] font-bold text-white">
              <span className="material-symbols-rounded text-[16px] text-blue">
                verified
              </span>
              {perks.length}件の特典が利用可能
            </span>
          </div>
        </div>
      </div>

      {/* Featured perks section */}
      {featuredPerks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-rounded text-[20px] text-[#f59e0b]">
              star
            </span>
            <h2 className="text-[15px] font-black text-navy">おすすめ特典</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredPerks.map((perk) => (
              <PerkCard
                key={perk.id}
                perk={perk}
                onSelect={() => setSelectedPerk(perk)}
                featured
              />
            ))}
          </div>
        </div>
      )}

      {/* Category filter pills */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveCategory("all")}
            className={`shrink-0 px-4 py-2 text-[12px] font-bold rounded-full transition-colors ${
              activeCategory === "all"
                ? "bg-blue text-white"
                : "bg-white border border-border text-navy hover:border-blue/40"
            }`}
          >
            すべて
          </button>
          {categories.map((cat) => {
            const count = perks.filter((p) => p.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-2 text-[12px] font-bold rounded-full transition-colors flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? "bg-blue text-white"
                    : "bg-white border border-border text-navy hover:border-blue/40"
                }`}
              >
                {cat.icon && (
                  <span className="material-symbols-rounded text-[16px]">
                    {cat.icon}
                  </span>
                )}
                {cat.name}
                <span
                  className={`text-[10px] ${
                    activeCategory === cat.id ? "text-white/70" : "text-[#aaa]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Perk cards grid */}
      {filteredPerks.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <span className="material-symbols-rounded text-[48px] text-[#ccc] block mb-3">
            upcoming
          </span>
          <p className="text-[14px] font-bold text-navy mb-2">Coming Soon</p>
          <p className="text-[12px] text-[#888]">
            このカテゴリの特典は現在準備中です。近日公開予定ですのでお楽しみに。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPerks.map((perk) => (
            <PerkCard
              key={perk.id}
              perk={perk}
              onSelect={() => setSelectedPerk(perk)}
            />
          ))}
        </div>
      )}

      {/* Modal overlay */}
      {selectedPerk && (
        <PerkModal perk={selectedPerk} onClose={() => setSelectedPerk(null)} />
      )}
    </div>
  );
}

function PerkCard({
  perk,
  onSelect,
  featured = false,
}: {
  perk: Perk;
  onSelect: () => void;
  featured?: boolean;
}) {
  const tierConfig = TIER_CONFIG[perk.tier];
  const category = perk.perk_categories;

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] cursor-pointer group ${
        featured
          ? "border-[#f59e0b]/30 ring-1 ring-[#f59e0b]/10"
          : "border-border"
      }`}
      onClick={onSelect}
    >
      {/* Image area or gradient */}
      {perk.image_url ? (
        <div className="h-40 bg-gray-bg overflow-hidden">
          <img
            src={perk.image_url}
            alt={perk.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-24 bg-gradient-to-br from-[#f0f7ff] to-[#e8f4fd] flex items-center justify-center">
          <span className="material-symbols-rounded text-[36px] text-blue/30">
            {category?.icon || "redeem"}
          </span>
        </div>
      )}

      <div className="p-5">
        {/* Badges row */}
        <div className="flex items-center justify-between mb-3">
          {category && (
            <span className="text-[10px] font-bold text-blue bg-[#EBF7FD] px-2 py-0.5 rounded">
              {category.name}
            </span>
          )}
          {tierConfig && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${tierConfig.color} ${tierConfig.bg}`}
            >
              {tierConfig.label}
            </span>
          )}
        </div>

        {/* Provider */}
        {perk.provider && (
          <p className="text-[11px] text-[#999] mb-1">{perk.provider}</p>
        )}

        {/* Title */}
        <h3 className="text-[15px] font-bold text-navy mb-2 leading-snug">
          {perk.title}
        </h3>

        {/* Benefit summary pill */}
        {perk.benefit_summary && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 bg-[#fef3c7] text-[#92400e] text-[12px] font-bold px-3 py-1 rounded-full">
              <span className="material-symbols-rounded text-[14px]">
                local_offer
              </span>
              {perk.benefit_summary}
            </span>
          </div>
        )}

        {/* Description */}
        {perk.description && (
          <p className="text-[12px] text-[#666] leading-relaxed line-clamp-2 mb-4">
            {perk.description}
          </p>
        )}

        {/* CTA */}
        <button className="w-full text-center py-2.5 text-[12px] font-bold text-blue border border-blue/20 rounded-xl hover:bg-blue/5 transition-colors flex items-center justify-center gap-1">
          詳しく見る
          <span className="material-symbols-rounded text-[16px]">
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}

function PerkModal({
  perk,
  onClose,
}: {
  perk: Perk;
  onClose: () => void;
}) {
  const tierConfig = TIER_CONFIG[perk.tier];
  const category = perk.perk_categories;

  // Close on escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full border border-border hover:bg-[#f5f5f5] transition-colors"
        >
          <span className="material-symbols-rounded text-[18px] text-[#555]">
            close
          </span>
        </button>

        {/* Header image or gradient */}
        {perk.image_url ? (
          <div className="h-48 bg-gray-bg overflow-hidden rounded-t-2xl">
            <img
              src={perk.image_url}
              alt={perk.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-[#f0f7ff] to-[#e8f4fd] rounded-t-2xl flex items-center justify-center">
            <span className="material-symbols-rounded text-[48px] text-blue/20">
              {category?.icon || "redeem"}
            </span>
          </div>
        )}

        <div className="p-6 md:p-8">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {category && (
              <span className="text-[11px] font-bold text-blue bg-[#EBF7FD] px-2.5 py-1 rounded">
                {category.name}
              </span>
            )}
            {tierConfig && (
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded ${tierConfig.color} ${tierConfig.bg}`}
              >
                {tierConfig.label}限定
              </span>
            )}
          </div>

          {/* Provider */}
          {perk.provider && (
            <p className="text-[12px] text-[#999] mb-1">{perk.provider}</p>
          )}

          {/* Title */}
          <h2 className="text-xl font-black text-navy mb-3 leading-snug">
            {perk.title}
          </h2>

          {/* Benefit summary */}
          {perk.benefit_summary && (
            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 bg-[#fef3c7] text-[#92400e] text-[13px] font-bold px-4 py-1.5 rounded-full">
                <span className="material-symbols-rounded text-[16px]">
                  local_offer
                </span>
                {perk.benefit_summary}
              </span>
            </div>
          )}

          {/* Description */}
          {perk.description && (
            <div className="mb-6">
              <p className="text-[13px] text-[#555] leading-relaxed">
                {perk.description}
              </p>
            </div>
          )}

          {/* Details */}
          {perk.details && (
            <div className="mb-6">
              <h3 className="text-[12px] font-bold text-navy uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-rounded text-[16px] text-blue">
                  info
                </span>
                詳細
              </h3>
              <div className="bg-[#f9f9fc] rounded-xl p-4 text-[13px] text-[#444] leading-relaxed whitespace-pre-wrap">
                {perk.details}
              </div>
            </div>
          )}

          {/* How to use */}
          {perk.how_to_use && (
            <div className="mb-6">
              <h3 className="text-[12px] font-bold text-navy uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-rounded text-[16px] text-blue">
                  help
                </span>
                ご利用方法
              </h3>
              <div className="bg-[#f0f7ff] rounded-xl p-4 text-[13px] text-[#444] leading-relaxed whitespace-pre-wrap">
                {perk.how_to_use}
              </div>
            </div>
          )}

          {/* Valid period */}
          {(perk.valid_from || perk.valid_until) && (
            <div className="mb-6 flex items-center gap-2 text-[12px] text-[#888]">
              <span className="material-symbols-rounded text-[16px]">
                calendar_today
              </span>
              <span>
                有効期間:
                {perk.valid_from ? ` ${formatDate(perk.valid_from)}` : ""}
                {perk.valid_from && perk.valid_until ? " 〜 " : ""}
                {perk.valid_until
                  ? `${!perk.valid_from ? " 〜 " : ""}${formatDate(perk.valid_until)}`
                  : " 〜 未定"}
              </span>
            </div>
          )}

          {/* CTA button */}
          {perk.external_url && (
            <a
              href={perk.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue text-white text-[14px] font-bold px-6 py-3 rounded-xl hover:bg-blue-dark transition-colors w-full justify-center"
            >
              特典を利用する
              <span className="material-symbols-rounded text-[18px]">
                arrow_forward
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
