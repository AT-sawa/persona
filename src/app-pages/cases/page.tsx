"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Case } from "@/lib/types";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    async function fetchCases() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("cases")
          .select("*")
          .eq("is_active", true)
          .order("published_at", { ascending: false });
        setCases(data ?? []);
      } catch {
        setCases([]);
      } finally {
        setLoading(false);
      }
    }
    fetchCases();
  }, []);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
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
  }, [cases, search, category]);

  return (
    <>
      <Header />
      <main className="py-[72px] px-6 bg-gray-bg min-h-screen">
        <div className="max-w-[1160px] mx-auto">
          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
            CASES
          </p>
          <h1 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35] mb-1.5">
            フリーコンサル<em className="not-italic text-blue">案件一覧</em>
          </h1>
          <div className="w-9 h-[3px] bg-blue mt-3 mb-8" />

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8">
            <input
              type="text"
              placeholder="フリーワード検索（タイトル・スキル）"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[240px] px-4 py-2.5 border border-border text-sm bg-white outline-none focus:border-blue"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2.5 border border-border text-sm bg-white outline-none focus:border-blue"
            >
              <option value="all">すべてのカテゴリ</option>
              <option value="IT">IT</option>
              <option value="非IT">非IT</option>
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-[#888] text-center py-10">
              読み込み中...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[#888] text-center py-10">
              該当する案件がありません。
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="bg-white p-[18px_16px] transition-colors hover:bg-[#f0f8ff] block"
                >
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
                        {c.occupancy}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
