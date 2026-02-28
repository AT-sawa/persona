import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CaseFilters from "@/components/CaseFilters";
import type { Case } from "@/lib/types";
import Link from "next/link";
import { CASE_CATEGORIES } from "@/lib/case-categories";

export const metadata: Metadata = {
  title: "フリーコンサル案件一覧｜募集中・過去案件アーカイブ",
  description:
    "戦略・DX・PMO・SAP等のフリーコンサル案件を常時掲載。高単価（100〜250万円/月）案件をフリーワード・カテゴリ・ステータスで検索できます。過去案件も含めた実績アーカイブ。",
  openGraph: {
    title: "フリーコンサル案件一覧 | PERSONA",
    description:
      "コンサルファーム出身者向けフリーコンサル案件。常時100件以上、月額100〜250万円の高単価案件を掲載中。",
  },
};

// Revalidate every 10 minutes for fresh case data
export const revalidate = 600;

async function getCases(): Promise<Case[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    // Fetch all cases (active + closed) for SEO coverage
    const { data } = await supabase
      .from("cases")
      .select("*")
      .order("is_active", { ascending: false })
      .order("published_at", { ascending: false });
    return (data as Case[]) ?? [];
  } catch {
    return [];
  }
}

export default async function CasesPage() {
  const cases = await getCases();

  // Structured data for SEO (JobPosting collection)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "フリーコンサル案件一覧",
    description:
      "PERSONAが提供するフリーコンサル案件一覧。戦略・DX・PMO・SAP等の高単価案件を掲載。",
    numberOfItems: cases.length,
    itemListElement: cases.slice(0, 30).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://persona-consultant.com/cases/${c.id}`,
      name: c.title,
    })),
  };

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
          <p className="text-sm text-[#555] mt-2 mb-1 leading-[1.8]">
            戦略・DX推進・PMO・SAP導入支援など、コンサルティングファーム出身者向けのフリーコンサル案件を掲載しています。
          </p>
          <div className="w-9 h-[3px] bg-blue mt-3 mb-6" />

          {/* Category navigation */}
          <div className="mb-8">
            <p className="text-[10px] font-bold text-[#888] tracking-[0.14em] uppercase mb-3">
              カテゴリから探す
            </p>
            <div className="flex flex-wrap gap-2">
              {CASE_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/cases/category/${cat.slug}`}
                  className="px-3.5 py-[6px] text-[12px] font-medium text-navy bg-white border border-border hover:border-blue hover:text-blue rounded-full transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Client-side filter/search */}
          <CaseFilters cases={cases} />
        </div>
      </main>
      <Footer />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
