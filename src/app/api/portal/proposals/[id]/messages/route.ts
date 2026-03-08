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

// GET — messages for a proposal
export async function GET(_request: Request, { params }: Props) {
  const supabase = await createClient();
  const { user, error: authError } = await checkClient(supabase);
  if (authError) return authError;

  const { id: proposalId } = await params;

  // Verify ownership
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id")
    .eq("id", proposalId)
    .eq("client_id", user!.id)
    .neq("status", "draft")
    .single();

  if (!proposal) {
    return NextResponse.json({ error: "提案書が見つかりません" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("proposal_messages")
    .select(`
      id, body, is_admin, created_at,
      profiles ( id, full_name, company_name )
    `)
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data || [] });
}

// POST — send message
export async function POST(request: Request, { params }: Props) {
  const supabase = await createClient();
  const { user, error: authError } = await checkClient(supabase);
  if (authError) return authError;

  const { id: proposalId } = await params;
  const body = await request.json();
  const { message } = body;

  if (!message || !message.trim()) {
    return NextResponse.json(
      { error: "メッセージを入力してください" },
      { status: 400 }
    );
  }

  // Verify ownership
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id")
    .eq("id", proposalId)
    .eq("client_id", user!.id)
    .neq("status", "draft")
    .single();

  if (!proposal) {
    return NextResponse.json({ error: "提案書が見つかりません" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("proposal_messages")
    .insert({
      proposal_id: proposalId,
      sender_id: user!.id,
      body: message.trim(),
      is_admin: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
