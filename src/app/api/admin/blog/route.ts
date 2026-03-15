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

/* ── PUT: 既存記事のフロントマター更新（メタタイトル/ディスクリプション） ── */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, title, description, category, thumbnail, reason } =
    await req.json();

  if (!filename) {
    return NextResponse.json(
      { error: "filename is required" },
      { status: 400 },
    );
  }

  const filepath = path.join(BLOG_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return NextResponse.json(
      { error: "File not found" },
      { status: 404 },
    );
  }

  const raw = fs.readFileSync(filepath, "utf8");
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) {
    return NextResponse.json(
      { error: "Invalid markdown format" },
      { status: 400 },
    );
  }

  // 既存のフロントマターをパース
  const meta: Record<string, string> = {};
  for (const line of fmMatch[1].split("\n")) {
    const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
    if (m) meta[m[1]] = m[2];
  }

  // 変更前の値を保存（ログ用）
  const beforeTitle = meta.title || "";
  const beforeDescription = meta.description || "";

  // 指定されたフィールドのみ上書き
  if (title !== undefined) meta.title = title;
  if (description !== undefined) meta.description = description;
  if (category !== undefined) meta.category = category;
  if (thumbnail !== undefined) meta.thumbnail = thumbnail;

  // フロントマターを再構築
  const newFm = [
    "---",
    `title: "${meta.title?.replace(/"/g, '\\"') || ""}"`,
    `date: "${meta.date || ""}"`,
  ];
  if (meta.description)
    newFm.push(`description: "${meta.description.replace(/"/g, '\\"')}"`);
  if (meta.category) newFm.push(`category: "${meta.category}"`);
  if (meta.thumbnail) newFm.push(`thumbnail: "${meta.thumbnail}"`);
  newFm.push("---");

  const newMarkdown = newFm.join("\n") + "\n" + fmMatch[2];
  fs.writeFileSync(filepath, newMarkdown, "utf8");

  // content_updates にログ記録（service client 使用）
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const slug = filename
      .replace(/^\d{4}-\d{2}-\d{2}-/, "")
      .replace(".md", "");

    if (title !== undefined && title !== beforeTitle) {
      await supabaseAdmin.from("content_updates").insert({
        update_type: "meta_title",
        target_slug: slug,
        before_content: beforeTitle,
        after_content: title,
        reason: reason || "管理者による手動更新",
        auto_generated: false,
      });
    }
    if (description !== undefined && description !== beforeDescription) {
      await supabaseAdmin.from("content_updates").insert({
        update_type: "meta_description",
        target_slug: slug,
        before_content: beforeDescription,
        after_content: description,
        reason: reason || "管理者による手動更新",
        auto_generated: false,
      });
    }
  } catch (logErr) {
    console.error("Failed to log content update:", logErr);
    // ログ記録失敗は更新処理のエラーにしない
  }

  return NextResponse.json({
    ok: true,
    filename,
    updated: { title: meta.title, description: meta.description },
  });
}
