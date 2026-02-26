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
            <Link
              href="#register"
              className="inline-flex items-center gap-2 bg-blue text-white px-7 py-3 text-sm font-bold transition-colors hover:bg-blue-dark"
            >
              案件を探す →
            </Link>
          </div>
          <div>
            <Image
              src="/images/hero_person.jpeg"
              alt="フリーコンサル案件紹介サービスPERSONA"
              width={420}
              height={280}
              className="w-full rounded"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
