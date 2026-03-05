"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/components/NotificationBell";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isDashboard = pathname.startsWith("/dashboard");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  return (
    <header className="sticky top-0 z-[200] bg-white border-b border-border shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="max-w-[1160px] mx-auto flex items-center px-6 h-[60px] gap-6">
        <Link
          href={isLoggedIn ? "/dashboard" : "/"}
          className="shrink-0"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <Image
            src="/images/persona_logo.png"
            alt="PERSONA フリーコンサルクラウド"
            width={140}
            height={36}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="ml-auto hidden md:flex items-center gap-1.5">
          {isDashboard ? (
            <>
              <Link
                href="/search"
                className="flex items-center justify-center w-8 h-8 text-[#888] hover:text-blue transition-colors mr-0.5"
                aria-label="検索"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </Link>
              <Link
                href="/dashboard/cases"
                className="bg-blue text-white px-[18px] py-2 font-bold text-[13px] transition-colors hover:bg-blue-dark"
              >
                案件を探す
              </Link>
              <Link
                href="/dashboard/matching"
                className="text-[13px] font-medium text-text px-3.5 py-1.5 transition-colors hover:text-blue"
              >
                マッチング
              </Link>
              <Link
                href="/dashboard/entries"
                className="text-[13px] font-medium text-text px-3.5 py-1.5 transition-colors hover:text-blue"
              >
                エントリー
              </Link>
              <NotificationBell />
              <Link
                href="/dashboard"
                className="border border-blue text-blue px-[18px] py-2 text-[13px] font-bold transition-colors hover:bg-blue hover:text-white"
              >
                マイページ
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/search"
                className="flex items-center justify-center w-8 h-8 text-[#888] hover:text-blue transition-colors mr-0.5"
                aria-label="検索"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </Link>
              <Link
                href="/cases"
                className="bg-blue text-white px-[18px] py-2 font-bold text-[13px] transition-colors hover:bg-blue-dark"
              >
                案件を探す
              </Link>
              <Link
                href="/expertise"
                className="text-[13px] font-medium text-text px-3.5 py-1.5 transition-colors hover:text-blue"
              >
                専門領域
              </Link>
              <Link
                href="/industries"
                className="text-[13px] font-medium text-text px-3.5 py-1.5 transition-colors hover:text-blue"
              >
                業界別案件
              </Link>
              <Link
                href="/case-studies"
                className="text-[13px] font-medium text-text px-3.5 py-1.5 transition-colors hover:text-blue"
              >
                導入事例
              </Link>
              <Link
                href="/blog"
                className="text-[13px] font-medium text-text px-3.5 py-1.5 transition-colors hover:text-blue"
              >
                ブログ
              </Link>
              <Link
                href="/for-enterprise"
                className="text-[13px] font-medium text-text px-3.5 py-1.5 transition-colors hover:text-blue"
              >
                企業向け
              </Link>
              {isLoggedIn ? (
                <>
                  <NotificationBell />
                  <Link
                    href="/dashboard"
                    className="border border-blue text-blue px-[18px] py-2 text-[13px] font-bold transition-colors hover:bg-blue hover:text-white"
                  >
                    マイページ
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="text-[13px] font-medium text-text px-3.5 py-1.5 transition-colors hover:text-blue"
                  >
                    ログイン
                  </Link>
                  <Link
                    href="/auth/register"
                    className="border border-blue text-blue px-[18px] py-2 text-[13px] font-bold transition-colors hover:bg-blue hover:text-white"
                  >
                    無料登録
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="ml-auto md:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px]"
          aria-label="メニューを開く"
        >
          <span
            className={`block w-5 h-[2px] bg-navy transition-transform duration-200 ${
              open ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`block w-5 h-[2px] bg-navy transition-opacity duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-[2px] bg-navy transition-transform duration-200 ${
              open ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="md:hidden bg-white border-t border-border shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          {isDashboard ? (
            <>
              <Link
                href="/search"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-6 py-3.5 text-[14px] font-medium text-text border-b border-border/50 hover:bg-[#f7faff]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                検索
              </Link>
              <Link
                href="/dashboard/cases"
                onClick={() => setOpen(false)}
                className="block px-6 py-3.5 text-[14px] font-bold text-navy border-b border-border/50 hover:bg-[#f7faff]"
              >
                案件を探す
              </Link>
              <Link
                href="/dashboard/matching"
                onClick={() => setOpen(false)}
                className="block px-6 py-3.5 text-[14px] font-medium text-text border-b border-border/50 hover:bg-[#f7faff]"
              >
                マッチング
              </Link>
              <Link
                href="/dashboard/entries"
                onClick={() => setOpen(false)}
                className="block px-6 py-3.5 text-[14px] font-medium text-text border-b border-border/50 hover:bg-[#f7faff]"
              >
                エントリー
              </Link>
              <Link
                href="/dashboard/notifications"
                onClick={() => setOpen(false)}
                className="block px-6 py-3.5 text-[14px] font-medium text-text border-b border-border/50 hover:bg-[#f7faff]"
              >
                通知
              </Link>
              <Link
                href="/dashboard/profile"
                onClick={() => setOpen(false)}
                className="block px-6 py-3.5 text-[14px] font-medium text-text border-b border-border/50 hover:bg-[#f7faff]"
              >
                プロフィール
              </Link>
              <div className="p-4">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="block text-center py-3 bg-blue text-white text-[14px] font-bold transition-colors hover:bg-blue-dark"
                >
                  マイページ
                </Link>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/search"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-6 py-3.5 text-[14px] font-medium text-text border-b border-border/50 hover:bg-[#f7faff]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                検索
              </Link>
              <Link
                href="/cases"
                onClick={() => setOpen(false)}
                className="block px-6 py-3.5 text-[14px] font-bold text-navy border-b border-border/50 hover:bg-[#f7faff]"
              >
                案件を探す
              </Link>
              <Link
                href="/expertise"
                onClick={() => setOpen(false)}
                className="block px-6 py-3.5 text-[14px] font-medium text-text border-b border-border/50 hover:bg-[#f7faff]"
              >
                専門領域
              </Link>
              <Link
                href="/industries"
                onClick={() => setOpen(false)}
                className="block px-6 py-3.5 text-[14px] font-medium text-text border-b border-border/50 hover:bg-[#f7faff]"
              >
                業界別案件
              </Link>
              <Link
                href="/case-studies"
                onClick={() => setOpen(false)}
                className="block px-6 py-3.5 text-[14px] font-medium text-text border-b border-border/50 hover:bg-[#f7faff]"
              >
                導入事例
              </Link>
              <Link
                href="/blog"
                onClick={() => setOpen(false)}
                className="block px-6 py-3.5 text-[14px] font-medium text-text border-b border-border/50 hover:bg-[#f7faff]"
              >
                ブログ
              </Link>
              <Link
                href="/for-enterprise"
                onClick={() => setOpen(false)}
                className="block px-6 py-3.5 text-[14px] font-medium text-text border-b border-border/50 hover:bg-[#f7faff]"
              >
                企業向け
              </Link>
              <div className="p-4">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="block text-center py-3 bg-blue text-white text-[14px] font-bold transition-colors hover:bg-blue-dark"
                  >
                    マイページ
                  </Link>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/auth/register"
                      onClick={() => setOpen(false)}
                      className="block text-center py-3 bg-blue text-white text-[14px] font-bold transition-colors hover:bg-blue-dark"
                    >
                      無料登録
                    </Link>
                    <Link
                      href="/auth/login"
                      onClick={() => setOpen(false)}
                      className="block text-center py-3 border border-border text-[14px] font-medium text-text transition-colors hover:bg-[#f7faff]"
                    >
                      ログイン
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
