import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AI導入効果アセスメント | PERSONA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background:
            "linear-gradient(135deg, #091747 0%, #0d2266 40%, #142d7a 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-60px",
            width: "380px",
            height: "380px",
            borderRadius: "50%",
            background: "rgba(31, 171, 233, 0.08)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-40px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "rgba(31, 171, 233, 0.06)",
            display: "flex",
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #1fabe9, #7DC7FF)",
            display: "flex",
          }}
        />

        {/* Kicker */}
        <div
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "#1fabe9",
            letterSpacing: "0.2em",
            marginBottom: "16px",
            display: "flex",
          }}
        >
          PERSONA SERVICE
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: 900,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.3,
            display: "flex",
          }}
        >
          AI導入効果アセスメント
        </div>

        {/* Divider */}
        <div
          style={{
            width: "60px",
            height: "3px",
            background: "#1fabe9",
            marginTop: "24px",
            marginBottom: "24px",
            display: "flex",
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: "20px",
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            lineHeight: 1.6,
            display: "flex",
          }}
        >
          業務×AIで削減効果を可視化｜1部署125万円〜
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            marginTop: "36px",
          }}
        >
          {[
            { num: "2週間〜", label: "最短納期" },
            { num: "125万円〜", label: "1部署から" },
            { num: "ROI可視化", label: "定量レポート" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 900,
                  color: "#1fabe9",
                  display: "flex",
                }}
              >
                {stat.num}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.5)",
                  display: "flex",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            right: "32px",
            fontSize: "13px",
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "1px",
            display: "flex",
          }}
        >
          persona-consultant.com
        </div>
      </div>
    ),
    { ...size },
  );
}
