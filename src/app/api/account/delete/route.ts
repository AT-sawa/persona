import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Delete user data in order (foreign key constraints)
    await serviceClient.from("matching_results").delete().eq("user_id", user.id);
    await serviceClient.from("entries").delete().eq("user_id", user.id);
    await serviceClient.from("resumes").delete().eq("user_id", user.id);
    await serviceClient.from("user_experiences").delete().eq("user_id", user.id);
    await serviceClient.from("user_preferences").delete().eq("user_id", user.id);
    await serviceClient.from("profiles").delete().eq("id", user.id);

    // Delete storage files
    const { data: files } = await serviceClient.storage
      .from("resumes")
      .list(user.id);
    if (files?.length) {
      await serviceClient.storage
        .from("resumes")
        .remove(files.map((f) => `${user.id}/${f.name}`));
    }

    // Delete auth user
    await serviceClient.auth.admin.deleteUser(user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Account deletion error:", err);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
