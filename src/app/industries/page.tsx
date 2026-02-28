import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { INDUSTRY_AREAS } from "@/lib/industry-data";

const BASE_URL = "https://persona-consultant.com";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "業界別案件一覧｜フリーコンサルタントの業界別対応実績",
  description:
    "PERSONAが対応するフリーコンサルタントの業界別案件一覧。製造業、金融・保険、流通・小売、ヘルスケア・製薬、IT・通信、エネルギー・インフラなど幅広い業界で即戦力の人材をご紹介します。",
  openGraph: {
    title: "業界別案件一覧 | PERSONA",
    description:
      "製造業・金融・小売・ヘルスケア・IT・エネルギー。各業界に精通したフリーコンサルタントをご紹介。",
    url: `${BASE_URL}/industries`,
  },
  alternates: {
    canonical: `${BASE_URL}/industries`,
  },
};

const industryIcons: Record<string, { icon: string; gradient: string }> = {
  manufacturing: {
    icon: "precision_manufacturing",
    gradient: "from-[#091747] to-[#1FABE9]",
  },
  finance: {
    icon: "account_balance",
    gradient: "from-[#1FABE9] to-[#34d399]",
  },
  retail: {
    icon: "storefront",
    gradient: "from-[#6366f1] to-[#1FABE9]",
  },
  healthcare: {
    icon: "health_and_safety",
    gradient: "from-[#091747] to-[#6366f1]",
  },
  "it-telecom": {
    icon: "cloud_circle",
    gradient: "from-[#1FABE9] to-[#8b5cf6]",
  },
  energy: {
    icon: "bolt",
    gradient: "from-[#f59e0b] to-[#1FABE9]",
  },
};

export default function IndustriesIndexPage() {
  const industries = Object.values(INDUSTRY_AREAS);

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
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "PERSONAの業界別案件一覧",
    description:
      "フリーコンサルタントの業界別対応実績。製造業・金融・小売・ヘルスケア・IT・エネルギーの各業界で即戦力をご紹介。",
    url: `${BASE_URL}/industries`,
    provider: {
      "@type": "Organization",
      name: "PERSONA（ペルソナ）",
      url: BASE_URL,
    },
    hasPart: industries.map((ind) => ({
      "@type": "Service",
      name: ind.name,
      url: `${BASE_URL}/industries/${ind.slug}`,
      description: ind.metaDescription,
    })),
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
              <span className="text-white/70">業界別案件</span>
            </nav>

            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
              <span className="text-[11px] font-semibold text-white/80 tracking-wide">
                INDUSTRIES
              </span>
            </div>
            <h1 className="text-[clamp(28px,4vw,44px)] font-black text-white leading-[1.3] mb-5">
              PERSONAの
              <span
                className="bg-gradient-to-r from-[#1FABE9] to-[#34d399] bg-clip-text"
                style={{ WebkitTextFillColor: "transparent" }}
              >
                業界別案件
              </span>
            </h1>
            <p className="text-[15px] leading-[1.9] text-white/60 max-w-[600px]">
              各業界に精通したフリーランスコンサルタントが、業界特有の課題を理解し、即戦力として御社のプロジェクトを支援します。
            </p>
          </div>
        </section>

        {/* Industries Grid */}
        <section className="py-20 px-6 bg-[#f2f2f7]">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                INDUSTRY SECTORS
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                対応業界
              </h2>
              <p className="text-[13px] text-[#888] mt-3">
                各業界の詳細ページでは、対応可能な案件例やPERSONAの強みをご覧いただけます
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {industries.map((ind) => {
                const iconData = industryIcons[ind.slug];
                return (
                  <Link
                    key={ind.slug}
                    href={`/industries/${ind.slug}`}
                    className="group bg-white rounded-2xl border border-[#e8e8ed] p-7 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${iconData.gradient} flex items-center justify-center mb-4`}
                    >
                      <span
                        className="material-symbols-rounded text-white"
                        style={{ fontSize: "20px" }}
                      >
                        {iconData.icon}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#1FABE9]/60 tracking-[0.15em] uppercase">
                      {ind.nameEn}
                    </span>
                    <h3 className="text-[15px] font-bold text-[#091747] mt-1.5 mb-2 group-hover:text-[#1FABE9] transition-colors">
                      {ind.name}
                    </h3>
                    <p className="text-[12.5px] text-[#888] leading-[1.7] mb-4">
                      {ind.tagline}
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
              各業界でプロフェッショナルをお探しの企業様へ
            </p>
            <h2 className="text-white text-[clamp(18px,2.5vw,24px)] font-black mb-3">
              まずはお気軽にご相談ください
            </h2>
            <p className="text-white/40 text-[13px] mb-6 max-w-[500px] mx-auto leading-[1.8]">
              業界に精通したコンサルタントを、プロジェクトの内容に合わせてご紹介いたします
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
