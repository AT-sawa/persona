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

  // ─── Page Views (Dashboard) ───
  /** Fires when the case list page is viewed */
  caseListView: (filterCount: number) =>
    trackEvent("case_list_view", { filter_count: filterCount }),
  /** Fires when the favorites page is viewed */
  favoritesView: (count: number) =>
    trackEvent("favorites_view", { count }),
  /** Fires when the entries history page is viewed */
  entriesHistoryView: (count: number) =>
    trackEvent("entries_history_view", { count }),
  /** Fires when the preferences page is viewed */
  preferencesView: () => trackEvent("preferences_view"),
  /** Fires when the profile page is viewed */
  profileView: () => trackEvent("profile_view"),

  // ─── Search & Content ───
  /** Fires when a search is performed */
  searchPerformed: (query: string, resultCount: number) =>
    trackEvent("search_performed", { query, result_count: resultCount }),
  /** Fires when a blog article is viewed */
  blogView: (slug: string, category: string) =>
    trackEvent("blog_view", { slug, category }),
  /** Fires when a case study is viewed */
  caseStudyView: (slug: string, category: string) =>
    trackEvent("case_study_view", { slug, category }),

  // ─── User Actions ───
  /** Fires when a case is added to favorites */
  favoriteAdd: (caseId: string) =>
    trackEvent("favorite_add", { case_id: caseId }),
  /** Fires when a case is removed from favorites */
  favoriteRemove: (caseId: string) =>
    trackEvent("favorite_remove", { case_id: caseId }),
  /** Fires when the user profile is updated */
  profileUpdate: () => trackEvent("profile_update"),
  /** Fires when user preferences are updated */
  preferencesUpdate: () => trackEvent("preferences_update"),

  // ─── A/B Testing ───
  /** Fires when a user is assigned to an experiment variant */
  abExperiment: (experiment: string, variant: string) =>
    trackEvent("ab_experiment", { experiment, variant }),
  /** Fires when a user in an experiment converts */
  abConversion: (experiment: string, variant: string) =>
    trackEvent("ab_conversion", { experiment, variant }),
};
