import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { CASE_STUDIES } from "@/lib/case-studies-data";

const BASE_URL = "https://persona-consultant.com";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "導入事例 | PERSONA（ペルソナ）",
  description:
    "PERSONAを活用したフリーコンサルタント導入事例をご紹介。DX推進、SAP導入、PMO、新規事業開発、業務改革（BPR）、経営戦略策定など、多様なプロジェクトでの成果をご覧いただけます。",
  openGraph: {
    title: "導入事例 | PERSONA（ペルソナ）",
    description:
      "DX推進・SAP導入・PMO・新規事業開発・BPR・経営戦略。大手ファーム出身コンサルタントによるプロジェクト成功事例。",
    url: `${BASE_URL}/case-studies`,
  },
  alternates: {
    canonical: `${BASE_URL}/case-studies`,
  },
};

const categoryColors: Record<string, { bg: string; text: string }> = {
  "DX推進": { bg: "bg-[#1FABE9]/10", text: "text-[#1FABE9]" },
  "SAP/ERP": { bg: "bg-[#6366f1]/10", text: "text-[#6366f1]" },
  PMO: { bg: "bg-[#091747]/10", text: "text-[#091747]" },
  "新規事業開発": { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]" },
  "業務改革（BPR）": { bg: "bg-[#8b5cf6]/10", text: "text-[#8b5cf6]" },
  "経営戦略": { bg: "bg-[#34d399]/10", text: "text-[#059669]" },
};

export default function CaseStudiesPage() {
  const studies = Object.values(CASE_STUDIES);

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
    ],
  };

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#091747] py-20 px-6">
          <div className="absolute top-[-120px] right-[-80px] w-[500px] h-[500px] rounded-full bg-[#1FABE9]/15 blur-[120px]" />
          <div className="absolute bottom-[-100px] left-[-60px] w-[400px] h-[400px] rounded-full bg-[#6366f1]/10 blur-[100px]" />
          <div className="relative max-w-[1000px] mx-auto">
            {/* Breadcrumb */}
            <nav
              aria-label="パンくずリスト"
              className="text-xs text-white/40 mb-6 flex items-center gap-1.5"
            >
              <Link href="/" className="hover:text-white/70 transition-colors">
                ホーム
              </Link>
              <span>/</span>
              <span className="text-white/70">導入事例</span>
            </nav>

            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
              <span className="text-[11px] font-semibold text-white/80 tracking-wide">
                CASE STUDIES
              </span>
            </div>
            <h1 className="text-[clamp(28px,4vw,44px)] font-black text-white leading-[1.3] mb-5">
              <span
                className="bg-gradient-to-r from-[#1FABE9] to-[#34d399] bg-clip-text"
                style={{ WebkitTextFillColor: "transparent" }}
              >
                導入事例
              </span>
            </h1>
            <p className="text-[15px] leading-[1.9] text-white/60 max-w-[650px]">
              大手コンサルティングファーム出身のフリーランスコンサルタントが、さまざまな業界・領域のプロジェクトで成果を創出しています。匿名化された事例を通じて、PERSONAの価値をご確認ください。
            </p>
          </div>
        </section>

        {/* Case Studies Grid */}
        <section className="py-20 px-6 bg-[#f2f2f7]">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                SUCCESS STORIES
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                プロジェクト成功事例
              </h2>
              <p className="text-[13px] text-[#888] mt-3">
                多様な業界・領域でのフリーコンサルタント活用事例をご紹介します
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {studies.map((study) => {
                const color = categoryColors[study.category] || {
                  bg: "bg-[#091747]/10",
                  text: "text-[#091747]",
                };
                return (
                  <Link
                    key={study.slug}
                    href={`/case-studies/${study.slug}`}
                    className="group bg-white rounded-2xl border border-[#e8e8ed] p-7 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col"
                  >
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className={`inline-flex items-center text-[10px] font-bold ${color.bg} ${color.text} rounded-full px-3 py-1`}
                      >
                        {study.category}
                      </span>
                      <span className="text-[10px] font-bold text-[#888] bg-[#f2f2f7] rounded-full px-3 py-1">
                        {study.industry}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-[15px] font-bold text-[#091747] leading-[1.5] mb-2 group-hover:text-[#1FABE9] transition-colors">
                      {study.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-[12.5px] text-[#888] leading-[1.7] mb-5 line-clamp-3 flex-1">
                      {study.summary}
                    </p>

                    {/* Key results preview */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {study.results.slice(0, 2).map((result) => (
                        <span
                          key={result.metric}
                          className="inline-flex items-center gap-1.5 text-[11px] text-[#555] bg-[#f2f2f7] rounded-lg px-2.5 py-1"
                        >
                          <span className="font-bold text-[#091747]">
                            {result.value}
                          </span>
                          <span className="text-[#aaa]">|</span>
                          <span>{result.metric}</span>
                        </span>
                      ))}
                    </div>

                    {/* Link */}
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1FABE9] group-hover:gap-2 transition-all mt-auto">
                      詳しく見る
                      <svg
                        className="w-3.5 h-3.5"
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
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-[#091747] py-16 px-6 text-center">
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#1FABE9]/10 blur-[100px]" />
          <div className="relative max-w-[800px] mx-auto">
            <p className="text-white/50 text-[13px] mb-3">
              プロジェクトへのフリーコンサルタント導入をお考えの企業様へ
            </p>
            <h2 className="text-white text-[clamp(18px,2.5vw,24px)] font-black mb-3">
              まずはお気軽にご相談ください
            </h2>
            <p className="text-white/40 text-[13px] mb-6 max-w-[500px] mx-auto leading-[1.8]">
              プロジェクトの内容に合わせて、最適なコンサルタントをご紹介いたします
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
      </main>
      <Footer />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}
