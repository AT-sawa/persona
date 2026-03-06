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
import { INDUSTRY_AREAS, INDUSTRY_SLUGS } from "@/lib/industry-data";
import { BASE_URL } from "@/lib/constants";

export const revalidate = 600;

interface Props {
  params: Promise<{ slug: string; industry: string }>;
}

/** Generate all category × industry combinations = 12 × 6 = 72 pages */
export async function generateStaticParams() {
  const params: { slug: string; industry: string }[] = [];
  for (const catSlug of CASE_CATEGORY_SLUGS) {
    for (const indSlug of INDUSTRY_SLUGS) {
      params.push({ slug: catSlug, industry: indSlug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, industry } = await params;
  const cat = getCategoryBySlug(slug);
  const ind = INDUSTRY_AREAS[industry];
  if (!cat || !ind) return {};

  const title = `${ind.name}の${cat.name}フリーコンサル案件｜PERSONA`;
  const description = `${ind.name}業界における${cat.name}のフリーランスコンサルタント案件一覧。${ind.name}×${cat.name}の専門プロジェクトに参画できます。提携エージェント30社以上の案件を一括検索。`;

  return {
    title,
    description,
    openGraph: {
      title: `${ind.name}×${cat.name} 案件一覧 | PERSONA（ペルソナ）`,
      description,
      url: `${BASE_URL}/cases/category/${slug}/${industry}`,
    },
    alternates: {
      canonical: `${BASE_URL}/cases/category/${slug}/${industry}`,
    },
  };
}

/**
 * Fetch cases matching BOTH category keywords AND industry keywords.
 */
async function getCasesByCategoryAndIndustry(
  categoryKeywords: string[],
  industryKeywords: string[]
): Promise<Case[]> {
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

    return (data as Case[]).filter((c) => {
      const searchable = [c.title, c.description, c.must_req, c.background]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const industryField = (c.industry || "").toLowerCase();

      const matchesCategory = categoryKeywords.some(
        (kw) => searchable.includes(kw.toLowerCase())
      );
      const matchesIndustry = industryKeywords.some(
        (kw) =>
          industryField.includes(kw.toLowerCase()) ||
          searchable.includes(kw.toLowerCase())
      );

      return matchesCategory && matchesIndustry;
    });
  } catch {
    return [];
  }
}

export default async function CategoryIndustryArchivePage({ params }: Props) {
  const { slug, industry } = await params;
  const cat = getCategoryBySlug(slug);
  const ind = INDUSTRY_AREAS[industry];
  if (!cat || !ind) notFound();

  const cases = await getCasesByCategoryAndIndustry(
    cat.keywords,
    [...ind.keywords, ...(ind.caseKeywords || [])]
  );
  const activeCount = cases.filter((c) => c.is_active).length;

  // ItemList JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${ind.name}×${cat.name} 案件一覧`,
    description: `${ind.name}業界における${cat.name}関連のフリーコンサルタント案件`,
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
      {
        "@type": "ListItem",
        position: 4,
        name: `${ind.name}`,
        item: `${BASE_URL}/cases/category/${slug}/${industry}`,
      },
    ],
  };

  // FAQPage JSON-LD
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `${ind.name}の${cat.name}フリーコンサル案件は何件ありますか？`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `現在、${ind.name}業界の${cat.name}関連フリーコンサル案件は${cases.length}件掲載中です。うち${activeCount}件が現在募集中です。PERSONAでは提携エージェント30社以上の案件を一括で検索できます。`,
        },
      },
      {
        "@type": "Question",
        name: `${ind.name}の${cat.name}案件の報酬相場はどのくらいですか？`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `PERSONAが扱う${ind.name}×${cat.name}案件の報酬レンジは月額100万円〜250万円が中心です。経験やスキルセット、稼働率によって変動します。登録（無料）後に詳細な報酬情報をご確認いただけます。`,
        },
      },
      {
        "@type": "Question",
        name: `${ind.name}の${cat.name}コンサルタントにはどのような経験が求められますか？`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${ind.name}業界での業務経験や業界知識に加え、${cat.name}領域の専門スキルが求められます。大手コンサルティングファームや${ind.name}企業での実務経験をお持ちの方が多く活躍されています。`,
        },
      },
    ],
  };

  // Same-category other industries
  const otherIndustries = INDUSTRY_SLUGS.filter((s) => s !== industry);

  // Same-industry other categories
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
            <Link
              href={`/cases/category/${slug}`}
              className="hover:text-blue transition-colors"
            >
              {cat.name}
            </Link>
            <span>/</span>
            <span className="text-navy">{ind.name}</span>
          </nav>

          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
            {cat.label} × {ind.nameEn}
          </p>
          <h1 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35] mb-1.5">
            {ind.name}の
            <em className="not-italic text-blue">{cat.name}</em>
            案件一覧
          </h1>
          <p className="text-sm text-[#555] mt-2 mb-1 leading-[1.8] max-w-[720px]">
            {ind.name}業界における{cat.name}領域のフリーランスコンサルタント案件を掲載しています。
            {ind.name}の業界知識と{cat.name}の専門スキルを活かせるプロジェクトが見つかります。
          </p>

          {/* Stats bar */}
          <div className="flex items-center gap-5 mt-4 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1a8a5c]" />
              <span className="text-[13px] text-[#555]">
                募集中{" "}
                <span className="font-bold text-navy">{activeCount}</span>件
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

          {/* Same category, other industries */}
          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-[10px] font-bold text-[#888] tracking-[0.18em] uppercase mb-3">
              {cat.name} × 他の業界
            </p>
            <div className="flex flex-wrap gap-2">
              {otherIndustries.map((indSlug) => (
                <Link
                  key={indSlug}
                  href={`/cases/category/${slug}/${indSlug}`}
                  className="px-3 py-1.5 text-[12px] font-medium text-blue bg-blue/[0.06] hover:bg-blue/[0.12] rounded-full transition-colors"
                >
                  {INDUSTRY_AREAS[indSlug].name} →
                </Link>
              ))}
              <Link
                href={`/cases/category/${slug}`}
                className="px-3 py-1.5 text-[12px] font-medium text-navy bg-[#091747]/[0.06] hover:bg-[#091747]/[0.12] rounded-full transition-colors"
              >
                {cat.name}の全案件 →
              </Link>
            </div>
          </div>

          {/* Same industry, other categories */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-[10px] font-bold text-[#888] tracking-[0.18em] uppercase mb-3">
              {ind.name} × 他のカテゴリ
            </p>
            <div className="flex flex-wrap gap-2">
              {otherCategories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/cases/category/${c.slug}/${industry}`}
                  className="px-3 py-1.5 text-[12px] font-medium text-blue bg-blue/[0.06] hover:bg-blue/[0.12] rounded-full transition-colors"
                >
                  {c.name} →
                </Link>
              ))}
              <Link
                href={`/industries/${industry}`}
                className="px-3 py-1.5 text-[12px] font-medium text-navy bg-[#091747]/[0.06] hover:bg-[#091747]/[0.12] rounded-full transition-colors"
              >
                {ind.name}の業界ガイド →
              </Link>
            </div>
          </div>

          {/* All categories navigation */}
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-[10px] font-bold text-[#888] tracking-[0.18em] uppercase mb-4">
              ALL CATEGORIES
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {CASE_CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/cases/category/${c.slug}`}
                  className={`px-4 py-2.5 text-[13px] font-bold transition-colors text-center ${
                    c.slug === slug
                      ? "text-white bg-blue"
                      : "text-navy bg-white border border-border hover:border-blue hover:text-blue"
                  }`}
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
              {ind.name}×{cat.name}の案件をお探しですか？
            </h2>
            <p className="text-[13px] text-[#888] leading-[1.8] mb-5 max-w-[480px] mx-auto">
              PERSONAに無料登録すると、非公開案件を含む{ind.name}×{cat.name}
              関連の全案件にアクセスできます。AIマッチングで最適な案件をご提案します。
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 bg-blue text-white px-8 py-3.5 text-[15px] font-bold transition-colors hover:bg-blue-dark shadow-[0_4px_14px_rgba(31,171,233,0.3)]"
            >
              無料で登録する
              <span
                className="material-symbols-rounded"
                style={{ fontSize: "18px" }}
              >
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
