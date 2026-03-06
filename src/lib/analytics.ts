/**
 * GA4 event tracking utilities.
 *
 * Provides type-safe wrappers around window.gtag for conversion tracking.
 * Events are silently ignored when GA is not loaded (e.g., dev, missing env var).
 */

function trackEvent(name: string, params?: Record<string, string | number>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

export const analytics = {
  // ─── Registration Funnel ───
  /** Fires when the registration form is displayed */
  signupStart: () => trackEvent("signup_start"),
  /** Fires on successful registration */
  signupComplete: (method: string = "email") =>
    trackEvent("sign_up", { method }),

  // ─── Onboarding Funnel ───
  /** Fires on each onboarding step transition */
  onboardingStep: (step: number) =>
    trackEvent("onboarding_step", { step }),
  /** Fires when onboarding is completed */
  onboardingComplete: () => trackEvent("onboarding_complete"),

  // ─── Case / Entry Funnel ───
  /** Fires when a case detail page is viewed */
  caseView: (caseId: string, category?: string) =>
    trackEvent("case_view", {
      case_id: caseId,
      ...(category && { category }),
    }),
  /** Fires when an entry/application is submitted */
  entrySubmit: (caseId: string) =>
    trackEvent("entry_submit", { case_id: caseId }),

  // ─── Engagement ───
  /** Fires when a CTA button is clicked */
  ctaClick: (location: string) =>
    trackEvent("cta_click", { location }),
  /** Fires when the matching page is viewed */
  matchingView: () => trackEvent("matching_view"),

  // ─── A/B Testing ───
  /** Fires when a user is assigned to an experiment variant */
  abExperiment: (experiment: string, variant: string) =>
    trackEvent("ab_experiment", { experiment, variant }),
  /** Fires when a user in an experiment converts */
  abConversion: (experiment: string, variant: string) =>
    trackEvent("ab_conversion", { experiment, variant }),
};
