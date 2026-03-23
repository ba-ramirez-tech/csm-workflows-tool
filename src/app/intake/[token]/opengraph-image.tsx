import { ImageResponse } from "next/og";

export const alt = "Colombie sur mesure — Votre voyage";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          background: "linear-gradient(135deg, #0F2B1F 0%, #1B4332 45%, #2D6A4F 70%, #D4A853 100%)",
          color: "#FDF8F0",
          fontFamily: "system-ui, sans-serif",
          padding: 48,
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            opacity: 0.9,
            marginBottom: 24,
          }}
        >
          Colombie sur mesure
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          Votre voyage en Colombie commence ici 🇨🇴
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 26,
            opacity: 0.92,
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Dites-nous votre rêve — nous créons l&apos;expérience sur mesure.
        </div>
      </div>
    ),
    { ...size },
  );
}
