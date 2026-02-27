import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!resume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signedUrl } = await supabase.storage
    .from("resumes")
    .createSignedUrl(resume.file_path, 60);

  if (!signedUrl?.signedUrl) {
    return NextResponse.json(
      { error: "ダウンロードURLの生成に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signedUrl.signedUrl);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!resume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete from storage
  await supabase.storage.from("resumes").remove([resume.file_path]);

  // Delete metadata
  await supabase.from("resumes").delete().eq("id", id);

  // If deleted resume was primary, set another as primary
  if (resume.is_primary) {
    const { data: remaining } = await supabase
      .from("resumes")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    if (remaining && remaining.length > 0) {
      await supabase
        .from("resumes")
        .update({ is_primary: true })
        .eq("id", remaining[0].id);
    }
  }

  return NextResponse.json({ ok: true });
}
