export interface EinkPanel {
  id: string;
  label: string;
  width: number;
  height: number;
  /** supported bits-per-pixel modes for the IT8951 controller, each implying a level count */
  bppModes: { bpp: 1 | 2 | 3 | 4; levels: number; label: string }[];
}

export const EINK_PANELS: EinkPanel[] = [
  {
    id: "waveshare-10.3-it8951",
    label: 'waveshare 10.3" flexible (IT8951)',
    width: 1872,
    height: 1404,
    bppModes: [
      { bpp: 1, levels: 2, label: "1bpp — 2 levels (A2 mode)" },
      { bpp: 2, levels: 4, label: "2bpp — 4 levels" },
      { bpp: 3, levels: 8, label: "3bpp — 8 levels" },
      { bpp: 4, levels: 16, label: "4bpp — 16 levels (GC16)" },
    ],
  },
  {
    id: "waveshare-7.5-v2",
    label: 'waveshare 7.5" V2 (SSD1683)',
    width: 800,
    height: 480,
    bppModes: [
      { bpp: 1, levels: 2, label: "1bpp — 2 levels (black/white only)" },
    ],
  },
];
