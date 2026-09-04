/* -------------------------------- fonts ---------------------------------- */

export interface Font {
  id: string;
  label: string;
  stack: string;
}

export const FONTS: Font[] = [
  {
    id: "inter",
    label: "Modern (Inter)",
    stack: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  {
    id: "space",
    label: "DJ Tech (Space Grotesk)",
    stack: "'Space Grotesk', 'Segoe UI', system-ui, sans-serif",
  },
  {
    id: "mono",
    label: "Mono (JetBrains Mono)",
    stack: "'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
  },
  {
    id: "display",
    label: "Bold Display (Archivo)",
    stack: "'Archivo', 'Inter', system-ui, sans-serif",
  },
  {
    id: "serif",
    label: "Editorial (Fraunces)",
    stack: "'Fraunces', Georgia, serif",
  },
  {
    id: "system",
    label: "System",
    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
];

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];

/** Popular Google families that read well on a stream overlay. */
export const GOOGLE_SUGGESTIONS = [
  "Bebas Neue",
  "Anton",
  "Oswald",
  "Archivo Black",
  "Space Grotesk",
  "Montserrat",
  "Poppins",
  "Teko",
  "Orbitron",
  "Chakra Petch",
  "Rajdhani",
  "Barlow Condensed",
  "Unbounded",
  "Syne",
  "Outfit",
  "Michroma",
];

export const GOOGLE_WEIGHT_SETS = [
  { id: "400;700", label: "Regular + Bold" },
  { id: "300;400;600", label: "Light → Semibold" },
  { id: "400;700;900", label: "Regular → Black" },
  { id: "400", label: "Single weight" },
];

/** Builds the Google Fonts css2 URL for a family + weight list. */
export function googleFontUrl(family: string, weights: string): string {
  const fam = family.trim().replace(/\s+/g, "+");
  if (!fam) return "";
  const w = weights.trim();
  return `https://fonts.googleapis.com/css2?family=${fam}${
    w ? `:wght@${w}` : ""
  }&display=swap`;
}

export const FONT_IMPORTS: Record<string, string> = {
  inter:
    "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');",
  space:
    "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap');",
  mono: "@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&display=swap');",
  display:
    "@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&display=swap');",
  serif:
    "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap');",
  system: "",
};

/* -------------------------------- layouts -------------------------------- */

export type LayoutId = "row-left" | "row-right" | "stack" | "card" | "minimal" | "tagged";

export interface LayoutDef {
  id: LayoutId;
  name: string;
  tagline: string;
  /** how artwork is placed: none | left | right | top | behind */
  art: "none" | "left" | "right" | "top" | "behind";
  flexRow: boolean;
  justify?: string;
}

export const LAYOUTS: LayoutDef[] = [
  { id: "row-left", name: "Art Left", tagline: "Artwork tile on the left of the text", art: "left", flexRow: true },
  { id: "row-right", name: "Art Right", tagline: "Artwork tile on the right", art: "right", flexRow: true },
  { id: "stack", name: "Stacked", tagline: "Artwork on top, centered text below", art: "top", flexRow: false },
  { id: "card", name: "Panel", tagline: "Centered chip on a floating panel", art: "top", flexRow: false },
  { id: "minimal", name: "Minimal", tagline: "Clean tagline — no artwork", art: "none", flexRow: true },
  { id: "tagged", name: "Badge Row", tagline: "Compact chips under the title", art: "none", flexRow: true, justify: "center" },
];

export const layoutById = (id: string) =>
  LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];

/* ---------------------------- content controls --------------------------- */

export type Panel = "fields" | "badges";

/** Full mutable state for the builder */
export type FontMode = "preset" | "google" | "custom";

export interface BuilderState {
  // appearance
  fontId: string;

  // directly editable overlay colours
  textColor: string;
  mutedColor: string;
  accentColor: string;
  chipColor: string;
  artworkColor: string;

  // fitted background behind the complete overlay composition
  showCardBackground: boolean;
  cardColor: string;
  cardOpacity: number;
  cardPadding: number;

  // fonts
  fontMode: FontMode;
  googleFamily: string;
  googleWeights: string;
  customStack: string;
  customCss: string;

  // layout
  layoutId: LayoutId;
  showArtwork: boolean;
  artworkCorner: number;

  // typography
  titleSize: number; // px
  artistSize: number;
  /** shared size for everything that isn't the title or artist (tagline + chips) */
  metaSize: number; // px
  titleVariant: string; // regular | italic | uppercase
  align: string;

  // accent / surfaces
  showBar: boolean;

  /** tokens (text fields) visible above the fold */
  shownFields: Record<string, boolean>;
  /** ordering of text fields in the stacked card text block */
  fieldOrder: string[];
  /** draw the small accent dash in front of the artist line */
  artistDash: boolean;
}

export const defaultState: BuilderState = {
  fontId: "inter",

  textColor: "#ffffff",
  mutedColor: "#8b93a3",
  accentColor: "#ff5c9b",
  chipColor: "#242733",
  artworkColor: "#151824",

  showCardBackground: false,
  cardColor: "#080a10",
  cardOpacity: 82,
  cardPadding: 24,

  fontMode: "preset",
  googleFamily: "Bebas Neue",
  googleWeights: "400;700",
  customStack: "'My Font', 'Inter', sans-serif",
  customCss: "",

  layoutId: "row-left",
  showArtwork: true,
  artworkCorner: 14,

  titleSize: 42,
  artistSize: 18,
  metaSize: 15,
  titleVariant: "regular",
  align: "left",

  showBar: true,

  shownFields: {
    title: true,
    artist: true,
    label: true,
    comment: false,
    bpm: true,
    currentBpm: false,
    key: true,
    rating: false,
    length: false,
    clock: false,
  },
  fieldOrder: [
    "title",
    "artist",
    "label",
    "comment",
    "bpm",
    "currentBpm",
    "key",
    "rating",
    "length",
    "clock",
  ],
  artistDash: true,
};

/** Fields drawn as flowing tagline text. */
export const TEXT_FIELDS = ["title", "artist", "label", "comment"];
/** Numeric / tech values — always drawn as chips. */
export const CHIP_FIELDS = [
  "bpm",
  "currentBpm",
  "key",
  "rating",
  "length",
  "clock",
];
