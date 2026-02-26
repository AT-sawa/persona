import { getAllPosts } from "@/lib/blog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ブログ",
  description:
    "フリーコンサルタントのキャリア、案件獲得のコツ、DXトレンドなど実務に役立つ情報を発信。PERSONA公式ブログ。",
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <Header />
      <main className="py-[72px] px-6">
        <div className="max-w-[800px] mx-auto">
          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
            BLOG
          </p>
          <h1 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35] mb-1.5">
            ブログ
          </h1>
          <div className="w-9 h-[3px] bg-blue mt-3 mb-8" />

          {posts.length === 0 ? (
            <p className="text-sm text-[#888]">記事がまだありません。</p>
          ) : (
            <div className="flex flex-col gap-6">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block p-6 border border-border transition-colors hover:bg-[#f0f8ff]"
                >
                  <p className="text-xs text-[#888] mb-1">{post.date}</p>
                  <h2 className="text-lg font-bold text-navy">{post.title}</h2>
                  {post.description && (
                    <p className="text-sm text-[#555] mt-2 leading-[1.8]">
                      {post.description}
                    </p>
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
