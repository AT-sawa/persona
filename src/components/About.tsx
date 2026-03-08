import Image from "next/image";
import Link from "next/link";

export default function About() {
  return (
    <section className="py-[72px] px-6" id="about">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
          ABOUT
        </p>
        <h2 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35] mb-1.5">
          フリーコンサル案件紹介サービス
          <br />
          <em className="not-italic text-blue">PERSONA（ペルソナ）とは？</em>
        </h2>
        <div className="w-9 h-[3px] bg-blue mt-3 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-14 items-center">
          <div>
            <p className="text-sm leading-[1.9] text-[#555] mb-3.5">
              PERSONAは、コンサルティングファーム出身のフリーランスコンサルタントに特化した案件紹介サービスです。全カテゴリの案件が集まり、市場に散在する案件を一元化します。
            </p>
            <ul className="list-none mb-6 flex flex-col gap-[7px]">
              {[
                "全カテゴリの案件が集まるサービス",
                "高単価帯（100〜250万）の案件が中心",
                "戦略・DX・PMO・SAP・調査すべて対応",
                "ファーム出身エージェントが担当",
              ].map((text) => (
                <li
                  key={text}
                  className="text-[13.5px] font-semibold text-navy flex items-center gap-2.5"
                >
                  <span className="text-blue font-black text-[13px]">✓</span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/cases"
                className="inline-flex items-center gap-2 bg-blue text-white px-7 py-3 text-sm font-bold transition-colors hover:bg-blue-dark"
              >
                フリーコンサル案件一覧 →
              </Link>
              <Link
                href="/expertise"
                className="inline-flex items-center gap-2 bg-white text-navy border border-border px-5 py-3 text-sm font-bold transition-colors hover:bg-[#f8f8f8]"
              >
                専門領域から探す
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <Image
                src="/images/consultant_woman.jpg"
                alt="PERSONAに登録するフリーコンサルタント"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 420px"
              />
            </div>
            {/* Floating stat card */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] p-4 border border-border">
              <div className="text-[22px] font-black text-blue leading-none">1,200+</div>
              <div className="text-[10px] text-[#888] mt-0.5">登録コンサルタント</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
