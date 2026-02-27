"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Case } from "@/lib/types";

const CATEGORIES = ["すべて", "IT", "非IT"];

export default function AppCasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [filtered, setFiltered] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("すべて");
  const [feeMin, setFeeMin] = useState("");
  const [location, setLocation] = useState("");
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const [casesRes, matchRes] = await Promise.all([
      supabase
        .from("cases")
        .select("*")
        .eq("is_active", true)
        .order("published_at", { ascending: false }),
      supabase
        .from("matching_results")
        .select("case_id, score")
        .eq("user_id", user.id),
    ]);

    const casesData = (casesRes.data as Case[]) ?? [];
    setCases(casesData);
    setFiltered(casesData);

    // Build score map
    const scores: Record<string, number> = {};
    (matchRes.data ?? []).forEach((m: { case_id: string; score: number }) => {
      scores[m.case_id] = m.score;
    });
    setMatchScores(scores);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let result = cases;

    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(kw) ||
          c.description?.toLowerCase().includes(kw) ||
          c.must_req?.toLowerCase().includes(kw) ||
          c.industry?.toLowerCase().includes(kw)
      );
    }

    if (category !== "すべて") {
      result = result.filter((c) => c.category === category);
    }

    if (feeMin) {
      const min = parseInt(feeMin);
      result = result.filter((c) => {
        if (!c.fee) return false;
        const nums = c.fee.match(/(\d+)/g);
        if (!nums) return false;
        return nums.some((n) => parseInt(n) >= min);
      });
    }

    if (location) {
      result = result.filter((c) =>
        c.location?.includes(location)
      );
    }

    setFiltered(result);
  }, [cases, keyword, category, feeMin, location]);

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
          CASES
        </p>
        <h1 className="text-xl font-black text-navy">案件検索</h1>
        <p className="text-[12px] text-[#888] mt-1">
          {filtered.length}件の案件
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-border p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              キーワード
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="スキル、業界、タイトル..."
              className="w-full px-3 py-2 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              カテゴリ
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              最低報酬（万円）
            </label>
            <input
              type="number"
              value={feeMin}
              onChange={(e) => setFeeMin(e.target.value)}
              placeholder="例: 100"
              min="0"
              className="w-full px-3 py-2 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              勤務地
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例: 東京"
              className="w-full px-3 py-2 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-border p-8 text-center">
          <p className="text-[13px] text-[#888]">
            条件に一致する案件が見つかりませんでした
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((c) => {
            const score = matchScores[c.id];
            return (
              <Link
                key={c.id}
                href={`/dashboard/cases/${c.id}`}
                className="bg-white border border-border p-5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {c.category && (
                        <span className="text-[10px] text-[#888] border border-border px-1.5 py-0.5">
                          {c.category}
                        </span>
                      )}
                      {score !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 ${
                            score >= 70
                              ? "text-[#10b981] bg-[#ecfdf5]"
                              : score >= 40
                              ? "text-[#f59e0b] bg-[#fffbeb]"
                              : "text-[#888] bg-[#f5f5f5]"
                          }`}
                        >
                          マッチ {score}%
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] font-bold text-navy mb-1">
                      {c.title}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#888]">
                      {c.fee && <span>💰 {c.fee}</span>}
                      {c.location && <span>📍 {c.location}</span>}
                      {c.occupancy && <span>⏱ {c.occupancy}</span>}
                      {c.industry && <span>🏢 {c.industry}</span>}
                    </div>
                  </div>
                  <span className="text-[12px] text-blue font-bold shrink-0">
                    詳細 →
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
