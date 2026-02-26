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
    </>
  );
}
