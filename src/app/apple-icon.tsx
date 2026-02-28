import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#091747",
          borderRadius: "36px",
        }}
      >
        <span
          style={{
            fontSize: "120px",
            fontWeight: 900,
            color: "#1fabe9",
            lineHeight: 1,
            marginTop: "-4px",
          }}
        >
          P
        </span>
      </div>
    ),
    { ...size }
  );
}
