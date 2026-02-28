import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EntryForm from "@/components/EntryForm";
import type { Case } from "@/lib/types";

// Revalidate every 10 minutes
export const revalidate = 600;

interface Props {
  params: Promise<{ id: string }>;
}

async function getCase(id: string): Promise<Case | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    // Fetch all cases (active + closed) for SEO
    const { data } = await supabase
      .from("cases")
      .select("*")
      .eq("id", id)
      .single();
    return data as Case | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) return {};

  const title = `${c.title} | フリーコンサル案件`;
  const description = [
    c.fee ? `報酬: ${c.fee}` : null,
    c.location ? `場所: ${c.location}` : null,
    c.description?.slice(0, 120),
  ]
    .filter(Boolean)
    .join("。");

  return {
    title,
    description,
    alternates: {
      canonical: `/cases/${id}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const caseData = await getCase(id);

  if (!caseData) {
    notFound();
  }

  // JSON-LD structured data (JobPosting)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: caseData.title,
    description: caseData.description || caseData.background || caseData.title,
    datePosted: caseData.published_at || caseData.created_at,
    hiringOrganization: {
      "@type": "Organization",
      name: "PERSONA（ペルソナ）",
      sameAs: "https://persona-consultant.com",
    },
    jobLocation: caseData.location
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: caseData.location,
            addressCountry: "JP",
          },
        }
      : undefined,
    employmentType: "CONTRACT",
    industry: caseData.industry || "コンサルティング",
    baseSalary: caseData.fee
      ? {
          "@type": "MonetaryAmount",
          currency: "JPY",
          value: {
            "@type": "QuantitativeValue",
            unitText: "MONTH",
          },
        }
      : undefined,
    skills: caseData.must_req,
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
        name: "案件一覧",
        item: "https://persona-consultant.com/cases",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: caseData.title,
        item: `https://persona-consultant.com/cases/${id}`,
      },
    ],
  };

  const rows = [
    { label: "案件番号", value: caseData.case_no },
    { label: "カテゴリ", value: caseData.category },
    { label: "業界", value: caseData.industry },
    { label: "報酬", value: caseData.fee },
    { label: "稼働率", value: caseData.occupancy },
    { label: "参画日", value: caseData.start_date },
    { label: "延長可能性", value: caseData.extendable },
    { label: "出社頻度", value: caseData.office_days },
    { label: "場所", value: caseData.location },
    { label: "商流", value: caseData.flow },
  ];

  const sections = [
    { title: "背景", content: caseData.background },
    { title: "作業内容・ポジション", content: caseData.description },
    { title: "必須スキル", content: caseData.must_req },
    { title: "尚可スキル", content: caseData.nice_to_have },
  ];

  return (
    <>
      <Header />
      <main className="py-[72px] px-6 bg-gray-bg min-h-screen">
        <div className="max-w-[800px] mx-auto">
          {/* Breadcrumbs */}
          <nav
            aria-label="パンくずリスト"
            className="text-[13px] text-[#999] mb-6 flex items-center gap-2"
          >
            <Link href="/" className="hover:text-navy transition-colors">
              ホーム
            </Link>
            <svg className="w-3 h-3 text-[#ccc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="m9 18 6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <Link href="/cases" className="hover:text-navy transition-colors">
              案件一覧
            </Link>
            <svg className="w-3 h-3 text-[#ccc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="m9 18 6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-navy font-medium truncate max-w-[300px]">{caseData.title}</span>
          </nav>

          {/* Hero card */}
          <div className="bg-white rounded-2xl border border-[#e8e8ed] p-8 mb-5">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-[10px] font-bold tracking-[0.12em] uppercase px-3 py-[4px] rounded-full border ${
                  caseData.is_active
                    ? caseData.status === "最注力"
                      ? "text-[#c0392b] border-[#c0392b]/30 bg-[#c0392b]/6"
                      : "text-[#1a8a5c] border-[#1a8a5c]/30 bg-[#1a8a5c]/6"
                    : "text-[#aaa] border-[#ddd] bg-[#f8f8f8]"
                }`}
              >
                {caseData.is_active
                  ? caseData.status === "最注力"
                    ? "PRIORITY"
                    : "OPEN"
                  : "CLOSED"}
              </span>
              {caseData.category && (
                <span className="text-[11px] text-[#999]">{caseData.category}</span>
              )}
            </div>
            <h1 className="text-[22px] font-bold text-navy leading-[1.45] mb-5">
              {caseData.title}
            </h1>

            {/* Key info pills */}
            <div className="flex flex-wrap gap-2">
              {caseData.fee && (
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy bg-[#f2f2f7] px-4 py-2 rounded-full">
                  {caseData.fee}
                </span>
              )}
              {caseData.occupancy && (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-[#555] bg-[#f2f2f7] px-4 py-2 rounded-full">
                  稼働 {typeof caseData.occupancy === "number"
                    ? `${Math.round(Number(caseData.occupancy) * 100)}%`
                    : caseData.occupancy}
                </span>
              )}
              {caseData.location && (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-[#555] bg-[#f2f2f7] px-4 py-2 rounded-full">
                  {caseData.location}
                </span>
              )}
              {caseData.industry && (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-[#555] bg-[#f2f2f7] px-4 py-2 rounded-full">
                  {caseData.industry}
                </span>
              )}
            </div>
          </div>

          {!caseData.is_active && (
            <div className="bg-[#f2f2f7] rounded-2xl p-5 mb-5 text-[13px] text-[#666] leading-[1.7]">
              この案件は募集を終了しています。類似案件をお探しの方は
              <Link href="/cases" className="text-blue font-semibold hover:underline ml-1">
                案件一覧
              </Link>
              をご覧ください。
            </div>
          )}

          {/* Summary table */}
          <div className="bg-white rounded-2xl border border-[#e8e8ed] p-6 mb-5">
            <h2 className="text-[13px] font-semibold text-navy mb-4">案件概要</h2>
            <div className="space-y-0">
              {rows.map(
                (row) =>
                  row.value && (
                    <div key={row.label} className="flex py-3 border-b border-[#f0f0f5] last:border-b-0">
                      <span className="text-[13px] text-[#999] w-[120px] shrink-0">
                        {row.label}
                      </span>
                      <span className="text-[13px] text-navy whitespace-pre-wrap">
                        {row.value}
                      </span>
                    </div>
                  )
              )}
            </div>
          </div>

          {/* Detail sections */}
          {sections.map(
            (s) =>
              s.content && (
                <div
                  key={s.title}
                  className="bg-white rounded-2xl border border-[#e8e8ed] p-6 mb-5"
                >
                  <h2 className="text-[13px] font-semibold text-navy mb-3">
                    {s.title}
                  </h2>
                  <p className="text-[13px] text-[#555] leading-[1.85] whitespace-pre-wrap">
                    {s.content}
                  </p>
                </div>
              )
          )}

          {/* Entry form (client component) — only for active cases */}
          {caseData.is_active && <EntryForm caseId={caseData.id} />}
        </div>
      </main>
      <Footer />

      {/* JSON-LD structured data */}
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
