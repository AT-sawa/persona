"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", icon: "dashboard" },
  { href: "/dashboard/profile", label: "プロフィール", icon: "person" },
  { href: "/dashboard/profile/experience", label: "職務経歴", icon: "work_history" },
  { href: "/dashboard/preferences", label: "希望条件", icon: "tune" },
  { href: "/dashboard/resumes", label: "レジュメ", icon: "description" },
  { href: "/dashboard/cases", label: "案件検索", icon: "search" },
  { href: "/dashboard/matching", label: "マッチング", icon: "auto_awesome" },
  { href: "/dashboard/entries", label: "エントリー", icon: "send" },
];

const ADMIN_ITEMS = [
  { href: "/dashboard/admin", label: "管理者TOP", icon: "admin_panel_settings" },
  { href: "/dashboard/admin/users", label: "ユーザー管理", icon: "group" },
  { href: "/dashboard/admin/cases", label: "案件管理", icon: "folder_open" },
  { href: "/dashboard/admin/entries", label: "エントリー管理", icon: "assignment" },
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
      <aside className="hidden lg:block w-[240px] shrink-0">
        <nav className="sticky top-[84px] flex flex-col gap-0.5 bg-white rounded-2xl border border-border/60 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-xl transition-all ${
                isActive(item.href)
                  ? "bg-blue/8 text-blue font-bold"
                  : "text-[#555] hover:bg-[#f5f7fa] hover:text-navy"
              }`}
            >
              <span
                className={`material-symbols-rounded text-[20px] ${
                  isActive(item.href) ? "filled" : ""
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="border-t border-border/60 my-2" />
              <p className="px-4 py-1 text-[10px] font-bold text-[#aaa] tracking-wider uppercase">
                Admin
              </p>
              {ADMIN_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-xl transition-all ${
                    isActive(item.href)
                      ? "bg-[#fef2f2] text-[#E15454] font-bold"
                      : "text-[#555] hover:bg-[#f5f7fa] hover:text-navy"
                  }`}
                >
                  <span
                    className={`material-symbols-rounded text-[20px] ${
                      isActive(item.href) ? "filled" : ""
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-t border-border/40 flex justify-around py-1.5 px-1 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        {NAV_ITEMS.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 min-w-[56px] text-center transition-colors ${
              isActive(item.href) ? "text-blue" : "text-[#999]"
            }`}
          >
            <span
              className={`material-symbols-rounded text-[22px] ${
                isActive(item.href) ? "filled" : ""
              }`}
            >
              {item.icon}
            </span>
            <span className="text-[9px] font-bold leading-tight">
              {item.label}
            </span>
          </Link>
        ))}
        {isAdmin ? (
          <Link
            href="/dashboard/admin"
            className={`flex flex-col items-center gap-0.5 py-1 px-2 min-w-[56px] text-center transition-colors ${
              pathname.startsWith("/dashboard/admin") ? "text-[#E15454]" : "text-[#999]"
            }`}
          >
            <span className={`material-symbols-rounded text-[22px] ${pathname.startsWith("/dashboard/admin") ? "filled" : ""}`}>
              admin_panel_settings
            </span>
            <span className="text-[9px] font-bold leading-tight">管理者</span>
          </Link>
        ) : (
          <Link
            href="/dashboard/matching"
            className={`flex flex-col items-center gap-0.5 py-1 px-2 min-w-[56px] text-center transition-colors ${
              pathname.startsWith("/dashboard/matching") ? "text-blue" : "text-[#999]"
            }`}
          >
            <span className={`material-symbols-rounded text-[22px] ${pathname.startsWith("/dashboard/matching") ? "filled" : ""}`}>
              auto_awesome
            </span>
            <span className="text-[9px] font-bold leading-tight">マッチング</span>
          </Link>
        )}
      </nav>
    </>
  );
}
