"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect to proposals list — creation is now inline
export default function AdminNewProposalRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/admin/proposals");
  }, [router]);
  return (
    <div className="py-8">
      <div className="text-sm text-[#888]">リダイレクト中...</div>
    </div>
  );
}
