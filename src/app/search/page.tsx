import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import type { Case } from "@/lib/types";
import SearchInput from "./SearchInput";

export const metadata: Metadata = {
  title: "検索",
  description:
    "PERSONAのブログ記事・フリーコンサル案件をキーワードで検索。戦略・DX・PMO・SAPなど、お探しの情報がすぐに見つかります。",
  robots: { index: false },
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

async function searchCases(query: string) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }
  try {
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data } = await supabase
      .from("cases")
      .select("id, title, category, industry, fee, is_active")
      .or(
        `title.ilike.%${query}%,category.ilike.%${query}%,industry.ilike.%${query}%`
      )
      .order("is_active", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(20);
    return (data ?? []) as Pick<
      Case,
      "id" | "title" | "category" | "industry" | "fee" | "is_active"
    >[];
  } catch {
    return [];
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  // Perform search server-side
  let blogResults: ReturnType<typeof getAllPosts> = [];
  let caseResults: Awaited<ReturnType<typeof searchCases>> = [];

  if (query) {
    const lower = query.toLowerCase();
    const allPosts = getAllPosts();
    blogResults = allPosts.filter((post) => {
      const title = (post.title ?? "").toLowerCase();
      const description = (post.description ?? "").toLowerCase();
      const category = (post.category ?? "").toLowerCase();
      return (
        title.includes(lower) ||
        description.includes(lower) ||
        category.includes(lower)
      );
    });

    caseResults = await searchCases(query);
  }

  const totalResults = blogResults.length + caseResults.length;

  return (
    <>
      <Header />
      <main className="pt-[72px] pb-16 min-h-screen">
        {/* Hero header */}
        <div className="bg-gradient-to-b from-[#f0f8ff] to-white px-6 pt-12 pb-10">
          <div className="max-w-[760px] mx-auto">
            <p className="text-[10px] font-bold text-blue tracking-[0.22em] uppercase mb-2">
              SEARCH
            </p>
            <h1 className="text-[clamp(26px,4vw,36px)] font-black text-navy leading-[1.3] mb-4">
              サイト内検索
            </h1>

            {/* Search form */}
            <SearchInput defaultValue={query} />

            {/* Result count */}
            {query && (
              <p className="mt-4 text-[13px] text-[#666]">
                「<span className="font-bold text-navy">{query}</span>
                」の検索結果：
                <span className="font-bold text-blue">{totalResults}</span>件
              </p>
            )}
          </div>
        </div>

        <div className="max-w-[760px] mx-auto px-6">
          {/* No query state */}
          {!query && (
            <div className="text-center py-20">
              <svg
                className="mx-auto mb-4 w-12 h-12 text-[#ccc]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <p className="text-[14px] text-[#888]">
                キーワードを入力して検索してください
              </p>
            </div>
          )}

          {/* No results */}
          {query && totalResults === 0 && (
            <div className="text-center py-20">
              <p className="text-[15px] text-[#888] mb-4">
                「{query}」に一致する結果が見つかりませんでした。
              </p>
              <p className="text-[13px] text-[#aaa] mb-6">
                別のキーワードで検索してみてください。
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["戦略", "DX", "PMO", "SAP", "フリーコンサル"].map((kw) => (
                  <Link
                    key={kw}
                    href={`/search?q=${encodeURIComponent(kw)}`}
                    className="px-3.5 py-[6px] text-[12px] font-medium text-navy bg-white border border-border hover:border-blue hover:text-blue rounded-full transition-colors"
                  >
                    {kw}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Blog results */}
          {blogResults.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-5 mt-2">
                <svg
                  className="w-[18px] h-[18px] text-blue"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
                <h2 className="text-[16px] font-black text-navy">
                  ブログ記事
                </h2>
                <span className="text-[12px] font-bold text-blue bg-[#EBF5FF] px-2 py-0.5 rounded-full">
                  {blogResults.length}件
                </span>
              </div>
              <div className="space-y-0">
                {blogResults.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group block py-4 border-b border-border/60 hover:bg-[#f9fbff] -mx-3 px-3 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {post.category && (
                        <span className="text-[10px] font-bold text-blue bg-[#EBF5FF] px-2 py-0.5 rounded-full">
                          {post.category}
                        </span>
                      )}
                      {post.date && (
                        <time className="text-[11px] text-[#aaa]">
                          {post.date}
                        </time>
                      )}
                    </div>
                    <h3 className="text-[14px] font-bold text-navy leading-[1.65] group-hover:text-blue transition-colors">
                      {post.title}
                    </h3>
                    {post.description && (
                      <p className="text-[12px] text-[#888] leading-[1.7] line-clamp-2 mt-1">
                        {post.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Case results */}
          {caseResults.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-5">
                <svg
                  className="w-[18px] h-[18px] text-blue"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <h2 className="text-[16px] font-black text-navy">案件</h2>
                <span className="text-[12px] font-bold text-blue bg-[#EBF5FF] px-2 py-0.5 rounded-full">
                  {caseResults.length}件
                </span>
              </div>
              <div className="space-y-0">
                {caseResults.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="group block py-4 border-b border-border/60 hover:bg-[#f9fbff] -mx-3 px-3 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {c.is_active ? (
                        <span className="text-[10px] font-bold text-white bg-blue px-2 py-0.5 rounded-full">
                          募集中
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#999] bg-[#f0f0f0] px-2 py-0.5 rounded-full">
                          募集終了
                        </span>
                      )}
                      {c.category && (
                        <span className="text-[10px] font-bold text-[#666] bg-[#f5f5f5] px-2 py-0.5 rounded-full">
                          {c.category}
                        </span>
                      )}
                      {c.industry && (
                        <span className="text-[11px] text-[#aaa]">
                          {c.industry}
                        </span>
                      )}
                    </div>
                    <h3 className="text-[14px] font-bold text-navy leading-[1.65] group-hover:text-blue transition-colors">
                      {c.title}
                    </h3>
                    {c.fee && (
                      <p className="text-[12px] text-[#888] mt-1">{c.fee}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Suggested keywords (shown when there are results) */}
          {query && totalResults > 0 && (
            <div className="pt-8 border-t border-border/40">
              <p className="text-[11px] font-bold text-[#888] tracking-[0.14em] uppercase mb-3">
                他のキーワードで検索
              </p>
              <div className="flex flex-wrap gap-2">
                {["戦略", "DX", "PMO", "SAP", "新規事業", "M&A", "BPR"]
                  .filter((kw) => kw.toLowerCase() !== query.toLowerCase())
                  .map((kw) => (
                    <Link
                      key={kw}
                      href={`/search?q=${encodeURIComponent(kw)}`}
                      className="px-3.5 py-[6px] text-[12px] font-medium text-navy bg-white border border-border hover:border-blue hover:text-blue rounded-full transition-colors"
                    >
                      {kw}
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
