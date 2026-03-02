import { getAllPosts } from "@/lib/blog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ブログ",
  description:
    "フリーコンサルタントのキャリア、案件獲得のコツ、DXトレンドなど実務に役立つ情報を発信。PERSONA公式ブログ。",
  alternates: {
    canonical: "/blog",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  キャリア: "bg-blue/10 text-blue",
  "業界トレンド": "bg-emerald-50 text-emerald-700",
  ノウハウ: "bg-amber-50 text-amber-700",
  "企業向け": "bg-purple-50 text-purple-700",
  "サービス紹介": "bg-red-50 text-[#E15454]",
};

export default function BlogPage() {
  const posts = getAllPosts();

  // Get unique categories
  const categories = Array.from(new Set(posts.map((p) => p.category).filter(Boolean)));

  return (
    <>
      <Header />
      <main className="py-[72px] px-6">
        <div className="max-w-[1000px] mx-auto">
          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
            BLOG
          </p>
          <h1 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35] mb-1.5">
            ブログ
          </h1>
          <p className="text-[13px] text-[#888] mb-2">
            フリーコンサルのキャリア・ノウハウ・業界トレンドを発信
          </p>
          <div className="w-9 h-[3px] bg-blue mt-3 mb-6" />

          {/* Category tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <span
                key={cat}
                className={`inline-block text-[11px] font-bold px-3 py-1 ${
                  CATEGORY_COLORS[cat!] || "bg-gray-50 text-gray-700"
                }`}
              >
                {cat}
                <span className="ml-1 opacity-60">
                  ({posts.filter((p) => p.category === cat).length})
                </span>
              </span>
            ))}
          </div>

          {posts.length === 0 ? (
            <p className="text-sm text-[#888]">記事がまだありません。</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block border border-border transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-blue/30 overflow-hidden"
                >
                  {/* Thumbnail */}
                  {post.thumbnail && (
                    <div className="relative aspect-[16/9] overflow-hidden bg-[#f5f5f5]">
                      <Image
                        src={post.thumbnail}
                        alt={post.title || ""}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <time className="text-[11px] text-[#888]">{post.date}</time>
                      {post.category && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 ${
                            CATEGORY_COLORS[post.category] || "bg-gray-50 text-gray-700"
                          }`}
                        >
                          {post.category}
                        </span>
                      )}
                    </div>
                    <h2 className="text-[14px] font-bold text-navy leading-[1.6] line-clamp-3 group-hover:text-blue transition-colors">
                      {post.title}
                    </h2>
                    {post.description && (
                      <p className="text-[12px] text-[#888] mt-2 leading-[1.7] line-clamp-2">
                        {post.description}
                      </p>
                    )}
                  </div>
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
