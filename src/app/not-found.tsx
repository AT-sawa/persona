import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ページが見つかりません | PERSONA",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="pt-[72px] min-h-[70vh] flex items-center justify-center px-6">
        <div className="max-w-[480px] text-center py-20">
          <p className="text-[80px] font-black text-blue leading-none mb-4 select-none">
            404
          </p>
          <h1 className="text-[clamp(20px,3vw,26px)] font-black text-navy leading-[1.4] mb-3">
            ページが見つかりません
          </h1>
          <p className="text-[14px] text-[#666] leading-[1.8] mb-8">
            お探しのページは移動または削除された可能性があります。
            <br />
            URLが正しいかご確認ください。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-blue text-white px-6 py-3 text-[14px] font-bold transition-colors hover:bg-blue-dark min-w-[160px]"
            >
              トップページへ
            </Link>
            <Link
              href="/cases"
              className="inline-flex items-center justify-center border border-blue text-blue px-6 py-3 text-[14px] font-bold transition-colors hover:bg-blue hover:text-white min-w-[160px]"
            >
              案件を探す
            </Link>
          </div>
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-[12px] text-[#999] mb-4">
              以下のページもご覧ください
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link
                href="/blog"
                className="text-[13px] text-blue hover:underline"
              >
                ブログ
              </Link>
              <Link
                href="/expertise"
                className="text-[13px] text-blue hover:underline"
              >
                専門領域
              </Link>
              <Link
                href="/industries"
                className="text-[13px] text-blue hover:underline"
              >
                業界別案件
              </Link>
              <Link
                href="/for-enterprise"
                className="text-[13px] text-blue hover:underline"
              >
                企業向け
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
