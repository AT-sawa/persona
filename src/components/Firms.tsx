import Image from "next/image";

export default function Firms() {
  return (
    <section className="bg-white py-[60px] px-6 text-center border-t border-border">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-2 text-center">
          MEMBER FIRMS
        </p>
        <h2 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.35] text-center">
          ご登録者のご出身ファーム
        </h2>
        <div className="mt-6 mx-auto max-w-[960px] opacity-70">
          <Image
            src="/images/firms_logo.png"
            alt="出身ファーム McKinsey BCG Deloitte PwC Accenture"
            width={960}
            height={120}
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
