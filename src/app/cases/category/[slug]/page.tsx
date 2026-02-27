import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CaseFilters from "@/components/CaseFilters";
import type { Case } from "@/lib/types";
import Link from "next/link";

export const revalidate = 600;

const CATEGORIES: Record<string, { name: string; description: string }> = {
  consul: {
    name: "コンサル",
    description:
      "戦略策定・業務改革・DX推進・PMOなどコンサルティングファーム出身者向けの案件一覧。経営課題の解決を支援するプロジェクトを多数掲載。",
  },
  si: {
    name: "SI",
    description:
      "システムインテグレーション案件一覧。ERP導入・基幹システム構築・クラウド移行など、IT領域のプロジェクトを掲載。",
  },
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES[slug];
  if (!cat) return {};

  return {
    title: `${cat.name}案件一覧｜フリーコンサル案件`,
    description: cat.description,
    openGraph: {
      title: `${cat.name}案件一覧 | PERSONA`,
      description: cat.description,
    },
  };
}

async function getCasesByCategory(categoryName: string): Promise<Case[]> {
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
      .eq("category", categoryName)
      .order("is_active", { ascending: false })
      .order("published_at", { ascending: false });
    return (data as Case[]) ?? [];
  } catch {
    return [];
  }
}

export default async function CategoryArchivePage({ params }: Props) {
  const { slug } = await params;
  const cat = CATEGORIES[slug];
  if (!cat) notFound();

  const cases = await getCasesByCategory(cat.name);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cat.name}案件一覧`,
    description: cat.description,
    numberOfItems: cases.length,
    itemListElement: cases.slice(0, 30).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://persona-consultant.com/cases/${c.id}`,
      name: c.title,
    })),
  };

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
        name: "案件一覧",
        item: "https://persona-consultant.com/cases",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${cat.name}案件`,
        item: `https://persona-consultant.com/cases/category/${slug}`,
      },
    ],
  };

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
            {slug.toUpperCase()} CASES
          </p>
          <h1 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35] mb-1.5">
            {cat.name}
            <em className="not-italic text-blue">案件一覧</em>
          </h1>
          <p className="text-sm text-[#555] mt-2 mb-1 leading-[1.8]">
            {cat.description}
          </p>
          <div className="w-9 h-[3px] bg-blue mt-3 mb-8" />

          <CaseFilters cases={cases} defaultCategory={cat.name} />

          {/* Category navigation */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-[10px] font-bold text-[#888] tracking-[0.18em] uppercase mb-3">
              OTHER CATEGORIES
            </p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(CATEGORIES)
                .filter(([s]) => s !== slug)
                .map(([s, c]) => (
                  <Link
                    key={s}
                    href={`/cases/category/${s}`}
                    className="px-4 py-2 text-[13px] font-bold text-navy bg-white border border-border hover:border-blue hover:text-blue transition-colors"
                  >
                    {c.name}案件一覧
                  </Link>
                ))}
              <Link
                href="/cases"
                className="px-4 py-2 text-[13px] font-bold text-navy bg-white border border-border hover:border-blue hover:text-blue transition-colors"
              >
                すべての案件
              </Link>
            </div>
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
    </>
  );
}
