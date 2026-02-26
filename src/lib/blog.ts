import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const postsDir = path.join(process.cwd(), "content/blog");

export interface BlogPost {
  slug: string;
  title?: string;
  date?: string;
  description?: string;
  category?: string;
  keywords?: string[];
  content?: string;
  [key: string]: unknown;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(postsDir)) return [];
  const files = fs.readdirSync(postsDir);
  return files
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const slug = filename
        .replace(/^\d{4}-\d{2}-\d{2}-/, "")
        .replace(".md", "");
      const raw = fs.readFileSync(path.join(postsDir, filename), "utf8");
      const { data } = matter(raw);
      return { slug, ...data } as BlogPost;
    })
    .sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? 1 : -1));
}

export async function getPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  if (!fs.existsSync(postsDir)) return null;
  const files = fs.readdirSync(postsDir);
  const file = files.find((f) => f.includes(slug));
  if (!file) return null;
  const raw = fs.readFileSync(path.join(postsDir, file), "utf8");
  const { data, content } = matter(raw);
  const processed = await remark().use(html).process(content);
  return { ...data, slug, content: processed.toString() } as BlogPost;
}
