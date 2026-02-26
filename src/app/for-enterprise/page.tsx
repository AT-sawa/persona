import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "企業向けサービス | フリーコンサル人材のご紹介",
  description:
    "コンサルファーム出身のフリーランスコンサルタントを貴社プロジェクトにマッチング。戦略・DX推進・PMO・SAP導入支援など幅広い領域に対応。",
  openGraph: {
    title: "企業向けサービス | PERSONA",
    description:
      "即戦力のフリーランスコンサルタントを最短1週間でアサイン。大手ファーム出身者のみを厳選してご紹介します。",
  },
};

export default function ForEnterprisePage() {
  return (
    <>
      <Header />
      <main className="py-[72px] px-6">
        <div className="max-w-[800px] mx-auto">
          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
            FOR ENTERPRISE
          </p>
          <h1 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35] mb-1.5">
            企業のお客様へ
          </h1>
          <div className="w-9 h-[3px] bg-blue mt-3 mb-8" />
          <p className="text-sm leading-[1.9] text-[#555] mb-6">
            PERSONAでは、コンサルティングファーム出身のフリーランスコンサルタントを御社のプロジェクトにマッチングいたします。戦略策定からDX推進、PMO、SAP導入支援まで幅広いカテゴリに対応しています。
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                title: "即戦力のプロフェッショナル",
                desc: "大手コンサルファーム出身者のみを厳選。プロジェクト開始後すぐに成果を出します。",
              },
              {
                title: "柔軟な契約形態",
                desc: "月単位での契約が可能。プロジェクトの規模や期間に合わせた最適なアサインを実現します。",
              },
              {
                title: "専門コーディネーター",
                desc: "ファーム出身のコーディネーターが御社の課題を深く理解し、最適な人材をご提案します。",
              },
            ].map((item) => (
              <div key={item.title} className="p-6 border border-border">
                <h3 className="text-sm font-bold text-navy mb-2">
                  {item.title}
                </h3>
                <p className="text-[13px] text-[#555] leading-[1.8]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Flow section */}
          <div className="mb-10">
            <h2 className="text-lg font-black text-navy mb-5">
              ご利用の流れ
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  step: "01",
                  title: "お問い合わせ",
                  desc: "下記フォームまたはお電話にてご連絡ください",
                },
                {
                  step: "02",
                  title: "ヒアリング",
                  desc: "プロジェクト内容・求めるスキルを詳しくお伺いします",
                },
                {
                  step: "03",
                  title: "人材ご提案",
                  desc: "最適なコンサルタントを厳選してご紹介します",
                },
                {
                  step: "04",
                  title: "参画開始",
                  desc: "契約後、最短1週間で稼働を開始します",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-5 bg-[#f8fbfe] border border-border"
                >
                  <span className="text-[22px] font-black text-blue/30 block mb-1">
                    {item.step}
                  </span>
                  <h3 className="text-[13px] font-bold text-navy mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-[12px] text-[#888] leading-[1.7]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <ContactForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
