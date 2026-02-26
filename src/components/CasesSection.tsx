import Link from "next/link";
import type { Case } from "@/lib/types";

// Fallback cases for when Supabase is not configured
const fallbackCases: Partial<Case>[] = [
  { id: "1", title: "電力需給管理業務支援・システム改定対応支援", fee: "115〜145万円/月・100%" },
  { id: "2", title: "生成AI活用_カスタマーサポート領域オファリング企画・推進支援", fee: "90〜120万円/月・100%" },
  { id: "3", title: "大手エネルギー企業向け_営業伴走支援", fee: "100〜130万円/月・100%" },
  { id: "4", title: "SAP導入での横断PMOリード", fee: "100〜130万円/月・100%" },
  { id: "5", title: "電力会社向け_SAP導入支援（PMモジュール）", fee: "100〜100万円/月・100%" },
  { id: "6", title: "大手SIer_金融機関向けステーブルコイン事業の上流工程支援", fee: "120〜120万円/月・100%" },
];

interface CasesSectionProps {
  cases?: Case[];
}

export default function CasesSection({ cases }: CasesSectionProps) {
  const displayCases = cases && cases.length > 0 ? cases : fallbackCases;

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
          {displayCases.slice(0, 6).map((c) => (
            <div
              key={c.id}
              className="bg-white p-[18px_16px] transition-colors hover:bg-[#f0f8ff]"
            >
              <p className="text-[13px] font-bold text-navy leading-[1.5] mb-2.5 min-h-[40px]">
                {c.title}
              </p>
              <div className="flex items-baseline justify-between pt-2 border-t border-border">
                <span className="text-[10px] text-[#aaa]">報酬金額</span>
                <span className="text-[13px] font-extrabold text-blue">
                  {c.fee || "お問い合わせ"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-[13px] text-[#888] py-5 border border-border border-t-0 bg-[#fafafa]">
          この他にも多くのフリーコンサル案件をご提案可能です。
        </p>
      </div>
    </section>
  );
}
