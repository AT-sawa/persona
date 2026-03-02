"use client";

import { useState, useEffect } from "react";
import { getVariant } from "@/lib/ab-test";

/**
 * React hook for A/B testing.
 *
 * Returns the variant ("A" or "B") for the given experiment.
 * Assignment is sticky via cookie for 30 days.
 *
 * Usage:
 *   const variant = useExperiment("cta-text");
 *   return variant === "B" ? <NewCTA /> : <OldCTA />;
 */
export function useExperiment(experimentId: string): "A" | "B" {
  const [variant, setVariant] = useState<"A" | "B">("A");

  useEffect(() => {
    setVariant(getVariant(experimentId));
  }, [experimentId]);

  return variant;
}
