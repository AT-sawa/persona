import type { Metadata } from "next";
import "./assessment.css";
import AssessmentLP from "./AssessmentLP";

export const metadata: Metadata = {
  title: "AI導入効果アセスメント | PERSONA",
  description:
    "業務プロセス分析×AI×ファーム出身コンサルの伴走で、導入効果を定量的にアセスメント",
  openGraph: {
    title: "AI導入効果アセスメント | PERSONA",
    description:
      "業務プロセス分析×AI×ファーム出身コンサルの伴走で、導入効果を定量的にアセスメント",
    type: "website",
    url: "https://persona-consultant.com/services/assessment/",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI導入効果アセスメント | PERSONA",
    description:
      "業務プロセス分析×AI×ファーム出身コンサルの伴走で、導入効果を定量的にアセスメント",
  },
};

export default function AssessmentPage() {
  return <AssessmentLP />;
}
