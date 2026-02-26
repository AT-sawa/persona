import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "PERSONA（ペルソナ）のプライバシーポリシー。個人情報の取り扱い、利用目的、安全管理措置について記載しています。",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="py-[72px] px-6">
        <article className="max-w-[800px] mx-auto">
          <h1 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.4] mb-8">
            プライバシーポリシー
          </h1>

          <div className="text-[13.5px] leading-[1.9] text-[#555] space-y-8">
            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                1. 個人情報の定義
              </h2>
              <p>
                本プライバシーポリシーにおいて「個人情報」とは、個人情報の保護に関する法律（以下「個人情報保護法」）第2条に規定される個人情報を指し、氏名、メールアドレス、電話番号、その他特定の個人を識別できる情報をいいます。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                2. 個人情報の収集
              </h2>
              <p>
                当社は、サービスの提供にあたり、以下の目的で個人情報を収集することがあります。収集は適法かつ公正な手段により行います。
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>コンサルタント登録およびアカウント管理</li>
                <li>案件のご紹介・マッチング</li>
                <li>企業様からのお問い合わせへの対応</li>
                <li>サービスの改善・新規サービスの開発</li>
                <li>各種お知らせ・メールマガジンの配信</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                3. 個人情報の利用目的
              </h2>
              <p>当社は、収集した個人情報を以下の目的で利用いたします。</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  当社サービス（フリーコンサルタント紹介サービス）の提供・運営
                </li>
                <li>登録コンサルタントへの案件情報のご提供</li>
                <li>企業様への人材のご紹介</li>
                <li>ご本人確認、審査の実施</li>
                <li>お問い合わせへの回答</li>
                <li>利用規約に違反した方への対応</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                4. 個人情報の第三者提供
              </h2>
              <p>
                当社は、以下の場合を除き、ご本人の同意なく個人情報を第三者に提供することはありません。
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>法令に基づく場合</li>
                <li>
                  人の生命、身体または財産の保護のために必要がある場合であって、ご本人の同意を得ることが困難であるとき
                </li>
                <li>
                  案件マッチングのため、企業様にコンサルタント情報をご提供する場合（事前にご本人の同意を得た場合に限ります）
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                5. 個人情報の安全管理
              </h2>
              <p>
                当社は、個人情報の漏洩、滅失、き損の防止その他個人情報の安全管理のために、必要かつ適切な措置を講じます。また、個人情報を取り扱う従業者に対して、必要かつ適切な監督を行います。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                6. Cookie（クッキー）の使用
              </h2>
              <p>
                当社のウェブサイトでは、サービスの利便性向上やアクセス分析のためにCookieを使用することがあります。Cookieの使用を望まない場合は、ブラウザの設定によりCookieを無効にすることが可能です。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                7. 個人情報の開示・訂正・削除
              </h2>
              <p>
                ご本人から個人情報の開示、訂正、削除等のご請求があった場合は、ご本人確認の上、合理的な期間内に対応いたします。ご請求は下記のお問い合わせ窓口までご連絡ください。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                8. プライバシーポリシーの変更
              </h2>
              <p>
                当社は、必要に応じて本プライバシーポリシーを変更することがあります。変更後のプライバシーポリシーは、当ウェブサイトに掲載した時点から効力を生じるものとします。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                9. お問い合わせ
              </h2>
              <p>
                本プライバシーポリシーに関するお問い合わせは、以下の窓口までお願いいたします。
              </p>
              <div className="mt-3 p-4 bg-[#f8fbfe] border border-border">
                <p className="font-bold text-navy text-sm">
                  PERSONA（ペルソナ）運営事務局
                </p>
                <p className="mt-1">
                  お問い合わせ：
                  <a
                    href="/for-enterprise#contact"
                    className="text-blue hover:underline"
                  >
                    お問い合わせフォーム
                  </a>
                </p>
              </div>
            </section>

            <p className="text-[12px] text-[#aaa] pt-4 border-t border-border">
              制定日：2026年2月27日
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
