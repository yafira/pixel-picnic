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
          one grid,
          <br />
          many machines.
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
          the same binary grid, exported for whichever machine is doing the
          making. right now: a grid of dots for laser engraving halftones, or a
          single serpentine stitch path for digitizing an embroidery fill. real
          millimeter dimensions throughout, ready to import directly. more
          fabrication techniques land here as they're built.
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
