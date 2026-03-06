"use client";

import { useState, useEffect, useRef } from "react";
import { getVariant } from "@/lib/ab-test";
import { analytics } from "@/lib/analytics";

/**
 * React hook for A/B testing.
 *
 * Returns the variant ("A" or "B") for the given experiment.
 * Assignment is sticky via cookie for 30 days.
 * Automatically sends GA4 event on first assignment.
 *
 * Usage:
 *   const variant = useExperiment("cta-text");
 *   return variant === "B" ? <NewCTA /> : <OldCTA />;
 */
export function useExperiment(experimentId: string): "A" | "B" {
  const [variant, setVariant] = useState<"A" | "B">("A");
  const tracked = useRef(false);

  useEffect(() => {
    const v = getVariant(experimentId);
    setVariant(v);

    // Track variant assignment once per session
    if (!tracked.current) {
      analytics.abExperiment(experimentId, v);
      tracked.current = true;
    }
  }, [experimentId]);

  return variant;
}
