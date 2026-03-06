import { NextRequest, NextResponse } from "next/server";

/**
 * Helper: verify the current user is an admin.
 * Returns { supabase, user } on success, or a NextResponse error.
 */
async function requireAdmin() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, user };
}

/**
 * GET /api/admin/seo
 * Fetch all keywords with their latest 30 days of snapshots.
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { supabase } = auth;

    // Fetch all keywords
    const { data: keywords, error: kwError } = await supabase
      .from("seo_keywords")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("keyword", { ascending: true });

    if (kwError) {
      console.error("seo_keywords fetch error:", kwError);
      return NextResponse.json(
        { error: "キーワードの取得に失敗しました" },
        { status: 500 }
      );
    }

    // Fetch snapshots for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sinceDate = thirtyDaysAgo.toISOString().split("T")[0]; // "YYYY-MM-DD"

    const { data: snapshots, error: snapError } = await supabase
      .from("seo_snapshots")
      .select("*")
      .gte("snapshot_date", sinceDate)
      .order("snapshot_date", { ascending: true });

    if (snapError) {
      console.error("seo_snapshots fetch error:", snapError);
      return NextResponse.json(
        { error: "スナップショットの取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      keywords: keywords || [],
      snapshots: snapshots || [],
    });
  } catch (err) {
    console.error("SEO GET error:", err);
    return NextResponse.json(
      { error: "データ取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/seo
 * Add a manual snapshot.
 * Body: { keyword_id, position, clicks?, impressions?, ctr? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { supabase } = auth;

    const body = await request.json();
    const { keyword_id, position, clicks, impressions, ctr } = body;

    if (!keyword_id || position === undefined || position === null) {
      return NextResponse.json(
        { error: "keyword_id と position は必須です" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("seo_snapshots")
      .insert({
        keyword_id,
        position: Number(position),
        clicks: clicks != null ? Number(clicks) : 0,
        impressions: impressions != null ? Number(impressions) : 0,
        ctr: ctr != null ? Number(ctr) : 0,
        snapshot_date: today,
        source: "manual",
      })
      .select()
      .single();

    if (error) {
      console.error("seo_snapshots insert error:", error);
      return NextResponse.json(
        { error: "スナップショットの登録に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ snapshot: data });
  } catch (err) {
    console.error("SEO POST error:", err);
    return NextResponse.json(
      { error: "スナップショットの登録に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/seo
 * Add a new keyword.
 * Body: { keyword, target_url?, is_primary? }
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { supabase } = auth;

    const body = await request.json();
    const { keyword, target_url, is_primary } = body;

    if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
      return NextResponse.json(
        { error: "keyword は必須です" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("seo_keywords")
      .insert({
        keyword: keyword.trim(),
        target_url: target_url?.trim() || null,
        is_primary: is_primary ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error("seo_keywords insert error:", error);
      return NextResponse.json(
        { error: "キーワードの登録に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ keyword: data });
  } catch (err) {
    console.error("SEO PUT error:", err);
    return NextResponse.json(
      { error: "キーワードの登録に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/seo
 * Remove a keyword (cascades snapshots).
 * Body: { keyword_id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { supabase } = auth;

    const body = await request.json();
    const { keyword_id } = body;

    if (!keyword_id) {
      return NextResponse.json(
        { error: "keyword_id は必須です" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("seo_keywords")
      .delete()
      .eq("id", keyword_id);

    if (error) {
      console.error("seo_keywords delete error:", error);
      return NextResponse.json(
        { error: "キーワードの削除に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("SEO DELETE error:", err);
    return NextResponse.json(
      { error: "キーワードの削除に失敗しました" },
      { status: 500 }
    );
  }
}
