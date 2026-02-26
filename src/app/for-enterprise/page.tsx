import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "企業向けサービス",
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
          <Link
            href="#"
            className="inline-flex items-center gap-2 bg-blue text-white px-8 py-3.5 text-[15px] font-bold transition-colors hover:bg-blue-dark"
          >
            お問い合わせ →
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
