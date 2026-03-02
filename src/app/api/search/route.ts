import { NextRequest, NextResponse } from "next/server";
import { getAllPosts } from "@/lib/blog";
import type { Case } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ blogs: [], cases: [] });
  }

  const query = q.toLowerCase();

  // Search blog posts (title and description matching)
  const allPosts = getAllPosts();
  const blogs = allPosts.filter((post) => {
    const title = (post.title ?? "").toLowerCase();
    const description = (post.description ?? "").toLowerCase();
    const category = (post.category ?? "").toLowerCase();
    return (
      title.includes(query) ||
      description.includes(query) ||
      category.includes(query)
    );
  });

  // Search Supabase cases (title matching)
  let cases: Pick<
    Case,
    "id" | "title" | "category" | "industry" | "fee" | "is_active"
  >[] = [];

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const { createServerClient } = await import("@supabase/ssr");
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { getAll: () => [], setAll: () => {} } }
      );
      const { data } = await supabase
        .from("cases")
        .select("id, title, category, industry, fee, is_active")
        .or(`title.ilike.%${q}%,category.ilike.%${q}%,industry.ilike.%${q}%`)
        .order("is_active", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(20);
      cases = (data as typeof cases) ?? [];
    } catch {
      // Supabase not available — return empty cases
    }
  }

  return NextResponse.json({ blogs, cases });
}
