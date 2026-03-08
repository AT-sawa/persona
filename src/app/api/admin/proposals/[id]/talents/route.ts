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

interface Props {
  params: Promise<{ id: string }>;
}

// POST — add talent to proposal
export async function POST(request: Request, { params }: Props) {
  const supabase = await createClient();
  const { error: authError } = await checkAdmin(supabase);
  if (authError) return authError;

  const { id: proposalId } = await params;
  const body = await request.json();

  const {
    profile_id,
    external_talent_id,
    display_label,
    sort_order,
    client_fee,
    internal_cost,
    internal_note,
    summary_position,
    summary_experience,
    summary_skills,
    summary_background,
    summary_work_style,
  } = body;

  // Validate: exactly one source
  if ((!profile_id && !external_talent_id) || (profile_id && external_talent_id)) {
    return NextResponse.json(
      { error: "profile_id か external_talent_id のいずれか1つを指定してください" },
      { status: 400 }
    );
  }

  if (!display_label) {
    return NextResponse.json(
      { error: "display_label は必須です" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("proposal_talents")
    .insert({
      proposal_id: proposalId,
      profile_id: profile_id || null,
      external_talent_id: external_talent_id || null,
      display_label,
      sort_order: sort_order ?? 0,
      client_fee: client_fee ?? null,
      internal_cost: internal_cost ?? null,
      internal_note: internal_note || null,
      summary_position: summary_position || null,
      summary_experience: summary_experience || null,
      summary_skills: summary_skills || null,
      summary_background: summary_background || null,
      summary_work_style: summary_work_style || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ talent: data });
}

// DELETE — remove talent from proposal (talent_id in body)
export async function DELETE(request: Request, { params }: Props) {
  const supabase = await createClient();
  const { error: authError } = await checkAdmin(supabase);
  if (authError) return authError;

  const { id: proposalId } = await params;
  const body = await request.json();
  const { talent_id } = body;

  if (!talent_id) {
    return NextResponse.json(
      { error: "talent_id は必須です" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("proposal_talents")
    .delete()
    .eq("id", talent_id)
    .eq("proposal_id", proposalId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
