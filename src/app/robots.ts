import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/dashboard/", "/_next/"],
      },
      // Block aggressive scrapers / AI training crawlers
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ChatGPT-User", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "Google-Extended", disallow: "/" },
      { userAgent: "Bytespider", disallow: "/" },
      { userAgent: "PetalBot", disallow: "/" },
      { userAgent: "Scrapy", disallow: "/" },
      { userAgent: "AhrefsBot", disallow: "/" },
      { userAgent: "SemrushBot", disallow: "/" },
      { userAgent: "MJ12bot", disallow: "/" },
      { userAgent: "DotBot", disallow: "/" },
    ],
    sitemap: "https://persona-consultant.com/sitemap.xml",
  };
}
