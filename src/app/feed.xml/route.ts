import { getAllPosts } from "@/lib/blog";

const BASE_URL = "https://persona-consultant.com";

export async function GET() {
  const posts = getAllPosts();

  const items = posts
    .slice(0, 30) // Latest 30 articles
    .map(
      (post) => `    <item>
      <title><![CDATA[${post.title ?? ""}]]></title>
      <link>${BASE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description ?? ""}]]></description>
      <pubDate>${post.date ? new Date(post.date).toUTCString() : ""}</pubDate>
      ${post.category ? `<category>${post.category}</category>` : ""}
      ${post.thumbnail ? `<enclosure url="${BASE_URL}${post.thumbnail}" type="image/png" />` : ""}
    </item>`
    )
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>PERSONA（ペルソナ）ブログ</title>
    <link>${BASE_URL}/blog</link>
    <description>フリーコンサルタントのキャリア、案件獲得のコツ、DXトレンドなど実務に役立つ情報を発信。PERSONA公式ブログ。</description>
    <language>ja</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${BASE_URL}/images/persona_logo_hero.png</url>
      <title>PERSONA（ペルソナ）</title>
      <link>${BASE_URL}</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
