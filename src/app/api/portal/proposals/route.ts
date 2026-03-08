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

// GET — list my proposals (client)
export async function GET() {
  const supabase = await createClient();
  const { user, error: authError } = await checkClient(supabase);
  if (authError) return authError;

  const { data, error } = await supabase
    .from("proposals")
    .select(`
      id, title, message, status, sent_at, viewed_at, created_at,
      cases ( id, title, category, fee, industry ),
      proposal_talents ( id, display_label, client_fee, summary_position, summary_skills )
    `)
    .eq("client_id", user!.id)
    .neq("status", "draft")
    .order("sent_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposals: data || [] });
}
