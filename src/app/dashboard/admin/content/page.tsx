"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ── Types ── */
interface MasterEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Question {
  id: string;
  question: string;
  context: string | null;
  source: string;
  answer: string | null;
  status: string;
  related_keyword: string | null;
  answered_at: string | null;
  applied_at: string | null;
  created_at: string;
}

interface UpdateLog {
  id: string;
  update_type: string;
  target_slug: string | null;
  keyword: string | null;
  before_content: string | null;
  after_content: string | null;
  reason: string;
  status: string;
  auto_generated: boolean;
  created_at: string;
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  brand_voice: "ブランドボイス",
  facts: "事実データ",
  instructions: "記事ルール",
  ng_words: "NG表現",
  keywords: "重要キーワード",
  qa: "Q&A（蓄積ナレッジ）",
};

const CATEGORY_ICONS: Record<string, string> = {
  brand_voice: "record_voice_over",
  facts: "fact_check",
  instructions: "rule",
  ng_words: "block",
  keywords: "key",
  qa: "question_answer",
};

const CATEGORY_ORDER = [
  "brand_voice",
  "facts",
  "instructions",
  "ng_words",
  "keywords",
  "qa",
];

const STATUS_LABELS: Record<string, string> = {
  pending: "未回答",
  answered: "回答済み",
  applied: "反映済み",
  dismissed: "却下",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  answered: "bg-blue-50 text-blue-700 border-blue-200",
  applied: "bg-green-50 text-green-700 border-green-200",
  dismissed: "bg-gray-50 text-gray-500 border-gray-200",
};

const UPDATE_TYPE_LABELS: Record<string, string> = {
  meta_title: "タイトル更新",
  meta_description: "ディスクリプション更新",
  article_rewrite: "記事リライト",
  new_draft: "新記事ドラフト",
  keyword_update: "キーワード更新",
};

type Tab = "master" | "questions" | "updates";

export default function ContentManagementPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("master");
  const [loading, setLoading] = useState(true);

  // Master state
  const [entries, setEntries] = useState<MasterEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "" });
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ title: "", content: "" });

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionFilter, setQuestionFilter] = useState<string>("pending");
  const [answerForm, setAnswerForm] = useState<Record<string, string>>({});
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ question: "", context: "" });

  // Updates state
  const [updates, setUpdates] = useState<UpdateLog[]>([]);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
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
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  // Fetch master entries
  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/admin/content-master");
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries || []);
    }
  }, []);

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    const url =
      questionFilter === "all"
        ? "/api/admin/content-questions"
        : `/api/admin/content-questions?status=${questionFilter}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions || []);
    }
  }, [questionFilter]);

  // Fetch updates
  const fetchUpdates = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("content_updates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setUpdates(data || []);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (tab === "master") fetchEntries();
      else if (tab === "questions") fetchQuestions();
      else if (tab === "updates") fetchUpdates();
    }
  }, [tab, loading, fetchEntries, fetchQuestions, fetchUpdates]);

  // ── Master CRUD handlers ──

  async function handleAddEntry() {
    if (!addingCategory || !addForm.title || !addForm.content) return;
    const res = await fetch("/api/admin/content-master", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: addingCategory,
        title: addForm.title,
        content: addForm.content,
      }),
    });
    if (res.ok) {
      setAddingCategory(null);
      setAddForm({ title: "", content: "" });
      fetchEntries();
    }
  }

  async function handleUpdateEntry(id: string) {
    const res = await fetch("/api/admin/content-master", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title: editForm.title,
        content: editForm.content,
      }),
    });
    if (res.ok) {
      setEditingId(null);
      fetchEntries();
    }
  }

  async function handleDeleteEntry(id: string) {
    if (!confirm("このエントリを削除しますか？")) return;
    const res = await fetch("/api/admin/content-master", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchEntries();
  }

  // ── Question handlers ──

  async function handleAnswerQuestion(id: string, applyToMaster: boolean) {
    const answer = answerForm[id];
    if (!answer) return;
    const res = await fetch("/api/admin/content-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, answer, apply_to_master: applyToMaster }),
    });
    if (res.ok) {
      setAnswerForm((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchQuestions();
    }
  }

  async function handleDismissQuestion(id: string) {
    const res = await fetch("/api/admin/content-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dismiss: true }),
    });
    if (res.ok) fetchQuestions();
  }

  async function handleAddQuestion() {
    if (!newQuestion.question) return;
    const res = await fetch("/api/admin/content-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: newQuestion.question,
        context: newQuestion.context || null,
        source: "manual",
      }),
    });
    if (res.ok) {
      setAddingQuestion(false);
      setNewQuestion({ question: "", context: "" });
      fetchQuestions();
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  // Group master entries by category
  const grouped: Record<string, MasterEntry[]> = {};
  for (const e of entries) {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
          CONTENT MANAGEMENT
        </p>
        <h1 className="text-xl font-black text-navy">
          コンテンツ管理
        </h1>
        <p className="text-[12px] text-[#888] mt-1">
          マスタープロンプト・質問キュー・自動更新ログの管理
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {(
          [
            { key: "master", label: "マスター", icon: "auto_awesome" },
            { key: "questions", label: "質問キュー", icon: "help" },
            { key: "updates", label: "更新ログ", icon: "history" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-[13px] font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === t.key
                ? "text-navy border-[#E15454]"
                : "text-[#888] border-transparent hover:text-navy"
            }`}
          >
            <Icon name={t.icon} className="text-[18px]" />
            {t.label}
            {t.key === "questions" &&
              questions.length > 0 &&
              questionFilter === "pending" && (
                <span className="ml-1 bg-[#E15454] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {questions.length}
                </span>
              )}
          </button>
        ))}
      </div>

      {/* ============ Master Tab ============ */}
      {tab === "master" && (
        <div className="space-y-4">
          {CATEGORY_ORDER.map((cat) => (
            <div key={cat} className="bg-white border border-border">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon
                    name={CATEGORY_ICONS[cat] || "article"}
                    className="text-[20px] text-[#E15454]"
                  />
                  <h3 className="text-[14px] font-bold text-navy">
                    {CATEGORY_LABELS[cat] || cat}
                  </h3>
                  <span className="text-[11px] text-[#aaa]">
                    ({(grouped[cat] || []).length}件)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setAddingCategory(addingCategory === cat ? null : cat);
                    setAddForm({ title: "", content: "" });
                  }}
                  className="text-[12px] font-bold text-blue hover:underline flex items-center gap-0.5"
                >
                  <Icon name="add" className="text-[16px]" />
                  追加
                </button>
              </div>

              {/* Add form */}
              {addingCategory === cat && (
                <div className="px-5 py-3 bg-blue-50/50 border-b border-border space-y-2">
                  <input
                    type="text"
                    placeholder="タイトル"
                    value={addForm.title}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="w-full border border-border px-3 py-2 text-[13px]"
                  />
                  <textarea
                    placeholder="内容"
                    value={addForm.content}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, content: e.target.value }))
                    }
                    rows={3}
                    className="w-full border border-border px-3 py-2 text-[13px]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddEntry}
                      className="px-4 py-1.5 bg-blue text-white text-[12px] font-bold hover:bg-blue-dark"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setAddingCategory(null)}
                      className="px-4 py-1.5 text-[12px] text-[#888] hover:text-navy"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}

              {/* Entries */}
              <div className="divide-y divide-border/50">
                {(grouped[cat] || []).map((entry) => (
                  <div key={entry.id} className="px-5 py-3">
                    {editingId === entry.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              title: e.target.value,
                            }))
                          }
                          className="w-full border border-border px-3 py-2 text-[13px]"
                        />
                        <textarea
                          value={editForm.content}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              content: e.target.value,
                            }))
                          }
                          rows={3}
                          className="w-full border border-border px-3 py-2 text-[13px]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateEntry(entry.id)}
                            className="px-4 py-1.5 bg-blue text-white text-[12px] font-bold"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-1.5 text-[12px] text-[#888]"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-navy">
                            {entry.title}
                          </p>
                          <p className="text-[12px] text-[#666] mt-0.5 whitespace-pre-wrap">
                            {entry.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingId(entry.id);
                              setEditForm({
                                title: entry.title,
                                content: entry.content,
                              });
                            }}
                            className="p-1 text-[#888] hover:text-blue"
                            title="編集"
                          >
                            <Icon name="edit" className="text-[16px]" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1 text-[#888] hover:text-red-500"
                            title="削除"
                          >
                            <Icon name="delete" className="text-[16px]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(!grouped[cat] || grouped[cat].length === 0) && (
                  <div className="px-5 py-4 text-[12px] text-[#aaa] text-center">
                    まだエントリがありません
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============ Questions Tab ============ */}
      {tab === "questions" && (
        <div>
          {/* Filter & add */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {["pending", "answered", "applied", "dismissed", "all"].map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setQuestionFilter(f)}
                    className={`px-3 py-1.5 text-[12px] font-bold border transition-colors ${
                      questionFilter === f
                        ? "bg-navy text-white border-navy"
                        : "text-[#888] border-border hover:text-navy"
                    }`}
                  >
                    {f === "all" ? "すべて" : STATUS_LABELS[f] || f}
                  </button>
                ),
              )}
            </div>
            <button
              onClick={() => setAddingQuestion(!addingQuestion)}
              className="text-[12px] font-bold text-blue hover:underline flex items-center gap-0.5"
            >
              <Icon name="add" className="text-[16px]" />
              質問を追加
            </button>
          </div>

          {/* Add question form */}
          {addingQuestion && (
            <div className="bg-white border border-border p-5 mb-4 space-y-2">
              <textarea
                placeholder="質問内容"
                value={newQuestion.question}
                onChange={(e) =>
                  setNewQuestion((p) => ({ ...p, question: e.target.value }))
                }
                rows={2}
                className="w-full border border-border px-3 py-2 text-[13px]"
              />
              <input
                type="text"
                placeholder="背景・コンテキスト（任意）"
                value={newQuestion.context}
                onChange={(e) =>
                  setNewQuestion((p) => ({ ...p, context: e.target.value }))
                }
                className="w-full border border-border px-3 py-2 text-[13px]"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddQuestion}
                  className="px-4 py-1.5 bg-blue text-white text-[12px] font-bold"
                >
                  追加
                </button>
                <button
                  onClick={() => setAddingQuestion(false)}
                  className="px-4 py-1.5 text-[12px] text-[#888]"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* Questions list */}
          <div className="space-y-3">
            {questions.length === 0 && (
              <div className="bg-white border border-border p-8 text-center text-[13px] text-[#aaa]">
                {questionFilter === "pending"
                  ? "未回答の質問はありません"
                  : "質問がありません"}
              </div>
            )}
            {questions.map((q) => (
              <div key={q.id} className="bg-white border border-border p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold border ${
                          STATUS_STYLES[q.status] || ""
                        }`}
                      >
                        {STATUS_LABELS[q.status] || q.status}
                      </span>
                      <span className="text-[10px] text-[#aaa]">
                        {q.source === "auto"
                          ? "AI自動生成"
                          : q.source === "seo_analysis"
                            ? "SEO分析"
                            : "手動"}
                      </span>
                      {q.related_keyword && (
                        <span className="text-[10px] text-blue">
                          KW: {q.related_keyword}
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] font-bold text-navy">
                      {q.question}
                    </p>
                    {q.context && (
                      <p className="text-[12px] text-[#888] mt-1">
                        背景: {q.context}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-[#aaa] shrink-0">
                    {new Date(q.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>

                {/* Answer display */}
                {q.answer && (
                  <div className="mt-3 p-3 bg-green-50/50 border border-green-100">
                    <p className="text-[11px] font-bold text-green-700 mb-1">
                      回答:
                    </p>
                    <p className="text-[13px] text-[#333] whitespace-pre-wrap">
                      {q.answer}
                    </p>
                  </div>
                )}

                {/* Answer form (pending only) */}
                {q.status === "pending" && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      placeholder="回答を入力..."
                      value={answerForm[q.id] || ""}
                      onChange={(e) =>
                        setAnswerForm((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full border border-border px-3 py-2 text-[13px]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAnswerQuestion(q.id, true)}
                        disabled={!answerForm[q.id]}
                        className="px-4 py-1.5 bg-green-600 text-white text-[12px] font-bold hover:bg-green-700 disabled:opacity-50"
                      >
                        回答 & マスターに反映
                      </button>
                      <button
                        onClick={() => handleAnswerQuestion(q.id, false)}
                        disabled={!answerForm[q.id]}
                        className="px-4 py-1.5 bg-blue text-white text-[12px] font-bold hover:bg-blue-dark disabled:opacity-50"
                      >
                        回答のみ
                      </button>
                      <button
                        onClick={() => handleDismissQuestion(q.id)}
                        className="px-4 py-1.5 text-[12px] text-[#888] hover:text-red-500"
                      >
                        却下
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ Updates Tab ============ */}
      {tab === "updates" && (
        <div>
          {updates.length === 0 ? (
            <div className="bg-white border border-border p-8 text-center text-[13px] text-[#aaa]">
              まだ更新ログはありません
            </div>
          ) : (
            <div className="space-y-2">
              {updates.map((u) => (
                <div key={u.id} className="bg-white border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {UPDATE_TYPE_LABELS[u.update_type] || u.update_type}
                        </span>
                        {u.auto_generated && (
                          <span className="text-[10px] text-[#E15454] font-bold">
                            自動
                          </span>
                        )}
                        {u.target_slug && (
                          <span className="text-[10px] text-[#888]">
                            /blog/{u.target_slug}
                          </span>
                        )}
                        {u.keyword && (
                          <span className="text-[10px] text-blue">
                            KW: {u.keyword}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold ${
                            u.status === "applied"
                              ? "text-green-600"
                              : u.status === "reverted"
                                ? "text-red-500"
                                : "text-yellow-600"
                          }`}
                        >
                          {u.status === "applied"
                            ? "適用済み"
                            : u.status === "reverted"
                              ? "差し戻し"
                              : "ドラフト"}
                        </span>
                      </div>
                      <p className="text-[13px] text-navy font-bold">
                        {u.reason}
                      </p>
                      {u.before_content && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
                          <div className="p-2 bg-red-50/50 border border-red-100">
                            <span className="text-[10px] font-bold text-red-500 block mb-0.5">
                              変更前
                            </span>
                            <span className="text-[#666] break-all">
                              {u.before_content.length > 200
                                ? u.before_content.slice(0, 200) + "..."
                                : u.before_content}
                            </span>
                          </div>
                          <div className="p-2 bg-green-50/50 border border-green-100">
                            <span className="text-[10px] font-bold text-green-600 block mb-0.5">
                              変更後
                            </span>
                            <span className="text-[#666] break-all">
                              {(u.after_content || "").length > 200
                                ? (u.after_content || "").slice(0, 200) + "..."
                                : u.after_content || ""}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-[#aaa] shrink-0">
                      {new Date(u.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
