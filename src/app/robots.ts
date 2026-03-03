import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/constants";

/**
 * Public pages that AI search engines should index for GEO
 * (Generative Engine Optimization).
 */
const PUBLIC_PATHS = [
  "/",
  "/cases",
  "/blog",
  "/for-enterprise",
  "/services/",
  "/expertise",
  "/industries",
  "/case-studies",
  "/about",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Default: allow everything public ──
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/dashboard/", "/_next/"],
      },

      // ── AI Search Crawlers: ALLOW public pages for GEO ──
      // These crawlers power ChatGPT Search, Perplexity, Google AI
      // Overview, etc. Allowing them lets PERSONA appear in AI answers.
      {
        userAgent: "GPTBot",
        allow: PUBLIC_PATHS,
        disallow: ["/api/", "/auth/", "/dashboard/", "/_next/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: PUBLIC_PATHS,
        disallow: ["/api/", "/auth/", "/dashboard/", "/_next/"],
      },
      {
        userAgent: "Google-Extended",
        allow: PUBLIC_PATHS,
        disallow: ["/api/", "/auth/", "/dashboard/", "/_next/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: PUBLIC_PATHS,
        disallow: ["/api/", "/auth/", "/dashboard/", "/_next/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: PUBLIC_PATHS,
        disallow: ["/api/", "/auth/", "/dashboard/", "/_next/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: PUBLIC_PATHS,
        disallow: ["/api/", "/auth/", "/dashboard/", "/_next/"],
      },

      // ── Block: pure scrapers / training-only crawlers ──
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "Bytespider", disallow: "/" },
      { userAgent: "PetalBot", disallow: "/" },
      { userAgent: "Scrapy", disallow: "/" },
      { userAgent: "AhrefsBot", disallow: "/" },
      { userAgent: "SemrushBot", disallow: "/" },
      { userAgent: "MJ12bot", disallow: "/" },
      { userAgent: "DotBot", disallow: "/" },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
