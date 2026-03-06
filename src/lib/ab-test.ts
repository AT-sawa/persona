/**
 * Lightweight A/B testing infrastructure.
 *
 * Usage:
 * 1. Define experiments in AB_EXPERIMENTS below
 * 2. In a client component:
 *    import { useExperiment } from "@/lib/ab-test";
 *    const variant = useExperiment("cta-color");  // "A" or "B"
 * 3. Track conversions by sending events to GA4:
 *    gtag("event", "ab_conversion", { experiment: "cta-color", variant });
 */

/** Experiment definition */
export interface ABExperiment {
  /** Unique experiment ID */
  id: string;
  /** Description for documentation */
  description: string;
  /** Traffic allocation for variant B (0-1). Default: 0.5 */
  trafficB?: number;
  /** Whether experiment is active */
  active: boolean;
}

/**
 * Register experiments here. Inactive experiments always return "A".
 */
export const AB_EXPERIMENTS: ABExperiment[] = [
  {
    id: "cta-text",
    description: "Test CTA button text: A=無料登録 vs B=案件を見てみる",
    trafficB: 0.5,
    active: true,
  },
  {
    id: "hero-layout",
    description: "Test hero section layout: A=current vs B=stats-focused",
    trafficB: 0.5,
    active: true,
  },
];

const COOKIE_PREFIX = "ab_";

/** Get or assign variant for an experiment (client-side) */
export function getVariant(experimentId: string): "A" | "B" {
  const experiment = AB_EXPERIMENTS.find((e) => e.id === experimentId);
  if (!experiment || !experiment.active) return "A";

  if (typeof document === "undefined") return "A";

  const cookieName = `${COOKIE_PREFIX}${experimentId}`;
  const existing = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${cookieName}=`));

  if (existing) {
    return existing.split("=")[1] === "B" ? "B" : "A";
  }

  // Assign new variant
  const variant = Math.random() < (experiment.trafficB ?? 0.5) ? "B" : "A";
  // Set cookie for 30 days
  document.cookie = `${cookieName}=${variant}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;

  return variant;
}
