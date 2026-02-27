import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@persona-consultant.com";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@persona-consultant.com";

interface NotifyPayload {
  type: "consultant_lead" | "enterprise_inquiry" | "case_entry";
  data: Record<string, string | null | undefined>;
}

export async function POST(req: NextRequest) {
  try {
    // Simple API key check to prevent abuse
    const authHeader = req.headers.get("x-notify-key");
    if (authHeader !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, data } = (await req.json()) as NotifyPayload;

    let subject = "";
    let body = "";

    switch (type) {
      case "consultant_lead":
        subject = `【PERSONA】新規コンサルタント登録: ${data.full_name || data.email}`;
        body = [
          "新規コンサルタント登録がありました。",
          "",
          `氏名: ${data.full_name || "—"}`,
          `メール: ${data.email || "—"}`,
          `電話: ${data.phone || "—"}`,
          `ファーム: ${data.firm || "—"}`,
          `経験: ${data.experience || "—"}`,
          "",
          "Supabaseダッシュボードで詳細を確認してください。",
          `https://supabase.com/dashboard/project/urikwrakbafnsllimcbl/editor`,
        ].join("\n");
        break;

      case "enterprise_inquiry":
        subject = `【PERSONA】企業お問い合わせ: ${data.company_name || data.email}`;
        body = [
          "企業からのお問い合わせがありました。",
          "",
          `企業名: ${data.company_name || "—"}`,
          `担当者: ${data.full_name || "—"}`,
          `メール: ${data.email || "—"}`,
          `電話: ${data.phone || "—"}`,
          `内容: ${data.message || "—"}`,
          "",
          "Supabaseダッシュボードで詳細を確認してください。",
          `https://supabase.com/dashboard/project/urikwrakbafnsllimcbl/editor`,
        ].join("\n");
        break;

      case "case_entry":
        subject = `【PERSONA】案件エントリー: ${data.email}`;
        body = [
          "案件へのエントリーがありました。",
          "",
          `案件ID: ${data.case_id || "—"}`,
          `メール: ${data.email || "—"}`,
          `メッセージ: ${data.message || "—"}`,
          "",
          "Supabaseダッシュボードで詳細を確認してください。",
          `https://supabase.com/dashboard/project/urikwrakbafnsllimcbl/editor`,
        ].join("\n");
        break;

      default:
        return NextResponse.json(
          { error: "Unknown notification type" },
          { status: 400 }
        );
    }

    if (!process.env.RESEND_API_KEY) {
      // In development without Resend key, just log
      console.log("[notify] Would send email:", { subject, body });
      return NextResponse.json({ ok: true, dev: true });
    }

    await resend.emails.send({
      from: `PERSONA通知 <${FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject,
      text: body,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[notify] Error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
