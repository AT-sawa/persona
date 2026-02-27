"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

const ADMIN_ITEMS = [
  { href: "/dashboard/admin", label: "管理者TOP", icon: "🛡️" },
  { href: "/dashboard/admin/users", label: "ユーザー管理", icon: "👥" },
  { href: "/dashboard/admin/cases", label: "案件管理", icon: "📁" },
  { href: "/dashboard/admin/entries", label: "エントリー管理", icon: "📨" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            setIsAdmin(data?.is_admin ?? false);
          });
      }
    });
  }, []);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/dashboard/admin") return pathname === "/dashboard/admin";
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

          {isAdmin && (
            <>
              <div className="border-t border-border my-2" />
              <p className="px-4 py-1 text-[10px] font-bold text-[#aaa] tracking-wider uppercase">
                Admin
              </p>
              {ADMIN_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-[#fef2f2] text-[#E15454] font-bold border-l-2 border-[#E15454]"
                      : "text-[#666] hover:bg-[#f5f5f5] hover:text-navy border-l-2 border-transparent"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </>
          )}
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
        {isAdmin ? (
          <Link
            href="/dashboard/admin"
            className={`flex flex-col items-center gap-0.5 py-1.5 px-2 min-w-[56px] text-center transition-colors ${
              pathname.startsWith("/dashboard/admin") ? "text-[#E15454]" : "text-[#999]"
            }`}
          >
            <span className="text-lg">🛡️</span>
            <span className="text-[9px] font-bold leading-tight">管理者</span>
          </Link>
        ) : (
          <Link
            href="/dashboard/matching"
            className={`flex flex-col items-center gap-0.5 py-1.5 px-2 min-w-[56px] text-center transition-colors ${
              pathname.startsWith("/dashboard/matching") ? "text-blue" : "text-[#999]"
            }`}
          >
            <span className="text-lg">🎯</span>
            <span className="text-[9px] font-bold leading-tight">マッチング</span>
          </Link>
        )}
      </nav>
    </>
  );
}
