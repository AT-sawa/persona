import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * 管理者専用: メール添付ファイルの署名付きURLを取得
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch attachment metadata
  const serviceClient = createServiceClient();
  const { data: attachment } = await serviceClient
    .from("email_attachments")
    .select("*")
    .eq("id", id)
    .single();

  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Generate signed URL
  const { data: signedUrl } = await serviceClient.storage
    .from("resumes")
    .createSignedUrl(attachment.file_path, 300); // 5 min

  if (!signedUrl?.signedUrl) {
    return NextResponse.json(
      { error: "URL生成に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: signedUrl.signedUrl,
    filename: attachment.filename,
    mime_type: attachment.mime_type,
    file_size: attachment.file_size,
  });
}
