import Image from "next/image";
import Link from "next/link";

export default function Register() {
  return (
    <section className="bg-gray-bg py-[72px] px-6" id="register">
      <div className="max-w-[1160px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-[72px] items-start">
        {/* Left */}
        <div>
          <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2">
            REGISTER
          </p>
          <h2 className="text-[clamp(24px,3vw,32px)] font-black text-navy leading-[1.3] mb-3.5">
            <em className="not-italic text-blue">フリーコンサル</em>登録フォーム
          </h2>
          <p className="text-sm leading-[1.9] text-[#555] mb-5">
            以下の必要情報をご入力いただきますと、専門コーディネーターより面談の日程調整についてご連絡をさせていただきます。また、コンサルタントの質を担保するため、大変僭越ながら弊社独自の審査を通過された方のみにご登録いただいております。
          </p>
          <ul className="list-none flex flex-col gap-2 mb-7">
            {[
              "登録完全無料・解約自由",
              "常時100件以上の案件から選べる",
              "30社以上のエージェント案件に一括アクセス",
              "最短1週間での参画実績",
            ].map((text) => (
              <li
                key={text}
                className="text-[13.5px] font-semibold text-navy flex items-center gap-2.5"
              >
                <span className="text-blue font-black">✓</span>
                {text}
              </li>
            ))}
          </ul>
          <Image
            src="/images/free_banner.png"
            alt=""
            width={400}
            height={120}
            className="max-w-[400px] w-full"
          />
        </div>

        {/* Right: Form */}
        <div className="bg-white border border-border p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <p className="text-[15px] font-black text-navy pb-3 border-b-2 border-blue mb-5">
            フリーコンサル登録フォーム
          </p>
          {[
            { label: "氏名", type: "text", placeholder: "山田 太郎", required: true },
            { label: "電話番号", type: "tel", placeholder: "090-0000-0000", required: true },
            { label: "メールアドレス", type: "email", placeholder: "example@email.com", required: true },
          ].map((field) => (
            <div key={field.label} className="mb-3">
              <label className="block text-[11px] font-bold text-[#888] mb-1">
                {field.label}
                {field.required && (
                  <span className="text-[#E15454] text-[10px] ml-0.5"> *必須</span>
                )}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
              />
            </div>
          ))}
          <div className="mb-3">
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              お勤め経験のあるコンサルファーム
              <span className="text-[#E15454] text-[10px] ml-0.5"> *必須</span>
            </label>
            <select className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white">
              <option>選択してください</option>
              <option>McKinsey &amp; Company</option>
              <option>BCG</option>
              <option>Deloitte</option>
              <option>PwC</option>
              <option>アクセンチュア</option>
              <option>A.T. Kearney</option>
              <option>Roland Berger</option>
              <option>EY</option>
              <option>KPMG</option>
              <option>その他</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-[11px] font-bold text-[#888] mb-1">
              フリーコンサル経験
            </label>
            <select className="w-full px-3 py-2.5 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white">
              <option>選択してください</option>
              <option>業務改革/業務改善/BPR</option>
              <option>戦略</option>
              <option>DX推進</option>
              <option>PMO</option>
              <option>SAP</option>
              <option>新規事業</option>
              <option>その他</option>
            </select>
          </div>
          <button className="w-full py-3.5 bg-blue text-white border-none text-[15px] font-bold cursor-pointer transition-colors hover:bg-blue-dark mt-1">
            登録する
          </button>
          <p className="text-[10px] text-[#aaa] text-center mt-2">
            ご登録いただきますと
            <Link href="#" className="text-blue">
              プライバシーポリシー
            </Link>
            に同意したものとみなします
          </p>
        </div>
      </div>
    </section>
  );
}
