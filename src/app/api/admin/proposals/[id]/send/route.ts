import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildProposalNotificationEmail } from "@/lib/emails/proposal-notification";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, profile: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email, full_name")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return { user: null, profile: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, profile, error: null };
}

interface Props {
  params: Promise<{ id: string }>;
}

// POST — send proposal to client
export async function POST(request: Request, { params }: Props) {
  const supabase = await createClient();
  const { profile: adminProfile, error: authError } = await checkAdmin(supabase);
  if (authError) return authError;

  const { id } = await params;

  // Parse optional body params
  let toEmail: string | undefined;
  let customMessage: string | undefined;
  try {
    const body = await request.json();
    toEmail = body.to_email;
    customMessage = body.message;
  } catch {
    // No body or invalid JSON — use defaults
  }

  // Fetch proposal with client info and talent count
  const { data: proposal, error: fetchError } = await supabase
    .from("proposals")
    .select(`
      *,
      profiles!proposals_client_id_fkey ( id, full_name, email, company_name ),
      proposal_talents ( id )
    `)
    .eq("id", id)
    .single();

  if (fetchError || !proposal) {
    return NextResponse.json(
      { error: "提案書が見つかりません" },
      { status: 404 }
    );
  }

  if (proposal.status !== "draft") {
    return NextResponse.json(
      { error: "この提案書はすでに送信済みです" },
      { status: 400 }
    );
  }

  const talentCount = proposal.proposal_talents?.length || 0;
  if (talentCount === 0) {
    return NextResponse.json(
      { error: "人材を1名以上追加してから送信してください" },
      { status: 400 }
    );
  }

  // Update status to sent
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("proposals")
    .update({
      status: "sent",
      sent_at: now,
      updated_at: now,
      ...(customMessage !== undefined ? { message: customMessage } : {}),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Send email notification
  let emailSent = false;
  const client = proposal.profiles as { email: string; company_name: string | null } | null;
  const recipientEmail = toEmail || client?.email;

  if (process.env.RESEND_API_KEY && recipientEmail) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      const messageToSend = customMessage ?? proposal.message;

      const { subject, html } = buildProposalNotificationEmail({
        companyName: client?.company_name || "お客様",
        proposalTitle: proposal.title,
        proposalId: id,
        talentCount,
        message: messageToSend,
        coordinatorName: adminProfile?.full_name || undefined,
      });

      const fromEmail =
        process.env.RESEND_FROM_EMAIL ||
        "PERSONA <noreply@persona-consultant.com>";

      // Reply-To: 管理者のメールアドレス（返信が管理者に届く）
      const replyTo = adminProfile?.email || undefined;

      await resend.emails.send({
        from: fromEmail,
        to: recipientEmail,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      });
      emailSent = true;
    } catch (e) {
      console.error("Failed to send proposal notification email:", e);
    }
  }

  return NextResponse.json({
    success: true,
    email_sent: emailSent,
    sent_to: recipientEmail || null,
  });
}
