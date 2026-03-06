import { NextRequest, NextResponse } from "next/server";

async function verifyAdmin() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return { supabase, user, isAdmin: profile?.is_admin ?? false };
}

export async function GET() {
  try {
    const { supabase, user, isAdmin } = await verifyAdmin();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("case_study_submissions")
      .select("*, profiles!case_study_submissions_user_id_fkey(full_name, email)")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Admin fetch case study submissions error:", error);
      return NextResponse.json(
        { error: "事例の取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ submissions: data ?? [] });
  } catch (err) {
    console.error("Admin case studies GET error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user, isAdmin } = await verifyAdmin();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, admin_notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "事例IDが必要です" },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "reviewing",
      "approved",
      "rejected",
      "published",
      "draft",
    ];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "無効なステータスです" },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updatePayload.status = status;
    }

    if (admin_notes !== undefined) {
      updatePayload.admin_notes = admin_notes;
    }

    if (status === "approved") {
      updatePayload.reviewed_at = new Date().toISOString();
      updatePayload.reviewed_by = user.id;
    }

    if (status === "published") {
      updatePayload.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("case_study_submissions")
      .update(updatePayload)
      .eq("id", id)
      .select("*, profiles!case_study_submissions_user_id_fkey(full_name, email)")
      .single();

    if (error) {
      console.error("Admin update case study submission error:", error);
      return NextResponse.json(
        { error: "事例の更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ submission: data });
  } catch (err) {
    console.error("Admin case studies PATCH error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
