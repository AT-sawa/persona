import type { MetadataRoute } from "next";
import { EXPERTISE_SLUGS } from "@/lib/expertise-data";
import { INDUSTRY_SLUGS } from "@/lib/industry-data";
import { CASE_STUDY_SLUGS } from "@/lib/case-studies-data";

const BASE_URL = "https://persona-consultant.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/cases`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/for-enterprise`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cases/category/consul`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/cases/category/si`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Expertise hub + detail pages
  const expertisePages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/expertise`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...EXPERTISE_SLUGS.map((slug) => ({
      url: `${BASE_URL}/expertise/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  // Industry hub + detail pages
  const industryPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/industries`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...INDUSTRY_SLUGS.map((slug) => ({
      url: `${BASE_URL}/industries/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  // Case studies hub + detail pages
  const caseStudyPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/case-studies`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...CASE_STUDY_SLUGS.map((slug) => ({
      url: `${BASE_URL}/case-studies/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  // Dynamic case pages from Supabase
  let casePages: MetadataRoute.Sitemap = [];
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: cases } = await supabase
        .from("cases")
        .select("id, published_at, is_active");

      if (cases) {
        casePages = cases.map((c) => ({
          url: `${BASE_URL}/cases/${c.id}`,
          lastModified: c.published_at
            ? new Date(c.published_at)
            : new Date(),
          changeFrequency: c.is_active ? ("weekly" as const) : ("monthly" as const),
          priority: c.is_active ? 0.8 : 0.4,
        }));
      }
    } catch {
      // Supabase not available — skip dynamic pages
    }
  }

  // Blog posts
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const { getAllPosts } = await import("@/lib/blog");
    const posts = getAllPosts();
    blogPages = posts.map((p) => ({
      url: `${BASE_URL}/blog/${p.slug}`,
      lastModified: p.date ? new Date(p.date) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // No blog posts yet
  }

  return [...staticPages, ...expertisePages, ...industryPages, ...caseStudyPages, ...casePages, ...blogPages];
}
