"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { analytics } from "@/lib/analytics";

const HIDDEN_PATHS = ["/auth/register", "/dashboard", "/onboarding", "/services/assessment"];
const SESSION_KEY = "persona_cta_dismissed";

export default function FloatingCTA() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [nearRegister, setNearRegister] = useState(false);
  const pathname = usePathname();

  const isHiddenPath = HIDDEN_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY)) {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (dismissed || isHiddenPath) return;

    const heroEl = document.getElementById("hero");
    const registerEl = document.getElementById("register");

    let heroObserver: IntersectionObserver | undefined;
    let registerObserver: IntersectionObserver | undefined;

    if (heroEl) {
      heroObserver = new IntersectionObserver(
        ([entry]) => setVisible(!entry.isIntersecting),
        { threshold: 0 }
      );
      heroObserver.observe(heroEl);
    } else {
      // Non-homepage: show after 300px scroll
      const handleScroll = () => {
        if (window.scrollY > 300) {
          setVisible(true);
          window.removeEventListener("scroll", handleScroll);
        }
      };
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }

    if (registerEl) {
      registerObserver = new IntersectionObserver(
        ([entry]) => setNearRegister(entry.isIntersecting),
        { threshold: 0.1 }
      );
      registerObserver.observe(registerEl);
    }

    return () => {
      heroObserver?.disconnect();
      registerObserver?.disconnect();
    };
  }, [dismissed, isHiddenPath]);

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem(SESSION_KEY, "1");
  }

  if (isHiddenPath || dismissed) return null;

  const show = visible && !nearRegister;

  return (
    <div
      className={`fixed z-[190] transition-all duration-400 ease-out
        ${show
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-full pointer-events-none"
        }
        bottom-0 left-0 right-0
        md:bottom-6 md:right-6 md:left-auto md:w-[320px]`}
      role="complementary"
      aria-label="無料登録のご案内"
    >
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 md:top-3 md:right-3 w-7 h-7 flex items-center justify-center rounded-full bg-[#f2f2f7] hover:bg-[#e8e8ed] transition-colors z-10"
        aria-label="閉じる"
      >
        <span className="material-symbols-rounded" style={{ fontSize: "16px" }}>
          close
        </span>
      </button>

      {/* PC layout */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#e8e8ed] shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-5">
        <p className="text-[10px] font-bold text-blue tracking-[0.14em] uppercase mb-1.5">
          FREE REGISTRATION
        </p>
        <p className="text-[15px] font-black text-navy leading-[1.4] mb-2">
          フリーコンサル案件を
          <br />
          今すぐ探してみませんか？
        </p>
        <p className="text-[11.5px] text-[#888] leading-[1.7] mb-3.5">
          登録無料・常時100件以上の案件
        </p>
        <Link
          href="/auth/register"
          onClick={() => analytics.ctaClick("floating_pc")}
          className="flex items-center justify-center gap-2 w-full py-3 bg-blue text-white text-[14px] font-bold rounded-lg transition-colors hover:bg-blue-dark shadow-[0_4px_14px_rgba(31,171,233,0.25)]"
        >
          無料で登録する
          <span className="material-symbols-rounded" style={{ fontSize: "18px" }}>
            arrow_forward
          </span>
        </Link>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden bg-white border-t border-[#e8e8ed] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-navy truncate">
            フリーコンサル案件を探す
          </p>
          <p className="text-[10.5px] text-[#888]">登録無料・100件以上</p>
        </div>
        <Link
          href="/auth/register"
          onClick={() => analytics.ctaClick("floating_mobile")}
          className="shrink-0 bg-blue text-white text-[13px] font-bold px-5 py-2.5 rounded-lg transition-colors hover:bg-blue-dark"
        >
          無料登録
        </Link>
      </div>
    </div>
  );
}
