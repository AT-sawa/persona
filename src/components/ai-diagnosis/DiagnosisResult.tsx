"use client";

import { useEffect, useState } from "react";
import type { DiagnosisResult } from "./diagnosis-data";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let frame: number;
    const duration = 1200;
    const start = performance.now();
    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span>
      {displayed.toLocaleString()}
      {suffix}
    </span>
  );
}

const IMPACT_BADGE: Record<string, { label: string; color: string }> = {
  high: { label: "HIGH", color: "bg-[#E15454]/10 text-[#E15454]" },
  medium: { label: "MEDIUM", color: "bg-[#E67E22]/10 text-[#E67E22]" },
  low: { label: "LOW", color: "bg-[#888]/10 text-[#888]" },
};

interface Props {
  result: DiagnosisResult;
  onReset: () => void;
  onScrollToContact: () => void;
}

export default function DiagnosisResultView({
  result,
  onReset,
  onScrollToContact,
}: Props) {
  return (
    <div>
      {/* Hero Summary */}
      <section className="bg-[#091747] py-16 px-6">
        <div className="max-w-[900px] mx-auto text-center">
          <p className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase mb-3">
            DIAGNOSIS RESULT
          </p>
          <h2 className="text-[clamp(22px,4vw,36px)] font-black text-white mb-2 leading-tight">
            {result.departmentLabel}
            {result.functionLabel && (
              <span className="text-[#1FABE9]">（{result.functionLabel}）</span>
            )}
            でAIを活用すると
          </h2>
          <p className="text-[clamp(28px,5vw,48px)] font-black mb-8">
            <span className="bg-gradient-to-r from-[#1FABE9] to-[#34d399] bg-clip-text" style={{ WebkitTextFillColor: "transparent" }}>
              月間 <AnimatedNumber value={result.estimatedHoursSaved} />時間
            </span>
            <span className="text-white text-[clamp(16px,2.5vw,24px)] ml-2">
              の業務削減が見込めます
            </span>
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-[600px] mx-auto">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <p className="text-[clamp(20px,3vw,32px)] font-black text-white mb-1">
                <AnimatedNumber value={result.estimatedHoursSaved} suffix="h" />
              </p>
              <p className="text-[11px] text-white/50">月間削減時間</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <p className="text-[clamp(20px,3vw,32px)] font-black text-[#34d399] mb-1">
                <AnimatedNumber value={result.estimatedCostSaved} suffix="万円" />
              </p>
              <p className="text-[11px] text-white/50">年間コスト削減</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <p className="text-[clamp(20px,3vw,32px)] font-black text-[#1FABE9] mb-1">
                <AnimatedNumber value={result.automationPotential} suffix="%" />
              </p>
              <p className="text-[11px] text-white/50">自動化ポテンシャル</p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Before → After */}
      <section className="py-16 px-6 bg-[#f8f9fb]">
        <div className="max-w-[900px] mx-auto">
          <p className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase mb-2 text-center">
            WORKFLOW OPTIMIZATION
          </p>
          <h3 className="text-[clamp(18px,2.5vw,26px)] font-black text-[#091747] text-center mb-8">
            業務フロー改善イメージ
          </h3>

          <div className="space-y-4">
            {result.workflows.map((wf, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#091747]">
                  <h4 className="text-[14px] font-bold text-white flex items-center gap-2">
                    <Icon name="auto_fix_high" className="text-[18px] text-[#1FABE9]" />
                    {wf.taskName}
                  </h4>
                  <span className="text-[13px] font-black text-[#34d399]">
                    -{wf.reductionPercent}%
                  </span>
                </div>

                {/* Before / After */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#e8e8ed]">
                  {/* Before */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-white bg-[#999] px-2 py-0.5 rounded">
                        BEFORE
                      </span>
                      <span className="text-[13px] font-black text-[#091747]">
                        {wf.beforeHours}時間/月
                      </span>
                    </div>
                    <p className="text-[13px] text-[#666] leading-[1.7]">
                      {wf.beforeProcess}
                    </p>
                  </div>

                  {/* After */}
                  <div className="p-5 bg-[#1FABE9]/3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-white bg-[#1FABE9] px-2 py-0.5 rounded">
                        AFTER
                      </span>
                      <span className="text-[13px] font-black text-[#1FABE9]">
                        {wf.afterHours}時間/月
                      </span>
                      <span className="text-[11px] font-bold text-[#34d399]">
                        ({wf.beforeHours - wf.afterHours}h削減)
                      </span>
                    </div>
                    <p className="text-[13px] text-[#666] leading-[1.7] mb-2">
                      {wf.afterProcess}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {wf.tools.map((tool) => (
                        <span
                          key={tool}
                          className="text-[10px] bg-[#1FABE9]/8 text-[#1FABE9] px-2 py-0.5 rounded font-bold"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-[900px] mx-auto">
          <p className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase mb-2 text-center">
            RECOMMENDATIONS
          </p>
          <h3 className="text-[clamp(18px,2.5vw,26px)] font-black text-[#091747] text-center mb-8">
            推奨アクション
          </h3>

          <div className="space-y-3">
            {result.recommendations.map((rec, i) => {
              const badge = IMPACT_BADGE[rec.impact];
              return (
                <div
                  key={i}
                  className="flex gap-4 p-5 rounded-2xl border border-[#e8e8ed] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-[#091747] flex items-center justify-center flex-shrink-0">
                    <span className="text-[14px] font-black text-white">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-[14px] font-bold text-[#091747]">
                        {rec.title}
                      </h4>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#666] leading-[1.7] mb-1">
                      {rec.description}
                    </p>
                    <span className="text-[11px] text-[#999]">
                      目安期間: {rec.timeframe}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-6 bg-[#091747]">
        <div className="max-w-[600px] mx-auto text-center">
          <p className="text-[14px] text-white/60 mb-3">
            より正確なROI分析と導入ロードマップの策定は
          </p>
          <h3 className="text-[clamp(18px,2.5vw,24px)] font-black text-white mb-6">
            PERSONAの専門コンサルタントにご相談ください
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onScrollToContact}
              className="px-8 py-3.5 bg-gradient-to-r from-[#1FABE9] to-[#34d399] text-white text-[15px] font-bold rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(31,171,233,0.3)] hover:scale-[1.02]"
            >
              <Icon name="mail" className="text-[18px] mr-1 align-middle" />
              診断結果レポートを受け取る
            </button>
            <button
              onClick={onReset}
              className="px-6 py-3.5 border border-white/20 text-white/60 text-[14px] font-bold rounded-xl transition-all hover:border-white/40 hover:text-white"
            >
              もう一度診断する
            </button>
          </div>
          <p className="text-[11px] text-white/30 mt-4">
            ※本診断結果は概算です。詳細な分析にはPERSONAのAI導入効果アセスメントをご利用ください。
          </p>
        </div>
      </section>
    </div>
  );
}
