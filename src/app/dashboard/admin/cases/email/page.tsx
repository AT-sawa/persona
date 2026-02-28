"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { parseCaseEmail, type ParsedCase } from "@/lib/parse-case-email";

export default function AdminCaseEmailPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [parsed, setParsed] = useState<ParsedCase | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.is_admin) {
        router.push("/dashboard");
        return;
      }
      setAuthorized(true);
    }
    checkAdmin();
  }, [router]);

  function handleParse() {
    if (!emailText.trim()) {
      setError("メール本文を貼り付けてください");
      return;
    }
    setError("");
    const result = parseCaseEmail(emailText);
    setParsed(result);
    setForm({
      title: result.title,
      case_no: result.case_no,
      category: result.category || "IT",
      industry: result.industry,
      fee: result.fee,
      occupancy: result.occupancy,
      location: result.location,
      office_days: result.office_days,
      start_date: result.start_date,
      extendable: result.extendable,
      background: result.background,
      description: result.description,
      must_req: result.must_req,
      nice_to_have: result.nice_to_have,
      flow: result.flow,
    });
    setSuccess(false);
  }

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(publish: boolean) {
    if (!form.title) {
      setError("タイトルは必須です");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("cases").insert({
        case_no: form.case_no || null,
        title: form.title,
        category: form.category || null,
        background: form.background || null,
        description: form.description || null,
        industry: form.industry || null,
        start_date: form.start_date || null,
        extendable: form.extendable || null,
        occupancy: form.occupancy || null,
        fee: form.fee || null,
        office_days: form.office_days || null,
        location: form.location || null,
        must_req: form.must_req || null,
        nice_to_have: form.nice_to_have || null,
        flow: form.flow || null,
        is_active: publish,
        status: publish ? "active" : "draft",
      });

      if (insertError) throw insertError;
      setSuccess(true);
      setEmailText("");
      setParsed(null);
      setForm({});
    } catch {
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  if (!authorized) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  const FORM_FIELDS: {
    key: string;
    label: string;
    type: "text" | "textarea" | "select";
    required?: boolean;
    placeholder?: string;
    options?: { value: string; label: string }[];
  }[] = [
    { key: "title", label: "タイトル", type: "text", required: true, placeholder: "案件名" },
    { key: "case_no", label: "案件番号", type: "text", placeholder: "P-2026-001" },
    { key: "category", label: "カテゴリ", type: "select", options: [
      { value: "IT", label: "IT" },
      { value: "非IT", label: "非IT" },
    ]},
    { key: "industry", label: "業界", type: "text", placeholder: "金融・保険" },
    { key: "fee", label: "報酬", type: "text", placeholder: "100~150万円/月" },
    { key: "occupancy", label: "稼働率", type: "text", placeholder: "100%" },
    { key: "location", label: "勤務地", type: "text", placeholder: "東京都千代田区" },
    { key: "office_days", label: "出社日数", type: "text", placeholder: "週3日出社 / フルリモート" },
    { key: "start_date", label: "開始日", type: "text", placeholder: "2026年4月〜" },
    { key: "extendable", label: "延長可否", type: "text", placeholder: "延長可能" },
    { key: "background", label: "案件背景", type: "textarea", placeholder: "案件の背景・経緯" },
    { key: "description", label: "業務内容", type: "textarea", placeholder: "具体的な業務内容" },
    { key: "must_req", label: "必須要件", type: "textarea", placeholder: "必須スキル・経験" },
    { key: "nice_to_have", label: "歓迎要件", type: "textarea", placeholder: "あると望ましい経験" },
    { key: "flow", label: "選考フロー", type: "textarea", placeholder: "面談回数・選考ステップ" },
  ];

  return (
    <div className="py-6">
      <div className="mb-6">
        <Link
          href="/dashboard/admin/cases"
          className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
        >
          ← 案件管理
        </Link>
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          ADMIN / EMAIL INTAKE
        </p>
        <h1 className="text-xl font-black text-navy">メールから案件登録</h1>
        <p className="text-[13px] text-[#888] mt-1">
          パートナーからの案件メールを貼り付けると、自動で各フィールドを抽出します。
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-[#ecfdf5] border border-[#10b981]/20 p-5 mb-5 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-bold text-[#10b981]">案件を登録しました</p>
            <p className="text-[12px] text-[#666] mt-0.5">
              続けて別のメールから案件を登録できます。
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/admin/cases"
              className="px-4 py-2 text-[12px] font-bold text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/5 transition-colors"
            >
              案件管理へ
            </Link>
          </div>
        </div>
      )}

      {/* Step 1: Paste email */}
      {!parsed && (
        <div className="bg-white border border-border p-6 mb-5">
          <h2 className="text-sm font-bold text-navy mb-1 pb-3 border-b-2 border-[#E15454]">
            STEP 1 — メール本文を貼り付け
          </h2>
          <p className="text-[12px] text-[#888] mb-3">
            案件情報が含まれるメールの本文をそのまま貼り付けてください。
            件名・ヘッダー含めてOKです。
          </p>
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            rows={16}
            placeholder={`例:\n\n■案件名：PMO支援｜大手金融機関のDX推進プロジェクト\n■業界：金融\n■報酬：130~160万円/月\n■稼働率：100%\n■勤務地：東京都千代田区（週3日出社）\n■開始日：2026年4月〜\n■業務内容：\n・DX推進プロジェクトのPMO支援\n・進捗管理、課題管理、リスク管理\n・各ステークホルダーとの調整\n■必須要件：\n・PMO経験3年以上\n・金融業界でのプロジェクト経験\n■歓迎要件：\n・PMP資格保持者`}
            className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none font-mono leading-[1.7]"
          />
          {error && <p className="text-[12px] text-[#E15454] mt-2">{error}</p>}
          <div className="mt-3 flex gap-3">
            <button
              onClick={handleParse}
              className="px-8 py-3 bg-[#E15454] text-white text-[14px] font-bold hover:bg-[#d04343] transition-colors"
            >
              解析する
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review & edit parsed fields */}
      {parsed && (
        <>
          {/* Extraction summary */}
          <div className="bg-blue/[0.04] border border-blue/20 p-4 mb-5">
            <p className="text-[13px] font-bold text-navy mb-1">
              {parsed._extractedFields.length} フィールドを自動抽出しました
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {FORM_FIELDS.map((f) => (
                <span
                  key={f.key}
                  className={`px-2 py-0.5 text-[11px] rounded-full ${
                    parsed._extractedFields.includes(f.key)
                      ? "bg-blue/10 text-blue font-bold"
                      : "bg-[#f2f2f7] text-[#bbb]"
                  }`}
                >
                  {f.label}
                </span>
              ))}
            </div>
          </div>

          {/* Editable form */}
          <div className="bg-white border border-border p-6 mb-5">
            <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b-2 border-[#E15454]">
              STEP 2 — 内容を確認・編集
            </h2>
            <div className="flex flex-col gap-4">
              {FORM_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="flex items-center gap-2 text-[11px] font-bold text-[#888] mb-1">
                    {field.label}
                    {field.required && (
                      <span className="text-[#E15454]">*必須</span>
                    )}
                    {parsed._extractedFields.includes(field.key) && (
                      <span className="text-[10px] text-blue bg-blue/10 px-1.5 py-0.5 rounded font-normal">
                        自動抽出
                      </span>
                    )}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={form[field.key] || ""}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      rows={4}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={form[field.key] || ""}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form[field.key] || ""}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {error && <p className="text-[12px] text-[#E15454] mb-3">{error}</p>}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-8 py-3 bg-[#E15454] text-white text-[14px] font-bold hover:bg-[#d04343] transition-colors disabled:opacity-50"
            >
              {saving ? "保存中..." : "公開して登録"}
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-6 py-3 border border-border text-[14px] font-bold text-navy hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
            >
              下書き保存
            </button>
            <button
              onClick={() => {
                setParsed(null);
                setForm({});
                setError("");
              }}
              className="px-4 py-3 text-[13px] text-[#888] hover:text-navy transition-colors"
            >
              やり直す
            </button>
          </div>

          {/* Original email (collapsible) */}
          <details className="bg-[#f9f9fb] border border-border p-4 mb-5">
            <summary className="text-[12px] font-bold text-[#888] cursor-pointer">
              元のメール本文を表示
            </summary>
            <pre className="mt-3 text-[11px] text-[#666] whitespace-pre-wrap leading-[1.7] font-mono max-h-[300px] overflow-y-auto">
              {parsed._rawEmail}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
