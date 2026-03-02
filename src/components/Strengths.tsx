import Image from "next/image";

const items = [
  {
    num: "01",
    label: "EXCLUSIVE NETWORK",
    title: "独自の顧客ネットワークで\n100万円〜250万円の高単価案件\n常時100件以上を取り扱い",
    text: "PERSONAで登録・案件検索依頼をすることで、他社エージェントの案件にも効率的に簡単エントリー。面倒だった稼働共有や複数回の面談の手間が省けます。",
    img: "/images/data_analysis.jpg",
    imgAlt: "PERSONAの独自ネットワークによる高単価フリーコンサル案件のデータ分析",
  },
  {
    num: "02",
    label: "MULTI-AGENT ACCESS",
    title: "10社以上のエージェントと連携\nここだけで他社案件にも効率的にエントリー",
    text: "PERSONA一つで複数エージェントの案件に一括アクセス。個別登録・個別面談の手間を大幅に削減できます。",
    img: "/images/brainstorm.jpg",
    imgAlt: "複数エージェントの案件にチームで効率的にアクセス",
  },
  {
    num: "03",
    label: "CONSULTANT-MADE",
    title: "コンサル出身者が作った\nフリーコンサル案件紹介サービス\nコンサルの理想のサービスを実現。",
    text: "フリーコンサルとして活動する中で「このようなサービスがあれば良いな」を詰め込みました。担当エージェントは全員ファーム出身かつフリーコンサル経験者。",
    img: "/images/team_success.jpg",
    imgAlt: "コンサル出身者チームが笑顔でサポート",
  },
];

export default function Strengths() {
  return (
    <section className="py-[72px] px-6">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
          WHY PERSONA
        </p>
        <h2 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35] mb-1.5">
          PERSONA（ペルソナ）が選ばれる
          <br />
          <em className="not-italic text-blue">圧倒的な3つの強み</em>
        </h2>
        <div className="w-9 h-[3px] bg-blue mt-3 mb-8" />
        <div className="flex flex-col">
          {items.map((item, i) => (
            <div
              key={item.num}
              className={`grid grid-cols-1 lg:grid-cols-[80px_1fr_380px] gap-0 py-10 ${
                i < items.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="text-5xl font-black text-blue opacity-15 self-center text-center leading-none hidden lg:block">
                {item.num}
              </div>
              <div className="lg:pr-10">
                <p className="text-[10px] font-bold text-blue tracking-[0.14em] uppercase mb-2.5">
                  {item.label}
                </p>
                <h3 className="text-lg font-black text-navy leading-[1.45] mb-3 whitespace-pre-line">
                  {item.title}
                </h3>
                <p className="text-[13.5px] leading-[1.85] text-[#555]">
                  {item.text}
                </p>
              </div>
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                <Image
                  src={item.img}
                  alt={item.imgAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 380px"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
