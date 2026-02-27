import Link from "next/link";
import type { Case } from "@/lib/types";

// Fallback cases — display only (no detail links since IDs don't exist in DB)
const fallbackCases: Partial<Case>[] = [
  { id: "f1", title: "大手製造業_基幹システム刷新PMO", fee: "130〜180万円/月" },
  { id: "f2", title: "金融機関向け_DX推進戦略策定支援", fee: "150〜200万円/月" },
  { id: "f3", title: "SAP S/4HANA導入_横断PMOリード", fee: "120〜160万円/月" },
  { id: "f4", title: "大手通信会社_新規事業開発支援", fee: "140〜200万円/月" },
  { id: "f5", title: "エネルギー企業_業務改革BPR推進", fee: "110〜150万円/月" },
  { id: "f6", title: "IT企業_M&A後PMI統合推進支援", fee: "130〜170万円/月" },
];

interface CasesSectionProps {
  cases?: Case[];
}

export default function CasesSection({ cases }: CasesSectionProps) {
  const hasRealCases = cases && cases.length > 0;
  const displayCases = hasRealCases ? cases : fallbackCases;

  return (
    <section className="py-[72px] px-6 bg-gray-bg" id="cases">
      <div className="max-w-[1160px] mx-auto">
        <div className="flex justify-between items-end mb-7">
          <div>
            <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
              CASES
            </p>
            <h2 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35]">
              フリーコンサル<em className="not-italic text-blue">案件事例</em>
            </h2>
          </div>
          <Link
            href="/cases"
            className="text-[13px] font-bold text-blue flex items-center gap-1"
          >
            すべての案件を見る →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border mb-px">
          {displayCases.slice(0, 6).map((c) => {
            const inner = (
              <>
                <p className="text-[13px] font-bold text-navy leading-[1.5] mb-2.5 min-h-[40px]">
                  {c.title}
                </p>
                <div className="flex items-baseline justify-between pt-2 border-t border-border">
                  <span className="text-[10px] text-[#aaa]">報酬金額</span>
                  <span className="text-[13px] font-extrabold text-blue">
                    {c.fee || "お問い合わせ"}
                  </span>
                </div>
              </>
            );

            // Real cases link to detail page; fallback cases don't
            return hasRealCases ? (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="bg-white p-[18px_16px] transition-colors hover:bg-[#f0f8ff] block"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={c.id}
                className="bg-white p-[18px_16px]"
              >
                {inner}
              </div>
            );
          })}
        </div>
        <p className="text-center text-[13px] text-[#888] py-5 border border-border border-t-0 bg-[#fafafa]">
          この他にも多くのフリーコンサル案件をご提案可能です。
        </p>
        <div className="mt-6 text-center">
          <Link
            href="/blog"
            className="text-[13px] font-bold text-blue hover:underline"
          >
            フリーコンサル関連の記事を読む →
          </Link>
        </div>
      </div>
    </section>
  );
}
