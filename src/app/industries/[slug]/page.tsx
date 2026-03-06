import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { INDUSTRY_AREAS, INDUSTRY_SLUGS } from "@/lib/industry-data";
import type { Case } from "@/lib/types";
import { BASE_URL } from "@/lib/constants";
import { getCaseStudiesByIndustry } from "@/lib/case-studies-data";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return INDUSTRY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const industry = INDUSTRY_AREAS[slug];
  if (!industry) return {};

  return {
    title: `${industry.name}｜業界別フリーコンサルタント案件`,
    description: industry.metaDescription,
    openGraph: {
      title: `${industry.name} | PERSONA`,
      description: industry.metaDescription,
      url: `${BASE_URL}/industries/${slug}`,
    },
    alternates: {
      canonical: `${BASE_URL}/industries/${slug}`,
    },
  };
}

async function getMatchingCases(
  industryKeywords: string[],
  caseKeywords: string[]
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

    // Build OR filter: search industry column + title/description
    const orConditions = [
      ...industryKeywords.map((kw) => `industry.ilike.%${kw}%`),
      ...caseKeywords.flatMap((kw) => [
        `title.ilike.%${kw}%`,
        `description.ilike.%${kw}%`,
      ]),
    ];

    const { data } = await supabase
      .from("cases")
      .select("*")
      .or(orConditions.join(","))
      .order("is_active", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(6);

    return (data as Case[]) ?? [];
  } catch {
    return [];
  }
}

async function getCaseCount(
  industryKeywords: string[],
  caseKeywords: string[]
): Promise<number> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return 0;
  }
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const orConditions = [
      ...industryKeywords.map((kw) => `industry.ilike.%${kw}%`),
      ...caseKeywords.flatMap((kw) => [
        `title.ilike.%${kw}%`,
        `description.ilike.%${kw}%`,
      ]),
    ];

    const { count } = await supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .or(orConditions.join(","));

    return count ?? 0;
  } catch {
    return 0;
  }
}

const industryIcons: Record<string, string> = {
  manufacturing: "precision_manufacturing",
  finance: "account_balance",
  retail: "storefront",
  healthcare: "health_and_safety",
  "it-telecom": "cloud_circle",
  energy: "bolt",
};

export default async function IndustryDetailPage({ params }: Props) {
  const { slug } = await params;
  const industry = INDUSTRY_AREAS[slug];
  if (!industry) notFound();

  const [cases, caseCount] = await Promise.all([
    getMatchingCases(industry.keywords, industry.caseKeywords),
    getCaseCount(industry.keywords, industry.caseKeywords),
  ]);

  const relatedCaseStudies = getCaseStudiesByIndustry(slug);

  // JSON-LD: BreadcrumbList
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
        name: "業界別案件",
        item: `${BASE_URL}/industries`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: industry.name,
        item: `${BASE_URL}/industries/${slug}`,
      },
    ],
  };

  // JSON-LD: Service
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${industry.name} - フリーコンサルタント紹介`,
    provider: {
      "@type": "Organization",
      name: "PERSONA（ペルソナ）",
      url: BASE_URL,
    },
    description: industry.metaDescription,
    areaServed: { "@type": "Country", name: "Japan" },
    serviceType: `${industry.name}向けコンサルティング`,
    url: `${BASE_URL}/industries/${slug}`,
  };

  // JSON-LD: FAQPage
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: industry.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  // Other industries for navigation
  const otherIndustries = Object.values(INDUSTRY_AREAS).filter(
    (a) => a.slug !== slug
  );

  return (
    <>
      <Header />
      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-[#091747] py-20 px-6">
          <div className="absolute top-[-120px] right-[-80px] w-[500px] h-[500px] rounded-full bg-[#1FABE9]/15 blur-[120px]" />
          <div className="absolute bottom-[-100px] left-[-60px] w-[400px] h-[400px] rounded-full bg-[#6366f1]/10 blur-[100px]" />
          <div className="relative max-w-[1000px] mx-auto">
            {/* Breadcrumb */}
            <nav
              aria-label="パンくずリスト"
              className="text-xs text-white/40 mb-6 flex items-center gap-1.5"
            >
              <Link
                href="/"
                className="hover:text-white/70 transition-colors"
              >
                ホーム
              </Link>
              <span>/</span>
              <Link
                href="/industries"
                className="hover:text-white/70 transition-colors"
              >
                業界別案件
              </Link>
              <span>/</span>
              <span className="text-white/70">{industry.name}</span>
            </nav>

            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
              <span className="text-[11px] font-semibold text-white/80 tracking-wide">
                {industry.nameEn}
              </span>
            </div>
            <h1 className="text-[clamp(28px,4vw,44px)] font-black text-white leading-[1.3] mb-5">
              <span
                className="bg-gradient-to-r from-[#1FABE9] to-[#34d399] bg-clip-text"
                style={{ WebkitTextFillColor: "transparent" }}
              >
                {industry.name}
              </span>
              <span className="block text-[clamp(16px,2vw,22px)] font-bold text-white/70 mt-2">
                の案件・コンサルタント紹介
              </span>
            </h1>
            <p className="text-[15px] leading-[1.9] text-white/60 mb-8 max-w-[650px]">
              {industry.description}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-4">
              {caseCount > 0 && (
                <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/[0.08]">
                  <span
                    className="text-[26px] font-black bg-gradient-to-r from-[#1FABE9] to-[#34d399] bg-clip-text block leading-none"
                    style={{ WebkitTextFillColor: "transparent" }}
                  >
                    {caseCount}+
                  </span>
                  <span className="text-[11px] text-white/40 mt-1.5 block">
                    関連案件実績
                  </span>
                </div>
              )}
              <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/[0.08]">
                <span
                  className="text-[26px] font-black bg-gradient-to-r from-[#1FABE9] to-[#34d399] bg-clip-text block leading-none"
                  style={{ WebkitTextFillColor: "transparent" }}
                >
                  1,200+
                </span>
                <span className="text-[11px] text-white/40 mt-1.5 block">
                  登録コンサルタント
                </span>
              </div>
              <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/[0.08]">
                <span
                  className="text-[26px] font-black bg-gradient-to-r from-[#1FABE9] to-[#34d399] bg-clip-text block leading-none"
                  style={{ WebkitTextFillColor: "transparent" }}
                >
                  95%
                </span>
                <span className="text-[11px] text-white/40 mt-1.5 block">
                  継続利用率
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Challenges ── */}
        <section className="py-20 px-6 bg-[#f2f2f7]">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                CHALLENGES
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                {industry.name}でよくある課題
              </h2>
              <p className="text-[13px] text-[#888] mt-3">
                {industry.name}に関する以下のような課題をお持ちの企業様をご支援します
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#e8e8ed] p-8 md:p-10">
              <ul className="flex flex-col gap-5">
                {industry.challenges.map((challenge, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1FABE9]/10 to-[#091747]/5 flex items-center justify-center shrink-0 mt-0.5">
                      <svg
                        className="w-4 h-4 text-[#1FABE9]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="m5 13 4 4L19 7"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="text-[14px] text-[#555] leading-[1.8]">
                      {challenge}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Matching Cases ── */}
        <section className="py-20 px-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                CASE EXAMPLES
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                {industry.name}の案件例
              </h2>
              {caseCount > 0 && (
                <p className="text-[13px] text-[#888] mt-3">
                  {industry.name}関連の案件を
                  <span className="font-bold text-[#1FABE9]">
                    {caseCount}件
                  </span>
                  以上掲載中
                </p>
              )}
            </div>

            {cases.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {cases.map((c) => (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="group bg-white rounded-2xl border border-[#e8e8ed] p-6 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {c.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#34d399] bg-[#34d399]/10 rounded-full px-3 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                            募集中
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-[#aaa] bg-[#f2f2f7] rounded-full px-3 py-1">
                            募集終了
                          </span>
                        )}
                        {c.category && (
                          <span className="text-[10px] font-bold text-[#888] bg-[#f2f2f7] rounded-full px-3 py-1">
                            {c.category}
                          </span>
                        )}
                        {c.industry && (
                          <span className="text-[10px] font-bold text-[#1FABE9]/70 bg-[#1FABE9]/10 rounded-full px-3 py-1">
                            {c.industry}
                          </span>
                        )}
                      </div>
                      <h3 className="text-[14px] font-bold text-[#091747] leading-[1.6] mb-2 group-hover:text-[#1FABE9] transition-colors line-clamp-2">
                        {c.title}
                      </h3>
                      {c.background && (
                        <p className="text-[12.5px] text-[#888] leading-[1.7] mb-3 line-clamp-2">
                          {c.background}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-[11px] text-[#aaa]">
                        {c.fee && (
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            {c.fee}
                          </span>
                        )}
                        {c.location && (
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            {c.location}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="text-center mt-8">
                  <Link
                    href="/cases"
                    className="inline-flex items-center gap-2 text-[14px] font-bold text-[#1FABE9] hover:text-[#091747] transition-colors"
                  >
                    すべての案件を見る
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="m9 18 6-6-6-6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center bg-white rounded-2xl border border-[#e8e8ed] p-12">
                <p className="text-[14px] text-[#888] mb-4">
                  現在、{industry.name}の公開案件はありません
                </p>
                <Link
                  href="/cases"
                  className="inline-flex items-center gap-2 text-[14px] font-bold text-[#1FABE9] hover:text-[#091747] transition-colors"
                >
                  すべての案件を見る
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="m9 18 6-6-6-6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── Related Case Studies ── */}
        {relatedCaseStudies.length > 0 && (
          <section className="py-20 px-6 bg-[#f2f2f7]">
            <div className="max-w-[1000px] mx-auto">
              <div className="text-center mb-12">
                <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                  CASE STUDIES
                </span>
                <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                  {industry.name}の導入事例
                </h2>
                <p className="text-[13px] text-[#888] mt-3">
                  {industry.name}でのフリーコンサルタント活用事例をご紹介します
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {relatedCaseStudies.slice(0, 6).map((cs) => (
                  <Link
                    key={cs.slug}
                    href={`/case-studies/${cs.slug}`}
                    className="group bg-white rounded-2xl border border-[#e8e8ed] p-6 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:border-[#1FABE9]/30 transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-bold text-[#1FABE9] bg-[#1FABE9]/10 rounded-full px-3 py-1">
                        {cs.category}
                      </span>
                      <span className="text-[10px] font-bold text-[#888] bg-[#f2f2f7] rounded-full px-3 py-1">
                        {cs.industry}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-bold text-[#091747] leading-[1.5] mb-2 group-hover:text-[#1FABE9] transition-colors">
                      {cs.title}
                    </h3>
                    <p className="text-[12px] text-[#888] leading-[1.7] line-clamp-2 mb-3">
                      {cs.subtitle}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {cs.results.slice(0, 2).map((r) => (
                        <span key={r.metric} className="text-[10px] text-[#555] bg-[#f2f2f7] rounded px-2 py-0.5">
                          <span className="font-bold text-[#091747]">{r.value}</span> {r.metric}
                        </span>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1FABE9]">
                      詳しく見る →
                    </span>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link
                  href="/case-studies"
                  className="inline-flex items-center gap-2 text-[14px] font-bold text-[#1FABE9] hover:text-[#091747] transition-colors"
                >
                  すべての導入事例を見る →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Strengths ── */}
        <section className="py-20 px-6 bg-[#f2f2f7]">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                WHY PERSONA
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                {industry.name}におけるPERSONAの強み
              </h2>
              <p className="text-[13px] text-[#888] mt-3">
                {industry.name}領域でPERSONAが選ばれる理由
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {industry.strengths.map((strength, i) => (
                <div
                  key={i}
                  className="relative bg-white p-7 rounded-2xl border border-[#e8e8ed] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300"
                >
                  <span
                    className="text-[40px] font-black bg-gradient-to-br from-[#1FABE9]/20 to-[#091747]/10 bg-clip-text leading-none"
                    style={{ WebkitTextFillColor: "transparent" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[15px] font-bold text-[#091747] mt-2 mb-3">
                    {strength.title}
                  </h3>
                  <p className="text-[13px] text-[#666] leading-[1.85]">
                    {strength.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-20 px-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                FAQ
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                よくあるご質問
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {industry.faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="rounded-2xl border border-[#e8e8ed] bg-white group"
                >
                  <summary className="p-6 cursor-pointer text-[14px] font-bold text-[#091747] flex justify-between items-center gap-4">
                    <span>{faq.q}</span>
                    <span className="w-6 h-6 rounded-full bg-[#f2f2f7] flex items-center justify-center shrink-0 group-open:bg-[#091747] transition-colors">
                      <svg
                        className="w-3 h-3 text-[#888] group-open:text-white group-open:rotate-180 transition-all"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="m6 9 6 6 6-6"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-6 pb-6 text-[13px] text-[#666] leading-[1.85]">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden bg-[#091747] py-16 px-6 text-center">
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#1FABE9]/10 blur-[100px]" />
          <div className="relative max-w-[800px] mx-auto">
            <h2 className="text-white text-[clamp(18px,2.5vw,24px)] font-black mb-3">
              {industry.name}のプロフェッショナルをお探しですか？
            </h2>
            <p className="text-white/40 text-[13px] mb-6 max-w-[500px] mx-auto leading-[1.8]">
              業界に精通した即戦力コンサルタントを、最短1週間でアサインいたします
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/for-enterprise#contact"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#1FABE9] to-[#34d399] text-white px-8 py-3.5 text-[15px] font-bold rounded-full transition-all hover:shadow-[0_4px_20px_rgba(31,171,233,0.4)] hover:scale-[1.02] active:scale-[0.98]"
              >
                企業様のお問い合わせ
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="m9 18 6-6-6-6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-8 py-3.5 text-[15px] font-bold rounded-full transition-all hover:bg-white/10"
              >
                コンサルタント登録
              </Link>
            </div>
          </div>
        </section>

        {/* ── Other Industries ── */}
        <section className="py-16 px-6 bg-[#f2f2f7]">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-8">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                OTHER INDUSTRIES
              </span>
              <h2 className="text-[clamp(18px,2vw,22px)] font-black text-[#091747] mt-2">
                その他の業界
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {otherIndustries.map((other) => (
                <Link
                  key={other.slug}
                  href={`/industries/${other.slug}`}
                  className="bg-white rounded-2xl border border-[#e8e8ed] p-4 text-center hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-[#1FABE9]/30 transition-all duration-300"
                >
                  <span
                    className="material-symbols-rounded text-[#1FABE9]/50 block mb-1"
                    style={{ fontSize: "20px" }}
                  >
                    {industryIcons[other.slug] || "business"}
                  </span>
                  <span className="text-[10px] font-bold text-[#1FABE9]/50 tracking-[0.12em] uppercase block mb-1">
                    {other.nameEn}
                  </span>
                  <span className="text-[13px] font-bold text-[#091747]">
                    {other.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
