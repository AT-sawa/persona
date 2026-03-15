import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return { error: "Forbidden", status: 403 };
  return { supabase, user };
}

/* ── GET: カテゴリ別にグループ化して返却 ── */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("content_master")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // カテゴリ別グループ化
  const grouped: Record<string, typeof data> = {};
  for (const item of data ?? []) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  return NextResponse.json({ entries: data, grouped });
}

/* ── POST: 新規エントリ追加 ── */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { category, title, content, sort_order } = body;

  if (!category || !title || !content) {
    return NextResponse.json(
      { error: "category, title, content are required" },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("content_master")
    .insert({
      category,
      title,
      content,
      sort_order: sort_order ?? 0,
      created_by: auth.user.id,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, entry: data });
}

/* ── PATCH: 既存エントリ更新 ── */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // 許可されたフィールドのみ
  const allowed: Record<string, unknown> = {};
  for (const key of [
    "title",
    "content",
    "category",
    "is_active",
    "sort_order",
  ]) {
    if (key in updates) allowed[key] = updates[key];
  }
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await auth.supabase
    .from("content_master")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, entry: data });
}

/* ── DELETE: エントリ削除 ── */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await request.json();
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await auth.supabase
    .from("content_master")
    .delete()
    .eq("id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
