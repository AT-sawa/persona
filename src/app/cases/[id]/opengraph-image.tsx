import { ImageResponse } from "next/og";

export const alt = "PERSONA フリーコンサル案件";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORY_COLORS: Record<string, string> = {
  戦略: "#6366f1",
  DX: "#1FABE9",
  PMO: "#10b981",
  SAP: "#f59e0b",
  BPR: "#ef4444",
  IT: "#3B82F6",
  SCM: "#14b8a6",
  人事: "#8b5cf6",
  財務: "#f97316",
  マーケティング: "#ec4899",
  M_A: "#6366f1",
  新規事業: "#0ea5e9",
};

function getCategoryColor(category: string | null): string {
  if (!category) return "#1FABE9";
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (category.includes(key)) return color;
  }
  return "#1FABE9";
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let title = "フリーコンサル案件";
  let category: string | null = null;
  let fee: string | null = null;
  let location: string | null = null;

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data } = await supabase
        .from("cases")
        .select("title, category, fee, location")
        .eq("id", id)
        .single();
      if (data) {
        title = data.title || title;
        category = data.category;
        fee = data.fee;
        location = data.location;
      }
    } catch {
      // Use defaults
    }
  }

  const accentColor = getCategoryColor(category);

  const fontData = await fetch(
    "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&display=swap"
  )
    .then((res) => res.text())
    .then((css) => {
      const match = css.match(
        /src:\s*url\(([^)]+)\)\s*format\('[^']*'\);\s*unicode-range:/
      );
      if (match) return fetch(match[1]);
      const fallback = css.match(/url\(([^)]+\.woff2[^)]*)\)/);
      if (fallback) return fetch(fallback[1]);
      return null;
    })
    .then((res) => res?.arrayBuffer() ?? null)
    .catch(() => null);

  const fonts: {
    name: string;
    data: ArrayBuffer;
    style: "normal";
    weight: 700 | 900;
  }[] = [];
  if (fontData) {
    fonts.push({ name: "NotoSansJP", data: fontData, style: "normal", weight: 900 });
  }

  const pills = [fee, location].filter(Boolean);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #091747 0%, #0F2B7A 40%, #1A3FA0 70%, #091747 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: fontData ? "NotoSansJP, sans-serif" : "sans-serif",
        }}
      >
        {/* Top accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: `linear-gradient(90deg, ${accentColor}, #1FABE9, ${accentColor})`,
            display: "flex",
          }}
        />

        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(31,171,233,0.1) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "60px 70px",
            width: "100%",
            height: "100%",
            justifyContent: "space-between",
          }}
        >
          {/* Top: Category + Label */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                fontSize: "14px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.2em",
              }}
            >
              CASE
            </div>
            {category && (
              <div
                style={{
                  display: "flex",
                  backgroundColor: accentColor,
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: 700,
                  padding: "4px 16px",
                  borderRadius: "100px",
                }}
              >
                {category}
              </div>
            )}
          </div>

          {/* Middle: Title */}
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
            }}
          >
            <h1
              style={{
                color: "#FFFFFF",
                fontSize:
                  title.length > 50
                    ? "36px"
                    : title.length > 35
                      ? "42px"
                      : "48px",
                fontWeight: 900,
                lineHeight: 1.5,
                margin: 0,
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {title}
            </h1>
          </div>

          {/* Bottom: pills + branding */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div style={{ display: "flex", gap: "12px" }}>
              {pills.map((pill, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "18px",
                    fontWeight: 700,
                    padding: "6px 18px",
                    borderRadius: "8px",
                  }}
                >
                  {pill}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, #3B82F6, #8B5CF6)`,
                }}
              >
                <span style={{ color: "#fff", fontSize: "16px", fontWeight: 900 }}>
                  P
                </span>
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "18px",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                }}
              >
                PERSONA
              </span>
            </div>
          </div>
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: `linear-gradient(90deg, ${accentColor}, #1FABE9, ${accentColor})`,
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined }
  );
}
