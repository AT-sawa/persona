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

/* ── GET: 全質問取得（ステータスフィルタ対応） ── */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // pending | answered | applied | dismissed

  let query = auth.supabase
    .from("content_questions")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: data });
}

/* ── POST: 新規質問追加（AI or 手動） ── */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { question, context, source, related_keyword } = body;

  if (!question) {
    return NextResponse.json(
      { error: "question is required" },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("content_questions")
    .insert({
      question,
      context: context || null,
      source: source || "manual",
      related_keyword: related_keyword || null,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, question: data });
}

/* ── PATCH: 回答登録 + マスター反映 ── */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { id, answer, apply_to_master, dismiss } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // 却下
  if (dismiss) {
    const { error } = await auth.supabase
      .from("content_questions")
      .update({ status: "dismissed" })
      .eq("id", id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "dismissed" });
  }

  if (!answer) {
    return NextResponse.json(
      { error: "answer is required" },
      { status: 400 },
    );
  }

  // 回答を登録
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    answer,
    status: "answered",
    answered_at: now,
  };

  // マスターに反映する場合
  if (apply_to_master) {
    // 質問情報を取得
    const { data: questionData } = await auth.supabase
      .from("content_questions")
      .select("question, related_keyword")
      .eq("id", id)
      .single();

    if (questionData) {
      // content_master の qa カテゴリに追加
      await auth.supabase.from("content_master").insert({
        category: "qa",
        title: questionData.question,
        content: answer,
        created_by: auth.user.id,
      });

      updateData.status = "applied";
      updateData.applied_at = now;
    }
  }

  const { data, error } = await auth.supabase
    .from("content_questions")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, question: data });
}

/* ── DELETE: 質問削除 ── */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await request.json();
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await auth.supabase
    .from("content_questions")
    .delete()
    .eq("id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
