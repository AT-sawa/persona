"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    fetch(`/api/newsletter?token=${encodeURIComponent(token)}`, {
      method: "DELETE",
    })
      .then((res) => {
        setStatus(res.ok ? "success" : "error");
      })
      .catch(() => {
        setStatus("error");
      });
  }, [token]);

  return (
    <div className="max-w-[480px] text-center py-20">
      {status === "loading" && (
        <>
          <p className="text-[16px] font-bold text-navy mb-3">処理中...</p>
          <p className="text-[14px] text-[#666]">
            配信停止を処理しています。
          </p>
        </>
      )}
      {status === "success" && (
        <>
          <p className="text-[40px] mb-4">&#10003;</p>
          <h1 className="text-[clamp(20px,3vw,26px)] font-black text-navy mb-3">
            配信停止が完了しました
          </h1>
          <p className="text-[14px] text-[#666] leading-[1.8] mb-8">
            ニュースレターの配信を停止しました。
            <br />
            再度登録をご希望の場合は、ブログページからお申し込みください。
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center justify-center bg-blue text-white px-6 py-3 text-[14px] font-bold transition-colors hover:bg-blue-dark"
          >
            ブログへ戻る
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-[clamp(20px,3vw,26px)] font-black text-navy mb-3">
            配信停止に失敗しました
          </h1>
          <p className="text-[14px] text-[#666] leading-[1.8] mb-8">
            リンクが無効か、既に配信停止済みの可能性があります。
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-blue text-white px-6 py-3 text-[14px] font-bold transition-colors hover:bg-blue-dark"
          >
            トップページへ
          </Link>
        </>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <>
      <Header />
      <main className="pt-[72px] min-h-[70vh] flex items-center justify-center px-6">
        <Suspense
          fallback={
            <div className="max-w-[480px] text-center py-20">
              <p className="text-[16px] font-bold text-navy">処理中...</p>
            </div>
          }
        >
          <UnsubscribeContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
