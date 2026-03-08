export const revalidate = 3600; // ISR: revalidate home page every hour

import { BASE_URL, APP_URL } from "@/lib/constants";
import type { Case } from "@/lib/types";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Ticker from "@/components/Ticker";
import About from "@/components/About";
import Banner from "@/components/Banner";
import CasesSection from "@/components/CasesSection";
import Strengths from "@/components/Strengths";
import Story from "@/components/Story";
import Firms from "@/components/Firms";
import HomeAchievements from "@/components/HomeAchievements";
import HomeFAQ from "@/components/HomeFAQ";
import Register from "@/components/Register";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

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
      .select("id, case_no, title, category, background, description, industry, start_date, extendable, occupancy, fee, work_style, office_days, location, must_req, nice_to_have, flow, status, published_at, created_at, is_active, source, source_url, synced_at, title_normalized, source_hash")
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .limit(6);
    return (data as Case[]) ?? [];
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
    url: BASE_URL,
    description:
      "コンサルティングファーム出身者のためのフリーコンサル案件紹介プラットフォーム。",
    publisher: {
      "@type": "Organization",
      name: "PERSONA（ペルソナ）",
      url: BASE_URL,
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
        url: `${APP_URL}/auth/register`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "プロフィール・スキル設定",
        text: "コンサルティング経験・専門スキル・希望条件（報酬・稼働率・リモート可否）を登録します。職務経歴書（レジュメ）をアップロードすると、スキルが自動で読み取られます。",
        url: `${APP_URL}/onboarding`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "AIマッチングで案件を探す",
        text: "AIがスキル・経験・希望条件をもとに最適な案件を自動マッチング。マッチ度が高い案件はメールでもお知らせします。戦略・DX・PMO・SAP等、月額100〜250万円の案件を常時100件以上掲載。",
        url: `${APP_URL}/dashboard/matching`,
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "案件にエントリー",
        text: "気になる案件にワンクリックでエントリー。コーディネーターが面談調整を行い、最短1週間での案件参画が可能です。",
        url: `${BASE_URL}/cases`,
      },
    ],
  };

  return (
    <>
      <Header />
      <Hero />
      <Ticker />
      <ScrollReveal>
        <About />
      </ScrollReveal>
      <ScrollReveal variant="scale">
        <Banner />
      </ScrollReveal>
      <ScrollReveal>
        <CasesSection cases={cases} />
      </ScrollReveal>
      <ScrollReveal>
        <Strengths />
      </ScrollReveal>
      <ScrollReveal variant="left">
        <Story />
      </ScrollReveal>
      <ScrollReveal>
        <Firms />
      </ScrollReveal>
      <ScrollReveal>
        <HomeAchievements />
      </ScrollReveal>
      <ScrollReveal>
        <HomeFAQ />
      </ScrollReveal>
      <ScrollReveal>
        <Register />
      </ScrollReveal>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "ホーム", item: BASE_URL },
            ],
          }),
        }}
      />
    </>
  );
}
