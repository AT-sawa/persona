import Image from "next/image";
import Link from "next/link";

const FOOTER_CATEGORIES = [
  { slug: "strategy", name: "戦略コンサル" },
  { slug: "dx", name: "DX・デジタル" },
  { slug: "pmo", name: "PMO" },
  { slug: "sap", name: "SAP・ERP" },
  { slug: "bpr", name: "業務改革" },
  { slug: "ma", name: "M&A・PMI" },
  { slug: "it-system", name: "IT戦略" },
  { slug: "new-business", name: "新規事業" },
  { slug: "finance-accounting", name: "経理・財務" },
  { slug: "scm", name: "SCM" },
  { slug: "hr-org", name: "人事・組織" },
  { slug: "marketing-cx", name: "マーケティング" },
];

export default function Footer() {
  return (
    <footer className="bg-navy text-white pt-[52px] pb-5 px-6">
      <div className="max-w-[1160px] mx-auto">
        {/* Category links for SEO internal linking */}
        <div className="pb-7 mb-7 border-b border-white/[0.07]">
          <p className="text-[10px] font-bold tracking-[0.14em] text-accent opacity-60 uppercase mb-3">
            案件カテゴリ
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {FOOTER_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/cases/category/${cat.slug}`}
                className="text-[11px] text-white/25 transition-colors hover:text-white"
              >
                {cat.name}案件
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-9 pb-8 border-b border-white/[0.07] mb-[18px]">
          <div>
            <Image
              src="/images/persona_logo_white.png"
              alt="PERSONA"
              width={140}
              height={28}
              className="h-7 w-auto object-contain mb-3"
            />
            <p className="text-xs text-white/[0.28] leading-[1.8] mb-1">
              ファーム出身コンサルタントのための
              <br />
              フリーコンサル案件紹介サービス
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-accent opacity-60 uppercase mb-3">
              コンサル向け
            </p>
            <ul className="list-none flex flex-col gap-[9px]">
              <li>
                <Link href="/" className="text-xs text-white/30 transition-colors hover:text-white">
                  PERSONAとは
                </Link>
              </li>
              <li>
                <Link href="/cases" className="text-xs text-white/30 transition-colors hover:text-white">
                  案件一覧
                </Link>
              </li>
              <li>
                <Link href="/expertise" className="text-xs text-white/30 transition-colors hover:text-white">
                  専門領域
                </Link>
              </li>
              <li>
                <Link href="/industries" className="text-xs text-white/30 transition-colors hover:text-white">
                  業界別案件
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="text-xs text-white/30 transition-colors hover:text-white">
                  無料登録
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-accent opacity-60 uppercase mb-3">
              企業向け
            </p>
            <ul className="list-none flex flex-col gap-[9px]">
              <li>
                <Link href="/for-enterprise" className="text-xs text-white/30 transition-colors hover:text-white">
                  企業様へ
                </Link>
              </li>
              <li>
                <Link href="/case-studies" className="text-xs text-white/30 transition-colors hover:text-white">
                  導入事例
                </Link>
              </li>
              <li>
                <Link href="/for-enterprise#contact" className="text-xs text-white/30 transition-colors hover:text-white">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-accent opacity-60 uppercase mb-3">
              情報
            </p>
            <ul className="list-none flex flex-col gap-[9px]">
              <li>
                <Link href="/blog" className="text-xs text-white/30 transition-colors hover:text-white">
                  ブログ
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-xs text-white/30 transition-colors hover:text-white">
                  プライバシーポリシー
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <p className="text-[11px] text-white/20">
            ©︎PERSONA All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
