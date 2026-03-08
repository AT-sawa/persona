import Link from "next/link";

const faqs = [
  {
    q: "フリーコンサル案件にはどのような種類がありますか？",
    a: "PERSONAでは戦略コンサルティング、DX推進・IT戦略、PMO（プロジェクト管理）、SAP/ERP導入、業務改革（BPR）、M&A・PMI、新規事業開発、マーケティング・CX、人事・組織改革、SCM、経理・財務など幅広い領域の案件を取り扱っています。",
  },
  {
    q: "案件の報酬相場はどれくらいですか？",
    a: "月額100万〜250万円の案件を中心に掲載しています。戦略案件やDX案件など専門性の高い領域では月額200万円以上の高単価案件もあります。報酬はスキル・経験・稼働率によって異なります。",
  },
  {
    q: "フルリモートの案件はありますか？",
    a: "はい、フルリモート案件は全体の約40%を占めています。ハイブリッド（週1〜2日出社）や完全常駐の案件もあり、ご希望の勤務形態でフィルタリングして検索できます。",
  },
  {
    q: "案件にエントリーするにはどうすればいいですか？",
    a: "PERSONAに無料会員登録後、気になる案件の詳細ページからワンクリックでエントリーできます。エントリー後は専門コーディネーターが面談調整を行い、最短1週間での参画が可能です。",
  },
  {
    q: "週2〜3日の部分稼働案件はありますか？",
    a: "はい、週2〜3日の部分稼働案件も多数掲載しています。副業・兼業としてフリーコンサルを始めたい方や、複数案件を並行したい方にも柔軟にマッチングいたします。案件一覧の稼働率フィルタをご活用ください。",
  },
  {
    q: "募集終了した過去案件も見られますか？",
    a: "はい、PERSONAでは過去に掲載した案件もアーカイブとして閲覧可能です。どのような案件が流通しているかの参考としてご活用いただけます。類似案件をお探しの場合は、会員登録いただければAIマッチングで最適な案件をご提案します。",
  },
];

export default function CasesFAQ() {
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
    <section className="mt-16 mb-8">
      <h2 className="text-[clamp(18px,2.5vw,24px)] font-black text-navy leading-[1.35] mb-6">
        フリーコンサル案件に関する<em className="not-italic text-blue">よくある質問</em>
      </h2>
      <div className="flex flex-col gap-3">
        {faqs.map((faq) => (
          <details
            key={faq.q}
            className="group border border-border bg-white"
          >
            <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-[14px] font-bold text-navy hover:bg-[#f0f8ff] transition-colors list-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3">
                <span className="text-blue font-black text-sm shrink-0">Q</span>
                {faq.q}
              </span>
              <span className="text-blue text-lg transition-transform group-open:rotate-45 shrink-0 ml-4">
                +
              </span>
            </summary>
            <div className="px-6 pb-5 pt-0">
              <p className="text-[13px] leading-[1.9] text-[#555] pl-7">
                {faq.a}
              </p>
            </div>
          </details>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-8 bg-[#f0f8ff] border border-blue/10 rounded-2xl p-6 text-center">
        <p className="text-[14px] font-bold text-navy mb-2">
          案件探しをもっと効率的に
        </p>
        <p className="text-[13px] text-[#666] mb-4">
          会員登録すると、AIマッチングで最適な案件をレコメンド。新着案件のメール通知も受け取れます。
        </p>
        <Link
          href="/auth/register"
          className="inline-flex items-center gap-2 bg-blue text-white px-7 py-3 text-sm font-bold transition-colors hover:bg-blue-dark"
        >
          無料会員登録 →
        </Link>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
