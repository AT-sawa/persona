import Image from "next/image";
import RegisterForm from "./RegisterForm";

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

        {/* Right: Form (client component) */}
        <RegisterForm />
      </div>
    </section>
  );
}
