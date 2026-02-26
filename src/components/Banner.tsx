export default function Banner() {
  return (
    <div className="bg-[#E0022B] py-7 px-6">
      <div className="max-w-[1160px] mx-auto flex items-center gap-6 flex-wrap">
        <div className="bg-white text-[#E0022B] text-[11px] font-black px-3.5 py-1.5 whitespace-nowrap tracking-[0.1em]">
          コンサル出身者による魅力的な案件提案
        </div>
        <div className="text-white text-[15px] font-bold leading-[1.5]">
          独自のネットワークで
          <strong>100万円〜250万円</strong>
          の高単価案件を常時取り扱い
        </div>
      </div>
    </div>
  );
}
