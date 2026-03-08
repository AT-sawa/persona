import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}

// GET — list proposals
export async function GET() {
  const supabase = await createClient();
  const { error: authError } = await checkAdmin(supabase);
  if (authError) return authError;

  const { data, error } = await supabase
    .from("proposals")
    .select(`
      *,
      cases ( id, title, category, fee ),
      profiles!proposals_client_id_fkey ( id, full_name, email, company_name ),
      proposal_talents ( id )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also fetch reaction counts
  const proposalIds = (data || []).map((p) => p.id);
  let reactionCounts: Record<string, { interested: number; pass: number }> = {};

  if (proposalIds.length > 0) {
    const { data: reactions } = await supabase
      .from("proposal_reactions")
      .select("proposal_talent_id, reaction, proposal_talents!inner(proposal_id)")
      .in("proposal_talents.proposal_id", proposalIds);

    if (reactions) {
      for (const r of reactions as unknown as Array<{
        reaction: string;
        proposal_talents: { proposal_id: string };
      }>) {
        const pid = r.proposal_talents.proposal_id;
        if (!reactionCounts[pid]) reactionCounts[pid] = { interested: 0, pass: 0 };
        if (r.reaction === "interested") reactionCounts[pid].interested++;
        else reactionCounts[pid].pass++;
      }
    }
  }

  const proposals = (data || []).map((p) => ({
    ...p,
    talent_count: p.proposal_talents?.length || 0,
    reaction_counts: reactionCounts[p.id] || { interested: 0, pass: 0 },
  }));

  return NextResponse.json({ proposals });
}

// POST — create proposal
export async function POST(request: Request) {
  const supabase = await createClient();
  const { error: authError } = await checkAdmin(supabase);
  if (authError) return authError;

  const body = await request.json();
  const { case_id, client_id, title, message } = body;

  if (!case_id || !client_id || !title) {
    return NextResponse.json(
      { error: "case_id, client_id, title は必須です" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      case_id,
      client_id,
      title,
      message: message || null,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposal: data });
}
