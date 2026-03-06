"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Perk, PerkCategory } from "@/lib/types";

const TIER_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
];

const TIER_BADGE: Record<string, { color: string; bg: string }> = {
  standard: { color: "text-blue", bg: "bg-[#EBF7FD]" },
  gold: { color: "text-[#b45309]", bg: "bg-[#fef3c7]" },
  platinum: { color: "text-[#7c3aed]", bg: "bg-[#ede9fe]" },
};

interface PerkFormData {
  category_id: string;
  title: string;
  provider: string;
  description: string;
  benefit_summary: string;
  details: string;
  how_to_use: string;
  external_url: string;
  image_url: string;
  tier: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  valid_from: string;
  valid_until: string;
}

const EMPTY_FORM: PerkFormData = {
  category_id: "",
  title: "",
  provider: "",
  description: "",
  benefit_summary: "",
  details: "",
  how_to_use: "",
  external_url: "",
  image_url: "",
  tier: "standard",
  is_active: true,
  is_featured: false,
  sort_order: 0,
  valid_from: "",
  valid_until: "",
};

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

export default function AdminPerksPage() {
  const router = useRouter();
  const [perks, setPerks] = useState<Perk[]>([]);
  const [categories, setCategories] = useState<PerkCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PerkFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchPerks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/perks");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }
        return;
      }
      const data = await res.json();
      setPerks(data.perks ?? []);
      setCategories(data.categories ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPerks();
  }, [fetchPerks]);

  function updateForm(field: keyof PerkFormData, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit(perk: Perk) {
    setEditingId(perk.id);
    setForm({
      category_id: perk.category_id,
      title: perk.title,
      provider: perk.provider || "",
      description: perk.description || "",
      benefit_summary: perk.benefit_summary || "",
      details: perk.details || "",
      how_to_use: perk.how_to_use || "",
      external_url: perk.external_url || "",
      image_url: perk.image_url || "",
      tier: perk.tier,
      is_active: perk.is_active,
      is_featured: perk.is_featured,
      sort_order: perk.sort_order,
      valid_from: perk.valid_from ? perk.valid_from.split("T")[0] : "",
      valid_until: perk.valid_until ? perk.valid_until.split("T")[0] : "",
    });
    setShowAddForm(false);
    setExpandedId(perk.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startAdd() {
    setShowAddForm(true);
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      category_id: categories.length > 0 ? categories[0].id : "",
    });
  }

  async function handleSave() {
    if (!form.title.trim() || !form.category_id) return;
    setSaving(true);

    try {
      if (editingId) {
        // Update existing perk
        const res = await fetch("/api/admin/perks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            ...form,
            valid_from: form.valid_from || null,
            valid_until: form.valid_until || null,
            provider: form.provider || null,
            description: form.description || null,
            benefit_summary: form.benefit_summary || null,
            details: form.details || null,
            how_to_use: form.how_to_use || null,
            external_url: form.external_url || null,
            image_url: form.image_url || null,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPerks((prev) =>
            prev.map((p) => (p.id === editingId ? data.perk : p))
          );
          setEditingId(null);
          setForm(EMPTY_FORM);
        }
      } else {
        // Create new perk
        const res = await fetch("/api/admin/perks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            valid_from: form.valid_from || null,
            valid_until: form.valid_until || null,
            provider: form.provider || null,
            description: form.description || null,
            benefit_summary: form.benefit_summary || null,
            details: form.details || null,
            how_to_use: form.how_to_use || null,
            external_url: form.external_url || null,
            image_url: form.image_url || null,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPerks((prev) => [data.perk, ...prev]);
          setShowAddForm(false);
          setForm(EMPTY_FORM);
        }
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      const res = await fetch("/api/admin/perks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      if (res.ok) {
        setPerks((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, is_active: !currentActive } : p
          )
        );
      }
    } catch {
      // silently fail
    }
  }

  async function toggleFeatured(id: string, currentFeatured: boolean) {
    try {
      const res = await fetch("/api/admin/perks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_featured: !currentFeatured }),
      });
      if (res.ok) {
        setPerks((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, is_featured: !currentFeatured } : p
          )
        );
      }
    } catch {
      // silently fail
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/perks?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPerks((prev) => prev.filter((p) => p.id !== id));
        setDeleteConfirm(null);
        if (expandedId === id) setExpandedId(null);
      }
    } catch {
      // silently fail
    }
  }

  // Filtering
  const filtered = perks
    .filter((p) => {
      if (filter === "active") return p.is_active;
      if (filter === "inactive") return !p.is_active;
      if (filter === "featured") return p.is_featured;
      return true;
    })
    .filter((p) => {
      if (categoryFilter === "all") return true;
      return p.category_id === categoryFilter;
    })
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.provider || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    });

  // Stats
  const activeCount = perks.filter((p) => p.is_active).length;
  const featuredCount = perks.filter((p) => p.is_featured).length;

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <Link
            href="/dashboard/admin"
            className="text-[12px] text-[#E15454] hover:underline mb-2 inline-block"
          >
            &larr; 管理者TOP
          </Link>
          <p className="text-[10px] font-bold text-[#E15454] tracking-[0.18em] uppercase mb-1">
            ADMIN / PERKS
          </p>
          <h1 className="text-xl font-black text-navy">特典管理</h1>
          <p className="text-[12px] text-[#888] mt-1">
            コンサルタント向け特典・優待を管理します
          </p>
        </div>
        <button
          onClick={startAdd}
          className="px-4 py-2 bg-[#E15454] text-white text-[13px] font-bold hover:bg-[#d04343] transition-colors rounded-lg flex items-center gap-1"
        >
          <Icon name="add" className="text-[18px]" />
          特典を追加
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-[11px] text-[#999] mb-1">合計</p>
          <p className="text-2xl font-black text-navy">{perks.length}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-[11px] text-[#999] mb-1">公開中</p>
          <p className="text-2xl font-black text-[#10b981]">{activeCount}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-[11px] text-[#999] mb-1">おすすめ</p>
          <p className="text-2xl font-black text-[#f59e0b]">{featuredCount}</p>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white border border-[#E15454]/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-navy flex items-center gap-2">
              <Icon name="add_circle" className="text-[20px] text-[#E15454]" />
              新しい特典を追加
            </h2>
            <button
              onClick={() => {
                setShowAddForm(false);
                setForm(EMPTY_FORM);
              }}
              className="text-[12px] text-[#888] hover:text-navy"
            >
              キャンセル
            </button>
          </div>
          <PerkForm
            form={form}
            categories={categories}
            onUpdate={updateForm}
            onSave={handleSave}
            saving={saving}
            isNew
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1">
          {[
            { value: "all", label: "すべて" },
            { value: "active", label: "公開中" },
            { value: "inactive", label: "非公開" },
            { value: "featured", label: "おすすめ" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 text-[12px] font-bold border transition-colors rounded-lg ${
                filter === opt.value
                  ? "bg-[#E15454] text-white border-[#E15454]"
                  : "bg-white text-[#666] border-border hover:border-[#E15454]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-[12px] border border-border rounded-lg px-3 py-1.5 text-[#555] bg-white"
        >
          <option value="all">全カテゴリ</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#aaa]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="タイトル、提供元で検索..."
            className="w-full text-[12px] border border-border rounded-lg pl-9 pr-3 py-1.5 text-[#555] placeholder:text-[#bbb]"
          />
        </div>
      </div>

      {/* Perks list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-8 text-center">
          <p className="text-[13px] text-[#888]">該当する特典がありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((perk) => {
            const isExpanded = expandedId === perk.id;
            const isEditing = editingId === perk.id;
            const category = perk.perk_categories;
            const tierBadge = TIER_BADGE[perk.tier] || TIER_BADGE.standard;

            return (
              <div
                key={perk.id}
                className="bg-white border border-border rounded-xl overflow-hidden"
              >
                {/* Summary row */}
                <div
                  className="p-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : perk.id)
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Row 1: badges */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Icon
                          name={isExpanded ? "expand_less" : "expand_more"}
                          className="text-[18px] text-[#999] shrink-0"
                        />
                        {category && (
                          <span className="text-[10px] font-bold text-blue bg-[#EBF7FD] px-2 py-0.5 rounded">
                            {category.name}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${tierBadge.color} ${tierBadge.bg}`}
                        >
                          {perk.tier}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            perk.is_active
                              ? "text-[#10b981] bg-[#ecfdf5]"
                              : "text-[#888] bg-[#f5f5f5]"
                          }`}
                        >
                          {perk.is_active ? "公開中" : "非公開"}
                        </span>
                        {perk.is_featured && (
                          <span className="text-[10px] font-bold text-[#f59e0b] bg-[#fef3c7] px-2 py-0.5 rounded">
                            おすすめ
                          </span>
                        )}
                      </div>

                      {/* Row 2: title */}
                      <p className="text-[14px] font-bold text-navy mb-1 ml-7">
                        {perk.title}
                      </p>

                      {/* Row 3: meta */}
                      <div className="ml-7 flex flex-wrap gap-2 text-[11px] text-[#aaa]">
                        {perk.provider && (
                          <span>提供: {perk.provider}</span>
                        )}
                        {perk.benefit_summary && (
                          <span className="text-[#92400e] bg-[#fef3c7] px-1.5 py-0.5 rounded font-medium">
                            {perk.benefit_summary}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div
                      className="flex gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => toggleFeatured(perk.id, perk.is_featured)}
                        title={perk.is_featured ? "おすすめを解除" : "おすすめに設定"}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                          perk.is_featured
                            ? "text-[#f59e0b] border-[#f59e0b] bg-[#fef3c7]"
                            : "text-[#ccc] border-border hover:text-[#f59e0b] hover:border-[#f59e0b]"
                        }`}
                      >
                        <Icon name="star" className="text-[16px]" />
                      </button>
                      <button
                        onClick={() => toggleActive(perk.id, perk.is_active)}
                        title={perk.is_active ? "非公開にする" : "公開する"}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                          perk.is_active
                            ? "text-[#10b981] border-[#10b981] bg-[#ecfdf5]"
                            : "text-[#888] border-border hover:text-[#10b981] hover:border-[#10b981]"
                        }`}
                      >
                        <Icon
                          name={perk.is_active ? "visibility" : "visibility_off"}
                          className="text-[16px]"
                        />
                      </button>
                      <button
                        onClick={() => startEdit(perk)}
                        title="編集"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#888] hover:text-blue hover:border-blue transition-colors"
                      >
                        <Icon name="edit" className="text-[16px]" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(perk.id)}
                        title="削除"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#888] hover:text-[#E15454] hover:border-[#E15454] transition-colors"
                      >
                        <Icon name="delete" className="text-[16px]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {isEditing ? (
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-[13px] font-bold text-navy flex items-center gap-2">
                            <Icon
                              name="edit"
                              className="text-[18px] text-blue"
                            />
                            特典を編集
                          </h3>
                          <button
                            onClick={cancelEdit}
                            className="text-[12px] text-[#888] hover:text-navy"
                          >
                            キャンセル
                          </button>
                        </div>
                        <PerkForm
                          form={form}
                          categories={categories}
                          onUpdate={updateForm}
                          onSave={handleSave}
                          saving={saving}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
                        {/* Left: Basic info */}
                        <div className="p-5">
                          <p className="text-[11px] font-bold text-[#E15454] tracking-[0.12em] uppercase mb-3">
                            基本情報
                          </p>
                          <div className="flex flex-col gap-2 text-[12px]">
                            <InfoRow label="タイトル" value={perk.title} highlight />
                            <InfoRow label="提供元" value={perk.provider} />
                            <InfoRow label="カテゴリ" value={category?.name} />
                            <InfoRow label="ティア" value={perk.tier} />
                            <InfoRow label="特典概要" value={perk.benefit_summary} highlight />
                            <InfoRow label="並び順" value={String(perk.sort_order)} />
                            <InfoRow
                              label="公開状態"
                              value={perk.is_active ? "公開中" : "非公開"}
                            />
                            <InfoRow
                              label="おすすめ"
                              value={perk.is_featured ? "はい" : "いいえ"}
                            />
                            {perk.valid_from && (
                              <InfoRow label="有効開始" value={perk.valid_from.split("T")[0]} />
                            )}
                            {perk.valid_until && (
                              <InfoRow label="有効終了" value={perk.valid_until.split("T")[0]} />
                            )}
                            {perk.external_url && (
                              <div className="flex gap-2">
                                <span className="text-[#999] shrink-0 w-[100px]">URL</span>
                                <a
                                  href={perk.external_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue hover:underline truncate"
                                >
                                  {perk.external_url}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Details */}
                        <div className="p-5">
                          <p className="text-[11px] font-bold text-blue tracking-[0.12em] uppercase mb-3">
                            詳細情報
                          </p>
                          <div className="flex flex-col gap-3">
                            {perk.description && (
                              <div>
                                <span className="text-[11px] text-[#999]">
                                  説明
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg">
                                  {perk.description}
                                </p>
                              </div>
                            )}
                            {perk.details && (
                              <div>
                                <span className="text-[11px] text-[#999]">
                                  詳細
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f9f9fc] p-3 rounded-lg max-h-[200px] overflow-y-auto">
                                  {perk.details}
                                </p>
                              </div>
                            )}
                            {perk.how_to_use && (
                              <div>
                                <span className="text-[11px] text-[#999]">
                                  利用方法
                                </span>
                                <p className="text-[12px] text-[#444] mt-1 whitespace-pre-wrap bg-[#f0f7ff] p-3 rounded-lg">
                                  {perk.how_to_use}
                                </p>
                              </div>
                            )}
                            {!perk.description &&
                              !perk.details &&
                              !perk.how_to_use && (
                                <p className="text-[12px] text-[#aaa] italic">
                                  詳細情報はありません
                                </p>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Delete confirmation */}
                {deleteConfirm === perk.id && (
                  <div className="border-t border-[#E15454]/30 bg-[#fef2f2] p-4 flex items-center justify-between">
                    <p className="text-[12px] text-[#E15454] font-bold">
                      「{perk.title}」を削除しますか？この操作は取り消せません。
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 text-[12px] font-bold text-[#666] border border-border bg-white rounded-lg hover:bg-[#f5f5f5]"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleDelete(perk.id)}
                        className="px-3 py-1.5 text-[12px] font-bold text-white bg-[#E15454] rounded-lg hover:bg-[#d04343]"
                      >
                        削除する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[12px]">
      <span className="text-[#999] shrink-0 w-[100px]">{label}</span>
      <span className={highlight ? "text-navy font-bold" : "text-[#333]"}>
        {value}
      </span>
    </div>
  );
}

function PerkForm({
  form,
  categories,
  onUpdate,
  onSave,
  saving,
  isNew,
}: {
  form: PerkFormData;
  categories: PerkCategory[];
  onUpdate: (field: keyof PerkFormData, value: string | boolean | number) => void;
  onSave: () => void;
  saving: boolean;
  isNew?: boolean;
}) {
  const inputCls =
    "w-full text-[13px] border border-border rounded-lg px-3 py-2 text-[#333] placeholder:text-[#bbb] focus:outline-none focus:border-blue/50 focus:ring-1 focus:ring-blue/20";
  const labelCls = "text-[11px] font-bold text-[#555] mb-1 block";

  return (
    <div className="space-y-4">
      {/* Row 1: Category + Tier */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>カテゴリ *</label>
          <select
            value={form.category_id}
            onChange={(e) => onUpdate("category_id", e.target.value)}
            className={inputCls}
          >
            <option value="">選択してください</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>ティア</label>
          <select
            value={form.tier}
            onChange={(e) => onUpdate("tier", e.target.value)}
            className={inputCls}
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>並び順</label>
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => onUpdate("sort_order", parseInt(e.target.value) || 0)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Row 2: Title + Provider */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>タイトル *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => onUpdate("title", e.target.value)}
            placeholder="特典タイトル"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>提供元</label>
          <input
            type="text"
            value={form.provider}
            onChange={(e) => onUpdate("provider", e.target.value)}
            placeholder="株式会社〇〇"
            className={inputCls}
          />
        </div>
      </div>

      {/* Row 3: Benefit summary */}
      <div>
        <label className={labelCls}>特典概要（バッジ表示）</label>
        <input
          type="text"
          value={form.benefit_summary}
          onChange={(e) => onUpdate("benefit_summary", e.target.value)}
          placeholder="例: 初月無料, 20%OFF, 特別価格"
          className={inputCls}
        />
      </div>

      {/* Row 4: Description */}
      <div>
        <label className={labelCls}>説明</label>
        <textarea
          value={form.description}
          onChange={(e) => onUpdate("description", e.target.value)}
          placeholder="特典の簡単な説明"
          rows={2}
          className={inputCls}
        />
      </div>

      {/* Row 5: Details */}
      <div>
        <label className={labelCls}>詳細</label>
        <textarea
          value={form.details}
          onChange={(e) => onUpdate("details", e.target.value)}
          placeholder="特典の詳細な説明"
          rows={4}
          className={inputCls}
        />
      </div>

      {/* Row 6: How to use */}
      <div>
        <label className={labelCls}>利用方法</label>
        <textarea
          value={form.how_to_use}
          onChange={(e) => onUpdate("how_to_use", e.target.value)}
          placeholder="1. 〇〇にアクセス&#10;2. コード「PERSONA」を入力&#10;3. 割引が適用されます"
          rows={3}
          className={inputCls}
        />
      </div>

      {/* Row 7: URLs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>外部URL</label>
          <input
            type="url"
            value={form.external_url}
            onChange={(e) => onUpdate("external_url", e.target.value)}
            placeholder="https://example.com"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>画像URL</label>
          <input
            type="url"
            value={form.image_url}
            onChange={(e) => onUpdate("image_url", e.target.value)}
            placeholder="https://example.com/image.png"
            className={inputCls}
          />
        </div>
      </div>

      {/* Row 8: Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>有効開始日</label>
          <input
            type="date"
            value={form.valid_from}
            onChange={(e) => onUpdate("valid_from", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>有効終了日</label>
          <input
            type="date"
            value={form.valid_until}
            onChange={(e) => onUpdate("valid_until", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Row 9: Toggles */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => onUpdate("is_active", e.target.checked)}
            className="w-4 h-4 rounded border-border text-blue focus:ring-blue/20"
          />
          <span className="text-[12px] font-bold text-[#555]">公開する</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => onUpdate("is_featured", e.target.checked)}
            className="w-4 h-4 rounded border-border text-[#f59e0b] focus:ring-[#f59e0b]/20"
          />
          <span className="text-[12px] font-bold text-[#555]">
            おすすめに表示
          </span>
        </label>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving || !form.title.trim() || !form.category_id}
          className="px-6 py-2.5 bg-[#E15454] text-white text-[13px] font-bold rounded-lg hover:bg-[#d04343] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {saving ? (
            <>
              <Icon name="hourglass_empty" className="text-[16px] animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Icon name="save" className="text-[16px]" />
              {isNew ? "追加する" : "更新する"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
