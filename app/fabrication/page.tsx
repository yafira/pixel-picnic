import FabricationExport from "@/components/FabricationExport";

export default function FabricationPage() {
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
          <a href="/eink">e-ink export</a>
          <a href="/fabrication">fabrication</a>
        </nav>
      </header>

      <section style={{ padding: "64px 28px 40px", maxWidth: 920 }}>
        <div
          className="mono"
          style={{ fontSize: 12, color: "var(--thread)", marginBottom: 18 }}
        >
          concept 00 — construction, physical
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
          from pixels
          <br />
          to stitches.
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: "#3a382f",
            maxWidth: 560,
            margin: 0,
          }}
        >
          exports a real, physically-sized SVG — a grid of dots for laser
          engraving halftones, or a single serpentine stitch path for digitizing
          an embroidery fill on felt. set the cell size in millimeters and the
          output carries its true dimensions, ready to import directly.
        </p>
      </section>

      <FabricationExport />

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
        <span>pixel picnic — concept 00 — fabrication export</span>
        <span>2026</span>
      </footer>
    </>
  );
}
