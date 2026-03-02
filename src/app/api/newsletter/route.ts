import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** POST — subscribe */
export async function POST(req: NextRequest) {
  // Check feature flag
  if (process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Newsletter is currently disabled" },
      { status: 403 }
    );
  }

  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    // Upsert: re-subscribe if previously unsubscribed
    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .upsert(
        {
          email: email.toLowerCase().trim(),
          status: "active",
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
        },
        { onConflict: "email" }
      );

    if (error) {
      console.error("Newsletter subscribe error:", error);
      return NextResponse.json(
        { error: "登録に失敗しました。しばらくしてからお試しください。" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "リクエストの処理に失敗しました" },
      { status: 500 }
    );
  }
}

/** DELETE — unsubscribe via token */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("token", token);

    if (error) {
      return NextResponse.json(
        { error: "配信停止に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "リクエストの処理に失敗しました" },
      { status: 500 }
    );
  }
}
