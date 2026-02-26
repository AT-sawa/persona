import type { NextConfig } from "next";

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
};

export default nextConfig;
