import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiParseCases } from "@/lib/ai-parse-cases";

export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json(
        { error: "テキストが短すぎます。案件情報を含むテキストを貼り付けてください。" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI解析機能が利用できません（ANTHROPIC_API_KEY未設定）" },
        { status: 503 }
      );
    }

    const cases = await aiParseCases(text);

    if (cases.length === 0) {
      return NextResponse.json(
        { error: "AIが案件情報を抽出できませんでした。テキストの内容を確認してください。" },
        { status: 422 }
      );
    }

    const errors: string[] = [];

    return NextResponse.json({
      cases,
      errors,
      rawSections: cases.length,
    });
  } catch (err) {
    console.error("Parse text error:", err);
    return NextResponse.json(
      { error: "AI解析中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
