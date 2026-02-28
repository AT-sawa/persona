import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-noto-serif-jp",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://persona-consultant.com"),
  title: {
    default: "フリーコンサル案件紹介サービスPERSONA（ペルソナ）",
    template: "%s | PERSONA（ペルソナ）",
  },
  description:
    "コンサルティングファーム出身者のためのフリーコンサル案件紹介プラットフォーム。登録者1,200人、提携エージェント30社以上、案件常時100件以上。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "PERSONA（ペルソナ）",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "PERSONA フリーコンサル案件紹介サービス" }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* Resource hints for critical third-party origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://urikwrakbafnsllimcbl.supabase.co" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body
        className={`${notoSansJP.variable} ${notoSerifJP.variable} antialiased`}
        style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
      >
        <GoogleAnalytics />
        {children}
        {/* Organization JSON-LD — global entity for AI/search engines + GEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "PERSONA（ペルソナ）",
              alternateName: ["PERSONA", "ペルソナ"],
              url: "https://persona-consultant.com",
              logo: "https://persona-consultant.com/images/persona_logo_hero.png",
              description:
                "コンサルティングファーム出身者のためのフリーコンサル案件紹介プラットフォーム。提携エージェント30社以上、案件常時100件以上。McKinsey・BCG・Deloitte・PwC・Accenture等の出身者1,200名以上が登録。",
              foundingDate: "2026",
              areaServed: { "@type": "Country", name: "JP" },
              serviceType: "フリーコンサルタント案件紹介",
              knowsAbout: [
                "経営コンサルティング",
                "DXコンサルティング",
                "フリーランスコンサルタント",
                "PMO",
                "SAP導入",
                "業務改革（BPR）",
                "新規事業開発",
                "M&Aアドバイザリー",
              ],
              numberOfEmployees: {
                "@type": "QuantitativeValue",
                value: 1200,
                unitText: "registered consultants",
              },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                availableLanguage: "Japanese",
                url: "https://persona-consultant.com/for-enterprise#contact",
              },
            }),
          }}
        />
        {/* Service JSON-LD — describes the matching service */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              name: "PERSONA フリーコンサル案件マッチング",
              description:
                "AIスキルマッチングを活用し、McKinsey・BCG・Deloitte等の大手ファーム出身フリーコンサルタントと企業プロジェクトを最適にマッチングするサービス。月額100〜250万円の案件を常時100件以上取り扱い。",
              provider: {
                "@type": "Organization",
                name: "PERSONA（ペルソナ）",
                url: "https://persona-consultant.com",
              },
              serviceType: "人材マッチング",
              areaServed: { "@type": "Country", name: "JP" },
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "フリーコンサル案件",
                itemListElement: [
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "戦略コンサルティング案件" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "DX・IT戦略案件" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "PMO・プロジェクト管理案件" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "SAP/ERP導入案件" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "業務改革（BPR）案件" } },
                ],
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
