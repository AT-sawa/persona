import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";
import { logAudit } from "@/lib/audit";
import { isValidEmail, sanitizeText, truncate } from "@/lib/validation";
import { runMatching } from "@/lib/matching/runMatching";
import { buildWelcomeEmail } from "@/lib/emails/welcome";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, phone, firm, trafficSource } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "必須項目を入力してください" },
        { status: 400 }
      );
    }

    // Email format validation
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    // Password strength validation (min 8 chars, at least one letter + one number)
    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "パスワードには英字と数字をそれぞれ1文字以上含めてください" },
        { status: 400 }
      );
    }

    // Sanitize and enforce length limits
    const sanitizedFullName = truncate(sanitizeText(fullName), 100);
    const sanitizedEmail = truncate(sanitizeText(email), 254);
    const sanitizedPhone = phone ? truncate(sanitizeText(phone), 20) : null;
    const sanitizedFirm = firm ? truncate(sanitizeText(firm), 200) : null;

    if (!sanitizedFullName) {
      return NextResponse.json(
        { error: "氏名を入力してください" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Create user via admin API (bypasses email confirmation)
    const { data: userData, error: authError } =
      await supabase.auth.admin.createUser({
        email: sanitizedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: sanitizedFullName },
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
      full_name: sanitizedFullName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      background: sanitizedFirm,
    });

    if (profileError) {
      console.error("Profile insert error:", profileError);
      // Don't fail the whole registration if profile insert fails
      // The user can fill in profile later
    }

    // Audit log for registration (pass userId explicitly — no session yet)
    try {
      await logAudit({
        action: "account.register",
        resourceType: "profiles",
        resourceId: userData.user.id,
        userId: userData.user.id,
        details: {
          email: sanitizedEmail,
          traffic_source: trafficSource || {},
        },
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    // Send welcome email to user
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const resend = new Resend(resendKey);
        const fromEmail =
          process.env.FROM_EMAIL || "noreply@persona-consultant.com";
        const { subject, html } = buildWelcomeEmail(sanitizedFullName);
        await resend.emails.send({
          from: `PERSONA <${fromEmail}>`,
          to: sanitizedEmail,
          subject,
          html,
        });
      } else {
        console.log("[register] Welcome email skipped (no RESEND_API_KEY)");
      }
    } catch (welcomeErr) {
      console.error("Welcome email error:", welcomeErr);
      // Don't fail registration if welcome email fails
    }

    // Send notification to admin (direct Resend call — sendNotification uses
    // relative fetch which doesn't work from server-side API routes)
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const adminResend = new Resend(resendKey);
        const fromEmail =
          process.env.FROM_EMAIL || "noreply@persona-consultant.com";
        const adminEmail =
          process.env.ADMIN_EMAIL || "admin@persona-consultant.com";
        const adminSubject = `【PERSONA】新規コンサルタント登録: ${sanitizedFullName}`;
        const adminBody = [
          "新規コンサルタント登録がありました。",
          "",
          `氏名: ${sanitizedFullName}`,
          `メール: ${sanitizedEmail}`,
          `電話: ${sanitizedPhone || "—"}`,
          `在籍/出身ファーム: ${sanitizedFirm || "—"}`,
          "",
          "管理画面で詳細を確認してください。",
          "https://app.persona-consultant.com/dashboard/admin/users",
        ].join("\n");
        await adminResend.emails.send({
          from: `PERSONA通知 <${fromEmail}>`,
          to: adminEmail,
          subject: adminSubject,
          text: adminBody,
        });
      } else {
        console.log("[register] Admin notification skipped (no RESEND_API_KEY)");
      }
    } catch (notifyErr) {
      console.error("Admin notification error:", notifyErr);
    }

    // Run initial matching for the new user (immediate, no debounce)
    try {
      await runMatching({
        targetUserId: userData.user.id,
        sendEmails: true,
        triggerType: "user_register",
      });
    } catch (matchErr) {
      console.error("Initial matching error:", matchErr);
      // Don't fail registration if matching fails
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
