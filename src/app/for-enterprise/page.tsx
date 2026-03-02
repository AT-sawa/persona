import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import Link from "next/link";
import Image from "next/image";
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

const enterpriseFaqs = [
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
];

const talentExamples = [
  {
    initials: "KT",
    name: "K.T.",
    background: "McKinsey & Company → 独立",
    experience: "15年",
    expertise: ["経営戦略", "新規事業", "M&A"],
    description:
      "大手総合商社・メガバンク向けの全社戦略策定、新規事業開発を多数リード。M&A後のPMI推進にも精通。",
    color: "from-[#091747] to-[#1FABE9]",
  },
  {
    initials: "MS",
    name: "M.S.",
    background: "Accenture → Deloitte → 独立",
    experience: "12年",
    expertise: ["DX推進", "SAP", "PMO"],
    description:
      "製造業・流通業を中心にSAP S/4HANA導入プロジェクトを10件以上推進。200名規模のPMO統括経験あり。",
    color: "from-[#1FABE9] to-[#34d399]",
  },
  {
    initials: "YH",
    name: "Y.H.",
    background: "BCG → PwC → 独立",
    experience: "10年",
    expertise: ["業務改革", "BPR", "組織設計"],
    description:
      "金融機関・保険会社向けの大規模BPRプロジェクトを複数完遂。業務プロセス可視化から実行支援までワンストップで対応。",
    color: "from-[#6366f1] to-[#1FABE9]",
  },
  {
    initials: "RN",
    name: "R.N.",
    background: "A.T. Kearney → 独立",
    experience: "8年",
    expertise: ["戦略策定", "コスト削減", "調達改革"],
    description:
      "製造業の調達・SCM領域を中心に、年間数十億円規模のコスト削減を実現。グローバル調達戦略の策定にも対応。",
    color: "from-[#091747] to-[#6366f1]",
  },
];

export default function ForEnterprisePage() {
  return (
    <>
      <Header />
      <main>
        {/* ── A. Hero ── */}
        <section className="relative overflow-hidden bg-[#091747] py-24 px-6">
          {/* Background image */}
          <Image
            src="/images/hero_consultant.jpg"
            alt=""
            fill
            className="object-cover opacity-15"
            sizes="100vw"
            priority
          />
          {/* Gradient orbs */}
          <div className="absolute top-[-120px] right-[-80px] w-[500px] h-[500px] rounded-full bg-[#1FABE9]/15 blur-[120px]" />
          <div className="absolute bottom-[-100px] left-[-60px] w-[400px] h-[400px] rounded-full bg-[#6366f1]/10 blur-[100px]" />
          <div className="relative max-w-[1000px] mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
              <span className="text-[11px] font-semibold text-white/80 tracking-wide">
                FOR ENTERPRISE
              </span>
            </div>
            <h1 className="text-[clamp(28px,4vw,44px)] font-black text-white leading-[1.3] mb-5">
              即戦力の
              <span className="bg-gradient-to-r from-[#1FABE9] to-[#34d399] bg-clip-text" style={{ WebkitTextFillColor: "transparent" }}>
                フリーコンサルタント
              </span>
              を
              <br />
              最短1週間でアサイン
            </h1>
            <p className="text-[15px] leading-[1.9] text-white/60 mb-10 max-w-[600px]">
              大手コンサルティングファーム出身のプロフェッショナルを、御社のプロジェクトに迅速にマッチング。戦略策定からDX推進、PMO、SAP導入支援まで幅広く対応いたします。
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: "1,200+", label: "登録コンサルタント" },
                { value: "30+", label: "提携エージェント" },
                { value: "100+", label: "常時案件数" },
                { value: "95%", label: "継続利用率" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/[0.06] backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/[0.08]">
                  <span className="text-[26px] font-black bg-gradient-to-r from-[#1FABE9] to-[#34d399] bg-clip-text block leading-none" style={{ WebkitTextFillColor: "transparent" }}>
                    {stat.value}
                  </span>
                  <span className="text-[11px] text-white/40 mt-1.5 block">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── B. Service Areas ── */}
        <section className="py-20 px-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                SERVICE AREAS
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                対応領域
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { name: "戦略策定", desc: "経営戦略・事業戦略・中期経営計画の策定支援", tag: "Strategy" },
                { name: "DX推進", desc: "デジタル変革のロードマップ策定から実行支援まで", tag: "DX" },
                { name: "PMO", desc: "大規模プロジェクトの横断管理・推進・品質管理", tag: "PMO" },
                { name: "SAP導入", desc: "SAP S/4HANA導入における要件定義〜カットオーバー", tag: "SAP" },
                { name: "業務改革", desc: "BPR・業務プロセス可視化・オペレーション改善", tag: "BPR" },
                { name: "新規事業", desc: "事業開発・市場調査・PoC検証・事業計画策定", tag: "New Biz" },
              ].map((cat) => (
                <div
                  key={cat.name}
                  className="group p-6 rounded-2xl bg-[#f8f9fb] hover:bg-white hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-transparent hover:border-[#e8e8ed] transition-all duration-300"
                >
                  <span className="text-[10px] font-bold text-[#1FABE9]/60 tracking-[0.15em] uppercase">
                    {cat.tag}
                  </span>
                  <h3 className="text-[16px] font-bold text-[#091747] mt-1.5 mb-2">
                    {cat.name}
                  </h3>
                  <p className="text-[12.5px] text-[#888] leading-[1.7]">{cat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Visual Break: Team Image ── */}
        <div className="relative h-[320px] overflow-hidden">
          <Image
            src="/images/team_analytics.jpg"
            alt="プロジェクトチームがデータ分析を行う様子"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#091747]/70 to-[#091747]/40" />
          <div className="relative h-full max-w-[1000px] mx-auto px-6 flex items-center">
            <div>
              <p className="text-white/60 text-[13px] font-bold tracking-wider uppercase mb-2">
                PROFESSIONAL TALENT
              </p>
              <p className="text-white text-[clamp(20px,3vw,30px)] font-black leading-[1.4]">
                大手ファーム出身の<br />プロフェッショナルが多数在籍
              </p>
            </div>
          </div>
        </div>

        {/* ── C. Talent Showcase ── */}
        <section className="py-20 px-6 bg-[#f8f9fb]">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                TALENT
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                紹介する人材例
              </h2>
              <p className="text-[13px] text-[#888] mt-3">
                大手ファーム出身のプロフェッショナルが多数在籍しています
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {talentExamples.map((t) => (
                <div
                  key={t.initials}
                  className="bg-white rounded-2xl border border-[#e8e8ed] p-6 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center shrink-0`}>
                      <span className="text-[13px] font-bold text-white">{t.initials}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-0.5">
                        <span className="text-[15px] font-bold text-[#091747]">{t.name}</span>
                        <span className="text-[11px] text-[#aaa]">経験 {t.experience}</span>
                      </div>
                      <p className="text-[12px] text-[#888]">{t.background}</p>
                    </div>
                  </div>
                  <p className="text-[13px] text-[#555] leading-[1.8] mb-4">
                    {t.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.expertise.map((skill) => (
                      <span
                        key={skill}
                        className="text-[11px] font-medium text-[#1FABE9] bg-[#1FABE9]/8 px-3 py-1 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-[12px] text-[#aaa] mt-6">
              ※ プライバシー保護のため、イニシャル表記としています
            </p>
          </div>
        </section>

        {/* ── D. 3 Strengths ── */}
        <section className="py-20 px-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                WHY PERSONA
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                PERSONAが選ばれる3つの理由
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  num: "01",
                  title: "即戦力のプロフェッショナル",
                  desc: "McKinsey, BCG, Deloitte, PwC, アクセンチュアなど大手コンサルファーム出身者のみを厳選。プロジェクト開始後すぐに成果を出します。",
                  img: "/images/business_meeting.jpg",
                },
                {
                  num: "02",
                  title: "柔軟な契約形態",
                  desc: "月単位での契約が可能。稼働率の調整や期間延長にも柔軟に対応。プロジェクトの規模や期間に合わせた最適なアサインを実現します。",
                  img: "/images/remote_work.jpg",
                },
                {
                  num: "03",
                  title: "専門コーディネーター",
                  desc: "ファーム出身のコーディネーターが御社の課題を深く理解し、最適な人材をご提案。ミスマッチを最小限に抑えます。",
                  img: "/images/team_meeting.jpg",
                },
              ].map((item) => (
                <div key={item.num} className="relative rounded-2xl bg-[#f8f9fb] border border-transparent hover:bg-white hover:border-[#e8e8ed] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300 overflow-hidden">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={item.img}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-7">
                    <span className="text-[40px] font-black bg-gradient-to-br from-[#1FABE9]/20 to-[#091747]/10 bg-clip-text leading-none" style={{ WebkitTextFillColor: "transparent" }}>
                      {item.num}
                    </span>
                    <h3 className="text-[15px] font-bold text-[#091747] mt-2 mb-3">{item.title}</h3>
                    <p className="text-[13px] text-[#666] leading-[1.85]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── E. Comparison ── */}
        <section className="py-20 px-6 bg-[#f8f9fb]">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                COMPARISON
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                コンサルファーム vs PERSONA
              </h2>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#e8e8ed] bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-5 text-left text-[12px] font-bold text-[#888] uppercase tracking-wider border-b border-[#f0f0f5] w-[28%]">
                      比較項目
                    </th>
                    <th className="p-5 text-left text-[12px] font-bold text-[#aaa] uppercase tracking-wider border-b border-[#f0f0f5] w-[36%]">
                      大手ファーム
                    </th>
                    <th className="p-5 text-left text-[12px] font-bold text-[#1FABE9] uppercase tracking-wider border-b border-[#f0f0f5] bg-[#1FABE9]/[0.03] w-[36%]">
                      PERSONA
                    </th>
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
                    <tr key={row.item} className="border-b border-[#f0f0f5] last:border-b-0">
                      <td className="p-5 font-semibold text-[#091747] text-[13px]">{row.item}</td>
                      <td className="p-5 text-[#888] text-[13px]">{row.firm}</td>
                      <td className="p-5 text-[#091747] font-semibold text-[13px] bg-[#1FABE9]/[0.03]">
                        {row.persona}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── F. Case Studies ── */}
        <section className="py-20 px-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                CASE STUDIES
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                導入事例
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                <div key={cs.industry} className="rounded-2xl border border-[#e8e8ed] bg-white p-7 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300">
                  <span className="inline-flex items-center text-[11px] font-bold text-[#1FABE9] bg-[#1FABE9]/8 rounded-full px-3.5 py-1 mb-4">
                    {cs.industry}
                  </span>
                  <div className="mb-4">
                    <h3 className="text-[12px] font-bold text-[#aaa] uppercase tracking-wider mb-1.5">課題</h3>
                    <p className="text-[13px] text-[#555] leading-[1.8]">{cs.challenge}</p>
                  </div>
                  <div className="mb-5">
                    <h3 className="text-[12px] font-bold text-[#aaa] uppercase tracking-wider mb-1.5">ソリューション</h3>
                    <p className="text-[13px] text-[#555] leading-[1.8]">{cs.solution}</p>
                  </div>
                  <div className="flex justify-between pt-4 border-t border-[#f0f0f5]">
                    <div>
                      <span className="text-[10px] text-[#aaa] block mb-0.5">成果</span>
                      <span className="text-[12.5px] font-bold text-[#091747]">{cs.result}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#aaa] block mb-0.5">期間</span>
                      <span className="text-[12.5px] font-bold text-[#1FABE9]">{cs.period}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── G. Process Flow ── */}
        <section className="py-20 px-6 bg-[#f8f9fb]">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                PROCESS
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                ご利用の流れ
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { step: "01", title: "お問い合わせ", desc: "下記フォームまたはお電話にてご連絡ください" },
                { step: "02", title: "ヒアリング", desc: "プロジェクト内容・求めるスキルを詳しくお伺いします" },
                { step: "03", title: "人材ご提案", desc: "最適なコンサルタントを厳選してご紹介します" },
                { step: "04", title: "参画開始", desc: "契約後、最短1週間で稼働を開始します" },
              ].map((item, i) => (
                <div key={item.step} className="relative">
                  <div className="bg-white rounded-2xl border border-[#e8e8ed] p-6 h-full">
                    <span className="text-[32px] font-black bg-gradient-to-br from-[#1FABE9]/20 to-[#091747]/10 bg-clip-text leading-none" style={{ WebkitTextFillColor: "transparent" }}>
                      {item.step}
                    </span>
                    <h3 className="text-[14px] font-bold text-[#091747] mt-2 mb-2">{item.title}</h3>
                    <p className="text-[12px] text-[#888] leading-[1.75]">{item.desc}</p>
                  </div>
                  {i < 3 && (
                    <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-[#f8f9fb] items-center justify-center">
                      <svg className="w-3 h-3 text-[#ccc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="m9 18 6-6-6-6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── H. FAQ ── */}
        <section className="py-20 px-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                FAQ
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2">
                よくあるご質問
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {enterpriseFaqs.map((faq) => (
                <details key={faq.q} className="rounded-2xl border border-[#e8e8ed] bg-white group">
                  <summary className="p-6 cursor-pointer text-[14px] font-bold text-[#091747] flex justify-between items-center gap-4">
                    <span>{faq.q}</span>
                    <span className="w-6 h-6 rounded-full bg-[#f2f2f7] flex items-center justify-center shrink-0 group-open:bg-[#091747] transition-colors">
                      <svg className="w-3 h-3 text-[#888] group-open:text-white group-open:rotate-180 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="m6 9 6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-6 pb-6 text-[13px] text-[#666] leading-[1.85]">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── I. Contact Form ── */}
        <section className="py-20 px-6 bg-[#f8f9fb]">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-10">
              <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
                CONTACT
              </span>
              <h2 className="text-[clamp(20px,2.5vw,28px)] font-black text-[#091747] mt-2 mb-2">
                お問い合わせ
              </h2>
              <p className="text-[13px] text-[#888]">
                プロジェクトへのコンサルタントアサインについてお気軽にご相談ください
              </p>
            </div>
            <div className="max-w-[640px] mx-auto">
              <ContactForm />
            </div>
          </div>
        </section>

        {/* ── J. CTA Banner ── */}
        <section className="relative overflow-hidden bg-[#091747] py-16 px-6 text-center">
          <Image
            src="/images/creative_office.jpg"
            alt=""
            fill
            className="object-cover opacity-10"
            sizes="100vw"
          />
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#1FABE9]/10 blur-[100px]" />
          <div className="relative max-w-[800px] mx-auto">
            <p className="text-white/50 text-[13px] mb-3">
              フリーランスコンサルタントとして活躍したい方へ
            </p>
            <h2 className="text-white text-[clamp(18px,2.5vw,24px)] font-black mb-6">
              コンサルタント登録も受付中
            </h2>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#1FABE9] to-[#34d399] text-white px-8 py-3.5 text-[15px] font-bold rounded-full transition-all hover:shadow-[0_4px_20px_rgba(31,171,233,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            >
              無料で登録する
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="m9 18 6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </section>
      </main>
      <Footer />

      {/* JSON-LD Structured Data — Service */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "PERSONA 企業向けフリーコンサルタント紹介サービス",
            provider: {
              "@type": "Organization",
              name: "PERSONA（ペルソナ）",
              url: "https://persona-consultant.com",
            },
            description:
              "コンサルファーム出身のフリーランスコンサルタントを企業プロジェクトにマッチング。戦略・DX推進・PMO・SAP導入支援に対応。",
            areaServed: { "@type": "Country", name: "Japan" },
            serviceType: "Consulting Staffing",
          }),
        }}
      />
      {/* JSON-LD Structured Data — FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: enterpriseFaqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          }),
        }}
      />
    </>
  );
}
