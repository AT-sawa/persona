"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RegisterLink() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <Link
      href={isHome ? "#register" : "/auth/register"}
      className="border border-blue text-blue px-[18px] py-2 text-[13px] font-bold transition-colors hover:bg-blue hover:text-white"
    >
      無料登録
    </Link>
  );
}
