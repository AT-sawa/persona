import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { CASE_STUDIES, CASE_STUDY_SLUGS } from "@/lib/case-studies-data";
import { BASE_URL } from "@/lib/constants";
import { EXPERTISE_AREAS } from "@/lib/expertise-data";
import { INDUSTRY_AREAS } from "@/lib/industry-data";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CASE_STUDY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const study = CASE_STUDIES[slug];
  if (!study) return {};

  return {
    title: `${study.title}｜導入事例 | PERSONA（ペルソナ）`,
    description: study.metaDescription,
    openGraph: {
      title: `${study.title} | PERSONA`,
      description: study.metaDescription,
      url: `${BASE_URL}/case-studies/${slug}`,
    },
    alternates: {
      canonical: `${BASE_URL}/case-studies/${slug}`,
    },
  };
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  "DX推進": { bg: "bg-[#1FABE9]/10", text: "text-[#1FABE9]" },
  "SAP/ERP": { bg: "bg-[#6366f1]/10", text: "text-[#6366f1]" },
  PMO: { bg: "bg-[#091747]/10", text: "text-[#091747]" },
  "新規事業開発": { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]" },
  "業務改革（BPR）": { bg: "bg-[#8b5cf6]/10", text: "text-[#8b5cf6]" },
  "経営戦略": { bg: "bg-[#34d399]/10", text: "text-[#059669]" },
  "M&A/PMI": { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]" },
  "ITシステム": { bg: "bg-[#0ea5e9]/10", text: "text-[#0ea5e9]" },
  "SCM": { bg: "bg-[#14b8a6]/10", text: "text-[#14b8a6]" },
  "人事・組織": { bg: "bg-[#f97316]/10", text: "text-[#f97316]" },
  "マーケティング・CX": { bg: "bg-[#ec4899]/10", text: "text-[#ec4899]" },
};

const resultGradients = [
  "from-[#091747] to-[#1FABE9]",
  "from-[#1FABE9] to-[#34d399]",
  "from-[#6366f1] to-[#1FABE9]",
  "from-[#091747] to-[#6366f1]",
];

export default async function CaseStudyDetailPage({ params }: Props) {
  const { slug } = await params;
  const study = CASE_STUDIES[slug];
  if (!study) notFound();

  const color = categoryColors[study.category] || {
    bg: "bg-[#091747]/10",
    text: "text-[#091747]",
  };

  // Other case studies for navigation
  const otherStudies = Object.values(CASE_STUDIES)
    .filter((s) => s.slug !== slug)
    .slice(0, 3);

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
        name: "導入事例",
        item: `${BASE_URL}/case-studies`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: study.title,
        item: `${BASE_URL}/case-studies/${slug}`,
      },
    ],
  };

  // JSON-LD: Article
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: study.title,
    description: study.metaDescription,
    url: `${BASE_URL}/case-studies/${slug}`,
    publisher: {
      "@type": "Organization",
      name: "PERSONA（ペルソナ）",
      url: BASE_URL,
    },
    keywords: study.keywords.join(", "),
    articleSection: "導入事例",
    inLanguage: "ja",
  };

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
                href="/case-studies"
                className="hover:text-white/70 transition-colors"
              >
                導入事例
              </Link>
              <span>/</span>
              <span className="text-white/70">{study.title}</span>
            </nav>

            {/* Badges */}
            <div className="flex items-center gap-2 mb-6">
              {(() => {
                const expertiseSlug = study.expertiseAreas?.[0];
                const expertiseArea = expertiseSlug ? EXPERTISE_AREAS[expertiseSlug] : null;
                if (expertiseArea) {
                  return (
                    <Link
                      href={`/expertise/${expertiseSlug}`}
                      className={`inline-flex items-center text-[10px] font-bold ${color.bg} ${color.text} rounded-full px-3 py-1 hover:opacity-80 transition-opacity`}
                    >
                      {study.category}
                    </Link>
                  );
                }
                return (
                  <span className={`inline-flex items-center text-[10px] font-bold ${color.bg} ${color.text} rounded-full px-3 py-1`}>
                    {study.category}
                  </span>
                );
              })()}
              {(() => {
                const industrySlug = study.industryAreas?.[0];
                const industryArea = industrySlug ? INDUSTRY_AREAS[industrySlug] : null;
                if (industryArea) {
                  return (
                    <Link
                      href={`/industries/${industrySlug}`}
                      className="text-[10px] font-bold text-white/60 bg-white/10 rounded-full px-3 py-1 hover:bg-white/20 transition-colors"
                    >
                      {study.industry}
                    </Link>
                  );
                }
                return (
                  <span className="text-[10px] font-bold text-white/60 bg-white/10 rounded-full px-3 py-1">
                    {study.industry}
                  </span>
                );
              })()}
            </div>

            <h1 className="text-[clamp(26px,4vw,40px)] font-black text-white leading-[1.3] mb-4">
              {study.title}
            </h1>
            <p className="text-[15px] leading-[1.9] text-white/60 max-w-[650px]">
              {study.subtitle}
            </p>
          </div>
        </section>

        {/* ── Project Overview ── */}
        <section className="py-12 px-6 bg-white border-b border-[#e8e8ed]">
          <div className="max-w-[1000px] mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#091747]/5 to-[#1FABE9]/10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#1FABE9]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider block">
                    期間
                  </span>
                  <span className="text-[14px] font-bold text-[#091747]">
                    {study.duration}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#091747]/5 to-[#1FABE9]/10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#1FABE9]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider block">
                    体制
                  </span>
                  <span className="text-[14px] font-bold text-[#091747]">
                    {study.teamSize}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#091747]/5 to-[#1FABE9]/10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#1FABE9]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 6h.008v.008H6V6Z"
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider block">
                    カテゴリ
                  </span>
                  <span className="text-[14px] font-bold text-[#091747]">
                    {study.category}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Background & Challenge ── */}
        <section className="py-20 px-6 bg-[#f2f2f7]">
          <div className="max-w-[1000px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Background */}
              <div className="bg-white rounded-2xl border border-[#e8e8ed] p-8">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#091747] to-[#1FABE9] flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                      />
                    </svg>
                  </span>
                  <h2 className="text-[18px] font-black text-[#091747]">
                    プロジェクト背景
                  </h2>
                </div>
                <p className="text-[13.5px] text-[#555] leading-[1.9]">
                  {study.background}
                </p>
              </div>

              {/* Challenge */}
              <div className="bg-white rounded-2xl border border-[#e8e8ed] p-8">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                      />
                    </svg>
                  </span>
                  <h2 className="text-[18px] font-black text-[#091747]">
                    課題
                  </h2>
                </div>
                <p className="text-[13.5px] text-[#555] leading-[1.9]">
                  {study.challenge}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Approach ── */}
        <section className="py-20 px-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                APPROACH
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                アプローチ
              </h2>
              <p className="text-[13px] text-[#888] mt-3">
                プロジェクトの推進ステップ
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {study.approach.map((step, i) => {
                const [stepTitle, ...rest] = step.split("：");
                const stepDesc = rest.join("：");
                return (
                  <div
                    key={i}
                    className="relative bg-white rounded-2xl border border-[#e8e8ed] p-7 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300"
                  >
                    <div className="flex items-start gap-5">
                      <span
                        className="text-[32px] font-black bg-gradient-to-br from-[#1FABE9]/30 to-[#091747]/15 bg-clip-text leading-none shrink-0 w-10"
                        style={{ WebkitTextFillColor: "transparent" }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-bold text-[#091747] mb-2">
                          {stepTitle}
                        </h3>
                        {stepDesc && (
                          <p className="text-[13px] text-[#666] leading-[1.85]">
                            {stepDesc}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Results ── */}
        <section className="py-20 px-6 bg-[#f2f2f7]">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                RESULTS
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                成果
              </h2>
              <p className="text-[13px] text-[#888] mt-3">
                プロジェクトで達成した主要な成果指標
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {study.results.map((result, i) => (
                <div
                  key={result.metric}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${resultGradients[i % resultGradients.length]} p-[1px]`}
                >
                  <div className="bg-white rounded-[15px] p-7 h-full">
                    <span className="text-[11px] font-bold text-[#1FABE9] tracking-wider uppercase block mb-2">
                      {result.metric}
                    </span>
                    <span
                      className={`text-[clamp(28px,4vw,36px)] font-black bg-gradient-to-r ${resultGradients[i % resultGradients.length]} bg-clip-text block leading-none mb-3`}
                      style={{ WebkitTextFillColor: "transparent" }}
                    >
                      {result.value}
                    </span>
                    <p className="text-[13px] text-[#666] leading-[1.8]">
                      {result.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Consultant Profile ── */}
        <section className="py-20 px-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                CONSULTANT
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                担当コンサルタント
              </h2>
            </div>

            <div className="max-w-[700px] mx-auto">
              <div className="bg-white rounded-2xl border border-[#e8e8ed] p-8 md:p-10">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  {/* Avatar */}
                  <div className="shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#091747] to-[#1FABE9] flex items-center justify-center">
                      <span className="text-[18px] font-black text-white tracking-wider">
                        {study.consultantProfile.initials}
                      </span>
                    </div>
                  </div>

                  {/* Profile */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-bold text-[#091747] mb-1">
                      コンサルタント {study.consultantProfile.initials}氏
                    </h3>
                    <p className="text-[12.5px] text-[#888] leading-[1.7] mb-4">
                      {study.consultantProfile.background}
                    </p>

                    <div className="mb-4">
                      <span className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider block mb-1.5">
                        実績
                      </span>
                      <p className="text-[13px] text-[#555] leading-[1.7]">
                        {study.consultantProfile.experience}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider block mb-2">
                        専門領域
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {study.consultantProfile.expertise.map((skill) => (
                          <span
                            key={skill}
                            className="text-[11px] font-semibold text-[#1FABE9] bg-[#1FABE9]/8 rounded-full px-3 py-1"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Testimonial */}
              <div className="mt-6 bg-gradient-to-br from-[#091747]/[0.03] to-[#1FABE9]/[0.05] rounded-2xl border border-[#e8e8ed] p-8">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-8 h-8 text-[#1FABE9]/30 shrink-0 mt-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
                  </svg>
                  <div>
                    <p className="text-[14px] text-[#555] leading-[1.9] italic">
                      {study.testimonial}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden bg-[#091747] py-16 px-6 text-center">
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#1FABE9]/10 blur-[100px]" />
          <div className="relative max-w-[800px] mx-auto">
            <h2 className="text-white text-[clamp(18px,2.5vw,24px)] font-black mb-3">
              同様のプロジェクトをお考えですか？
            </h2>
            <p className="text-white/40 text-[13px] mb-6 max-w-[500px] mx-auto leading-[1.8]">
              {study.category}領域の経験豊富なコンサルタントを、最短1週間でアサインいたします
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

        {/* ── Other Case Studies ── */}
        <section className="py-16 px-6 bg-[#f2f2f7]">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-8">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                OTHER CASES
              </span>
              <h2 className="text-[clamp(18px,2vw,22px)] font-black text-[#091747] mt-2">
                その他の導入事例
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {otherStudies.map((other) => {
                const otherColor = categoryColors[other.category] || {
                  bg: "bg-[#091747]/10",
                  text: "text-[#091747]",
                };
                return (
                  <Link
                    key={other.slug}
                    href={`/case-studies/${other.slug}`}
                    className="group bg-white rounded-2xl border border-[#e8e8ed] p-6 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:border-[#1FABE9]/30 transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`inline-flex items-center text-[10px] font-bold ${otherColor.bg} ${otherColor.text} rounded-full px-2.5 py-0.5`}
                      >
                        {other.category}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-bold text-[#091747] leading-[1.5] mb-2 group-hover:text-[#1FABE9] transition-colors">
                      {other.title}
                    </h3>
                    <p className="text-[12px] text-[#888] leading-[1.7] line-clamp-2 mb-3">
                      {other.subtitle}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1FABE9]">
                      詳しく見る
                      <svg
                        className="w-3 h-3"
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
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/case-studies"
                className="inline-flex items-center gap-2 text-[14px] font-bold text-[#1FABE9] hover:text-[#091747] transition-colors"
              >
                すべての導入事例を見る
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
    </>
  );
}
