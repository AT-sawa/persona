import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const postsDir = path.join(process.cwd(), "content/blog");

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface BlogPost {
  slug: string;
  title?: string;
  date?: string;
  description?: string;
  category?: string;
  keywords?: string[];
  thumbnail?: string;
  content?: string;
  toc?: TocItem[];
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

/** Generate a URL-safe ID from Japanese/English heading text */
function headingToId(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 80);
}

/** Add id attributes to h2/h3 tags and extract TOC */
function addHeadingIds(htmlStr: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const idCounts: Record<string, number> = {};

  const result = htmlStr.replace(
    /<(h[23])>(.*?)<\/\1>/gi,
    (_match, tag: string, inner: string) => {
      const text = inner.replace(/<[^>]*>/g, "").trim();
      let id = headingToId(text);
      // Ensure unique IDs
      if (idCounts[id]) {
        idCounts[id]++;
        id = `${id}-${idCounts[id]}`;
      } else {
        idCounts[id] = 1;
      }
      const level = tag.toLowerCase() === "h2" ? 2 : 3;
      toc.push({ id, text, level });
      return `<${tag} id="${id}">${inner}</${tag}>`;
    }
  );

  return { html: result, toc };
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
  const { html: htmlWithIds, toc } = addHeadingIds(processed.toString());
  return { ...data, slug, content: htmlWithIds, toc } as BlogPost;
}
