import Link from "next/link";

const stats = [
  { value: "1,200+", label: "登録コンサルタント", desc: "McKinsey・BCG・Deloitte等の出身者" },
  { value: "30+", label: "提携エージェント", desc: "複数社の案件を一括検索・応募" },
  { value: "100+", label: "常時掲載案件数", desc: "戦略・DX・PMO・SAP案件を中心に" },
  { value: "100〜250万", label: "月額報酬レンジ", desc: "高単価案件を厳選してご紹介" },
];

export default function HomeAchievements() {
  return (
    <section className="py-[72px] px-6 bg-white border-t border-border">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2 text-center">
          TRACK RECORD
        </p>
        <h2 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35] text-center mb-3">
          フリーコンサル案件紹介の<em className="not-italic text-blue">実績</em>
        </h2>
        <p className="text-sm text-[#555] leading-[1.9] text-center max-w-[640px] mx-auto mb-10">
          PERSONAは、コンサルティングファーム出身のフリーランスコンサルタントに特化した案件紹介サービスとして、
          多くのプロフェッショナルの独立・案件獲得を支援してきました。
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-[#f8fafc] border border-[#e8e8ed] rounded-2xl p-6 text-center"
            >
              <p className="text-[clamp(28px,4vw,36px)] font-black text-blue leading-none mb-1">
                {s.value}
              </p>
              <p className="text-[13px] font-bold text-navy mb-1">{s.label}</p>
              <p className="text-[11px] text-[#888] leading-[1.6]">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* SEO text content */}
        <div className="max-w-[800px] mx-auto">
          <h3 className="text-[16px] font-black text-navy mb-4">
            フリーコンサルタントの案件獲得を効率化
          </h3>
          <p className="text-[13.5px] leading-[1.9] text-[#555] mb-4">
            フリーランスコンサルタントとして独立した際、多くの方が直面する課題が「案件探しの手間」です。
            複数のエージェントに個別登録し、同じような面談を繰り返し、希望と異なる案件を紹介される——
            PERSONAはそんな非効率を解消するために生まれました。
          </p>
          <p className="text-[13.5px] leading-[1.9] text-[#555] mb-4">
            当サービスでは、戦略コンサルティング、DX推進、PMO、SAP/ERP導入、業務改革（BPR）、
            M&amp;A・PMI、新規事業開発など、コンサルティングファーム出身者が得意とする幅広い領域の案件を取り扱っています。
            AIスキルマッチング技術により、ご経験・スキル・希望条件に最適な案件を自動でレコメンドし、
            最短1週間での案件参画を実現します。
          </p>
          <p className="text-[13.5px] leading-[1.9] text-[#555] mb-6">
            フルリモート案件は全体の約40%を占め、週2〜3日の部分稼働案件も豊富に揃えています。
            副業・兼業としてフリーコンサルを始めたい方から、フルタイムで複数案件に参画したい方まで、
            柔軟なワークスタイルをサポートします。
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 bg-blue text-white px-7 py-3 text-sm font-bold transition-colors hover:bg-blue-dark"
            >
              案件一覧を見る →
            </Link>
            <Link
              href="/expertise"
              className="inline-flex items-center gap-2 bg-white text-navy border border-border px-7 py-3 text-sm font-bold transition-colors hover:bg-[#f8f8f8]"
            >
              専門領域から探す
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
