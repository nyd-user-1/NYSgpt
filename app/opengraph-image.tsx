import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const runtime = "edge";
export const alt = "NYSgpt — case studies and build notes";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          padding: "40px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "4px solid #111827",
            borderRadius: "24px",
            padding: "60px",
          }}
        >
          <h1
            style={{
              fontSize: "84px",
              color: "#111827",
              marginBottom: "16px",
              textAlign: "center",
              letterSpacing: "-2px",
              fontWeight: 700,
            }}
          >
            {siteConfig.name}
          </h1>
          <p
            style={{
              fontSize: "28px",
              color: "#374151",
              textAlign: "center",
              maxWidth: "820px",
              lineHeight: 1.4,
            }}
          >
            {siteConfig.description}
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
