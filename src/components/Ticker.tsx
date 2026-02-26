export default function Ticker() {
  const items = [
    { bold: "戦略", text: "フリーコンサル案件" },
    { bold: "DX推進", text: "・PMO案件" },
    { bold: "SAP", text: "導入支援案件" },
    { bold: "100〜250万円", text: "/月" },
    { bold: "提携エージェント", text: "30社以上" },
    { bold: "登録", text: "完全無料" },
  ];

  const repeated = [...items, ...items];

  return (
    <div className="bg-navy py-2 overflow-hidden border-t border-white/5">
      <div className="ticker-track">
        {repeated.map((item, i) => (
          <span
            key={i}
            className="text-xs text-white/55 pr-8"
          >
            <strong className="text-white font-bold">{item.bold}</strong>
            {item.text}　｜
          </span>
        ))}
      </div>
    </div>
  );
}
