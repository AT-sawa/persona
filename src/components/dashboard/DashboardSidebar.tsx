"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", icon: "📊" },
  { href: "/dashboard/profile", label: "プロフィール", icon: "👤" },
  { href: "/dashboard/profile/experience", label: "職務経歴", icon: "📋" },
  { href: "/dashboard/preferences", label: "条件登録", icon: "⚙️" },
  { href: "/dashboard/resumes", label: "レジュメ", icon: "📄" },
  { href: "/dashboard/cases", label: "案件検索", icon: "🔍" },
  { href: "/dashboard/matching", label: "マッチング", icon: "🎯" },
  { href: "/dashboard/entries", label: "エントリー", icon: "✉️" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[220px] shrink-0">
        <nav className="sticky top-[76px] flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-blue/10 text-blue font-bold border-l-2 border-blue"
                  : "text-[#666] hover:bg-[#f5f5f5] hover:text-navy border-l-2 border-transparent"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-border flex justify-around py-1 px-1 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        {NAV_ITEMS.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-2 min-w-[56px] text-center transition-colors ${
              isActive(item.href) ? "text-blue" : "text-[#999]"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[9px] font-bold leading-tight">
              {item.label}
            </span>
          </Link>
        ))}
        <Link
          href="/dashboard/matching"
          className={`flex flex-col items-center gap-0.5 py-1.5 px-2 min-w-[56px] text-center transition-colors ${
            pathname.startsWith("/dashboard/matching") ? "text-blue" : "text-[#999]"
          }`}
        >
          <span className="text-lg">🎯</span>
          <span className="text-[9px] font-bold leading-tight">マッチング</span>
        </Link>
      </nav>
    </>
  );
}
