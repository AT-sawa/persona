"use client";

import { useEffect } from "react";

/**
 * Captures traffic source data (referrer + UTM) on the user's first page load
 * and stores it in sessionStorage for later use during registration.
 *
 * Renders nothing. Zero performance impact — runs once per session,
 * reads URL params synchronously, writes to sessionStorage.
 */
export default function TrafficSourceCapture() {
  useEffect(() => {
    // Only capture once per session
    if (sessionStorage.getItem("_ts_captured")) return;

    const params = new URLSearchParams(window.location.search);
    const trafficSource = {
      referrer: document.referrer || null,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_term: params.get("utm_term"),
      utm_content: params.get("utm_content"),
      landing_page: window.location.pathname,
    };

    sessionStorage.setItem("_traffic_source", JSON.stringify(trafficSource));
    sessionStorage.setItem("_ts_captured", "1");
  }, []);

  return null;
}
