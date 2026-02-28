import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "PERSONA（ペルソナ）の利用規約。サービスの利用条件、禁止事項、免責事項について記載しています。",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="py-[72px] px-6">
        <article className="max-w-[800px] mx-auto">
          <h1 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.4] mb-8">
            利用規約
          </h1>

          <div className="text-[13.5px] leading-[1.9] text-[#555] space-y-8">
            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                第1条（適用）
              </h2>
              <p>
                本利用規約（以下「本規約」）は、PERSONA（以下「当サービス」）が提供するフリーコンサルタント向け案件紹介サービスの利用に関する条件を定めるものです。登録ユーザーは、本規約に同意のうえ当サービスを利用するものとします。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                第2条（定義）
              </h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>「ユーザー」とは、本規約に同意し、当サービスに登録した個人をいいます。</li>
                <li>「案件情報」とは、当サービスに掲載されるコンサルティング案件に関する情報をいいます。</li>
                <li>「マッチング」とは、ユーザーのスキル・経験と案件情報を照合し、適合度を算出する機能をいいます。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                第3条（登録）
              </h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>当サービスの利用を希望する方は、所定の登録フォームより必要事項を入力し、会員登録を行うものとします。</li>
                <li>登録にあたり、虚偽の情報を提供してはなりません。</li>
                <li>当サービスは、以下の場合に登録を拒否できるものとします。
                  <ul className="list-disc pl-5 mt-1">
                    <li>過去に本規約違反により登録を抹消された場合</li>
                    <li>登録情報に虚偽が含まれる場合</li>
                    <li>その他当サービスが不適切と判断した場合</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                第4条（アカウント管理）
              </h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>ユーザーは自己の責任においてアカウント情報（メールアドレス・パスワード）を管理するものとします。</li>
                <li>アカウント情報の不正利用により生じた損害について、当サービスは一切の責任を負いません。</li>
                <li>ユーザーはアカウントを第三者に譲渡・貸与することはできません。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                第5条（提供サービス）
              </h2>
              <p>当サービスは以下の機能を提供します。</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>フリーコンサルタント向け案件情報の閲覧・検索</li>
                <li>AIを活用したスキルマッチング</li>
                <li>案件へのエントリー（応募）</li>
                <li>レジュメ（職務経歴書）の管理</li>
                <li>案件に関するメール通知</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                第6条（禁止事項）
              </h2>
              <p>ユーザーは以下の行為を行ってはなりません。</p>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>法令または公序良俗に反する行為</li>
                <li>当サービスの運営を妨害する行為</li>
                <li>他のユーザーまたは第三者の権利を侵害する行為</li>
                <li>虚偽の情報を登録・提供する行為</li>
                <li>案件情報を当サービス外で無断転載・再配布する行為</li>
                <li>当サービスのシステムに不正アクセスする行為</li>
                <li>スクレイピング等による大量のデータ取得行為</li>
                <li>その他当サービスが不適切と判断する行為</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                第7条（案件情報の取扱い）
              </h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>案件情報は提携エージェントから提供されるものであり、当サービスはその正確性・完全性を保証しません。</li>
                <li>案件の成約・報酬の支払いについては、ユーザーとエージェント間の契約に基づくものとし、当サービスは関与しません。</li>
                <li>案件情報は予告なく変更・削除される場合があります。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                第8条（個人情報の取扱い）
              </h2>
              <p>
                ユーザーの個人情報は、別途定める
                <a href="/privacy" className="text-blue hover:underline">プライバシーポリシー</a>
                に従い適切に取り扱います。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                第9条（退会）
              </h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>ユーザーは、当サービスの設定画面よりいつでも退会手続きを行うことができます。</li>
                <li>退会後、ユーザーの登録情報は当サービスの定める期間経過後に削除されます。</li>
                <li>退会後の再登録は可能ですが、過去のデータは復元できません。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                第10条（免責事項）
              </h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>当サービスは、提供する情報の正確性・有用性について一切保証しません。</li>
                <li>当サービスの利用により生じた損害について、当サービスの故意または重過失による場合を除き、責任を負いません。</li>
                <li>システム障害・メンテナンス等によるサービス停止について、事前通知に努めますが、やむを得ず予告なく停止する場合があります。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                第11条（規約の変更）
              </h2>
              <p>
                当サービスは、必要と判断した場合、ユーザーへの事前通知なく本規約を変更できるものとします。変更後の規約は、当サービスのウェブサイトに掲載した時点で効力を生じます。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-navy mb-3">
                第12条（準拠法・管轄）
              </h2>
              <p>
                本規約の解釈・適用は日本法に準拠するものとし、本規約に関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
            </section>

            <section className="pt-4 border-t border-border">
              <p className="text-[12px] text-[#999]">
                制定日: 2026年2月27日
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
