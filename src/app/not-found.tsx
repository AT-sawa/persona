import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="py-[120px] px-6 text-center min-h-[60vh] flex items-center justify-center">
        <div>
          <p className="text-[80px] font-black text-blue/15 leading-none mb-4">
            404
          </p>
          <h1 className="text-xl font-black text-navy mb-3">
            ページが見つかりません
          </h1>
          <p className="text-sm text-[#888] leading-[1.8] mb-8 max-w-[400px] mx-auto">
            お探しのページは移動または削除された可能性があります。
            <br />
            URLをご確認のうえ、再度お試しください。
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-blue text-white px-6 py-3 text-[14px] font-bold transition-colors hover:bg-blue-dark"
            >
              トップページへ
            </Link>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 border border-blue text-blue px-6 py-3 text-[14px] font-bold transition-colors hover:bg-blue/5"
            >
              案件一覧を見る
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
