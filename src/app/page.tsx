export const revalidate = 3600; // ISR: revalidate home page every hour

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Ticker from "@/components/Ticker";
import About from "@/components/About";
import Banner from "@/components/Banner";
import CasesSection from "@/components/CasesSection";
import Strengths from "@/components/Strengths";
import Story from "@/components/Story";
import Firms from "@/components/Firms";
import HomeFAQ from "@/components/HomeFAQ";
import Register from "@/components/Register";
import Footer from "@/components/Footer";

async function getCases() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("cases")
      .select("*")
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .limit(6);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const cases = await getCases();

  // WebSite JSON-LD — declares site entity for search engines & AI
  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PERSONA（ペルソナ）",
    url: "https://persona-consultant.com",
    description:
      "コンサルティングファーム出身者のためのフリーコンサル案件紹介プラットフォーム。",
    publisher: {
      "@type": "Organization",
      name: "PERSONA（ペルソナ）",
      url: "https://persona-consultant.com",
    },
  };

  // HowTo JSON-LD — GEO optimization for AI search engines
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "PERSONAでフリーコンサル案件を見つける方法",
    description:
      "PERSONAに登録してフリーコンサルタントとして案件参画するまでの手順を解説します。",
    totalTime: "PT10M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "無料会員登録",
        text: "氏名・メールアドレス・パスワードを入力して会員登録を行います。登録は完全無料で、約1分で完了します。",
        url: "https://app.persona-consultant.com/auth/register",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "プロフィール・スキル設定",
        text: "コンサルティング経験・専門スキル・希望条件（報酬・稼働率・リモート可否）を登録します。職務経歴書（レジュメ）をアップロードすると、スキルが自動で読み取られます。",
        url: "https://app.persona-consultant.com/onboarding",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "AIマッチングで案件を探す",
        text: "AIがスキル・経験・希望条件をもとに最適な案件を自動マッチング。マッチ度が高い案件はメールでもお知らせします。戦略・DX・PMO・SAP等、月額100〜250万円の案件を常時100件以上掲載。",
        url: "https://app.persona-consultant.com/dashboard/matching",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "案件にエントリー",
        text: "気になる案件にワンクリックでエントリー。コーディネーターが面談調整を行い、最短1週間での案件参画が可能です。",
        url: "https://persona-consultant.com/cases",
      },
    ],
  };

  return (
    <>
      <Header />
      <Hero />
      <Ticker />
      <About />
      <Banner />
      <CasesSection cases={cases} />
      <Strengths />
      <Story />
      <Firms />
      <HomeFAQ />
      <Register />
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
    </>
  );
}
