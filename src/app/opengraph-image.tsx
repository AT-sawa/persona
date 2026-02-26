import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PERSONA フリーコンサル案件紹介サービス";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a1628 0%, #122240 50%, #1a3055 100%)",
          position: "relative",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -40,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(31, 171, 233, 0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(31, 171, 233, 0.05)",
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #1fabe9, #4dc8ff)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#1fabe9",
              letterSpacing: "0.2em",
              textTransform: "uppercase" as const,
            }}
          >
            FREE CONSULTANT PLATFORM
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            PERSONA
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: "rgba(255,255,255,0.7)",
              marginTop: -4,
            }}
          >
            フリーコンサル案件紹介サービス
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: 48,
              marginTop: 32,
            }}
          >
            {[
              { n: "100+", l: "常時案件数" },
              { n: "30+", l: "提携エージェント" },
              { n: "250万", l: "最高月額" },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    color: "#1fabe9",
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            fontSize: 14,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.05em",
          }}
        >
          persona-consultant.com
        </div>
      </div>
    ),
    { ...size }
  );
}
