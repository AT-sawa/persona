import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/blog";

export const alt = "PERSONA Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  キャリア: { bg: "#3B82F6", text: "#FFFFFF" },
  業界トレンド: { bg: "#10B981", text: "#FFFFFF" },
  ノウハウ: { bg: "#F59E0B", text: "#FFFFFF" },
  企業向け: { bg: "#8B5CF6", text: "#FFFFFF" },
  サービス紹介: { bg: "#E15454", text: "#FFFFFF" },
};

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  const title = post?.title ?? "PERSONA Blog";
  const category = post?.category ?? "";
  const categoryColor = CATEGORY_COLORS[category] ?? {
    bg: "#3B82F6",
    text: "#FFFFFF",
  };

  // Fetch Noto Sans JP for Japanese text support
  const fontData = await fetch(
    "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&display=swap"
  )
    .then((res) => res.text())
    .then((css) => {
      // Extract the font URL from the CSS (wght 900 for the title)
      const match = css.match(
        /src:\s*url\(([^)]+)\)\s*format\('[^']*'\);\s*unicode-range:/
      );
      if (match) return fetch(match[1]);
      // Fallback: try to find any url in the CSS
      const fallback = css.match(/url\(([^)]+\.woff2[^)]*)\)/);
      if (fallback) return fetch(fallback[1]);
      return null;
    })
    .then((res) => res?.arrayBuffer() ?? null)
    .catch(() => null);

  const fonts: { name: string; data: ArrayBuffer; style: "normal"; weight: 700 | 900 }[] = [];
  if (fontData) {
    fonts.push({
      name: "NotoSansJP",
      data: fontData,
      style: "normal" as const,
      weight: 900,
    });
  }

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
          background: "linear-gradient(135deg, #091747 0%, #0F2B7A 40%, #1A3FA0 70%, #091747 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: fontData ? "NotoSansJP, sans-serif" : "sans-serif",
        }}
      >
        {/* Background decorative elements */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.03,
            backgroundSize: "40px 40px",
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
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
            height: "4px",
            background: "linear-gradient(90deg, #3B82F6, #8B5CF6, #3B82F6)",
            display: "flex",
          }}
        />

        {/* Content area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 80px",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Category badge */}
          {category && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: categoryColor.bg,
                  color: categoryColor.text,
                  fontSize: "18px",
                  fontWeight: 700,
                  padding: "6px 20px",
                  borderRadius: "100px",
                  letterSpacing: "0.05em",
                }}
              >
                {category}
              </div>
            </div>
          )}

          {/* Title */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              width: "100%",
              maxWidth: "1000px",
            }}
          >
            <h1
              style={{
                color: "#FFFFFF",
                fontSize: title.length > 40 ? "42px" : title.length > 25 ? "48px" : "54px",
                fontWeight: 900,
                lineHeight: 1.45,
                textAlign: "center",
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                wordBreak: "break-word",
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              {title}
            </h1>
          </div>

          {/* Bottom section: PERSONA branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              marginTop: "24px",
            }}
          >
            {/* Logo circle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              }}
            >
              <span
                style={{
                  color: "#FFFFFF",
                  fontSize: "18px",
                  fontWeight: 900,
                }}
              >
                P
              </span>
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "0.15em",
              }}
            >
              PERSONA
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: "16px",
                fontWeight: 700,
                marginLeft: "4px",
              }}
            >
              BLOG
            </span>
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #3B82F6, #8B5CF6, #3B82F6)",
            display: "flex",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    }
  );
}
