import type { Metadata } from "next";
import DitherTool from "@/components/DitherTool";
import RepeatHero from "@/components/RepeatHero";

type SearchParams = { [key: string]: string | string[] | undefined };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const pick = (key: string): string | undefined =>
    typeof sp[key] === "string" ? (sp[key] as string) : undefined;

  const algo = pick("algo");
  const grain = pick("grain");
  const exposure = pick("exposure");
  const palette = pick("palette");
  const preset = pick("preset");

  if (!algo && !grain && !exposure && !palette) {
    return {}; // no share params — inherit the default metadata from layout.tsx
  }

  const ogParams = new URLSearchParams();
  if (algo) ogParams.set("algo", algo);
  if (grain) ogParams.set("grain", grain);
  if (exposure) ogParams.set("exposure", exposure);
  if (palette) ogParams.set("palette", palette);
  if (preset) ogParams.set("preset", preset);

  const title = preset
    ? `pixel picnic — ${preset}`
    : "pixel picnic — dither / exposure";
  const ogImage = `/og?${ogParams.toString()}`;

  return {
    title,
    openGraph: { title, images: [ogImage] },
    twitter: { card: "summary_large_image", title, images: [ogImage] },
  };
}

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
        <nav
          className="mono"
          style={{ display: "flex", gap: 28, fontSize: 12 }}
        >
          <a href="#">upload</a>
          <a href="/fabrication">fabrication</a>
        </nav>
      </header>

      <section style={{ padding: "64px 28px 40px", maxWidth: 920 }}>
        <div
          className="mono"
          style={{ fontSize: 12, color: "var(--thread)", marginBottom: 18 }}
        >
          concept 00 — overpaint, digital
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
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: "#3a382f",
            maxWidth: 520,
            margin: 0,
          }}
        >
          a browser-based dithering tool. every photograph is reduced to its raw
          pixel construction — the seams left visible instead of smoothed away.
          nothing is uploaded anywhere; it all happens in this tab.
        </p>
      </section>

      <div style={{ padding: "0 28px 56px", maxWidth: 1200, margin: "0 auto" }}>
        <RepeatHero />
      </div>

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
