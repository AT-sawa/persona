"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Case } from "@/lib/types";

const PER_PAGE = 18;

interface CaseFiltersProps {
  cases: Case[];
  defaultStatus?: string;
  defaultCategory?: string;
}

export default function CaseFilters({
  cases,
  defaultStatus,
  defaultCategory,
}: CaseFiltersProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(defaultCategory || "all");
  const [status, setStatus] = useState(defaultStatus || "all");
  const [page, setPage] = useState(1);

  const activeCount = useMemo(
    () => cases.filter((c) => c.is_active).length,
    [cases]
  );
  const closedCount = useMemo(
    () => cases.filter((c) => !c.is_active).length,
    [cases]
  );

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (status === "active" && !c.is_active) return false;
      if (status === "closed" && c.is_active) return false;
      if (search) {
        const q = search.toLowerCase();
        const searchable = [c.title, c.must_req, c.description, c.industry]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [cases, search, category, status]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const currentPage = Math.min(page, totalPages || 1);
  const paginated = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleCategory(value: string) {
    setCategory(value);
    setPage(1);
  }

  function handleStatus(value: string) {
    setStatus(value);
    setPage(1);
  }

  return (
    <>
      {/* Status tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: "all", label: `すべて（${cases.length}）` },
          { key: "active", label: `募集中（${activeCount}）` },
          { key: "closed", label: `クローズ（${closedCount}）` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleStatus(tab.key)}
            className={`px-4 py-2 text-[12px] font-bold border transition-colors ${
              status === tab.key
                ? "bg-navy text-white border-navy"
                : "bg-white text-[#666] border-border hover:bg-[#f5f7fa]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <input
          type="text"
          placeholder="フリーワード検索（タイトル・スキル）"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 min-w-[240px] px-4 py-2.5 border border-border text-sm bg-white outline-none focus:border-blue"
        />
        <select
          value={category}
          onChange={(e) => handleCategory(e.target.value)}
          className="px-4 py-2.5 border border-border text-sm bg-white outline-none focus:border-blue"
        >
          <option value="all">すべてのカテゴリ</option>
          <option value="コンサル">コンサル</option>
          <option value="SI">SI</option>
          <option value="IT">IT</option>
          <option value="非IT">非IT</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-xs text-[#888] mb-4">
        {filtered.length}件の案件が見つかりました
        {totalPages > 1 && (
          <span className="ml-2">
            （{currentPage}/{totalPages}ページ）
          </span>
        )}
      </p>

      {/* Case grid */}
      {paginated.length === 0 ? (
        <p className="text-sm text-[#888] text-center py-10">
          該当する案件がありません。
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
          {paginated.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className={`bg-white p-[18px_16px] transition-colors hover:bg-[#f0f8ff] block relative ${
                !c.is_active ? "opacity-75" : ""
              }`}
            >
              {/* Status badge */}
              <span
                className={`inline-block text-[10px] font-bold px-2 py-0.5 mb-2 ${
                  c.is_active
                    ? "text-[#10b981] bg-[#ecfdf5]"
                    : "text-[#888] bg-[#f5f5f5]"
                }`}
              >
                {c.is_active ? "募集中" : "クローズ"}
              </span>

              <p className="text-[13px] font-bold text-navy leading-[1.5] mb-2.5 min-h-[40px]">
                {c.title}
              </p>
              {c.industry && (
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-[10px] font-bold text-blue bg-[#EBF7FD] px-2 py-0.5">
                    {c.industry}
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-2 border-t border-border">
                <span className="text-[10px] text-[#aaa]">報酬金額</span>
                <span className="text-[13px] font-extrabold text-blue">
                  {c.fee || "お問い合わせ"}
                </span>
              </div>
              {c.occupancy && (
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-[10px] text-[#aaa]">稼働率</span>
                  <span className="text-[12px] text-[#555]">
                    {typeof c.occupancy === "number"
                      ? `${Math.round(Number(c.occupancy) * 100)}%`
                      : c.occupancy}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="ページネーション"
          className="flex items-center justify-center gap-1 mt-8"
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-2 text-sm border border-border bg-white text-navy hover:bg-[#f0f8ff] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← 前へ
          </button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            // Show pages around current page
            let p: number;
            if (totalPages <= 10) {
              p = i + 1;
            } else if (currentPage <= 5) {
              p = i + 1;
            } else if (currentPage >= totalPages - 4) {
              p = totalPages - 9 + i;
            } else {
              p = currentPage - 4 + i;
            }
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 text-sm border transition-colors ${
                  p === currentPage
                    ? "bg-blue text-white border-blue font-bold"
                    : "border-border bg-white text-navy hover:bg-[#f0f8ff]"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-2 text-sm border border-border bg-white text-navy hover:bg-[#f0f8ff] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            次へ →
          </button>
        </nav>
      )}
    </>
  );
}
