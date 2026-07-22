import DitherTool from "@/components/DitherTool";

export default function Home() {
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
        <div className="mono" style={{ fontSize: 13 }}>
          ° 00
        </div>
        <nav className="mono" style={{ display: "flex", gap: 28, fontSize: 12 }}>
          <a href="#">upload</a>
          <a href="#about">about</a>
        </nav>
      </header>

      <section style={{ padding: "64px 28px 40px", maxWidth: 920 }}>
        <div className="mono" style={{ fontSize: 12, color: "var(--thread)", marginBottom: 18 }}>
          concept 00 — bianchetto, digital
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
          expose the
          <br />
          construction.
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "#3a382f", maxWidth: 520, margin: 0 }}>
          a browser-based dithering tool. every photograph is reduced to its raw pixel
          construction — the seams left visible instead of smoothed away. nothing is
          uploaded anywhere; it all happens in this tab.
        </p>
      </section>

      <DitherTool />

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
        <span>pixel picnic — concept 00</span>
        <span>2026</span>
      </footer>
    </>
  );
}
