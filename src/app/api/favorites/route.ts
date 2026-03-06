import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("favorites")
      .select("*, cases(id, case_no, title, category, background, description, industry, start_date, extendable, occupancy, fee, office_days, location, must_req, nice_to_have, flow, status, published_at, created_at, is_active, source, source_url, synced_at, title_normalized, source_hash)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Favorites fetch error:", error);
      return NextResponse.json(
        { error: "お気に入りの取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ favorites: data });
  } catch (err) {
    console.error("Favorites GET error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { case_id } = body;

    if (!case_id) {
      return NextResponse.json(
        { error: "case_id は必須です" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("favorites")
      .insert({ user_id: user.id, case_id })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "既にお気に入りに追加されています" },
          { status: 409 }
        );
      }
      console.error("Favorites insert error:", error);
      return NextResponse.json(
        { error: "お気に入りの追加に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ favorite: data }, { status: 201 });
  } catch (err) {
    console.error("Favorites POST error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { case_id } = body;

    if (!case_id) {
      return NextResponse.json(
        { error: "case_id は必須です" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("case_id", case_id);

    if (error) {
      console.error("Favorites delete error:", error);
      return NextResponse.json(
        { error: "お気に入りの削除に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Favorites DELETE error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
