import EinkExport from "@/components/EinkExport";

export default function EinkPage() {
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
        </nav>
      </header>

      <section style={{ padding: "64px 28px 40px", maxWidth: 920 }}>
        <div
          className="mono"
          style={{ fontSize: 12, color: "var(--thread)", marginBottom: 18 }}
        >
          concept 00 — for the soft computer
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
          exact levels,
          <br />
          exact panel.
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
          matched to the waveshare 10.3&quot; flexible e-ink panel's real
          resolution and gray-level modes. quantizes to as few as 2 or as many
          as 16 levels, exports a real BMP file at the panel's native 1872 ×
          1404 — the format its reference driver code expects to read.
        </p>
      </section>

      <EinkExport />

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
        <span>pixel picnic — concept 00 — e-ink export</span>
        <span>2026</span>
      </footer>
    </>
  );
}
