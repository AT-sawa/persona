import type { Metadata } from "next";
import "./assessment.css";
import AssessmentLP from "./AssessmentLP";
import { BASE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "AI導入効果アセスメント｜業務×AIで削減効果を可視化 | PERSONA",
  description:
    "業務プロセス分析×AI×ファーム出身コンサルの伴走で、AI導入効果を定量的にアセスメント。1部署125万円〜、最短2週間。Before/After・ROI試算・推奨ツール・実装ロードマップを納品。",
  keywords: [
    "AI導入効果",
    "AIアセスメント",
    "AI導入診断",
    "業務効率化",
    "DX推進",
    "業務自動化",
    "AI活用",
    "フリーコンサル",
  ],
  openGraph: {
    title: "AI導入効果アセスメント｜業務×AIで削減効果を可視化 | PERSONA",
    description:
      "業務プロセス分析×AI×ファーム出身コンサルの伴走で、AI導入効果を定量的にアセスメント。1部署125万円〜。",
    type: "website",
    url: `${BASE_URL}/services/assessment`,
    locale: "ja_JP",
    siteName: "PERSONA（ペルソナ）",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "PERSONA AI導入効果アセスメント",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI導入効果アセスメント | PERSONA",
    description:
      "業務プロセス分析×AI×ファーム出身コンサルの伴走で、導入効果を定量的にアセスメント",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: `${BASE_URL}/services/assessment`,
  },
};

/* JSON-LD: Service schema */
const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "AI導入効果アセスメント",
  description:
    "業務プロセス分析×AI×ファーム出身コンサルの伴走で、御社のAI導入効果を定量的にアセスメント。業務棚卸シート、Before/After分析、ROI試算、推奨ツール選定、導入ロードマップを納品。",
  provider: {
    "@type": "Organization",
    name: "PERSONA（ペルソナ）",
    url: BASE_URL,
  },
  serviceType: "AI導入コンサルティング",
  areaServed: { "@type": "Country", name: "JP" },
  url: `${BASE_URL}/services/assessment`,
  offers: [
    {
      "@type": "Offer",
      name: "Light — 1部署診断",
      price: "1250000",
      priceCurrency: "JPY",
      description: "対象1部署の業務棚卸・Before/After一覧・推奨ツール＋自動化提案・削減効果試算・簡易ロードマップ",
    },
    {
      "@type": "Offer",
      name: "Standard — 3-5部署診断",
      price: "3750000",
      priceCurrency: "JPY",
      description: "主要部署横断の業務棚卸・部署別Before/After＋フロー図・全社削減効果＋ROI・優先順位マトリクス・12ヶ月ロードマップ・経営層向けプレゼン",
    },
    {
      "@type": "Offer",
      name: "Premium — 全社診断＋PoC",
      price: "7500000",
      priceCurrency: "JPY",
      description: "Standardの全納品物＋Quick Win施策1件のPoC・業務自動化フロー1件構築・PoC効果測定レポート・全社展開計画",
    },
  ],
};

/* JSON-LD: FAQPage schema */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "アセスメントにはどれくらいの期間がかかりますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lightプラン（1部署）で約2週間、Standardプラン（3-5部署）で約1〜1.5ヶ月が目安です。",
      },
    },
    {
      "@type": "Question",
      name: "社員のヒアリングにはどの程度の負荷がかかりますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "1人あたり30〜45分の個別ヒアリングを1回実施します。日常業務への影響は最小限に調整します。",
      },
    },
    {
      "@type": "Question",
      name: "アセスメント後、実装支援も依頼できますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "はい。レポートに「必要な人材像」を明記しており、PERSONAから最適な人材をご紹介します。週1日からの柔軟な稼働でアサイン可能です。",
      },
    },
    {
      "@type": "Question",
      name: "特定のAIツールを推奨されることはありますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ベンダーニュートラルの立場で診断します。御社の環境・予算に最適なツールを客観的に提案します。",
      },
    },
    {
      "@type": "Question",
      name: "まずは1部署だけ試すことはできますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lightプラン（125万円）で1部署からスモールスタート可能です。診断結果を見て、全社展開を判断していただけます。",
      },
    },
  ],
};

/* JSON-LD: BreadcrumbList */
const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "ホーム", item: BASE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "AI導入効果アセスメント",
      item: `${BASE_URL}/services/assessment`,
    },
  ],
};

export default function AssessmentPage() {
  return (
    <>
      <AssessmentLP />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}
