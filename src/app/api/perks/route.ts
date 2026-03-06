import { NextResponse } from "next/server";
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

    // Fetch all active perks with their categories
    const { data: perks, error } = await supabase
      .from("perks")
      .select("*, perk_categories(*)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Perks fetch error:", error);
      return NextResponse.json(
        { error: "特典の取得に失敗しました" },
        { status: 500 }
      );
    }

    // Fetch active categories for filtering
    const { data: categories, error: catError } = await supabase
      .from("perk_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (catError) {
      console.error("Perk categories fetch error:", catError);
      return NextResponse.json(
        { error: "カテゴリの取得に失敗しました" },
        { status: 500 }
      );
    }

    // Sort perks by category sort_order, then by perk sort_order
    const sortedPerks = (perks ?? []).sort((a, b) => {
      const catSortA = a.perk_categories?.sort_order ?? 999;
      const catSortB = b.perk_categories?.sort_order ?? 999;
      if (catSortA !== catSortB) return catSortA - catSortB;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

    return NextResponse.json({
      perks: sortedPerks,
      categories: categories ?? [],
    });
  } catch (err) {
    console.error("Perks GET error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
