import Image from "next/image";

export default function Story() {
  return (
    <section className="bg-navy py-[72px] px-6 text-white relative overflow-hidden">
      {/* Background text */}
      <div
        className="absolute right-[-40px] top-1/2 -translate-y-1/2 text-[160px] font-black text-white/[0.03] tracking-[-0.05em] pointer-events-none select-none"
        style={{ fontFamily: '"Noto Serif JP", serif' }}
      >
        PERSONA
      </div>
      <div className="max-w-[1160px] mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[10px] font-bold text-accent tracking-[0.18em] uppercase mb-4 flex items-center gap-2">
              <span className="text-[8px]">●</span>
              PERSONA（ペルソナ）の想い
            </p>
            <h2
              className="text-[clamp(20px,3vw,28px)] font-bold leading-[1.5] text-white mb-5"
              style={{ fontFamily: '"Noto Serif JP", serif' }}
            >
              どうして、こんな<em className="not-italic text-accent">フリーコンサル</em>
              <br />
              サービスがないんだろう
            </h2>
            <p
              className="text-[clamp(18px,2.5vw,24px)] font-bold leading-[1.5] text-white mb-6"
              style={{ fontFamily: '"Noto Serif JP", serif' }}
            >
              ここ一つで<em className="not-italic text-accent">市場にある</em>
              <br />
              フリーコンサル案件を
            </p>
            <p className="text-[13.5px] leading-[1.95] text-white/65 mb-3">
              コンサルティングファームを卒業して、フリーコンサルとして活動していた当時、私達はふと疑問に思いました。「なんだかフリーコンサルって色々とやりにくくないか？」
            </p>
            <p className="text-[13.5px] leading-[1.95] text-white/65 mb-3">
              希望と異なる案件を提案してくるエージェント、何度も同じ話や案件依頼を出す手間暇、業務報告などの面倒くささ、案件が決まるかわからない不安感。
            </p>
            <p className="text-[13.5px] leading-[1.95] text-white/65 mb-3">
              そのような経験と考えを元に、私たちが目指したのは「案件集約型のフリーコンサルプラットフォーム」自社だけではなく、他社案件も集約することで営業活動の工数を削減。
            </p>
            <div className="grid grid-cols-3 gap-0 border border-white/10 mt-8">
              {[
                { n: "100+", l: "常時案件数" },
                { n: "30+", l: "提携エージェント" },
                { n: "¥0", l: "登録費用" },
              ].map((s, i) => (
                <div
                  key={s.l}
                  className={`py-5 px-4 text-center ${
                    i < 2 ? "border-r border-white/10" : ""
                  }`}
                >
                  <div
                    className="text-[32px] font-black leading-none bg-gradient-to-br from-accent to-blue bg-clip-text"
                    style={{ WebkitTextFillColor: "transparent" }}
                  >
                    {s.n}
                  </div>
                  <div className="text-[11px] text-white/40 mt-1.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Image
              src="/images/story_person.jpeg"
              alt="PERSONAの創業背景 — フリーコンサルの課題を解決するプラットフォーム"
              width={560}
              height={400}
              className="w-full rounded"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
