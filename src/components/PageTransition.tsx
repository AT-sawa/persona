"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const contentRef = useRef<HTMLDivElement>(null);
  const [navigating, setNavigating] = useState(false);

  // Intercept internal link clicks to show progress bar immediately
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href === pathname ||
        anchor.hasAttribute("download") ||
        anchor.target === "_blank"
      )
        return;
      // Internal navigation detected — show progress bar
      setNavigating(true);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  // When pathname changes, hide progress bar and animate content in
  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    setNavigating(false);

    const el = contentRef.current;
    if (!el) return;

    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Fade + slide-up for the new page content
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transition = "none";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition =
          "opacity 0.3s ease-out, transform 0.3s ease-out";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    });
  }, [pathname]);

  return (
    <>
      {/* Top progress bar — immediate visual feedback on navigation */}
      <div
        className={`fixed top-0 left-0 z-[250] h-[2.5px] bg-blue ${
          navigating
            ? "w-[70%] opacity-100 transition-[width] duration-[2500ms] ease-out"
            : "w-full opacity-0 transition-opacity duration-200"
        }`}
        style={{
          boxShadow: navigating
            ? "0 0 8px rgba(31,171,233,0.4)"
            : "none",
        }}
      />
      <div ref={contentRef}>{children}</div>
    </>
  );
}
