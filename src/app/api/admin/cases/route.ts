import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { cases: casesData } = body;

    if (!Array.isArray(casesData) || casesData.length === 0) {
      return NextResponse.json(
        { error: "案件データが必要です" },
        { status: 400 }
      );
    }

    // Validate and clean data
    const cleaned = casesData.map((c: Record<string, string>) => ({
      case_no: c.case_no || c["案件番号"] || null,
      title: c.title || c["タイトル"] || c["案件名"] || "",
      category: c.category || c["カテゴリ"] || null,
      background: c.background || c["背景"] || null,
      description: c.description || c["業務内容"] || c["説明"] || null,
      industry: c.industry || c["業界"] || null,
      start_date: c.start_date || c["開始日"] || c["開始時期"] || null,
      extendable: c.extendable || c["延長"] || null,
      occupancy: c.occupancy || c["稼働率"] || c["稼働"] || null,
      fee: c.fee || c["報酬"] || c["単価"] || null,
      office_days: c.office_days || c["出社"] || c["出社日数"] || null,
      location: c.location || c["勤務地"] || c["場所"] || null,
      must_req: c.must_req || c["必須要件"] || c["必須スキル"] || null,
      nice_to_have: c.nice_to_have || c["歓迎要件"] || c["歓迎スキル"] || null,
      flow: c.flow || c["選考フロー"] || c["フロー"] || null,
      status: "active",
      is_active: true,
    }));

    // Filter out entries without title
    const valid = cleaned.filter(
      (c: { title: string }) => c.title && c.title.trim() !== ""
    );

    if (valid.length === 0) {
      return NextResponse.json(
        { error: "有効な案件データがありませんでした（タイトル必須）" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("cases")
      .insert(valid)
      .select("id");

    if (error) {
      console.error("Case import error:", error);
      return NextResponse.json(
        { error: "インポートに失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imported: data?.length ?? 0,
      skipped: casesData.length - valid.length,
    });
  } catch (err) {
    console.error("Admin cases error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
