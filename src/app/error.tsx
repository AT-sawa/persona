"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-bg px-6">
      <div className="max-w-[480px] text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#E15454]/10 flex items-center justify-center">
          <span className="text-[#E15454] text-2xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-black text-navy mb-3">
          エラーが発生しました
        </h2>
        <p className="text-sm text-[#888] leading-[1.8] mb-6">
          申し訳ございません。問題が発生しました。
          <br />
          もう一度お試しいただくか、トップページからやり直してください。
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-blue text-white text-sm font-bold transition-colors hover:bg-blue-dark"
          >
            もう一度試す
          </button>
          <a
            href="/"
            className="px-6 py-2.5 border border-border text-sm font-bold text-text transition-colors hover:bg-[#f5f5f5]"
          >
            トップへ戻る
          </a>
        </div>
      </div>
    </div>
  );
}
