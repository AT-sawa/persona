"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

export default function BlogTracker({
  slug,
  category,
}: {
  slug: string;
  category: string;
}) {
  useEffect(() => {
    analytics.blogView(slug, category);
  }, [slug, category]);

  return null;
}
