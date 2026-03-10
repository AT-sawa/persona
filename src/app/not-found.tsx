import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ページが見つかりません | PERSONA",
  robots: { index: false },
};

const CATEGORY_LINKS = [
  { href: "/cases/category/strategy", label: "戦略コンサル" },
  { href: "/cases/category/dx", label: "DX・デジタル" },
  { href: "/cases/category/pmo", label: "PMO" },
  { href: "/cases/category/sap", label: "SAP・ERP" },
  { href: "/cases/category/bpr", label: "業務改革" },
  { href: "/cases/category/ma", label: "M&A・PMI" },
  { href: "/cases/category/it-system", label: "IT戦略" },
  { href: "/cases/category/new-business", label: "新規事業" },
];

const NAV_LINKS = [
  { href: "/cases", label: "案件一覧" },
  { href: "/blog", label: "ブログ" },
  { href: "/expertise", label: "専門領域" },
  { href: "/industries", label: "業界別案件" },
  { href: "/for-enterprise", label: "企業向け" },
  { href: "/case-studies", label: "導入事例" },
];

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="pt-[72px] min-h-[70vh] flex items-center justify-center px-6">
        <div className="max-w-[560px] text-center py-16">
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

          {/* Category links for SEO */}
          <div className="mt-10 pt-8 border-t border-border">
            <p className="text-[12px] font-bold text-[#999] mb-3">
              案件カテゴリから探す
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORY_LINKS.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className="text-[12px] text-navy bg-[#f0f2f5] hover:bg-blue hover:text-white px-3 py-1.5 rounded-full transition-colors font-medium"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Navigation links */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-[12px] font-bold text-[#999] mb-3">
              その他のページ
            </p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
              {NAV_LINKS.map((nav) => (
                <Link
                  key={nav.href}
                  href={nav.href}
                  className="text-[13px] text-blue hover:underline"
                >
                  {nav.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
