import { DEFAULT_ANIMATIONS, type AnimationSettings } from "./animations";
import { DEFAULT_SURFACE_EFFECTS, type SurfaceEffects } from "./surfaces";

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

/* -------------------------------- layout --------------------------------- */

/** Where the artwork sits relative to the text stack. */
export type ArtPosition = "left" | "right" | "top" | "bottom";
/** Horizontal justification of the text. */
export type TextAlign = "left" | "center" | "right";

export type FontMode = "preset" | "google" | "custom";

/** Corner treatment shared by every background surface. */
export type CornerStyle = "rounded" | "square";
export type ArtworkShape = CornerStyle | "circle";

export interface BuilderState {
  // appearance
  fontId: string;

  // directly editable overlay colours
  textColor: string;
  mutedColor: string;
  accentColor: string;
  chipColor: string;

  // fitted background behind the complete overlay composition
  showCardBackground: boolean;
  cardColor: string;
  cardOpacity: number;
  cardPadding: number;
  cardCorner: CornerStyle;
  cardEffects: SurfaceEffects;

  // background plate hugging just the title text
  showTitleBackground: boolean;
  titleBgColor: string;
  titleBgOpacity: number;
  titleBgCorner: CornerStyle;
  titleBgEffects: SurfaceEffects;

  // background plate hugging just the artist line
  showArtistBackground: boolean;
  artistBgColor: string;
  artistBgOpacity: number;
  artistBgCorner: CornerStyle;
  artistBgEffects: SurfaceEffects;

  // fonts
  fontMode: FontMode;
  googleFamily: string;
  googleWeights: string;
  customStack: string;
  customCss: string;

  // layout
  showArtwork: boolean;
  /** left | right | top | bottom (only when artwork is shown) */
  artPosition: ArtPosition;
  /** artwork size multiplier, from the automatic/default 1x up to 2x */
  artworkScale: number;
  /** vertical alignment when artwork is left/right */
  artAlignY: "top" | "center" | "bottom";
  /** horizontal alignment when artwork is top/bottom */
  artAlignX: "left" | "center" | "right";
  artworkCorner: number;
  artworkShape: ArtworkShape;
  /** Accent-coloured divider for left/right artwork layouts. */
  showArtworkDivider: boolean;
  /** Width of the accent divider in px (only when shown). */
  artworkDividerWidth: number;
  /** Render title + artist on one shared line when they sit together. */
  combineTitleArtist: boolean;
  /** Show the previously played track under the current details. */
  showPrevious: boolean;
  /** Light pulse travelling around the full-card border. */
  cardPulse: boolean;
  /** Sweep direction for the border pulse. */
  cardPulseDirection: "cw" | "ccw";
  /** Artist treatment, mirroring the title style options. */
  artistVariant: "regular" | "italic" | "uppercase";
  /** "sleeve" = plain cover tile · "vinyl" = record slides out & spins */
  artStyle: "sleeve" | "vinyl";

  // typography
  titleSize: number; // px
  artistSize: number;
  /** shared size for everything that isn't the title or artist (tagline + chips) */
  metaSize: number; // px
  titleVariant: string; // regular | italic | uppercase
  /** Title stroke weight, 100–900. */
  titleWeight: number;
  /** Artist stroke weight, 100–900. */
  artistWeight: number;
  /**
   * Title letter-spacing in em. null keeps the built-in -.018em default, so
   * existing themes render exactly as before.
   */
  titleTracking: number | null;
  /**
   * Artist letter-spacing in em. null follows the artist style: wide tracking
   * for the uppercase treatment, tight for regular/italic.
   */
  artistTracking: number | null;
  align: TextAlign;

  // accent / surfaces
  showBar: boolean;
  /** "nested" = NOW PLAYING inside the card · "above" = its own title above the card */
  livePlacement: LivePlacement;

  // Decorative spectrum under the metadata, independent of artwork style.
  showSpectrum: boolean;
  spectrumHeight: number;
  spectrumSpeed: number;
  /** "bottom" = bars rise from the baseline · "center" = bars mirror around the middle line */
  spectrumStyle: SpectrumStyle;

  animation: AnimationSettings;

  /** tokens (text fields) visible above the fold */
  shownFields: Record<string, boolean>;
  /**
   * For chip-capable tokens only: true = rounded chip, false = plain tagline
   * text. Tokens absent from this map fall back to chip styling.
   */
  chipFields: Record<string, boolean>;
  /** ordering of text fields in the stacked card text block */
  fieldOrder: string[];
  /** draw the small accent dash in front of the artist line */
  artistDash: boolean;
  /** how the rating renders: "4 ★" numeric, or a 5-star fill bar */
  ratingStyle: RatingStyle;
}

/** Rating presentation. */
export type RatingStyle = "numeric" | "stars";

/**
 * Where the live "NOW PLAYING" indicator sits.
 * "nested" — as the first line inside the card's text block (the original).
 * "above"  — a separate element stacked above the card, outside its background.
 */
export type LivePlacement = "nested" | "above";

/** Spectrum growth: from the baseline, or mirrored around the middle line. */
export type SpectrumStyle = "bottom" | "center";

export const defaultState: BuilderState = {
  fontId: "inter",

  textColor: "#ffffff",
  mutedColor: "#8b93a3",
  accentColor: "#ff5c9b",
  chipColor: "#242733",

  showCardBackground: false,
  cardColor: "#080a10",
  cardOpacity: 82,
  cardPadding: 24,
  cardCorner: "rounded",
  cardEffects: { ...DEFAULT_SURFACE_EFFECTS.card },

  showTitleBackground: false,
  titleBgColor: "#000000",
  titleBgOpacity: 70,
  titleBgCorner: "rounded",
  titleBgEffects: { ...DEFAULT_SURFACE_EFFECTS.title },

  showArtistBackground: false,
  artistBgColor: "#000000",
  artistBgOpacity: 70,
  artistBgCorner: "rounded",
  artistBgEffects: { ...DEFAULT_SURFACE_EFFECTS.artist },

  fontMode: "preset",
  googleFamily: "Bebas Neue",
  googleWeights: "400;700",
  customStack: "'My Font', 'Inter', sans-serif",
  customCss: "",

  showArtwork: true,
  artPosition: "left",
  artworkScale: 1,
  artAlignY: "center",
  artAlignX: "center",
  artworkCorner: 14,
  artworkShape: "rounded",
  showArtworkDivider: false,
  artworkDividerWidth: 3,
  combineTitleArtist: false,
  showPrevious: false,
  cardPulse: false,
  cardPulseDirection: "cw",
  artistVariant: "uppercase",
  artistWeight: 600,
  artistTracking: null,
  artStyle: "sleeve",

  titleSize: 42,
  artistSize: 30,
  metaSize: 15,
  titleVariant: "regular",
  titleWeight: 900,
  titleTracking: null,
  align: "left",

  showBar: true,
  livePlacement: "nested",

  showSpectrum: false,
  spectrumHeight: 30,
  spectrumSpeed: 1,
  spectrumStyle: "bottom",

  animation: DEFAULT_ANIMATIONS,

  shownFields: {
    title: true,
    artist: true,
    label: true,
    comment: false,
    remix: false,
    bpm: true,
    key: true,
    rating: false,
    length: false,
  },
  chipFields: {
    bpm: true,
    key: true,
    rating: true,
    length: true,
  },
  fieldOrder: [
    "title",
    "artist",
    "label",
    "comment",
    "remix",
    "bpm",
    "key",
    "rating",
    "length",
  ],
  artistDash: true,
  ratingStyle: "numeric",
};

/** Fields drawn as flowing tagline text. */
export const TEXT_FIELDS = ["title", "artist", "label", "comment", "remix"];
/** Fields that support either chip or plain-text presentation. */
export const CHIP_FIELDS = [
  "bpm",
  "key",
  "rating",
  "length",
];
