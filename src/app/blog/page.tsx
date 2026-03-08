import { getAllPosts } from "@/lib/blog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogCategoryFilter from "@/components/BlogCategoryFilter";
import NewsletterForm from "@/components/NewsletterForm";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "フリーコンサルブログ｜キャリア・案件獲得・業界トレンド",
  description:
    "フリーコンサルタントのキャリア設計、高単価案件の獲得ノウハウ、DX・AI業界トレンドなど実務に役立つ情報を発信。ファーム出身者による現場視点のコラム。PERSONA公式ブログ。",
  alternates: {
    canonical: "/blog",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  キャリア: "bg-[#EBF5FF] text-blue",
  "業界トレンド": "bg-emerald-50 text-emerald-700",
  ノウハウ: "bg-amber-50 text-amber-700",
  "企業向け": "bg-purple-50 text-purple-700",
  "サービス紹介": "bg-red-50 text-[#E15454]",
};

const POSTS_PER_PAGE = 12;

interface PageProps {
  searchParams: Promise<{ category?: string; page?: string }>;
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { category, page: pageStr } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageStr || "1", 10) || 1);
  const allPosts = getAllPosts();
  const categories = Array.from(
    new Set(allPosts.map((p) => p.category).filter(Boolean))
  ) as string[];

  const counts: Record<string, number> = {};
  for (const cat of categories) {
    counts[cat] = allPosts.filter((p) => p.category === cat).length;
  }

  // Filter posts by category if specified
  const filteredPosts = category
    ? allPosts.filter((p) => p.category === category)
    : allPosts;

  // Featured: latest post (only on page 1)
  const featured = currentPage === 1 ? filteredPosts[0] : undefined;
  const afterFeatured = currentPage === 1 ? filteredPosts.slice(1) : filteredPosts;

  // Pagination
  const totalPosts = afterFeatured.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = afterFeatured.slice(startIdx, startIdx + POSTS_PER_PAGE);

  // Build pagination URL helper
  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/blog${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      <Header />
      <main className="pt-[72px] pb-16">
        {/* Hero header */}
        <div className="bg-gradient-to-b from-[#f0f8ff] to-white px-6 pt-12 pb-10">
          <div className="max-w-[1100px] mx-auto">
            <p className="text-[10px] font-bold text-blue tracking-[0.22em] uppercase mb-2">
              BLOG
            </p>
            <h1 className="text-[clamp(26px,4vw,36px)] font-black text-navy leading-[1.3] mb-2">
              {category ? `${category}の記事` : "ブログ"}
            </h1>
            <p className="text-[14px] text-[#666] leading-[1.8] max-w-[520px]">
              フリーコンサルのキャリア設計・案件獲得ノウハウ・
              <br className="hidden sm:block" />
              業界トレンドを現場視点で発信しています。
            </p>
          </div>
        </div>

        <div className="max-w-[1100px] mx-auto px-6">
          {/* Category filter */}
          <Suspense
            fallback={
              <div className="flex flex-wrap gap-2 mb-10 -mt-2">
                <span className="inline-flex items-center text-[11px] font-bold text-navy bg-white border border-border px-3 py-1.5 rounded-full">
                  すべて ({allPosts.length})
                </span>
              </div>
            }
          >
            <BlogCategoryFilter
              categories={categories}
              counts={counts}
              totalCount={allPosts.length}
            />
          </Suspense>

          {/* No results */}
          {filteredPosts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-[15px] text-[#888] mb-4">
                「{category}」カテゴリーの記事はまだありません。
              </p>
              <Link
                href="/blog"
                className="inline-flex items-center text-[13px] font-bold text-blue hover:underline"
              >
                すべての記事を見る
              </Link>
            </div>
          )}

          {/* Featured article (page 1 only) */}
          {featured && (
            <Link
              href={`/blog/${featured.slug}`}
              className="group block mb-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white rounded-2xl border border-border overflow-hidden transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-blue/20">
                {featured.thumbnail && (
                  <div className="relative aspect-[16/9] lg:aspect-auto overflow-hidden bg-[#f5f5f5]">
                    <Image
                      src={featured.thumbnail}
                      alt={featured.title || ""}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 550px"
                      priority
                    />
                  </div>
                )}
                <div className="p-8 lg:p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-2.5 mb-3">
                    {!category && (
                      <span className="text-[10px] font-bold text-white bg-blue px-2.5 py-1 rounded-full tracking-wide">
                        NEW
                      </span>
                    )}
                    {featured.category && (
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          CATEGORY_COLORS[featured.category] ||
                          "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {featured.category}
                      </span>
                    )}
                    <time className="text-[11px] text-[#999]">
                      {featured.date}
                    </time>
                  </div>
                  <h2 className="text-[clamp(18px,2.5vw,24px)] font-black text-navy leading-[1.45] mb-3 group-hover:text-blue transition-colors">
                    {featured.title}
                  </h2>
                  {featured.description && (
                    <p className="text-[13px] text-[#666] leading-[1.8] line-clamp-3 mb-4">
                      {featured.description}
                    </p>
                  )}
                  <span className="inline-flex items-center text-[13px] font-bold text-blue group-hover:underline">
                    記事を読む
                    <svg
                      className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Article grid */}
          {paginatedPosts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block bg-white rounded-xl border border-border overflow-hidden transition-all hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)] hover:border-blue/20 hover:-translate-y-0.5"
                >
                  {post.thumbnail && (
                    <div className="relative aspect-[16/9] overflow-hidden bg-[#f5f5f5]">
                      <Image
                        src={post.thumbnail}
                        alt={post.title || ""}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 370px"
                      />
                      {post.category && (
                        <span
                          className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                            CATEGORY_COLORS[post.category] ||
                            "bg-gray-50 text-gray-700"
                          }`}
                        >
                          {post.category}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="p-5">
                    <time className="text-[11px] text-[#aaa] block mb-2">
                      {post.date}
                    </time>
                    <h2 className="text-[14px] font-bold text-navy leading-[1.65] line-clamp-3 mb-2 group-hover:text-blue transition-colors">
                      {post.title}
                    </h2>
                    {post.description && (
                      <p className="text-[12px] text-[#888] leading-[1.7] line-clamp-2">
                        {post.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="ページネーション"
              className="flex items-center justify-center gap-1.5 mt-12"
            >
              {safePage > 1 && (
                <Link
                  href={pageUrl(safePage - 1)}
                  className="inline-flex items-center justify-center w-9 h-9 text-[13px] text-[#666] bg-white border border-border rounded-lg hover:bg-[#f8f8f8] transition-colors"
                  aria-label="前のページ"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageUrl(p)}
                  className={`inline-flex items-center justify-center w-9 h-9 text-[13px] font-bold rounded-lg transition-colors ${
                    p === safePage
                      ? "bg-blue text-white"
                      : "text-[#666] bg-white border border-border hover:bg-[#f8f8f8]"
                  }`}
                  aria-current={p === safePage ? "page" : undefined}
                >
                  {p}
                </Link>
              ))}
              {safePage < totalPages && (
                <Link
                  href={pageUrl(safePage + 1)}
                  className="inline-flex items-center justify-center w-9 h-9 text-[13px] text-[#666] bg-white border border-border rounded-lg hover:bg-[#f8f8f8] transition-colors"
                  aria-label="次のページ"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </nav>
          )}

          {/* Internal links for SEO */}
          <div className="mt-12 bg-[#f0f8ff] border border-blue/10 rounded-2xl p-6">
            <p className="text-[14px] font-bold text-navy mb-3">
              フリーコンサルタントの案件をお探しですか？
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/cases" className="text-[13px] font-bold text-blue hover:underline">
                フリーコンサル案件一覧 →
              </Link>
              <Link href="/expertise" className="text-[13px] font-bold text-blue hover:underline">
                専門領域から案件を探す →
              </Link>
              <Link href="/industries" className="text-[13px] font-bold text-blue hover:underline">
                業界別の案件を見る →
              </Link>
              <Link href="/auth/register" className="text-[13px] font-bold text-blue hover:underline">
                無料会員登録 →
              </Link>
            </div>
          </div>

          {/* Newsletter */}
          <div className="mt-16">
            <NewsletterForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
