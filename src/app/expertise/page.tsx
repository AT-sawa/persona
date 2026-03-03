import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { EXPERTISE_AREAS } from "@/lib/expertise-data";
import { BASE_URL } from "@/lib/constants";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "専門領域一覧｜フリーコンサルタントの対応分野",
  description:
    "PERSONAが対応するフリーコンサルタントの専門領域一覧。戦略コンサルティング、DX推進、PMO、SAP/ERP導入、業務改革（BPR）、新規事業開発など幅広い領域で即戦力の人材をご紹介します。",
  openGraph: {
    title: "専門領域一覧 | PERSONA",
    description:
      "戦略・DX・PMO・SAP・BPR・新規事業。大手ファーム出身のフリーコンサルタントを各専門領域でご紹介。",
    url: `${BASE_URL}/expertise`,
  },
  alternates: {
    canonical: `${BASE_URL}/expertise`,
  },
};

const areaIcons: Record<string, { icon: string; gradient: string }> = {
  strategy: { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", gradient: "from-[#091747] to-[#1FABE9]" },
  dx: { icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", gradient: "from-[#1FABE9] to-[#34d399]" },
  pmo: { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", gradient: "from-[#6366f1] to-[#1FABE9]" },
  sap: { icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4", gradient: "from-[#091747] to-[#6366f1]" },
  bpr: { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", gradient: "from-[#1FABE9] to-[#8b5cf6]" },
  "new-business": { icon: "M13 10V3L4 14h7v7l9-11h-7z", gradient: "from-[#f59e0b] to-[#1FABE9]" },
};

export default function ExpertiseIndexPage() {
  const areas = Object.values(EXPERTISE_AREAS);

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
        name: "専門領域",
        item: `${BASE_URL}/expertise`,
      },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "PERSONAの専門領域一覧",
    description:
      "フリーコンサルタントの対応分野。戦略・DX・PMO・SAP・BPR・新規事業開発の各領域で即戦力をご紹介。",
    url: `${BASE_URL}/expertise`,
    provider: {
      "@type": "Organization",
      name: "PERSONA（ペルソナ）",
      url: BASE_URL,
    },
    hasPart: areas.map((area) => ({
      "@type": "Service",
      name: area.name,
      url: `${BASE_URL}/expertise/${area.slug}`,
      description: area.metaDescription,
    })),
  };

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#091747] py-20 px-6">
          <Image
            src="/images/digital_flow.jpg"
            alt=""
            fill
            className="object-cover opacity-20"
            sizes="100vw"
            priority
          />
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
              <span className="text-white/70">専門領域</span>
            </nav>

            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
              <span className="text-[11px] font-semibold text-white/80 tracking-wide">
                EXPERTISE
              </span>
            </div>
            <h1 className="text-[clamp(28px,4vw,44px)] font-black text-white leading-[1.3] mb-5">
              PERSONAの
              <span
                className="bg-gradient-to-r from-[#1FABE9] to-[#34d399] bg-clip-text"
                style={{ WebkitTextFillColor: "transparent" }}
              >
                専門領域
              </span>
            </h1>
            <p className="text-[15px] leading-[1.9] text-white/60 max-w-[600px]">
              大手コンサルティングファーム出身のフリーランスコンサルタントが、各専門領域で即戦力として御社のプロジェクトを支援します。
            </p>
          </div>
        </section>

        {/* Areas Grid */}
        <section className="py-20 px-6 bg-[#f2f2f7]">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                SERVICE AREAS
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                対応領域
              </h2>
              <p className="text-[13px] text-[#888] mt-3">
                各領域の詳細ページでは、対応可能な案件例やPERSONAの強みをご覧いただけます
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {areas.map((area) => {
                const iconData = areaIcons[area.slug];
                return (
                  <Link
                    key={area.slug}
                    href={`/expertise/${area.slug}`}
                    className="group bg-white rounded-2xl border border-[#e8e8ed] p-7 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${iconData.gradient} flex items-center justify-center mb-4`}
                    >
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={iconData.icon}
                        />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-[#1FABE9]/60 tracking-[0.15em] uppercase">
                      {area.nameEn}
                    </span>
                    <h3 className="text-[15px] font-bold text-[#091747] mt-1.5 mb-2 group-hover:text-[#1FABE9] transition-colors">
                      {area.name}
                    </h3>
                    <p className="text-[12.5px] text-[#888] leading-[1.7] mb-4">
                      {area.tagline}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1FABE9] group-hover:gap-2 transition-all">
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
              各専門領域でプロフェッショナルをお探しの企業様へ
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
    </>
  );
}
