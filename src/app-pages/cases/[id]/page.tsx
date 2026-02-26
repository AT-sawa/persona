"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Case } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [entryMessage, setEntryMessage] = useState("");
  const [entrySubmitted, setEntrySubmitted] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser ? { id: currentUser.id } : null);

      const { data } = await supabase
        .from("cases")
        .select("*")
        .eq("id", params.id)
        .single();
      setCaseData(data);
      setLoading(false);
    }
    fetchData();
  }, [params.id]);

  async function handleEntry() {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    const supabase = createClient();
    await supabase.from("entries").insert({
      case_id: caseData!.id,
      user_id: user.id,
      message: entryMessage,
    });
    setEntrySubmitted(true);
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="py-[72px] px-6 min-h-screen">
          <div className="max-w-[800px] mx-auto text-sm text-[#888]">
            読み込み中...
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!caseData) {
    return (
      <>
        <Header />
        <main className="py-[72px] px-6 min-h-screen">
          <div className="max-w-[800px] mx-auto text-sm text-[#888]">
            案件が見つかりません。
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="py-[72px] px-6 bg-gray-bg min-h-screen">
        <div className="max-w-[800px] mx-auto">
          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
            CASE DETAIL
          </p>
          <h1 className="text-xl font-black text-navy leading-[1.4] mb-6">
            {caseData.title}
          </h1>

          <div className="bg-white border border-border p-8 mb-6">
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "案件番号", value: caseData.case_no },
                  { label: "カテゴリ", value: caseData.category },
                  { label: "業界", value: caseData.industry },
                  { label: "報酬", value: caseData.fee },
                  { label: "稼働率", value: caseData.occupancy },
                  { label: "参画日", value: caseData.start_date },
                  { label: "延長可能性", value: caseData.extendable },
                  { label: "出社頻度", value: caseData.office_days },
                  { label: "場所", value: caseData.location },
                  { label: "商流", value: caseData.flow },
                ].map(
                  (row) =>
                    row.value && (
                      <tr key={row.label} className="border-b border-border">
                        <td className="py-3 pr-4 font-bold text-navy w-[140px] align-top">
                          {row.label}
                        </td>
                        <td className="py-3 text-[#555] whitespace-pre-wrap">
                          {row.value}
                        </td>
                      </tr>
                    )
                )}
              </tbody>
            </table>
          </div>

          {caseData.background && (
            <div className="bg-white border border-border p-8 mb-6">
              <h2 className="text-sm font-bold text-navy mb-3">背景</h2>
              <p className="text-[13px] text-[#555] leading-[1.85] whitespace-pre-wrap">
                {caseData.background}
              </p>
            </div>
          )}

          {caseData.description && (
            <div className="bg-white border border-border p-8 mb-6">
              <h2 className="text-sm font-bold text-navy mb-3">
                作業内容・ポジション
              </h2>
              <p className="text-[13px] text-[#555] leading-[1.85] whitespace-pre-wrap">
                {caseData.description}
              </p>
            </div>
          )}

          {caseData.must_req && (
            <div className="bg-white border border-border p-8 mb-6">
              <h2 className="text-sm font-bold text-navy mb-3">必須スキル</h2>
              <p className="text-[13px] text-[#555] leading-[1.85] whitespace-pre-wrap">
                {caseData.must_req}
              </p>
            </div>
          )}

          {caseData.nice_to_have && (
            <div className="bg-white border border-border p-8 mb-6">
              <h2 className="text-sm font-bold text-navy mb-3">尚可スキル</h2>
              <p className="text-[13px] text-[#555] leading-[1.85] whitespace-pre-wrap">
                {caseData.nice_to_have}
              </p>
            </div>
          )}

          {/* Entry form */}
          <div className="bg-white border border-border p-8">
            <h2 className="text-[15px] font-black text-navy pb-3 border-b-2 border-blue mb-5">
              この案件にエントリーする
            </h2>
            {entrySubmitted ? (
              <p className="text-sm text-blue font-bold">
                エントリーを送信しました。担当者よりご連絡いたします。
              </p>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-[11px] font-bold text-[#888] mb-1">
                    メッセージ（任意）
                  </label>
                  <textarea
                    value={entryMessage}
                    onChange={(e) => setEntryMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white resize-none"
                    placeholder="志望動機や自己PRをご記入ください"
                  />
                </div>
                <button
                  onClick={handleEntry}
                  className="w-full py-3.5 bg-blue text-white border-none text-[15px] font-bold cursor-pointer transition-colors hover:bg-blue-dark"
                >
                  {user ? "エントリーする" : "ログインしてエントリー"}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
