"use client";

import { useState } from "react";
import type { TocItem } from "@/lib/blog";

interface Props {
  items: TocItem[];
}

export default function BlogTOC({ items }: Props) {
  const [open, setOpen] = useState(false);

  if (items.length < 3) return null;

  return (
    <nav
      className="my-8 bg-[#f8fafc] border border-border rounded-xl overflow-hidden"
      aria-label="目次"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left cursor-pointer"
      >
        <span className="text-[14px] font-bold text-navy flex items-center gap-2">
          <svg className="w-4 h-4 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h12" />
          </svg>
          目次
        </span>
        <svg
          className={`w-4 h-4 text-[#999] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-border/50">
          <ul className="mt-3 flex flex-col gap-1.5">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`block text-[13px] leading-[1.7] text-[#555] hover:text-blue transition-colors ${
                    item.level === 3 ? "pl-4 text-[12px] text-[#777]" : "font-medium"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
