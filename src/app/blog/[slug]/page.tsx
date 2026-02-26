import { getPostBySlug, getAllPosts } from "@/lib/blog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: ["PERSONA（ペルソナ）"],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Related posts (same category, exclude current)
  const allPosts = getAllPosts();
  const relatedPosts = allPosts
    .filter(
      (p) =>
        p.slug !== slug &&
        (post.category ? p.category === post.category : true)
    )
    .slice(0, 3);

  // BlogPosting JSON-LD
  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: "PERSONA（ペルソナ）",
      url: "https://persona-consultant.com",
    },
    publisher: {
      "@type": "Organization",
      name: "PERSONA（ペルソナ）",
      url: "https://persona-consultant.com",
      logo: {
        "@type": "ImageObject",
        url: "https://persona-consultant.com/images/persona_logo_hero.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://persona-consultant.com/blog/${slug}`,
    },
    keywords: post.keywords?.join(", ") || post.category || "フリーコンサル",
  };

  // BreadcrumbList JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ホーム",
        item: "https://persona-consultant.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "ブログ",
        item: "https://persona-consultant.com/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://persona-consultant.com/blog/${slug}`,
      },
    ],
  };

  return (
    <>
      <Header />
      <main className="py-[72px] px-6">
        <article className="max-w-[800px] mx-auto">
          {/* Breadcrumbs */}
          <nav
            aria-label="パンくずリスト"
            className="text-xs text-[#888] mb-6 flex items-center gap-1.5"
          >
            <Link href="/" className="hover:text-blue transition-colors">
              ホーム
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-blue transition-colors">
              ブログ
            </Link>
            <span>/</span>
            <span className="text-navy">{post.title}</span>
          </nav>

          <p className="text-xs text-[#888] mb-2">{post.date}</p>
          {post.category && (
            <span className="inline-block text-[10px] font-bold text-blue tracking-[0.1em] uppercase bg-blue/5 px-2 py-0.5 mb-3">
              {post.category}
            </span>
          )}
          <h1 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.4] mb-6">
            {post.title}
          </h1>
          <div
            className="prose prose-sm max-w-none text-[#555] leading-[1.9]"
            dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
          />

          {/* Related content / cross-links */}
          <aside className="mt-12 pt-8 border-t border-border">
            <h2 className="text-lg font-black text-navy mb-4">
              関連コンテンツ
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Link
                href="/cases"
                className="block p-4 border border-border hover:bg-[#f0f8ff] transition-colors"
              >
                <p className="text-[10px] font-bold text-blue tracking-[0.1em] uppercase mb-1">
                  CASES
                </p>
                <p className="text-sm font-bold text-navy">
                  フリーコンサル案件一覧を見る →
                </p>
              </Link>
              <Link
                href="/for-enterprise"
                className="block p-4 border border-border hover:bg-[#f0f8ff] transition-colors"
              >
                <p className="text-[10px] font-bold text-blue tracking-[0.1em] uppercase mb-1">
                  FOR ENTERPRISE
                </p>
                <p className="text-sm font-bold text-navy">
                  企業向けサービスを見る →
                </p>
              </Link>
            </div>

            {relatedPosts.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-navy mb-3">
                  関連記事
                </h3>
                <div className="flex flex-col gap-3">
                  {relatedPosts.map((rp) => (
                    <Link
                      key={rp.slug}
                      href={`/blog/${rp.slug}`}
                      className="block p-4 border border-border hover:bg-[#f0f8ff] transition-colors"
                    >
                      <p className="text-xs text-[#888] mb-0.5">{rp.date}</p>
                      <p className="text-sm font-bold text-navy">{rp.title}</p>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </aside>
        </article>
      </main>
      <Footer />

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}
