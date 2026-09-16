import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

// headline font only -- yafira's established brand/display font, used
// the same way on yafira.xyz and altloom. pixelify sans only ships a
// normal style (no true italic glyphs), so headlines using it switch
// off the italic slant rather than getting a synthetic oblique, which
// tends to look broken on pixel fonts.
const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixel",
  weight: ["400"],
});

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/public/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/public/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/public/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  title: "pixel picnic",
  description:
    "a browser-based dithering tool. expose the construction. nothing is uploaded anywhere.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable} ${pixelifySans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
