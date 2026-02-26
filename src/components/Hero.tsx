"use client";

import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* ── Background layers ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7fe] via-white to-[#eaf4fd]" />

      {/* Soft blurred circles */}
      <div className="absolute top-[-140px] right-[-60px] w-[520px] h-[520px] rounded-full bg-blue/[0.045] blur-[2px]" />
      <div className="absolute bottom-[-80px] left-[-120px] w-[380px] h-[380px] rounded-full bg-blue/[0.035] blur-[2px]" />
      <div className="absolute top-[35%] left-[18%] w-[180px] h-[180px] rounded-full bg-accent/[0.05]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--navy) 1px, transparent 1px), linear-gradient(90deg, var(--navy) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Bottom fade to white */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />

      {/* ── Content ── */}
      <div className="relative max-w-[1160px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 items-center px-6 pt-[52px] pb-10">
        {/* Left */}
        <div>
          <p className="text-[11px] font-bold text-blue tracking-[0.12em] uppercase mb-3.5">
            フリーコンサル案件紹介サービス
          </p>
          <Image
            src="/images/persona_logo_hero.png"
            alt="PERSONA フリーコンサルクラウド"
            width={280}
            height={80}
            className="max-w-[280px] mb-5"
          />
          <ul className="list-none mb-6 flex flex-col gap-2">
            {[
              "案件紹介が常時100件以上アクティブ",
              "他のエージェント案件も一括アクセス可能",
              "ファーム出身エージェントが対応",
            ].map((text) => (
              <li
                key={text}
                className="text-sm font-medium text-text flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue shrink-0" />
                {text}
              </li>
            ))}
          </ul>
          <div className="flex gap-5 mb-7">
            {[
              { n: "100+", l: "常時案件数" },
              { n: "30+", l: "提携エージェント" },
              { n: "250万", l: "最高月額" },
            ].map((s) => (
              <div
                key={s.l}
                className="flex flex-col px-3.5 py-2.5 bg-white/80 backdrop-blur-sm border-l-[3px] border-blue"
              >
                <span className="text-[22px] font-black text-blue leading-none">
                  {s.n}
                </span>
                <span className="text-[10px] text-[#888] mt-0.5">{s.l}</span>
              </div>
            ))}
          </div>
          <Link
            href="#register"
            className="inline-flex items-center gap-2 bg-blue text-white px-8 py-3.5 text-[15px] font-bold transition-colors hover:bg-blue-dark shadow-[0_4px_14px_rgba(31,171,233,0.3)]"
          >
            無料で登録する
            <span>→</span>
          </Link>
        </div>

        {/* Right: Form */}
        <div className="bg-white/95 backdrop-blur-sm border border-border p-6 shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
          <p className="text-[13px] font-bold text-navy mb-4 pb-2.5 border-b-2 border-blue flex items-center gap-1.5">
            <span className="w-1 h-4 bg-blue shrink-0" />
            フリーコンサル登録フォーム
          </p>
          <div className="mb-2.5">
            <label className="block text-[11px] font-bold text-[#888] mb-0.5">
              メールアドレス<span className="text-[#E15454] text-[10px] ml-0.5">*必須</span>
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              className="w-full px-[11px] py-[9px] border border-border text-[13px] text-text outline-none bg-[#fafafa] transition-colors focus:border-blue focus:bg-white"
            />
          </div>
          <div className="mb-2.5">
            <label className="block text-[11px] font-bold text-[#888] mb-0.5">
              お勤め経験のあるコンサルファーム
              <span className="text-[#E15454] text-[10px] ml-0.5">*必須</span>
            </label>
            <select className="w-full px-[11px] py-[9px] border border-border text-[13px] text-text outline-none bg-[#fafafa] transition-colors focus:border-blue focus:bg-white">
              <option>選択してください</option>
              <option>McKinsey &amp; Company</option>
              <option>BCG</option>
              <option>Deloitte</option>
              <option>PwC</option>
              <option>アクセンチュア</option>
              <option>A.T. Kearney</option>
              <option>Roland Berger</option>
              <option>その他</option>
            </select>
          </div>
          <button className="w-full py-3 bg-blue text-white border-none text-sm font-bold cursor-pointer transition-colors hover:bg-blue-dark">
            無料で登録する
          </button>
          <p className="text-[10px] text-[#aaa] text-center mt-1.5">
            登録無料・専門コーディネーターよりご連絡します
          </p>
        </div>
      </div>
    </section>
  );
}
