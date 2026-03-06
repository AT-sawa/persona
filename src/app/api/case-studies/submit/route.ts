import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("case_study_submissions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Fetch case study submissions error:", error);
      return NextResponse.json(
        { error: "事例の取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ submissions: data ?? [] });
  } catch (err) {
    console.error("Case study submissions GET error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      title,
      industry,
      category,
      duration,
      role,
      team_size,
      summary,
      background,
      challenge,
      approach,
      results,
      learnings,
      status,
    } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "タイトルは必須です" },
        { status: 400 }
      );
    }

    // Users can only set status to 'draft' or 'submitted'
    const allowedStatuses = ["draft", "submitted"];
    const safeStatus = allowedStatuses.includes(status) ? status : "draft";

    if (safeStatus === "submitted" && (!summary || !summary.trim())) {
      return NextResponse.json(
        { error: "提出するには概要の入力が必要です" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const payload = {
      title: title.trim(),
      industry: industry || null,
      category: category || null,
      duration: duration || null,
      role: role || null,
      team_size: team_size || null,
      summary: summary || null,
      background: background || null,
      challenge: challenge || null,
      approach: approach || null,
      results: results || null,
      learnings: learnings || null,
      status: safeStatus,
      updated_at: now,
      ...(safeStatus === "submitted" ? { submitted_at: now } : {}),
    };

    if (id) {
      // Update existing submission - verify ownership
      const { data: existing } = await supabase
        .from("case_study_submissions")
        .select("id, user_id, status")
        .eq("id", id)
        .single();

      if (!existing) {
        return NextResponse.json(
          { error: "事例が見つかりません" },
          { status: 404 }
        );
      }

      if (existing.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Don't allow editing once approved/published
      if (["approved", "published"].includes(existing.status)) {
        return NextResponse.json(
          { error: "承認済み・公開済みの事例は編集できません" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("case_study_submissions")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Update case study submission error:", error);
        return NextResponse.json(
          { error: "事例の更新に失敗しました" },
          { status: 500 }
        );
      }

      return NextResponse.json({ submission: data });
    } else {
      // Create new submission
      const { data, error } = await supabase
        .from("case_study_submissions")
        .insert({
          ...payload,
          user_id: user.id,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error("Create case study submission error:", error);
        return NextResponse.json(
          { error: "事例の作成に失敗しました" },
          { status: 500 }
        );
      }

      return NextResponse.json({ submission: data }, { status: 201 });
    }
  } catch (err) {
    console.error("Case study submissions POST error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
