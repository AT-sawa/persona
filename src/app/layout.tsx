import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
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
      <body
        className={`${notoSansJP.variable} ${notoSerifJP.variable} antialiased`}
        style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
      >
        {children}
        {/* Organization JSON-LD — global entity for AI/search engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "PERSONA（ペルソナ）",
              url: "https://persona-consultant.com",
              logo: "https://persona-consultant.com/images/persona_logo_hero.png",
              description:
                "コンサルティングファーム出身者のためのフリーコンサル案件紹介プラットフォーム。提携エージェント30社以上、案件常時100件以上。",
              areaServed: { "@type": "Country", name: "JP" },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                availableLanguage: "Japanese",
                url: "https://persona-consultant.com/for-enterprise#contact",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
