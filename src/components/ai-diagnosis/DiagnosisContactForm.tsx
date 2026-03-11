"use client";

import { useState, forwardRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendNotification } from "@/lib/notify";
import { useHoneypot } from "@/lib/useHoneypot";
import type { DiagnosisResult } from "./diagnosis-data";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

interface Props {
  result: DiagnosisResult;
  department: string;
  businessFunction: string;
  companySize: string;
  systems: string[];
  challenges: string[];
}

const DiagnosisContactForm = forwardRef<HTMLDivElement, Props>(
  function DiagnosisContactForm(
    { result, department, businessFunction, companySize, systems, challenges },
    ref
  ) {
    const [formData, setFormData] = useState({
      companyName: "",
      fullName: "",
      email: "",
      phone: "",
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const hp = useHoneypot();

    function update(key: string, value: string) {
      setFormData((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (hp.isFilled) {
        setSubmitted(true);
        return;
      }
      if (!formData.companyName || !formData.fullName || !formData.email) {
        setError("必須項目をすべて入力してください");
        return;
      }
      setError("");
      setLoading(true);
      try {
        const supabase = createClient();

        const diagnosisSummary = [
          `【AI業務診断結果】`,
          `部署: ${result.departmentLabel}`,
          `業務: ${result.functionLabel}`,
          `規模: ${result.companySizeLabel}`,
          `利用システム: ${systems.join(", ")}`,
          `課題: ${challenges.join(", ")}`,
          ``,
          `月間削減見込: ${result.estimatedHoursSaved}時間`,
          `年間コスト削減: ${result.estimatedCostSaved}万円`,
          `自動化ポテンシャル: ${result.automationPotential}%`,
          ``,
          `改善対象業務:`,
          ...result.workflows.map(
            (wf) =>
              `- ${wf.taskName}: ${wf.beforeHours}h→${wf.afterHours}h (${wf.reductionPercent}%削減)`
          ),
        ].join("\n");

        const { error: insertError } = await supabase
          .from("inquiries")
          .insert({
            type: "ai_diagnosis",
            company_name: formData.companyName,
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone || null,
            message: diagnosisSummary,
          });
        if (insertError) throw insertError;

        sendNotification("enterprise_inquiry", {
          company_name: `【AI診断】${formData.companyName}`,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          message: diagnosisSummary,
        });

        setSubmitted(true);
      } catch {
        setError("送信に失敗しました。もう一度お試しください。");
      } finally {
        setLoading(false);
      }
    }

    return (
      <section ref={ref} className="py-16 px-6 bg-[#f8f9fb]" id="diagnosis-contact">
        <div className="max-w-[500px] mx-auto">
          {submitted ? (
            <div className="bg-white rounded-2xl border border-[#e8e8ed] p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#34d399]/10 flex items-center justify-center">
                <Icon name="check" className="text-[28px] text-[#34d399]" />
              </div>
              <p className="text-[16px] font-bold text-[#091747] mb-2">
                送信しました
              </p>
              <p className="text-[13px] text-[#888] leading-[1.8]">
                診断結果レポートを担当者よりお送りいたします。
                <br />
                2営業日以内にご連絡いたします。
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-[#e8e8ed] p-8"
            >
              <div className="text-center mb-6">
                <Icon
                  name="description"
                  className="text-[32px] text-[#1FABE9] mb-2 block mx-auto"
                />
                <h3 className="text-[16px] font-bold text-[#091747] mb-1">
                  診断結果レポートをメールで受け取る
                </h3>
                <p className="text-[12px] text-[#888]">
                  詳細な分析結果と具体的な導入提案をお送りします
                </p>
              </div>

              {[
                {
                  key: "companyName",
                  label: "会社名",
                  type: "text",
                  placeholder: "株式会社〇〇",
                  required: true,
                },
                {
                  key: "fullName",
                  label: "ご担当者名",
                  type: "text",
                  placeholder: "山田 太郎",
                  required: true,
                },
                {
                  key: "email",
                  label: "メールアドレス",
                  type: "email",
                  placeholder: "example@company.com",
                  required: true,
                },
                {
                  key: "phone",
                  label: "電話番号",
                  type: "tel",
                  placeholder: "03-0000-0000",
                  required: false,
                },
              ].map((field) => (
                <div key={field.key} className="mb-4">
                  <label className="block text-[12px] font-semibold text-[#555] mb-1.5">
                    {field.label}
                    {field.required && (
                      <span className="text-[#E15454] text-[10px] ml-1">
                        *必須
                      </span>
                    )}
                  </label>
                  <input
                    type={field.type}
                    value={formData[field.key as keyof typeof formData]}
                    onChange={(e) => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-3 rounded-xl border border-[#e8e8ed] text-[13px] text-[#091747] outline-none bg-[#f8f9fb] focus:border-[#1FABE9] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,171,233,0.08)] transition-all placeholder:text-[#bbb]"
                  />
                </div>
              ))}

              {/* Honeypot */}
              <input
                type="text"
                name="website"
                value={hp.value}
                onChange={(e) => hp.setValue(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="absolute opacity-0 h-0 w-0 pointer-events-none"
                aria-hidden="true"
              />

              {error && (
                <p className="text-[12px] text-[#E15454] mb-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#1FABE9] to-[#34d399] text-white text-[15px] font-bold rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(31,171,233,0.3)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? "送信中..." : "レポートを受け取る"}
              </button>
              <p className="text-[11px] text-[#aaa] text-center mt-3">
                2営業日以内に担当者よりご連絡いたします
              </p>
            </form>
          )}
        </div>
      </section>
    );
  }
);

export default DiagnosisContactForm;
