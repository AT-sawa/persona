import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    const { data } = await supabase
      .from("cases")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
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
          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
            CASE DETAIL
          </p>
          <h1 className="text-xl font-black text-navy leading-[1.4] mb-6">
            {caseData.title}
          </h1>

          {/* Summary table */}
          <div className="bg-white border border-border p-8 mb-6">
            <table className="w-full text-sm">
              <tbody>
                {rows.map(
                  (row) =>
                    row.value && (
                      <tr key={row.label} className="border-b border-border">
                        <td className="py-3 pr-4 font-bold text-navy w-[140px] align-top">
                          {row.label}
                        </td>
                        <td className="py-3 text-[#555] whitespace-pre-wrap">
                          {row.value}
                        </td>
                      </tr>
                    )
                )}
              </tbody>
            </table>
          </div>

          {/* Detail sections */}
          {sections.map(
            (s) =>
              s.content && (
                <div
                  key={s.title}
                  className="bg-white border border-border p-8 mb-6"
                >
                  <h2 className="text-sm font-bold text-navy mb-3">
                    {s.title}
                  </h2>
                  <p className="text-[13px] text-[#555] leading-[1.85] whitespace-pre-wrap">
                    {s.content}
                  </p>
                </div>
              )
          )}

          {/* Entry form (client component) */}
          <EntryForm caseId={caseData.id} />
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
