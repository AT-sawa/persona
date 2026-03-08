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

// POST — upsert reaction for a talent
export async function POST(request: Request, { params }: Props) {
  const supabase = await createClient();
  const { user, error: authError } = await checkClient(supabase);
  if (authError) return authError;

  const { id: proposalId } = await params;
  const body = await request.json();
  const { proposal_talent_id, reaction, message } = body;

  if (!proposal_talent_id || !reaction) {
    return NextResponse.json(
      { error: "proposal_talent_id と reaction は必須です" },
      { status: 400 }
    );
  }

  if (!["interested", "pass"].includes(reaction)) {
    return NextResponse.json(
      { error: "reaction は 'interested' または 'pass' を指定してください" },
      { status: 400 }
    );
  }

  // Verify proposal belongs to this client
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, status")
    .eq("id", proposalId)
    .eq("client_id", user!.id)
    .neq("status", "draft")
    .single();

  if (!proposal) {
    return NextResponse.json({ error: "提案書が見つかりません" }, { status: 404 });
  }

  // Verify talent belongs to this proposal
  const { data: talent } = await supabase
    .from("proposal_talents")
    .select("id")
    .eq("id", proposal_talent_id)
    .eq("proposal_id", proposalId)
    .single();

  if (!talent) {
    return NextResponse.json(
      { error: "指定された人材が見つかりません" },
      { status: 404 }
    );
  }

  // Upsert reaction
  const { data, error } = await supabase
    .from("proposal_reactions")
    .upsert(
      {
        proposal_talent_id,
        client_id: user!.id,
        reaction,
        message: message || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "proposal_talent_id,client_id",
      }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update proposal status to 'responded' if it's currently 'sent' or 'viewed'
  if (["sent", "viewed"].includes(proposal.status)) {
    await supabase
      .from("proposals")
      .update({
        status: "responded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId);
  }

  return NextResponse.json({ reaction: data });
}
