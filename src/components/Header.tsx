"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-[200] bg-white border-b border-border shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="max-w-[1160px] mx-auto flex items-center px-6 h-[60px] gap-6">
        <Link href="/" className="shrink-0">
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
          <Link
            href="/cases"
            className="bg-blue text-white px-[18px] py-2 font-bold text-[13px] transition-colors hover:bg-blue-dark"
          >
            案件を探す
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
          <Link
            href={isHome ? "#register" : "/auth/register"}
            className="border border-blue text-blue px-[18px] py-2 text-[13px] font-bold transition-colors hover:bg-blue hover:text-white"
          >
            無料登録
          </Link>
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
          <Link
            href="/cases"
            onClick={() => setOpen(false)}
            className="block px-6 py-3.5 text-[14px] font-bold text-navy border-b border-border/50 hover:bg-[#f7faff]"
          >
            案件を探す
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
            <Link
              href={isHome ? "#register" : "/auth/register"}
              onClick={() => setOpen(false)}
              className="block text-center py-3 bg-blue text-white text-[14px] font-bold transition-colors hover:bg-blue-dark"
            >
              無料登録
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
