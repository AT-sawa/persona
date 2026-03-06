import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, error: null };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { error: authError } = await checkAdmin(supabase);
    if (authError) return authError;

    // Fetch all perks (including inactive) with categories
    const { data: perks, error } = await supabase
      .from("perks")
      .select("*, perk_categories(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin perks fetch error:", error);
      return NextResponse.json(
        { error: "特典の取得に失敗しました" },
        { status: 500 }
      );
    }

    // Fetch all categories
    const { data: categories, error: catError } = await supabase
      .from("perk_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (catError) {
      console.error("Admin perk categories fetch error:", catError);
      return NextResponse.json(
        { error: "カテゴリの取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      perks: perks ?? [],
      categories: categories ?? [],
    });
  } catch (err) {
    console.error("Admin perks GET error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error: authError } = await checkAdmin(supabase);
    if (authError) return authError;

    const body = await request.json();
    const {
      category_id,
      title,
      provider,
      description,
      benefit_summary,
      details,
      how_to_use,
      external_url,
      image_url,
      tier,
      is_active,
      is_featured,
      sort_order,
      valid_from,
      valid_until,
    } = body;

    if (!title || !category_id) {
      return NextResponse.json(
        { error: "タイトルとカテゴリは必須です" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("perks")
      .insert({
        category_id,
        title,
        provider: provider || null,
        description: description || null,
        benefit_summary: benefit_summary || null,
        details: details || null,
        how_to_use: how_to_use || null,
        external_url: external_url || null,
        image_url: image_url || null,
        tier: tier || "standard",
        is_active: is_active ?? true,
        is_featured: is_featured ?? false,
        sort_order: sort_order ?? 0,
        valid_from: valid_from || null,
        valid_until: valid_until || null,
      })
      .select("*, perk_categories(*)")
      .single();

    if (error) {
      console.error("Admin perk create error:", error);
      return NextResponse.json(
        { error: "特典の作成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ perk: data });
  } catch (err) {
    console.error("Admin perks POST error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error: authError } = await checkAdmin(supabase);
    if (authError) return authError;

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "IDが必要です" },
        { status: 400 }
      );
    }

    // Clean null/undefined values for optional fields
    const cleanUpdates: Record<string, unknown> = {};
    const allowedFields = [
      "category_id",
      "title",
      "provider",
      "description",
      "benefit_summary",
      "details",
      "how_to_use",
      "external_url",
      "image_url",
      "tier",
      "is_active",
      "is_featured",
      "sort_order",
      "valid_from",
      "valid_until",
    ];

    for (const key of allowedFields) {
      if (key in updates) {
        cleanUpdates[key] = updates[key];
      }
    }

    const { data, error } = await supabase
      .from("perks")
      .update(cleanUpdates)
      .eq("id", id)
      .select("*, perk_categories(*)")
      .single();

    if (error) {
      console.error("Admin perk update error:", error);
      return NextResponse.json(
        { error: "特典の更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ perk: data });
  } catch (err) {
    console.error("Admin perks PATCH error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error: authError } = await checkAdmin(supabase);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "IDが必要です" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("perks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Admin perk delete error:", error);
      return NextResponse.json(
        { error: "特典の削除に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin perks DELETE error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
