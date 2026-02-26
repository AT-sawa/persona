import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-noto-serif-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "フリーコンサル案件紹介サービスPERSONA",
    template: "%s | PERSONA",
  },
  description:
    "コンサルティングファーム出身者のためのフリーコンサル案件紹介プラットフォーム。登録者1,200人、提携エージェント30社以上、案件常時100件以上。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${notoSerifJP.variable} antialiased`}
        style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
