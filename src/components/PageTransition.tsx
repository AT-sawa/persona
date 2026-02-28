"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    const el = contentRef.current;
    if (!el) return;

    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // View Transitions API handles it via CSS — skip fallback for supported browsers
    if ("startViewTransition" in document) return;

    // Fallback: simple opacity fade for unsupported browsers
    el.style.opacity = "0";
    el.style.transition = "none";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "opacity 0.25s ease-out";
        el.style.opacity = "1";
      });
    });
  }, [pathname]);

  return <div ref={contentRef}>{children}</div>;
}
