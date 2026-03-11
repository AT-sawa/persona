import type { Metadata } from "next";
import AIDiagnosisLP from "@/components/ai-diagnosis/AIDiagnosisLP";
import { BASE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "AI業務診断｜あなたの部署のAI活用ポテンシャルを無料診断 | PERSONA",
  description:
    "4つの質問に答えるだけで、AIによる業務効率化の可能性を即座に診断。部署別の削減時間・推奨ツール・ワークフロー最適化案を無料でレポート。",
  openGraph: {
    title: "AI業務診断 | PERSONA",
    description:
      "あなたの部署でAIを導入すると、どれだけ業務を効率化できる？4つの質問で無料診断。",
    type: "website",
    url: `${BASE_URL}/ai-diagnosis`,
  },
  alternates: {
    canonical: `${BASE_URL}/ai-diagnosis`,
  },
};

export default function AIDiagnosisPage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "AI業務診断 | PERSONA",
            description:
              "4つの質問に答えるだけで、AIによる業務効率化の可能性を即座に診断。",
            url: `${BASE_URL}/ai-diagnosis`,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
            provider: {
              "@type": "Organization",
              name: "PERSONA",
              url: BASE_URL,
            },
          }),
        }}
      />
      <AIDiagnosisLP />
    </>
  );
}
