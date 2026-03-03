const faqs = [
  {
    q: "PERSONA（ペルソナ）とは何ですか？",
    a: "PERSONAは、コンサルティングファーム出身者のためのフリーコンサル案件紹介プラットフォームです。自社案件に加え、30社以上の提携エージェントの案件にも一括でアクセスでき、効率的に案件を探すことができます。",
  },
  {
    q: "登録に費用はかかりますか？",
    a: "いいえ、PERSONAへの登録は完全無料です。案件参画後も登録者様からの費用はいただいておりません。いつでも解約可能です。",
  },
  {
    q: "どのようなバックグラウンドの人が登録していますか？",
    a: "McKinsey、BCG、Deloitte、PwC、Accentureなど大手コンサルティングファーム出身者を中心に、1,200名以上のフリーコンサルタントにご登録いただいています。戦略、DX・IT、PMO、業務改革（BPR）、SAP/ERP導入など幅広い専門領域をカバーしています。",
  },
  {
    q: "報酬の相場はどれくらいですか？",
    a: "案件の種類やスキルによりますが、月額100万〜250万円の案件を常時100件以上取り扱っています。戦略案件やDX案件では月額200万円以上の高単価案件もございます。",
  },
  {
    q: "案件紹介までどのくらいかかりますか？",
    a: "ご登録後、専門コーディネーターとの面談を経て、最短1週間での案件参画実績がございます。ご経験やご希望に合った案件を迅速にご紹介いたします。",
  },
  {
    q: "他のフリーコンサル案件紹介サービスとの違いは？",
    a: "PERSONAの最大の特徴は「案件の網羅性」です。自社案件だけでなく、30社以上の提携エージェントが保有する案件にもワンストップでアクセスできます。一般的なサービスでは1社のエージェントが持つ案件しか紹介されませんが、PERSONAなら複数エージェントの案件を横断検索・一括応募できるため、最適な案件に出会える確率が大幅に高まります。",
  },
  {
    q: "フリーコンサルタントとして独立する際の注意点は？",
    a: "主な注意点は、①案件の安定確保（営業力や人脈が必要）、②社会保険・税金の自己管理、③スキルのアップデート継続の3点です。PERSONAでは案件紹介だけでなく、独立後のキャリア相談やブランクリスク軽減のサポートも行っています。ファーム出身のコーディネーターが伴走するため、初めての独立でも安心してスタートできます。",
  },
  {
    q: "リモート案件・週2-3日稼働の案件はありますか？",
    a: "はい、あります。フルリモート案件は全体の約40%を占め、週2-3日の部分稼働案件も多数取り扱っています。副業・兼業として始めたい方や、複数案件を並行したい方にも柔軟にマッチングいたします。ご希望の稼働条件をコーディネーターにお伝えいただければ、条件に合った案件を優先的にご紹介します。",
  },
];

export default function HomeFAQ() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <section className="py-[72px] px-6 bg-white border-t border-border">
      <div className="max-w-[800px] mx-auto">
        <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2 text-center">
          FAQ
        </p>
        <h2 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35] text-center mb-8">
          よくあるご質問
        </h2>
        <div className="flex flex-col gap-3">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group border border-border bg-white"
            >
              <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-[15px] font-bold text-navy hover:bg-[#f0f8ff] transition-colors list-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-3">
                  <span className="text-blue font-black text-sm">Q</span>
                  {faq.q}
                </span>
                <span className="text-blue text-lg transition-transform group-open:rotate-45 shrink-0 ml-4">
                  +
                </span>
              </summary>
              <div className="px-6 pb-5 pt-0">
                <p className="text-[13.5px] leading-[1.9] text-[#555] pl-7">
                  {faq.a}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
