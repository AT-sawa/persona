import type { NextConfig } from "next";

// Build Content-Security-Policy header value
const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://persona-consultant.com https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "persona-consultant.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // ── Legacy site URL redirects (preserve SEO equity) ──
      // Old consultant-facing top
      { source: "/free-consultant", destination: "/", permanent: true },
      { source: "/free-consultant/", destination: "/", permanent: true },
      // Old project detail pages → new case pages
      {
        source: "/free-consultant/projects/:id",
        destination: "/cases/:id",
        permanent: true,
      },
      {
        source: "/project_detail/:id",
        destination: "/cases/:id",
        permanent: true,
      },
      // Old company page → for-enterprise
      { source: "/company", destination: "/for-enterprise", permanent: true },
      { source: "/company/", destination: "/for-enterprise", permanent: true },
      // Old job search pages → cases
      {
        source: "/search-job/:path*",
        destination: "/cases",
        permanent: true,
      },
      // Old blog content pages
      {
        source: "/free-consultant/dx-success-cases",
        destination: "/blog",
        permanent: true,
      },
      {
        source: "/free-consultant/dx-success-cases/",
        destination: "/blog",
        permanent: true,
      },
      // Old category/column paths
      {
        source: "/free-consultant/:slug",
        destination: "/blog",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy,
          },
        ],
      },
      // Long cache for static assets (images, fonts, JS/CSS chunks)
      {
        source: "/images/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
