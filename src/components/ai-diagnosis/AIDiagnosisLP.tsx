"use client";

import { useState, useRef, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DiagnosisWizard from "./DiagnosisWizard";
import DiagnosisResultView from "./DiagnosisResult";
import DiagnosisContactForm from "./DiagnosisContactForm";
import {
  calculateDiagnosis,
  SYSTEMS,
  CHALLENGES,
  DEPARTMENT_FUNCTIONS,
  FUNCTION_TASKS,
  type DiagnosisResult,
} from "./diagnosis-data";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

type Phase = "intro" | "wizard" | "calculating" | "result";

export default function AIDiagnosisLP() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(1);
  const [department, setDepartment] = useState<string | null>(null);
  const [businessFunction, setBusinessFunction] = useState<string | null>(null);
  const [tasks, setTasks] = useState<string[]>([]);
  const [companySize, setCompanySize] = useState<string | null>(null);
  const [systems, setSystems] = useState<string[]>([]);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  const scrollToContact = useCallback(() => {
    contactRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  function startDiagnosis() {
    setPhase("wizard");
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSelectDepartment(id: string) {
    setDepartment(id);
    // 部署が変わったら業務・タスクもリセット
    setBusinessFunction(null);
    setTasks([]);
    setStep(2);
  }

  function handleSelectFunction(id: string) {
    setBusinessFunction(id);
    // 業務が変わったらタスクリセット
    setTasks([]);
    setStep(3);
  }

  function handleToggleTask(id: string) {
    setTasks((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function handleSelectSize(id: string) {
    setCompanySize(id);
    setStep(5);
  }

  function handleToggleSystem(id: string) {
    setSystems((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleToggleChallenge(id: string) {
    setChallenges((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function handleNext() {
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  function handleSubmit() {
    if (!department || !businessFunction || !companySize) return;
    setPhase("calculating");
    // Brief animation delay
    setTimeout(() => {
      const r = calculateDiagnosis({
        department,
        businessFunction,
        tasks,
        companySize,
        systems,
        challenges,
      });
      setResult(r);
      setPhase("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1200);
  }

  function handleReset() {
    setPhase("intro");
    setStep(1);
    setDepartment(null);
    setBusinessFunction(null);
    setTasks([]);
    setCompanySize(null);
    setSystems([]);
    setChallenges([]);
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // System/Challenge labels for the contact form
  const systemLabels = systems
    .map((id) => SYSTEMS.find((s) => s.id === id)?.label || id);
  const challengeLabels = challenges
    .map((id) => CHALLENGES.find((c) => c.id === id)?.label || id);

  // Function label for the contact form
  const functionLabel = department && businessFunction
    ? (DEPARTMENT_FUNCTIONS[department]?.find((f) => f.id === businessFunction)?.label || "")
    : "";

  // Task labels for the contact form
  const taskLabels = businessFunction
    ? tasks.map((id) => FUNCTION_TASKS[businessFunction]?.find((t) => t.id === id)?.label || id)
    : [];

  return (
    <>
      <Header />
      <main>
        {/* Intro */}
        {phase === "intro" && (
          <>
            {/* Hero */}
            <section className="relative bg-[#091747] overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#1FABE9]/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#34d399]/5 rounded-full blur-[100px]" />
              </div>

              <div className="relative max-w-[800px] mx-auto px-6 py-20 md:py-28 text-center">
                <p className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase mb-4">
                  AI BUSINESS DIAGNOSIS
                </p>
                <h1 className="text-[clamp(24px,4.5vw,44px)] font-black text-white leading-tight mb-4">
                  あなたの部署の
                  <br />
                  <span
                    className="bg-gradient-to-r from-[#1FABE9] to-[#34d399] bg-clip-text"
                    style={{ WebkitTextFillColor: "transparent" }}
                  >
                    AI活用ポテンシャル
                  </span>
                  を無料診断
                </h1>
                <p className="text-[clamp(14px,1.8vw,17px)] text-white/60 leading-[1.8] mb-8 max-w-[600px] mx-auto">
                  6つの質問に答えるだけで、AIによる業務効率化の可能性を即座に分析。
                  <br className="hidden md:block" />
                  削減時間・推奨ツール・ワークフロー改善案をその場でレポートします。
                </p>
                <button
                  onClick={startDiagnosis}
                  className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-[#1FABE9] to-[#34d399] text-white text-[17px] font-bold rounded-xl transition-all hover:shadow-[0_4px_24px_rgba(31,171,233,0.4)] hover:scale-[1.03] active:scale-[0.99]"
                >
                  <Icon name="auto_awesome" className="text-[22px]" />
                  無料で診断する（約1分）
                </button>

                {/* Feature badges */}
                <div className="flex flex-wrap justify-center gap-4 mt-10">
                  {[
                    { icon: "timer", text: "所要時間 約1分" },
                    { icon: "lock_open", text: "登録不要" },
                    { icon: "description", text: "結果レポート付き" },
                  ].map((f) => (
                    <div
                      key={f.text}
                      className="flex items-center gap-1.5 text-white/40 text-[12px]"
                    >
                      <Icon name={f.icon} className="text-[16px]" />
                      {f.text}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* How it works */}
            <section className="py-16 px-6 bg-[#f8f9fb]">
              <div className="max-w-[900px] mx-auto">
                <p className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase mb-2 text-center">
                  HOW IT WORKS
                </p>
                <h2 className="text-[clamp(18px,2.5vw,26px)] font-black text-[#091747] text-center mb-10">
                  診断の流れ
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    {
                      step: "01",
                      icon: "apartment",
                      title: "部署を選択",
                      desc: "改善したい部署",
                    },
                    {
                      step: "02",
                      icon: "work",
                      title: "業務領域を選択",
                      desc: "業務カテゴリ",
                    },
                    {
                      step: "03",
                      icon: "checklist",
                      title: "具体業務を選択",
                      desc: "改善したい業務",
                    },
                    {
                      step: "04",
                      icon: "groups",
                      title: "規模を選択",
                      desc: "従業員規模",
                    },
                    {
                      step: "05",
                      icon: "devices",
                      title: "システムを選択",
                      desc: "利用中のツール",
                    },
                    {
                      step: "06",
                      icon: "priority_high",
                      title: "課題を選択",
                      desc: "感じている課題",
                    },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className="bg-white rounded-2xl border border-[#e8e8ed] p-4 text-center"
                    >
                      <span className="text-[10px] font-black text-[#1FABE9]">
                        STEP {s.step}
                      </span>
                      <Icon
                        name={s.icon}
                        className="text-[28px] text-[#091747] block mx-auto my-2"
                      />
                      <p className="text-[12px] font-bold text-[#091747] mb-0.5">
                        {s.title}
                      </p>
                      <p className="text-[10px] text-[#888]">{s.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-8">
                  <button
                    onClick={startDiagnosis}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-[#091747] text-white text-[14px] font-bold rounded-xl transition-all hover:bg-[#0c1e52]"
                  >
                    <Icon name="play_arrow" className="text-[20px]" />
                    診断をはじめる
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Wizard */}
        {phase === "wizard" && (
          <div className="bg-[#091747] min-h-screen">
            <DiagnosisWizard
              step={step}
              department={department}
              businessFunction={businessFunction}
              tasks={tasks}
              companySize={companySize}
              systems={systems}
              challenges={challenges}
              onSelectDepartment={handleSelectDepartment}
              onSelectFunction={handleSelectFunction}
              onToggleTask={handleToggleTask}
              onSelectSize={handleSelectSize}
              onToggleSystem={handleToggleSystem}
              onToggleChallenge={handleToggleChallenge}
              onNext={handleNext}
              onBack={handleBack}
              onSubmit={handleSubmit}
            />
          </div>
        )}

        {/* Calculating animation */}
        {phase === "calculating" && (
          <div className="bg-[#091747] min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                <div className="absolute inset-0 rounded-full border-4 border-[#1FABE9] border-t-transparent animate-spin" />
              </div>
              <p className="text-[18px] font-bold text-white mb-2">
                AIが分析中...
              </p>
              <p className="text-[13px] text-white/50">
                最適なワークフロー改善案を計算しています
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {phase === "result" && result && (
          <>
            <DiagnosisResultView
              result={result}
              onReset={handleReset}
              onScrollToContact={scrollToContact}
            />
            <DiagnosisContactForm
              ref={contactRef}
              result={result}
              department={department || ""}
              businessFunction={functionLabel}
              companySize={companySize || ""}
              systems={systemLabels}
              challenges={challengeLabels}
            />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
