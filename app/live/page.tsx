import type { Metadata } from "next";
import LiveRegionDither from "@/components/LiveRegionDither";

export const metadata: Metadata = {
  title: "pixel picnic — live",
  description:
    "real-time, region-aware dithering over your camera. an on-device segmentation model treats the subject and background differently -- nothing is ever sent anywhere.",
};

export default function LivePage() {
  return (
    <>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "22px 28px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <a
          href="/"
          className="mono"
          style={{ fontSize: 13, textDecoration: "none" }}
        >
          ° 00
        </a>
        <nav
          className="mono"
          style={{ display: "flex", gap: 28, fontSize: 12 }}
        >
          <a href="/">tool</a>
          <a href="/fabrication">fabrication</a>
          <a href="/live">live</a>
        </nav>
      </header>

      <section style={{ padding: "64px 28px 40px", maxWidth: 920 }}>
        <div
          className="mono"
          style={{ fontSize: 12, color: "var(--thread)", marginBottom: 18 }}
        >
          concept 01 — construction, alive
        </div>
        <h1
          style={{
            fontSize: "clamp(38px, 6vw, 74px)",
            lineHeight: 0.98,
            fontWeight: 700,
            fontStyle: "italic",
            letterSpacing: "-0.01em",
            margin: "0 0 22px",
          }}
        >
          one frame,
          <br />
          two treatments.
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: "#3a382f",
            maxWidth: 520,
            margin: 0,
          }}
        >
          an on-device segmentation model finds the subject in your camera
          feed, live -- the subject and the background each get their own
          dither treatment instead of one setting applied uniformly. the
          model and the dithering both run entirely in this tab; no frame
          is ever sent anywhere.
        </p>
      </section>

      <LiveRegionDither />

      <footer
        className="mono"
        style={{
          borderTop: "1px solid var(--line)",
          padding: "22px 28px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--thread)",
        }}
      >
        <span>pixel picnic — concept 01</span>
        <span>2026</span>
      </footer>
    </>
  );
}
