import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CaseFilters from "@/components/CaseFilters";
import type { Case } from "@/lib/types";
import Link from "next/link";
import {
  CASE_CATEGORIES,
  CASE_CATEGORY_SLUGS,
  getCategoryBySlug,
} from "@/lib/case-categories";
import { BASE_URL } from "@/lib/constants";

export const revalidate = 600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CASE_CATEGORY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) return {};

  return {
    title: `${cat.name}のフリーコンサル案件一覧｜PERSONA`,
    description: cat.metaDescription,
    openGraph: {
      title: `${cat.name}案件一覧 | PERSONA（ペルソナ）`,
      description: cat.metaDescription,
    },
  };
}

/**
 * Fetch all cases and filter by keyword matching.
 * Matches against title + description + must_req + industry fields.
 */
async function getCasesByKeywords(keywords: string[]): Promise<Case[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("cases")
      .select("*")
      .order("is_active", { ascending: false })
      .order("published_at", { ascending: false });

    if (!data) return [];

    // Filter cases by keyword matching
    return (data as Case[]).filter((c) => {
      const searchable = [c.title, c.description, c.must_req, c.industry]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return keywords.some((kw) => searchable.includes(kw.toLowerCase()));
    });
  } catch {
    return [];
  }
}

export default async function CategoryArchivePage({ params }: Props) {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) notFound();

  const cases = await getCasesByKeywords(cat.keywords);
  const activeCount = cases.filter((c) => c.is_active).length;

  // ItemList JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: cat.heading,
    description: cat.metaDescription,
    numberOfItems: cases.length,
    itemListElement: cases.slice(0, 30).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE_URL}/cases/${c.id}`,
      name: c.title,
    })),
  };

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ホーム",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "案件一覧",
        item: `${BASE_URL}/cases`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${cat.name}案件`,
        item: `${BASE_URL}/cases/category/${slug}`,
      },
    ],
  };

  // FAQPage JSON-LD for featured snippet potential
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `${cat.name}のフリーコンサル案件は何件ありますか？`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `現在、${cat.name}関連のフリーコンサル案件は${cases.length}件掲載中です。うち${activeCount}件が現在募集中です。PERSONAでは提携エージェント30社以上の案件を一括で検索できます。`,
        },
      },
      {
        "@type": "Question",
        name: `${cat.name}案件の報酬相場はどのくらいですか？`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `PERSONAが扱う${cat.name}案件の報酬レンジは月額100万円〜250万円が中心です。経験やスキルセット、稼働率によって変動します。登録（無料）後に詳細な報酬情報をご確認いただけます。`,
        },
      },
    ],
  };

  // Other categories for internal linking (exclude current)
  const otherCategories = CASE_CATEGORIES.filter((c) => c.slug !== slug);

  return (
    <>
      <Header />
      <main className="py-[72px] px-6 bg-gray-bg min-h-screen">
        <div className="max-w-[1160px] mx-auto">
          {/* Breadcrumbs */}
          <nav
            aria-label="パンくずリスト"
            className="text-xs text-[#888] mb-4 flex items-center gap-1.5"
          >
            <Link href="/" className="hover:text-blue transition-colors">
              ホーム
            </Link>
            <span>/</span>
            <Link href="/cases" className="hover:text-blue transition-colors">
              案件一覧
            </Link>
            <span>/</span>
            <span className="text-navy">{cat.name}</span>
          </nav>

          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
            {cat.label} CASES
          </p>
          <h1 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35] mb-1.5">
            {cat.name}
            <em className="not-italic text-blue">案件一覧</em>
          </h1>
          <p className="text-sm text-[#555] mt-2 mb-1 leading-[1.8] max-w-[720px]">
            {cat.intro}
          </p>

          {/* Stats bar */}
          <div className="flex items-center gap-5 mt-4 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1a8a5c]" />
              <span className="text-[13px] text-[#555]">
                募集中 <span className="font-bold text-navy">{activeCount}</span>件
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ccc]" />
              <span className="text-[13px] text-[#555]">
                全{cases.length}件
              </span>
            </div>
          </div>

          <div className="w-9 h-[3px] bg-blue mt-3 mb-8" />

          {/* Case listing with filters */}
          <CaseFilters cases={cases} />

          {/* Related expertise/industry links */}
          {(cat.relatedExpertise || cat.relatedIndustries) && (
            <div className="mt-10 pt-6 border-t border-border">
              <p className="text-[10px] font-bold text-[#888] tracking-[0.18em] uppercase mb-3">
                RELATED PAGES
              </p>
              <div className="flex flex-wrap gap-2">
                {cat.relatedExpertise?.map((slug) => (
                  <Link
                    key={slug}
                    href={`/expertise/${slug}`}
                    className="px-3 py-1.5 text-[12px] font-medium text-blue bg-blue/[0.06] hover:bg-blue/[0.12] rounded-full transition-colors"
                  >
                    {cat.name}の専門領域ガイド →
                  </Link>
                ))}
                {cat.relatedIndustries?.map((slug) => (
                  <Link
                    key={slug}
                    href={`/industries/${slug}`}
                    className="px-3 py-1.5 text-[12px] font-medium text-blue bg-blue/[0.06] hover:bg-blue/[0.12] rounded-full transition-colors"
                  >
                    業界別案件を見る →
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Other category navigation — key for internal linking */}
          <div className="mt-10 pt-8 border-t border-border">
            <p className="text-[10px] font-bold text-[#888] tracking-[0.18em] uppercase mb-4">
              OTHER CATEGORIES
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {otherCategories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/cases/category/${c.slug}`}
                  className="px-4 py-2.5 text-[13px] font-bold text-navy bg-white border border-border hover:border-blue hover:text-blue transition-colors text-center"
                >
                  {c.name}
                </Link>
              ))}
              <Link
                href="/cases"
                className="px-4 py-2.5 text-[13px] font-bold text-white bg-navy hover:bg-blue transition-colors text-center"
              >
                すべての案件
              </Link>
            </div>
          </div>

          {/* CTA section */}
          <div className="mt-12 bg-white border border-border rounded-2xl p-8 text-center">
            <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
              FREE REGISTRATION
            </p>
            <h2 className="text-[20px] font-black text-navy mb-2">
              {cat.name}案件をお探しですか？
            </h2>
            <p className="text-[13px] text-[#888] leading-[1.8] mb-5 max-w-[480px] mx-auto">
              PERSONAに無料登録すると、非公開案件を含む{cat.name}関連の全案件にアクセスできます。
              AIマッチングで最適な案件をご提案します。
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 bg-blue text-white px-8 py-3.5 text-[15px] font-bold transition-colors hover:bg-blue-dark shadow-[0_4px_14px_rgba(31,171,233,0.3)]"
            >
              無料で登録する
              <span className="material-symbols-rounded" style={{ fontSize: "18px" }}>
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
