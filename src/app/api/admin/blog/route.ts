import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/* ── Auth helper ── */
async function requireAdmin(req: NextRequest) {
  const cookie = req.cookies.get("sb-urikwrakbafnsllimcbl-auth-token");
  const accessToken =
    cookie?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  if (!accessToken) return null;

  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(accessToken);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin ? user : null;
}

const BLOG_DIR = path.join(process.cwd(), "content/blog");

/* ── GET: list all blog posts ── */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!fs.existsSync(BLOG_DIR)) {
    return NextResponse.json({ posts: [] });
  }

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
  const posts = files.map((filename) => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf8");
    // Parse front matter manually (simple approach)
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    const meta: Record<string, string> = {};
    if (fmMatch) {
      for (const line of fmMatch[1].split("\n")) {
        const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
        if (m) meta[m[1]] = m[2];
      }
    }
    return {
      filename,
      slug: filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(".md", ""),
      title: meta.title || filename,
      date: meta.date || "",
      category: meta.category || "",
      description: meta.description || "",
    };
  });

  posts.sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json({ posts });
}

/* ── POST: create new blog post ── */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, date, description, category, thumbnail, content, slug } =
    await req.json();

  if (!title || !content) {
    return NextResponse.json(
      { error: "title and content are required" },
      { status: 400 },
    );
  }

  // Generate slug from title if not provided
  const postSlug =
    slug ||
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80);

  const postDate = date || new Date().toISOString().split("T")[0];

  // Build markdown content
  const frontMatter = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    `date: "${postDate}"`,
  ];
  if (description) frontMatter.push(`description: "${description.replace(/"/g, '\\"')}"`);
  if (category) frontMatter.push(`category: "${category}"`);
  if (thumbnail) frontMatter.push(`thumbnail: "${thumbnail}"`);
  frontMatter.push("---");

  const markdown = frontMatter.join("\n") + "\n" + content;

  // Write file
  if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true });
  }

  const filename = `${postDate}-${postSlug}.md`;
  const filepath = path.join(BLOG_DIR, filename);

  // Prevent overwriting existing files
  if (fs.existsSync(filepath)) {
    return NextResponse.json(
      { error: "A post with this slug and date already exists" },
      { status: 409 },
    );
  }

  fs.writeFileSync(filepath, markdown, "utf8");

  return NextResponse.json({
    ok: true,
    filename,
    slug: postSlug,
    url: `/blog/${postSlug}`,
  });
}
