import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function checkClient(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_client")
    .eq("id", user.id)
    .single();
  if (!profile?.is_client) {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}

interface Props {
  params: Promise<{ id: string }>;
}

// GET — proposal detail (client view, sanitized)
export async function GET(_request: Request, { params }: Props) {
  const supabase = await createClient();
  const { user, error: authError } = await checkClient(supabase);
  if (authError) return authError;

  const { id } = await params;

  const { data, error } = await supabase
    .from("proposals")
    .select(`
      id, title, message, status, sent_at, viewed_at, created_at,
      cases ( id, title, category, fee, description, industry, work_style, location, occupancy ),
      proposal_talents (
        id, display_label, sort_order, client_fee,
        summary_position, summary_experience, summary_skills, summary_background, summary_work_style,
        proposal_reactions ( id, reaction, message, client_id, created_at )
      ),
      proposal_messages (
        id, sender_id, body, is_admin, created_at,
        profiles ( id, full_name, company_name )
      )
    `)
    .eq("id", id)
    .eq("client_id", user!.id)
    .neq("status", "draft")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "提案書が見つかりません" }, { status: 404 });
  }

  // Mark as viewed if first time
  if (data.status === "sent") {
    const now = new Date().toISOString();
    await supabase
      .from("proposals")
      .update({ status: "viewed", viewed_at: now, updated_at: now })
      .eq("id", id);
    data.status = "viewed";
    data.viewed_at = now;
  }

  // SECURITY: Strip internal fields from talents
  // - Remove profile_id, external_talent_id (anonymization)
  // - Remove internal_cost, internal_note
  const sanitizedTalents = (data.proposal_talents || []).map((t: Record<string, unknown>) => ({
    id: t.id,
    display_label: t.display_label,
    sort_order: t.sort_order,
    client_fee: t.client_fee,
    summary_position: t.summary_position,
    summary_experience: t.summary_experience,
    summary_skills: t.summary_skills,
    summary_background: t.summary_background,
    summary_work_style: t.summary_work_style,
    proposal_reactions: t.proposal_reactions,
  }));

  return NextResponse.json({
    proposal: {
      ...data,
      proposal_talents: sanitizedTalents,
    },
  });
}
