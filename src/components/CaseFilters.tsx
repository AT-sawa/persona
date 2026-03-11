"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Case } from "@/lib/types";

const PER_PAGE = 18;

/** occupancy文字列から最小パーセンテージを抽出（例: "50%-100%" → 50, "80%" → 80） */
function parseOccupancyMin(occ: string | null): number | null {
  if (!occ) return null;
  const normalized = occ.replace(/％/g, "%").replace(/～/g, "~").replace(/〜/g, "~");
  const match = normalized.match(/(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return num > 0 && num <= 100 ? num : null;
}

const OCCUPANCY_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

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
  const [status, setStatus] = useState(defaultStatus || "all");
  const [occMin, setOccMin] = useState(0);
  const [occMax, setOccMax] = useState(100);
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
      // 稼働率フィルター
      if (occMin > 0 || occMax < 100) {
        const minPct = parseOccupancyMin(c.occupancy);
        if (minPct === null) return false;
        if (minPct < occMin || minPct > occMax) return false;
      }
      return true;
    });
  }, [cases, search, status, occMin, occMax]);

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

  function handleStatus(value: string) {
    setStatus(value);
    setPage(1);
  }

  function handleOccMin(value: number) {
    setOccMin(value);
    if (value > occMax) setOccMax(value);
    setPage(1);
  }

  function handleOccMax(value: number) {
    setOccMax(value);
    if (value < occMin) setOccMin(value);
    setPage(1);
  }

  const hasFilter = search || status !== "all" || occMin > 0 || occMax < 100;

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status pills */}
          <div className="flex items-center gap-1 sm:gap-2 bg-[#f2f2f7] rounded-full p-1 w-full sm:w-auto">
            {[
              { key: "all", label: "すべて", count: cases.length },
              { key: "active", label: "募集中", count: activeCount },
              { key: "closed", label: "クローズ", count: closedCount },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleStatus(tab.key)}
                className={`flex-1 sm:flex-initial px-3 sm:px-4 py-[7px] text-[13px] rounded-full transition-all text-center ${
                  status === tab.key
                    ? "bg-white text-navy font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
                    : "text-[#888] hover:text-[#555]"
                }`}
              >
                {tab.label}
                <span className={`ml-1 sm:ml-1.5 text-[11px] ${status === tab.key ? "text-[#555]" : "text-[#bbb]"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Occupancy range filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#999] whitespace-nowrap">稼働率</span>
            <select
              value={occMin}
              onChange={(e) => handleOccMin(Number(e.target.value))}
              className="bg-[#f2f2f7] text-[12px] text-navy font-medium pl-2.5 pr-6 py-[6px] rounded-full outline-none appearance-none cursor-pointer hover:bg-[#eaeaef] transition-colors"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
            >
              {OCCUPANCY_STEPS.map((v) => (
                <option key={v} value={v}>{v}%</option>
              ))}
            </select>
            <span className="text-[11px] text-[#bbb]">〜</span>
            <select
              value={occMax}
              onChange={(e) => handleOccMax(Number(e.target.value))}
              className="bg-[#f2f2f7] text-[12px] text-navy font-medium pl-2.5 pr-6 py-[6px] rounded-full outline-none appearance-none cursor-pointer hover:bg-[#eaeaef] transition-colors"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
            >
              {OCCUPANCY_STEPS.map((v) => (
                <option key={v} value={v}>{v}%</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-auto">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[#bbb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="キーワードで検索..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full sm:w-[220px] pl-9 pr-4 py-2 bg-[#f2f2f7] text-[13px] text-text outline-none rounded-full focus:bg-white focus:shadow-[0_0_0_2px_rgba(9,23,71,0.12)] transition-all placeholder:text-[#bbb]"
            />
          </div>
        </div>

        {/* Results info */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[13px] text-[#888]">
            <span className="font-semibold text-navy">{filtered.length}</span> 件の案件
            {totalPages > 1 && (
              <span className="ml-2 text-[#ccc]">
                {currentPage} / {totalPages}
              </span>
            )}
          </p>
          {hasFilter && (
            <button
              onClick={() => {
                setSearch("");
                setStatus("all");
                setOccMin(0);
                setOccMax(100);
                setPage(1);
              }}
              className="text-[12px] text-blue hover:text-blue-dark transition-colors"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {/* Case list */}
      {paginated.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[15px] text-[#888]">
            該当する案件がありません
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className={`group block bg-white rounded-2xl border border-[#e8e8ed] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-300 ${
                !c.is_active ? "opacity-55" : ""
              }`}
            >
              <div className="p-5">
                {/* Top: badge */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-bold tracking-[0.12em] uppercase px-2.5 py-[3px] rounded-full border ${
                      c.is_active
                        ? c.status === "最注力"
                          ? "text-[#c0392b] border-[#c0392b]/30 bg-[#c0392b]/6"
                          : "text-[#1a8a5c] border-[#1a8a5c]/30 bg-[#1a8a5c]/6"
                        : "text-[#aaa] border-[#ddd] bg-[#f8f8f8]"
                    }`}
                  >
                    {c.is_active
                      ? c.status === "最注力"
                        ? "PRIORITY"
                        : "OPEN"
                      : "CLOSED"}
                  </span>
                  {c.industry && (
                    <span className="text-[10px] text-[#999]">
                      {c.industry}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-[15px] font-semibold text-navy leading-[1.5] group-hover:text-blue transition-colors line-clamp-2 min-h-[45px] mb-2">
                  {c.title}
                </h3>

                {/* Description */}
                {c.description ? (
                  <p className="text-[12px] text-[#888] leading-[1.65] mb-3 line-clamp-2">
                    {c.description}
                  </p>
                ) : c.must_req ? (
                  <p className="text-[12px] text-[#888] leading-[1.65] mb-3 line-clamp-2">
                    {c.must_req}
                  </p>
                ) : (
                  <p className="text-[12px] text-[#ccc] leading-[1.65] mb-3">
                    詳細はお問い合わせください
                  </p>
                )}

                {/* Meta */}
                {c.location && (
                  <p className="text-[11px] text-[#aaa] mb-3">{c.location}</p>
                )}

                {/* Footer */}
                <div className="pt-3 mt-auto border-t border-[#f0f0f5]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-[#aaa]">報酬</span>
                    <span className="text-[15px] font-bold text-navy tracking-tight">
                      {c.fee || (
                        <span className="text-[12px] text-[#ccc] font-normal">
                          要相談
                        </span>
                      )}
                    </span>
                  </div>
                  {c.occupancy && (
                    <div className="flex items-baseline justify-between mt-0.5">
                      <span className="text-[11px] text-[#aaa]">稼働</span>
                      <span className="text-[13px] text-[#666]">
                        {typeof c.occupancy === "number"
                          ? `${Math.round(Number(c.occupancy) * 100)}%`
                          : c.occupancy}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="ページネーション"
          className="flex items-center justify-center gap-1 mt-12 mb-4"
        >
          <button
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            disabled={currentPage <= 1}
            className="w-9 h-9 flex items-center justify-center text-[13px] text-navy hover:bg-[#f2f2f7] disabled:opacity-20 disabled:cursor-not-allowed transition-colors rounded-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="m15 18-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
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
                onClick={() => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-9 h-9 text-[13px] rounded-full transition-all ${
                  p === currentPage
                    ? "bg-navy text-white font-semibold"
                    : "text-[#888] hover:bg-[#f2f2f7]"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            disabled={currentPage >= totalPages}
            className="w-9 h-9 flex items-center justify-center text-[13px] text-navy hover:bg-[#f2f2f7] disabled:opacity-20 disabled:cursor-not-allowed transition-colors rounded-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="m9 18 6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </nav>
      )}
    </>
  );
}
