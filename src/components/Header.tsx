"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
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
          />
        </Link>
        <nav className="ml-auto flex items-center gap-1.5">
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
      </div>
    </header>
  );
}
