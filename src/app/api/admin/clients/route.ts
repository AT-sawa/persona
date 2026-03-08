import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildClientInvitationEmail } from "@/lib/emails/client-invitation";

// ---------------------------------------------------------------------------
// Admin check helper
// ---------------------------------------------------------------------------
async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return {
      user: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user, error: null };
}

// ---------------------------------------------------------------------------
// GET — list all clients
// ---------------------------------------------------------------------------
export async function GET() {
  const supabase = await createClient();
  const { error: authError } = await checkAdmin(supabase);
  if (authError) return authError;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, company_name, is_client, created_at")
    .eq("is_client", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // For each client, also fetch proposal count
  const clientIds = (data || []).map((c) => c.id);
  let proposalCounts: Record<string, number> = {};
  if (clientIds.length > 0) {
    const { data: proposals } = await supabase
      .from("proposals")
      .select("client_id")
      .in("client_id", clientIds);
    if (proposals) {
      for (const p of proposals) {
        proposalCounts[p.client_id] = (proposalCounts[p.client_id] || 0) + 1;
      }
    }
  }

  const clients = (data || []).map((c) => ({
    ...c,
    proposal_count: proposalCounts[c.id] || 0,
  }));

  return NextResponse.json({ clients });
}

// ---------------------------------------------------------------------------
// POST — create a new client account
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const supabase = await createClient();
  const { error: authError } = await checkAdmin(supabase);
  if (authError) return authError;

  const body = await request.json();
  const {
    email,
    company_name,
    full_name,
  }: {
    email?: string;
    company_name?: string;
    full_name?: string;
  } = body;

  if (!email || !company_name) {
    return NextResponse.json(
      { error: "email と company_name は必須です" },
      { status: 400 }
    );
  }

  // Generate a temporary password
  const temporaryPassword =
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    "!";

  // Use service role to create user
  const serviceSupabase = (await import("@supabase/supabase-js")).createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create auth user
  const { data: authData, error: createError } =
    await serviceSupabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || company_name,
      },
    });

  if (createError) {
    return NextResponse.json(
      { error: createError.message },
      { status: 400 }
    );
  }

  const userId = authData.user.id;

  // Update the profile with client fields (profile is auto-created by trigger)
  const { error: updateError } = await serviceSupabase
    .from("profiles")
    .update({
      is_client: true,
      company_name,
      full_name: full_name || company_name,
    })
    .eq("id", userId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  // Send invitation email via Resend
  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { subject, html } = buildClientInvitationEmail({
        companyName: company_name,
        email,
        temporaryPassword,
      });

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "PERSONA <noreply@persona-consultant.com>",
        to: email,
        subject,
        html,
      });
      emailSent = true;
    } catch (e) {
      console.error("Failed to send client invitation email:", e);
    }
  }

  return NextResponse.json({
    success: true,
    client_id: userId,
    email_sent: emailSent,
    temporary_password: temporaryPassword,
  });
}
