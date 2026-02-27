import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendNotification } from "@/lib/notify";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, phone } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "必須項目を入力してください" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Create user via admin API (bypasses email confirmation)
    const { data: userData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (authError) {
      // Handle duplicate email
      if (
        authError.message.includes("already been registered") ||
        authError.message.includes("already exists")
      ) {
        return NextResponse.json(
          { error: "このメールアドレスは既に登録されています" },
          { status: 409 }
        );
      }
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!userData.user) {
      return NextResponse.json(
        { error: "ユーザーの作成に失敗しました" },
        { status: 500 }
      );
    }

    // Create profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userData.user.id,
      full_name: fullName,
      email,
      phone: phone || null,
    });

    if (profileError) {
      console.error("Profile insert error:", profileError);
      // Don't fail the whole registration if profile insert fails
      // The user can fill in profile later
    }

    // Send notification to admin
    try {
      await sendNotification("consultant_lead", {
        full_name: fullName,
        email,
        phone: phone || "",
      });
    } catch (notifyErr) {
      console.error("Notification error:", notifyErr);
    }

    return NextResponse.json({
      success: true,
      userId: userData.user.id,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
