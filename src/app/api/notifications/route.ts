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

    // Fetch most recent 50 notifications
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Notifications fetch error:", error);
      return NextResponse.json(
        { error: "通知の取得に失敗しました" },
        { status: 500 }
      );
    }

    // Get unread count
    const { count, error: countError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (countError) {
      console.error("Unread count error:", countError);
    }

    return NextResponse.json({
      notifications: notifications ?? [],
      unread_count: count ?? 0,
    });
  } catch (err) {
    console.error("Notifications GET error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids, all } = body as { ids?: string[]; all?: boolean };

    if (all) {
      // Mark all as read
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Mark all read error:", error);
        return NextResponse.json(
          { error: "通知の更新に失敗しました" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Mark specific notifications as read
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .in("id", ids);

      if (error) {
        console.error("Mark read error:", error);
        return NextResponse.json(
          { error: "通知の更新に失敗しました" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "ids または all パラメータが必要です" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Notifications PATCH error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
