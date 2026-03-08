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

// GET — proposal detail
export async function GET(_request: Request, { params }: Props) {
  const supabase = await createClient();
  const { error: authError } = await checkAdmin(supabase);
  if (authError) return authError;

  const { id } = await params;

  const { data, error } = await supabase
    .from("proposals")
    .select(`
      *,
      cases ( id, title, category, fee, description, industry, work_style, location ),
      profiles!proposals_client_id_fkey ( id, full_name, email, company_name ),
      proposal_talents (
        *,
        proposal_reactions ( * )
      ),
      proposal_messages (
        *,
        profiles ( id, full_name, company_name )
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ proposal: data });
}

// PATCH — update proposal
export async function PATCH(request: Request, { params }: Props) {
  const supabase = await createClient();
  const { error: authError } = await checkAdmin(supabase);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const allowedFields = ["title", "message", "status"];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("proposals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposal: data });
}

// DELETE — delete proposal
export async function DELETE(_request: Request, { params }: Props) {
  const supabase = await createClient();
  const { error: authError } = await checkAdmin(supabase);
  if (authError) return authError;

  const { id } = await params;

  const { error } = await supabase.from("proposals").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
