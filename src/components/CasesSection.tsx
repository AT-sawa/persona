import Link from "next/link";
import type { Case } from "@/lib/types";

// Fallback cases — display only (no detail links since IDs don't exist in DB)
const fallbackCases: Partial<Case>[] = [
  { id: "f1", title: "大手製造業_基幹システム刷新PMO", fee: "130〜180万円/月", industry: "製造" },
  { id: "f2", title: "金融機関向け_DX推進戦略策定支援", fee: "150〜200万円/月", industry: "金融" },
  { id: "f3", title: "SAP S/4HANA導入_横断PMOリード", fee: "120〜160万円/月", industry: "IT" },
  { id: "f4", title: "大手通信会社_新規事業開発支援", fee: "140〜200万円/月", industry: "通信" },
  { id: "f5", title: "エネルギー企業_業務改革BPR推進", fee: "110〜150万円/月", industry: "エネルギー" },
  { id: "f6", title: "IT企業_M&A後PMI統合推進支援", fee: "130〜170万円/月", industry: "IT" },
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
            className="text-[13px] font-semibold text-navy bg-[#f2f2f7] hover:bg-[#e8e8ed] px-5 py-2 rounded-full transition-colors flex items-center gap-1.5"
          >
            すべての案件を見る
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="m9 18 6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayCases.slice(0, 6).map((c) => {
            const inner = (
              <div className="p-5">
                {/* Badge + industry */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-bold tracking-[0.12em] uppercase px-2.5 py-[3px] rounded-full border ${
                      hasRealCases && !c.is_active
                        ? "text-[#aaa] border-[#ddd] bg-[#f8f8f8]"
                        : hasRealCases && c.status === "最注力"
                          ? "text-[#c0392b] border-[#c0392b]/30 bg-[#c0392b]/6"
                          : "text-[#1a8a5c] border-[#1a8a5c]/30 bg-[#1a8a5c]/6"
                    }`}
                  >
                    {hasRealCases
                      ? c.is_active
                        ? c.status === "最注力"
                          ? "PRIORITY"
                          : "OPEN"
                        : "CLOSED"
                      : "OPEN"}
                  </span>
                  {c.industry && (
                    <span className="text-[10px] text-[#999]">
                      {c.industry}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-[15px] font-semibold text-navy leading-[1.5] group-hover:text-blue transition-colors line-clamp-2 min-h-[45px] mb-2">
                  {c.title}
                </h3>

                {/* Description */}
                {c.description && (
                  <p className="text-[12px] text-[#888] leading-[1.65] mb-3 line-clamp-2">
                    {c.description}
                  </p>
                )}

                {/* Footer */}
                <div className="pt-3 mt-auto border-t border-[#f0f0f5]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-[#aaa]">報酬</span>
                    <span className="text-[15px] font-bold text-navy tracking-tight">
                      {c.fee || (
                        <span className="text-[12px] text-[#ccc] font-normal">
                          要相談
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );

            // Real cases link to detail page; fallback cases don't
            return hasRealCases ? (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className={`group block bg-white rounded-2xl border border-[#e8e8ed] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-300 ${
                  !c.is_active ? "opacity-55" : ""
                }`}
              >
                {inner}
              </Link>
            ) : (
              <div
                key={c.id}
                className="group block bg-white rounded-2xl border border-[#e8e8ed]"
              >
                {inner}
              </div>
            );
          })}
        </div>
        <div className="mt-5 bg-[#f2f2f7] rounded-2xl py-5 text-center">
          <p className="text-[13px] text-[#888]">
            この他にも多くのフリーコンサル案件をご提案可能です。
          </p>
        </div>
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
