import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
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

    const filePath = request.nextUrl.searchParams.get("path");
    if (!filePath) {
      return NextResponse.json(
        { error: "pathパラメータが必要です" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    const { data: signedUrl } = await serviceClient.storage
      .from("talent-resumes")
      .createSignedUrl(filePath, 300); // 5 min expiry

    if (!signedUrl?.signedUrl) {
      return NextResponse.json(
        { error: "署名付きURLの生成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (err) {
    console.error("Talent resume URL error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
