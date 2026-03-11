"use client";

import {
  DEPARTMENTS,
  DEPARTMENT_FUNCTIONS,
  FUNCTION_TASKS,
  COMPANY_SIZES,
  SYSTEMS,
  CHALLENGES,
} from "./diagnosis-data";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

interface Props {
  step: number;
  department: string | null;
  businessFunction: string | null;
  tasks: string[];
  companySize: string | null;
  systems: string[];
  challenges: string[];
  onSelectDepartment: (id: string) => void;
  onSelectFunction: (id: string) => void;
  onToggleTask: (id: string) => void;
  onSelectSize: (id: string) => void;
  onToggleSystem: (id: string) => void;
  onToggleChallenge: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}

const TOTAL_STEPS = 6;

/** 戻るボタン（次への下に表示） */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 text-[13px] text-white/40 hover:text-white/80 flex items-center gap-1 transition-colors mx-auto"
    >
      <Icon name="arrow_back" className="text-[16px]" />
      前のステップに戻る
    </button>
  );
}

export default function DiagnosisWizard({
  step,
  department,
  businessFunction,
  tasks,
  companySize,
  systems,
  challenges,
  onSelectDepartment,
  onSelectFunction,
  onToggleTask,
  onSelectSize,
  onToggleSystem,
  onToggleChallenge,
  onNext,
  onBack,
  onSubmit,
}: Props) {
  const progress = (step / TOTAL_STEPS) * 100;
  const functions = department ? (DEPARTMENT_FUNCTIONS[department] || []) : [];
  const taskOptions = businessFunction ? (FUNCTION_TASKS[businessFunction] || []) : [];

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Progress bar */}
      <div className="w-full max-w-[600px] mx-auto px-6 pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-[#1FABE9] tracking-[0.2em] uppercase">
            STEP {String(step).padStart(2, "0")} / {String(TOTAL_STEPS).padStart(2, "0")}
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#1FABE9] to-[#34d399] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-[700px]">
          {/* Step 1: Department (単一選択 → 即次へ) */}
          {step === 1 && (
            <div>
              <h2 className="text-[clamp(20px,3vw,28px)] font-black text-white text-center mb-2">
                どの部署の業務を改善したいですか？
              </h2>
              <p className="text-[14px] text-white/50 text-center mb-8">
                最も課題を感じている部署を選んでください
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DEPARTMENTS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onSelectDepartment(d.id)}
                    className={`group p-4 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-[1.02] ${
                      department === d.id
                        ? "border-[#1FABE9] bg-white shadow-[0_0_20px_rgba(31,171,233,0.2)]"
                        : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    <Icon
                      name={d.icon}
                      className={`text-[28px] block mb-2 ${
                        department === d.id
                          ? "text-[#1FABE9]"
                          : "text-white/40 group-hover:text-white/70"
                      }`}
                    />
                    <p
                      className={`text-[14px] font-bold mb-0.5 ${
                        department === d.id ? "text-[#091747]" : "text-white"
                      }`}
                    >
                      {d.label}
                    </p>
                    <p
                      className={`text-[11px] ${
                        department === d.id
                          ? "text-[#091747]/60"
                          : "text-white/40"
                      }`}
                    >
                      {d.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Business Function (単一選択 → 即次へ) */}
          {step === 2 && (
            <div>
              <h2 className="text-[clamp(20px,3vw,28px)] font-black text-white text-center mb-2">
                どの業務領域を改善したいですか？
              </h2>
              <p className="text-[14px] text-white/50 text-center mb-8">
                具体的な業務領域を選んでください
              </p>
              <div className={`grid gap-3 max-w-[550px] mx-auto ${
                functions.length <= 3 ? "grid-cols-1 sm:grid-cols-3" :
                functions.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
              }`}>
                {functions.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onSelectFunction(f.id)}
                    className={`group p-4 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-[1.02] ${
                      businessFunction === f.id
                        ? "border-[#1FABE9] bg-white shadow-[0_0_20px_rgba(31,171,233,0.2)]"
                        : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    <Icon
                      name={f.icon}
                      className={`text-[28px] block mb-2 ${
                        businessFunction === f.id
                          ? "text-[#1FABE9]"
                          : "text-white/40 group-hover:text-white/70"
                      }`}
                    />
                    <p
                      className={`text-[14px] font-bold mb-0.5 ${
                        businessFunction === f.id ? "text-[#091747]" : "text-white"
                      }`}
                    >
                      {f.label}
                    </p>
                    <p
                      className={`text-[11px] ${
                        businessFunction === f.id
                          ? "text-[#091747]/60"
                          : "text-white/40"
                      }`}
                    >
                      {f.description}
                    </p>
                  </button>
                ))}
              </div>
              <div className="text-center mt-6">
                <BackButton onClick={onBack} />
              </div>
            </div>
          )}

          {/* Step 3: Specific Tasks (複数選択) */}
          {step === 3 && (
            <div>
              <h2 className="text-[clamp(20px,3vw,28px)] font-black text-white text-center mb-2">
                改善したい具体的な業務は？
              </h2>
              <p className="text-[14px] text-white/50 text-center mb-8">
                当てはまるものをすべて選んでください
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-[550px] mx-auto mb-6">
                {taskOptions.map((t) => {
                  const selected = tasks.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onToggleTask(t.id)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-center gap-3 ${
                        selected
                          ? "border-[#1FABE9] bg-white"
                          : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                          selected
                            ? "bg-[#1FABE9] border-[#1FABE9]"
                            : "border-white/30"
                        }`}
                      >
                        {selected && (
                          <Icon name="check" className="text-[14px] text-white" />
                        )}
                      </div>
                      <span
                        className={`text-[13px] font-bold ${
                          selected ? "text-[#091747]" : "text-white"
                        }`}
                      >
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="text-center">
                <button
                  onClick={onNext}
                  disabled={tasks.length === 0}
                  className="px-8 py-3 bg-gradient-to-r from-[#1FABE9] to-[#34d399] text-white text-[15px] font-bold rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(31,171,233,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  次へ
                  <Icon name="arrow_forward" className="text-[18px] ml-1 align-middle" />
                </button>
                <BackButton onClick={onBack} />
              </div>
            </div>
          )}

          {/* Step 4: Company Size (単一選択 → 即次へ) */}
          {step === 4 && (
            <div>
              <h2 className="text-[clamp(20px,3vw,28px)] font-black text-white text-center mb-2">
                従業員規模を教えてください
              </h2>
              <p className="text-[14px] text-white/50 text-center mb-8">
                会社全体の従業員数を選んでください
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-[500px] mx-auto">
                {COMPANY_SIZES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelectSize(s.id)}
                    className={`p-5 rounded-2xl border-2 transition-all duration-200 text-center hover:scale-[1.02] ${
                      companySize === s.id
                        ? "border-[#1FABE9] bg-white shadow-[0_0_20px_rgba(31,171,233,0.2)]"
                        : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    <p
                      className={`text-[20px] font-black mb-1 ${
                        companySize === s.id ? "text-[#091747]" : "text-white"
                      }`}
                    >
                      {s.label}
                    </p>
                    <p
                      className={`text-[12px] ${
                        companySize === s.id
                          ? "text-[#091747]/60"
                          : "text-white/40"
                      }`}
                    >
                      {s.description}
                    </p>
                  </button>
                ))}
              </div>
              <div className="text-center mt-4">
                <BackButton onClick={onBack} />
              </div>
            </div>
          )}

          {/* Step 5: Systems (複数選択) */}
          {step === 5 && (
            <div>
              <h2 className="text-[clamp(20px,3vw,28px)] font-black text-white text-center mb-2">
                現在利用中のシステムは？
              </h2>
              <p className="text-[14px] text-white/50 text-center mb-8">
                当てはまるものをすべて選んでください
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-[550px] mx-auto mb-6">
                {SYSTEMS.map((s) => {
                  const selected = systems.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => onToggleSystem(s.id)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-center gap-3 ${
                        selected
                          ? "border-[#1FABE9] bg-white"
                          : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                          selected
                            ? "bg-[#1FABE9] border-[#1FABE9]"
                            : "border-white/30"
                        }`}
                      >
                        {selected && (
                          <Icon name="check" className="text-[14px] text-white" />
                        )}
                      </div>
                      <span
                        className={`text-[13px] font-bold ${
                          selected ? "text-[#091747]" : "text-white"
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="text-center">
                <button
                  onClick={onNext}
                  disabled={systems.length === 0}
                  className="px-8 py-3 bg-gradient-to-r from-[#1FABE9] to-[#34d399] text-white text-[15px] font-bold rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(31,171,233,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  次へ
                  <Icon name="arrow_forward" className="text-[18px] ml-1 align-middle" />
                </button>
                <BackButton onClick={onBack} />
              </div>
            </div>
          )}

          {/* Step 6: Challenges (複数選択) */}
          {step === 6 && (
            <div>
              <h2 className="text-[clamp(20px,3vw,28px)] font-black text-white text-center mb-2">
                特に感じている課題は？
              </h2>
              <p className="text-[14px] text-white/50 text-center mb-8">
                当てはまるものをすべて選んでください
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-[550px] mx-auto mb-6">
                {CHALLENGES.map((c) => {
                  const selected = challenges.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => onToggleChallenge(c.id)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-center gap-3 ${
                        selected
                          ? "border-[#1FABE9] bg-white"
                          : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                          selected
                            ? "bg-[#1FABE9] border-[#1FABE9]"
                            : "border-white/30"
                        }`}
                      >
                        {selected && (
                          <Icon name="check" className="text-[14px] text-white" />
                        )}
                      </div>
                      <span
                        className={`text-[13px] font-bold ${
                          selected ? "text-[#091747]" : "text-white"
                        }`}
                      >
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="text-center">
                <button
                  onClick={onSubmit}
                  disabled={challenges.length === 0}
                  className="px-8 py-3.5 bg-gradient-to-r from-[#1FABE9] to-[#34d399] text-white text-[16px] font-bold rounded-xl transition-all hover:shadow-[0_4px_20px_rgba(31,171,233,0.4)] hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Icon name="auto_awesome" className="text-[20px] mr-1 align-middle" />
                  診断結果を見る
                </button>
                <BackButton onClick={onBack} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
