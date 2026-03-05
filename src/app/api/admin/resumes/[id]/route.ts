import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin-only endpoint to get a signed URL for any resume.
 * Returns JSON { url } instead of redirecting.
 */
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

  // Check admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .single();

  if (!resume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signedUrl } = await supabase.storage
    .from("resumes")
    .createSignedUrl(resume.file_path, 300); // 5 min

  if (!signedUrl?.signedUrl) {
    return NextResponse.json(
      { error: "URL生成に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: signedUrl.signedUrl,
    filename: resume.filename,
    mime_type: resume.mime_type,
    file_size: resume.file_size,
  });
}
