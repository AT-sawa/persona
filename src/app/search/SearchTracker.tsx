"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

export default function SearchTracker({
  query,
  resultCount,
}: {
  query: string;
  resultCount: number;
}) {
  useEffect(() => {
    if (query) {
      analytics.searchPerformed(query, resultCount);
    }
  }, [query, resultCount]);

  return null;
}
