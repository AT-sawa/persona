import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import Link from "next/link";
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
      <main>
        {/* ── A. Enterprise Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#f0f7fe] via-white to-[#eaf4fd] py-16 px-6">
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: "linear-gradient(var(--navy) 1px, transparent 1px), linear-gradient(90deg, var(--navy) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />
          <div className="relative max-w-[1000px] mx-auto">
            <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
              FOR ENTERPRISE
            </p>
            <h1 className="text-[clamp(24px,3.5vw,36px)] font-black text-navy leading-[1.35] mb-4">
              即戦力のフリーコンサルタントを
              <br />
              <em className="not-italic text-blue">最短1週間</em>でアサイン
            </h1>
            <p className="text-sm leading-[1.9] text-[#555] mb-8 max-w-[640px]">
              大手コンサルティングファーム出身のフリーランスコンサルタントを、御社のプロジェクトに迅速にマッチング。戦略策定からDX推進、PMO、SAP導入支援まで幅広く対応いたします。
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: "1,200+", label: "登録コンサルタント" },
                { value: "30+", label: "提携エージェント" },
                { value: "100+", label: "常時案件数" },
                { value: "95%", label: "継続利用率" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/80 backdrop-blur-sm border-l-[3px] border-blue px-4 py-3">
                  <span className="text-[22px] font-black text-blue block leading-none">{stat.value}</span>
                  <span className="text-[11px] text-[#888] mt-1 block">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── B. Service Categories ── */}
        <section className="py-14 px-6">
          <div className="max-w-[1000px] mx-auto">
            <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
              SERVICE AREAS
            </p>
            <h2 className="text-lg font-black text-navy mb-6">対応領域</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { icon: "📊", name: "戦略策定", desc: "経営・事業戦略" },
                { icon: "🔄", name: "DX推進", desc: "デジタル変革" },
                { icon: "📋", name: "PMO", desc: "プロジェクト管理" },
                { icon: "💻", name: "SAP導入", desc: "ERP刷新" },
                { icon: "🏗️", name: "業務改革", desc: "BPR・オペ改善" },
                { icon: "📈", name: "新規事業", desc: "事業開発・検証" },
              ].map((cat) => (
                <div key={cat.name} className="text-center p-4 bg-[#f8fbfe] border border-border hover:border-blue/30 transition-colors">
                  <span className="text-2xl block mb-2">{cat.icon}</span>
                  <span className="text-[12px] font-bold text-navy block">{cat.name}</span>
                  <span className="text-[10px] text-[#aaa]">{cat.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── C. 3 Strengths ── */}
        <section className="py-14 px-6 bg-gray-bg">
          <div className="max-w-[1000px] mx-auto">
            <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
              WHY PERSONA
            </p>
            <h2 className="text-lg font-black text-navy mb-6">PERSONAが選ばれる3つの理由</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  num: "01",
                  title: "即戦力のプロフェッショナル",
                  desc: "McKinsey, BCG, Deloitte, PwC, アクセンチュアなど大手コンサルファーム出身者のみを厳選。プロジェクト開始後すぐに成果を出します。",
                },
                {
                  num: "02",
                  title: "柔軟な契約形態",
                  desc: "月単位での契約が可能。稼働率の調整や期間延長にも柔軟に対応。プロジェクトの規模や期間に合わせた最適なアサインを実現します。",
                },
                {
                  num: "03",
                  title: "専門コーディネーター",
                  desc: "ファーム出身のコーディネーターが御社の課題を深く理解し、最適な人材をご提案。ミスマッチを最小限に抑えます。",
                },
              ].map((item) => (
                <div key={item.num} className="p-6 border border-border border-t-[3px] border-t-blue bg-white">
                  <span className="text-[28px] font-black text-blue/15 block mb-2">{item.num}</span>
                  <h3 className="text-sm font-bold text-navy mb-2">{item.title}</h3>
                  <p className="text-[13px] text-[#555] leading-[1.8]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── D. Comparison Table ── */}
        <section className="py-14 px-6">
          <div className="max-w-[1000px] mx-auto">
            <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
              COMPARISON
            </p>
            <h2 className="text-lg font-black text-navy mb-6">
              コンサルファーム vs フリーコンサル（PERSONA）
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border bg-white">
                <thead>
                  <tr className="bg-[#f8fbfe]">
                    <th className="p-4 text-left font-bold text-navy border-b border-border w-[28%]">比較項目</th>
                    <th className="p-4 text-left font-bold text-[#888] border-b border-border w-[36%]">大手コンサルファーム</th>
                    <th className="p-4 text-left font-bold text-blue border-b border-border bg-blue/5 w-[36%]">PERSONA</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { item: "月額コスト", firm: "300〜600万円/人", persona: "100〜250万円/人" },
                    { item: "アサイン速度", firm: "1〜2ヶ月", persona: "最短1週間" },
                    { item: "契約期間", firm: "6ヶ月〜", persona: "1ヶ月〜（柔軟対応）" },
                    { item: "担当者の質", firm: "シニア〜ジュニア混在", persona: "ファーム出身者のみ" },
                    { item: "契約形態", firm: "プロジェクト単位", persona: "人月単位（柔軟）" },
                  ].map((row) => (
                    <tr key={row.item} className="border-b border-border last:border-b-0">
                      <td className="p-4 font-bold text-navy">{row.item}</td>
                      <td className="p-4 text-[#555]">{row.firm}</td>
                      <td className="p-4 text-navy font-semibold bg-blue/5">{row.persona}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── E. Case Studies ── */}
        <section className="py-14 px-6 bg-gray-bg">
          <div className="max-w-[1000px] mx-auto">
            <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
              CASE STUDIES
            </p>
            <h2 className="text-lg font-black text-navy mb-6">導入事例</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  industry: "大手製造業",
                  challenge: "基幹システム刷新に伴うSAP S/4HANA導入プロジェクトのPMO体制が不足",
                  solution: "元アクセンチュアのSAP専門コンサルタントを2名アサイン。要件定義からカットオーバーまで伴走支援",
                  result: "プロジェクト予定通り完了。追加で3名増員のご依頼",
                  period: "6ヶ月（継続中）",
                },
                {
                  industry: "金融機関",
                  challenge: "DX推進部門の立ち上げにあたり、戦略策定と実行支援が必要",
                  solution: "元BCGの戦略コンサルタントをリード役としてアサイン。ロードマップ策定から組織設計まで支援",
                  result: "3ヶ月でDXロードマップ策定完了。実行フェーズも継続支援中",
                  period: "3ヶ月〜",
                },
                {
                  industry: "IT企業",
                  challenge: "M&A後のPMI（統合作業）を推進できる人材が社内に不足",
                  solution: "元PwCのPMI経験豊富なコンサルタントをPMOとしてアサイン",
                  result: "統合プロジェクトを予定通り完了。組織統合・システム統合を並行推進",
                  period: "4ヶ月",
                },
              ].map((cs) => (
                <div key={cs.industry} className="border border-border p-6 bg-white">
                  <span className="text-[10px] font-bold text-blue bg-blue/[0.08] px-2.5 py-1 mb-3 inline-block">
                    {cs.industry}
                  </span>
                  <h3 className="text-[13px] font-bold text-navy mb-2">課題</h3>
                  <p className="text-[13px] text-[#555] leading-[1.8] mb-3">{cs.challenge}</p>
                  <h3 className="text-[13px] font-bold text-navy mb-2">ソリューション</h3>
                  <p className="text-[13px] text-[#555] leading-[1.8] mb-3">{cs.solution}</p>
                  <div className="flex justify-between pt-3 border-t border-border">
                    <div>
                      <span className="text-[10px] text-[#aaa] block">成果</span>
                      <span className="text-[12px] font-bold text-navy">{cs.result}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#aaa] block">期間</span>
                      <span className="text-[12px] font-bold text-blue">{cs.period}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── F. Process Flow ── */}
        <section className="py-14 px-6">
          <div className="max-w-[1000px] mx-auto">
            <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
              PROCESS
            </p>
            <h2 className="text-lg font-black text-navy mb-6">ご利用の流れ</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { step: "01", title: "お問い合わせ", desc: "下記フォームまたはお電話にてご連絡ください" },
                { step: "02", title: "ヒアリング", desc: "プロジェクト内容・求めるスキルを詳しくお伺いします" },
                { step: "03", title: "人材ご提案", desc: "最適なコンサルタントを厳選してご紹介します" },
                { step: "04", title: "参画開始", desc: "契約後、最短1週間で稼働を開始します" },
              ].map((item, i) => (
                <div key={item.step} className="relative p-5 bg-[#f8fbfe] border border-border">
                  <span className="text-[28px] font-black text-blue/20 block mb-1">{item.step}</span>
                  <h3 className="text-[13px] font-bold text-navy mb-1.5">{item.title}</h3>
                  <p className="text-[12px] text-[#888] leading-[1.7]">{item.desc}</p>
                  {i < 3 && (
                    <span className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-blue/30 text-lg font-bold">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── G. FAQ ── */}
        <section className="py-14 px-6 bg-gray-bg">
          <div className="max-w-[1000px] mx-auto">
            <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
              FAQ
            </p>
            <h2 className="text-lg font-black text-navy mb-6">よくあるご質問</h2>
            <div className="flex flex-col gap-3">
              {[
                {
                  q: "どのような人材が登録していますか？",
                  a: "McKinsey、BCG、Deloitte、PwC、アクセンチュアなど大手コンサルティングファーム出身者を中心に、1,200名以上のコンサルタントが登録しています。全員、弊社独自の審査を通過したプロフェッショナルです。",
                },
                {
                  q: "最短どのくらいでアサイン可能ですか？",
                  a: "お問い合わせから最短1週間での稼働開始実績がございます。通常は2〜3週間でのアサインが目安です。緊急のニーズにも可能な限り対応いたします。",
                },
                {
                  q: "契約期間の柔軟性はありますか？",
                  a: "1ヶ月単位での契約が可能です。プロジェクトの進捗に応じた期間延長や、稼働率の変更にも柔軟に対応いたします。",
                },
                {
                  q: "費用体系を教えてください",
                  a: "コンサルタントのスキル・経験に応じた月額報酬制です。大手ファームと比較して、同等以上の品質を40〜60%のコストでご提供いたします。詳細はお問い合わせください。",
                },
                {
                  q: "秘密保持契約（NDA）は締結できますか？",
                  a: "はい。プロジェクト開始前に個別のNDA締結に対応しております。コンサルタント個人とも別途NDAを締結することが可能です。",
                },
              ].map((faq) => (
                <details key={faq.q} className="border border-border bg-white group">
                  <summary className="p-5 cursor-pointer text-sm font-bold text-navy flex justify-between items-center gap-4">
                    <span>{faq.q}</span>
                    <span className="text-blue text-lg shrink-0 group-open:rotate-45 transition-transform duration-200">+</span>
                  </summary>
                  <p className="px-5 pb-5 text-[13px] text-[#555] leading-[1.8]">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── H. CTA + Contact Form ── */}
        <section className="py-14 px-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-8">
              <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
                CONTACT
              </p>
              <h2 className="text-lg font-black text-navy mb-2">お問い合わせ</h2>
              <p className="text-sm text-[#555]">
                プロジェクトへのコンサルタントアサインについてお気軽にご相談ください
              </p>
            </div>
            <div className="max-w-[640px] mx-auto">
              <ContactForm />
            </div>
          </div>
        </section>

        {/* ── I. CTA Banner ── */}
        <section className="bg-navy py-12 px-6 text-center">
          <div className="max-w-[800px] mx-auto">
            <p className="text-white/70 text-sm mb-3">
              フリーランスコンサルタントとして活躍したい方へ
            </p>
            <h2 className="text-white text-xl font-black mb-5">
              コンサルタント登録も受付中
            </h2>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 bg-blue text-white px-8 py-3.5 text-[15px] font-bold transition-colors hover:bg-blue-dark shadow-[0_4px_14px_rgba(31,171,233,0.3)]"
            >
              無料で登録する →
            </Link>
          </div>
        </section>
      </main>
      <Footer />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "PERSONA 企業向けフリーコンサルタント紹介サービス",
            provider: {
              "@type": "Organization",
              name: "PERSONA",
              url: "https://persona-consultant.com",
            },
            description:
              "コンサルファーム出身のフリーランスコンサルタントを企業プロジェクトにマッチング。戦略・DX推進・PMO・SAP導入支援に対応。",
            areaServed: { "@type": "Country", name: "Japan" },
            serviceType: "Consulting Staffing",
          }),
        }}
      />
    </>
  );
}
