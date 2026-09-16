import { byToken } from "../data/placeholders";
import { effectiveExit, resolveAnimationSettings } from "../data/animations";
import { resolveSurfaceEffects, type BackgroundSurface, type SurfaceEffects } from "../data/surfaces";
import overlayMotionRuntime from "./overlayMotion.js?raw";
import overlaySpectrumRuntime from "./overlaySpectrum.js?raw";
import {
  BuilderState,
  fontById,
  FONT_IMPORTS,
  googleFontUrl,
} from "../data/presets";

/**
 * Emits a Now Playing "Custom HTML" theme.
 *
 * The app injects jQuery + socket.io when serving the file and calls
 * `window.onTrackUpdate(track)` on every track change; optional `onHide()` /
 * `onShow()` drive the "Hide After" behaviour. There is no token substitution,
 * so the generated file paints the track object into the DOM itself.
 *
 * Mock mode (live preview) ships the same runtime plus one bootstrap call with
 * a sample track, so the preview exercises the exact production code path.
 */

const UNIT: Record<string, string> = { bpm: "BPM" };

export type CssVars = Record<string, string>;

/* ------------------------------- resolved UI ----------------------------- */

/** The font-family stack actually used, honouring preset / Google / custom. */
export function resolveFontStack(state: BuilderState): string {
  if (state.fontMode === "google" && state.googleFamily.trim()) {
    return `'${state.googleFamily.trim()}', 'Inter', system-ui, sans-serif`;
  }
  if (state.fontMode === "custom" && state.customStack.trim()) {
    return state.customStack.trim();
  }
  return fontById(state.fontId).stack;
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) return `rgba(8,10,16,${alpha})`;
  const n = Number.parseInt(raw, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function surfaceCssVars(surface: BackgroundSurface, value: SurfaceEffects | undefined): CssVars {
  const effects = resolveSurfaceEffects(value, surface);
  return {
    [`--np-${surface}-border`]: effects.borderEnabled
      ? `${effects.borderWidth}px solid ${hexToRgba(effects.borderColor, effects.borderOpacity / 100)}`
      : "0px solid transparent",
    [`--np-${surface}-shadow`]: effects.shadowEnabled
      ? `${shadowOffsetX(effects)} ${shadowOffsetY(effects)} ${effects.shadowBlur}px ${hexToRgba(effects.shadowColor, effects.shadowOpacity / 100)}`
      : "none",
  };
}

/** Horizontal shadow offset in px. 0° = down, 90° = right → uses sin. */
function shadowOffsetX(effects: SurfaceEffects): string {
  const rad = (effects.shadowAngle * Math.PI) / 180;
  return `${Math.round(Math.sin(rad) * effects.shadowDistance * 100) / 100}px`;
}
/** Vertical shadow offset in px. 0° = down, 180° = up → uses cos. */
function shadowOffsetY(effects: SurfaceEffects): string {
  const rad = (effects.shadowAngle * Math.PI) / 180;
  return `${Math.round(Math.cos(rad) * effects.shadowDistance * 100) / 100}px`;
}

export function resolveCssVars(state: BuilderState): CssVars {
  const f = { stack: resolveFontStack(state) };

  return {
    ...surfaceCssVars("card", state.cardEffects),
    ...surfaceCssVars("title", state.titleBgEffects),
    ...surfaceCssVars("artist", state.artistBgEffects),
    "--np-text": state.textColor,
    "--np-muted": state.mutedColor,
    "--np-accent": state.accentColor,
    "--np-spectrum-low": shadeHex(state.accentColor, -0.5),
    "--np-spectrum-high": shadeHex(state.accentColor, 0.42),
    "--np-spectrum-height": `${Math.max(16, Math.min(80, state.spectrumHeight || 30))}px`,
    "--np-chip": state.chipColor,
    "--np-card": hexToRgba(state.cardColor, state.cardOpacity / 100),
    "--np-card-pad": `${state.cardPadding}px`,
    "--np-card-radius": state.cardCorner === "square" ? "0px" : "18px",
    "--np-title-bg": hexToRgba(state.titleBgColor, state.titleBgOpacity / 100),
    "--np-title-radius": state.titleBgCorner === "square" ? "0px" : "10px",
    "--np-artist-bg": hexToRgba(state.artistBgColor, state.artistBgOpacity / 100),
    "--np-artist-radius": state.artistBgCorner === "square" ? "0px" : "8px",
    "--np-artist-case": state.artistVariant === "uppercase" ? "uppercase" : "none",
    "--np-artist-style": state.artistVariant === "italic" ? "italic" : "normal",
    "--np-artist-spacing": state.artistVariant === "uppercase" ? ".12em" : "-.01em",
    "--np-font": f.stack,
    "--np-title": `${state.titleSize}px`,
    "--np-artist": `${state.artistSize}px`,
    "--np-meta": `${state.metaSize}px`,
    "--np-radii": state.artworkShape === "circle" ? "50%"
      : state.artworkShape === "square" ? "0px" : `${state.artworkCorner}px`,
    // Divider mirrors the artwork footprint: square bar for square art,
    // pill bar for rounded art or a circular crop.
    "--np-divider-radius": state.artworkShape === "square" ? "0px" : "999px",
    "--np-art-scale": String(state.artworkScale),
    "--np-art-size": "150px",
    "--np-case": state.titleVariant === "uppercase" ? "uppercase" : "none",
    "--np-style": state.titleVariant === "italic" ? "italic" : "normal",
  };
}

/**
 * The @import / @font-face block that loads the chosen face.
 * - preset  → the bundled Google family for that preset
 * - google  → any family name typed by the user
 * - custom  → either a bare stylesheet URL (wrapped in @import) or raw CSS
 *             such as a full @font-face rule the user pasted in.
 */
export function fontImportFor(state: BuilderState): string {
  if (state.fontMode === "google") {
    const url = googleFontUrl(state.googleFamily, state.googleWeights);
    return url ? `@import url('${url}');` : "";
  }
  if (state.fontMode === "custom") {
    const raw = state.customCss.trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return `@import url('${raw}');`;
    return raw;
  }
  return FONT_IMPORTS[state.fontId] ?? "";
}

/* ------------------------------ markup nuts ------------------------------ */

/** Tokens whose value can be presented as a rounded chip. */
function isChipKind(token: string): boolean {
  const k = byToken(token)?.kind;
  return !!k && k !== "text";
}

/**
 * Whether a token actually renders as a chip. Chip-capable tokens default to
 * chip styling; the user can switch any of them to plain tagline text.
 */
function rendersAsChip(state: BuilderState, token: string): boolean {
  if (!isChipKind(token)) return false;
  return state.chipFields?.[token] !== false;
}

function chipIcon(token: string): string {
  const kind = byToken(token)?.kind;
  if (kind === "bpm")
    return `<svg class="np-ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M3 13h3l2.5-7 4 11L15 7l2 6h4"/></svg>`;
  if (kind === "key")
    return `<svg class="np-ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M7 4v9"/><path d="M17 4v2"/><circle cx="7" cy="16" r="3"/><circle cx="17" cy="14" r="3"/></svg>`;
  if (kind === "length")
    return `<svg class="np-ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`;
  if (kind === "rating")
    return `<svg class="np-ico" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>`;
  return "";
}

const STAR_PATH = "m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z";

/**
 * Five-star rating bar. A grey base row sits underneath a gold row clipped to
 * the rated fraction, so whole and half stars (and anything in between) fill
 * naturally. The inner strip owns the clipping so chip padding never shifts
 * the filled stars away from their grey counterparts.
 */
function ratingStars(withChip: boolean): string {
  const star =
    `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;
  const row = star.repeat(5);
  return `<span class="np-rating${withChip ? " np-chip" : ""}" id="np-rating" data-np-motion role="img" aria-label="Not rated">` +
    `<span class="np-stars" aria-hidden="true">` +
    `<span class="np-stars-base" aria-hidden="true">${row}</span>` +
    `<span class="np-stars-fill" data-np-stars-fill aria-hidden="true">` +
    `<span class="np-stars-fill-inner">${row}</span></span></span></span>`;
}

/**
 * Cover slot. The shipped starter uses the exact `artwork` id.
 * Vinyl mode adds a record that slides out from behind the sleeve and spins,
 * mirroring the community "vinyl" themes — the disc reserves its slide-out
 * space up front so nothing jumps when a track lands.
 */
function coverBlock(
  state: BuilderState,
  roleClass: string,
  pad: string,
  slide: "l" | "r",
  alignClass = ""
): string {
  const img = `<img id="artwork" src="">`;
  if (state.artStyle !== "vinyl") {
    return `<div class="np-dock ${roleClass} ${alignClass}" data-np-motion>
  <div class="np-art pad-${pad}" id="cover">
    ${img}
  </div>
</div>`;
  }
  return `<div class="np-dock ${roleClass} ${alignClass}" data-np-motion>
  <div class="np-vinyl-wrap vinyl-${slide}" id="np-vinyl">
    <div class="np-vinyl-disc">
      <div class="np-vinyl-spin">
        <div class="np-vinyl-label" id="np-vinyl-label"></div>
      </div>
    </div>
    <div class="np-sleeve" id="cover">
      ${img}
    </div>
  </div>
</div>`;
}

function liveRow(state: BuilderState): string {
  if (!state.showBar) return "";
  const above = state.livePlacement === "above" ? " np-live--above" : "";
  return `<div class="np-live${above}" data-np-motion><i></i>NOW PLAYING</div>`;
}

/** The example's spectrum sits below the metadata, not in place of artwork. */
function spectrumBlock(state: BuilderState): string {
  if (!state.showSpectrum) return "";
  const bars = '<span class="np-spectrum-bar"></span>'.repeat(40);
  // "center" only swaps the transform origin, so the runtime stays identical.
  const grow = state.spectrumStyle === "center" ? " np-spectrum-center" : "";
  return `<div class="np-spectrum-row" data-np-motion aria-hidden="true"><div class="np-spectrum${grow}" id="np-spectrum">${bars}</div></div>`;
}

function titleBlock(state: BuilderState, motion = true): string {
  if (!state.shownFields.title) return "";
  const bg = state.showTitleBackground ? " has-bg" : "";
  return `<h1 class="np-title${bg}" id="np-title"${motion ? " data-np-motion" : ""}><span data-np-text></span></h1>`;
}

function artistRow(state: BuilderState, motion = true, combined = false): string {
  if (!state.shownFields.artist) return "";
  // In a combined line the accent dash is dropped — the separator takes its
  // place — and CSS unifies the artist type with the title.
  const dash = state.artistDash && !combined ? '<span class="np-mark"></span>' : "";
  const bg = state.showArtistBackground ? " has-bg" : "";
  const combCls = combined ? " is-combined" : "";
  return `<div class="np-artist-row${bg}${combCls}" id="np-artist"${motion ? " data-np-motion" : ""}>${dash}<h2><span data-np-text></span></h2></div>`;
}

/**
 * Title + artist sharing one baseline-aligned line, separated by an accent
 * rule. The runtime hides the separator whenever either side is empty.
 */
function combinedBlock(state: BuilderState, titleFirst: boolean): string {
  const first = titleFirst ? titleBlock(state, false) : artistRow(state, false, true);
  const second = titleFirst ? artistRow(state, false, true) : titleBlock(state, false);
  return `<div class="np-combined" id="np-combined" data-np-motion>
      ${first}
      <span class="np-combined-sep" aria-hidden="true"></span>
      ${second}
    </div>`;
}

/**
 * Previously played track, styled like the community example themes. The single
 * "artist — title" reading mirrors the current track's order: whichever of the
 * two leads the stacked card (the arranged field order) also leads this line,
 * the same rule the combined title+artist line uses.
 */
function previousBlock(state: BuilderState): string {
  if (!state.showPrevious) return "";
  const idxTitle = state.fieldOrder.indexOf("title");
  const idxArtist = state.fieldOrder.indexOf("artist");
  const titleFirst = idxTitle >= 0 && (idxArtist < 0 || idxTitle < idxArtist);
  const first = titleFirst
    ? "<span data-np-prev-title></span>"
    : "<span data-np-prev-artist></span>";
  const second = titleFirst
    ? "<span data-np-prev-artist></span>"
    : "<span data-np-prev-title></span>";
  return `<div class="np-prev" id="np-prev" data-np-motion aria-live="polite">
      <span class="np-prev-label">Previous</span>
      <span id="np-prev-tune">${first}<i class="np-prev-sep">—</i>${second}</span>
    </div>`;
}

function chipItem(state: BuilderState, token: string): string {
  const p = byToken(token);
  if (!p) return "";
  if (token === "rating" && state.ratingStyle === "stars") return ratingStars(true);
  const unit = UNIT[token] ? `<small>${UNIT[token]}</small>` : "";
  // Rating reads numeric-first: "4 ★".
  if (token === "rating")
    return `<span class="np-chip" id="np-${token}" data-np-motion><span data-np-text></span>${chipIcon(token)}${unit}</span>`;
  return `<span class="np-chip" id="np-${token}" data-np-motion>${chipIcon(token)}<span data-np-text></span>${unit}</span>`;
}

function textMetaItem(state: BuilderState, token: string): string {
  const p = byToken(token);
  if (!p) return "";
  if (token === "rating" && state.ratingStyle === "stars") return ratingStars(false);
  const prefix = token === "label" ? '<em class="np-on">ON</em>' : "";
  // Chip-capable tokens shown as text keep their unit (e.g. "126 BPM").
  const unit = UNIT[token] ? `<small>${UNIT[token]}</small>` : "";
  // Rating reads numeric-first: "4 ★".
  const icon = token === "rating" ? chipIcon(token) : "";
  return `<span class="np-m" id="np-${token}" data-np-motion>${prefix}<b data-np-text></b>${unit}${icon}</span>`;
}

/**
 * Renders every enabled field in the exact order the user arranged them.
 *
 * Title, artist, label, comment and remix each get their own row. Every
 * chip-capable field (BPM, Key, Rating, Length) joins one shared row —
 * whether it renders as a chip or plain text — placed where the first of
 * those fields sits in the order.
 */
function orderedBlocks(state: BuilderState): string {
  const seq = state.fieldOrder.filter((t) => state.shownFields[t]);
  const out: string[] = [];

  const renderItem = (token: string): string =>
    rendersAsChip(state, token) ? chipItem(state, token) : textMetaItem(state, token);

  const group = seq.filter((t) => isChipKind(t));
  let groupEmitted = false;

  // Combine title + artist onto one line when they sit next to each other.
  const idxTitle = seq.indexOf("title");
  const idxArtist = seq.indexOf("artist");
  const combine =
    state.combineTitleArtist &&
    idxTitle >= 0 &&
    idxArtist >= 0 &&
    Math.abs(idxTitle - idxArtist) === 1;
  let combinedEmitted = false;

  for (const token of seq) {
    if (combine && (token === "title" || token === "artist")) {
      if (!combinedEmitted) {
        out.push(combinedBlock(state, idxTitle < idxArtist));
        combinedEmitted = true;
      }
      continue;
    }
    if (token === "title") {
      out.push(titleBlock(state));
    } else if (token === "artist") {
      out.push(artistRow(state));
    } else if (isChipKind(token)) {
      if (!groupEmitted) {
        out.push(`<div class="np-inline">${group.map(renderItem).join("")}</div>`);
        groupEmitted = true;
      }
    } else {
      out.push(`<div class="np-meta-muted">${textMetaItem(state, token)}</div>`);
    }
  }

  out.push(previousBlock(state));

  return out.filter(Boolean).join("\n      ");
}

/* --------------------------------- body ---------------------------------- */

export function bodyHtml(state: BuilderState): string {
  const pos = state.artPosition;
  const showArt = state.showArtwork;

  // Map text alignment → the classes the stylesheet understands.
  const alignClass =
    state.align === "center" ? " align-center" : state.align === "right" ? " align-right" : "";
  // The .np-vec justifies the whole composition; center/right keeps the block
  // sitting under the chosen edge.
  const vecClass =
    state.align === "center" ? " ctr" : state.align === "right" ? " end" : "";
  const columnAlignClass =
    state.align === "center"
      ? " align-center"
      : state.align === "right"
        ? " align-right"
        : " align-left";

  const panel = state.showCardBackground
    ? ` np-panel${state.cardPulse ? ` np-pulse${state.cardPulseDirection === "ccw" ? " np-pulse--ccw" : ""}` : ""}`
    : "";
  const backdrop = state.showCardBackground
    ? '<div class="np-panel-backdrop" data-np-motion-backdrop aria-hidden="true"></div>'
    : '';

  // "Above" lifts the live indicator out of the card so it reads as its own
  // title; the card then stacks beneath it inside #np-root. Both variants keep
  // data-np-motion so the indicator still takes part in the overlay animation.
  const aboveLive = state.showBar && state.livePlacement === "above";
  const nestedLive = aboveLive ? "" : liveRow(state);

  const textBlock = `
    <div class="np-txt${alignClass}">
      ${nestedLive}
      ${orderedBlocks(state)}
      ${spectrumBlock(state)}
    </div>`;

  // The record slides away from the text block: for left artwork it slides
  // right, for right artwork it slides left; for top/bottom it slides right.
  const slide = pos === "right" ? "l" : "r";
  // Vertical alignment for left/right artwork → the row's align-items.
  const rowAlignClass =
    pos === "left" || pos === "right"
      ? " art-y-" + state.artAlignY
      : "";
  // Horizontal alignment for top/bottom artwork → align-self on the dock.
  const dockAlignClass =
    pos === "top" || pos === "bottom" ? " art-x-" + state.artAlignX : "";
  const art = showArt
    ? coverBlock(state, "dock--" + pos.charAt(0), pos.charAt(0), slide, dockAlignClass)
    : "";
  const hasDivider = showArt && state.showArtworkDivider && (pos === "left" || pos === "right");
  const divider = hasDivider
    ? `<div class="np-artwork-divider" data-np-motion aria-hidden="true" style="width:${state.artworkDividerWidth}px;flex-basis:${state.artworkDividerWidth}px"></div>`
    : '';
  const dividerClass = hasDivider ? " has-artwork-divider" : "";

  let composition: string;
  if (!showArt) {
    composition = `<div class="np-center${panel}" id="np-composition">${backdrop}${textBlock}</div>`;
  } else if (pos === "top") {
    composition = `<div class="np-col${columnAlignClass}${panel}" id="np-composition">${backdrop}${art}${textBlock}</div>`;
  } else if (pos === "bottom") {
    composition = `<div class="np-col${columnAlignClass}${panel}" id="np-composition">${backdrop}${textBlock}${art}</div>`;
  } else if (pos === "right") {
    composition = `<div class="np-row rev${rowAlignClass}${dividerClass}${panel}" id="np-composition">${backdrop}${art}${divider}${textBlock}</div>`;
  } else {
    composition = `<div class="np-row${rowAlignClass}${dividerClass}${panel}" id="np-composition">${backdrop}${art}${divider}${textBlock}</div>`;
  }

  // The root starts hidden and is revealed once the first track update arrives.
  const stackClass = aboveLive ? " np-vec--above" : "";
  const outsideLive = aboveLive ? liveRow(state) : "";
  return `<div class="np-vec${vecClass}${stackClass} is-hidden" id="np-root">${outsideLive}${composition}</div>`;
}

/* ------------------------------- runtime JS ------------------------------ */

/** Mix a hex colour toward black (amt < 0) or white (amt > 0). */
function shadeHex(hex: string, amt: number): string {
  const raw = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) return hex;
  const n = parseInt(raw, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const target = amt < 0 ? 0 : 255;
  const t = Math.abs(Math.max(-1, Math.min(1, amt)));
  r = Math.round((target - r) * t + r);
  g = Math.round((target - g) * t + g);
  b = Math.round((target - b) * t + b);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Sample cover used by the builder's live preview only. It is rendered from the
 * current accent colour so the preview stays consistent with what the user
 * picked — never shipped in the real overlay (Now Playing sends track.artwork).
 */
function mockArt(accent: string): string {
  const c1 = accent;
  const c2 = shadeHex(accent, -0.62);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='300' height='300' fill='url(#g)'/><circle cx='150' cy='150' r='62' fill='none' stroke='rgba(255,255,255,0.55)' stroke-width='14'/><circle cx='150' cy='150' r='20' fill='rgba(255,255,255,0.9)'/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function mockPayload(accent: string): string {
  const track: Record<string, unknown> = {
    id: "mock-1",
    title: "Midnight Circuit",
    artist: "Neon District",
    artwork: mockArt(accent),
    label: "Afterdark Records",
    bpm: 126,
    key: "8A",
    rating: 4,
    length: 402,
    comment: "Peak time weapon",
    remix: "Extended Mix",
  };
  return JSON.stringify(track);
}

/**
 * The script Now Playing requires. Structured to mirror the official starter
 * and known-working community themes exactly:
 *
 *  - ONE top-level <script>, no IIFE wrapper
 *  - onTrackUpdate / onHide / onShow are plain `function` declarations so they
 *    are hoisted globals (Now Playing's injected loader probes for them)
 *  - artwork is revealed on the <img> `load` event, not on src assignment
 *  - console.log(track) so the payload can be inspected in the OBS/browser
 *    console (the tutorial explicitly tells you to check the console)
 */
function runtimeScript(state: BuilderState, mock: boolean): string {
  const resolved = resolveAnimationSettings(state.animation);
  // Bake the effective exit in so the exported theme carries concrete values
  // and never needs to know about the "reverse entrance" mode at runtime.
  const animation = {
    entrance: resolved.entrance,
    exit: effectiveExit(resolved),
    animateTrackChanges: resolved.animateTrackChanges,
  };
  return `
<script>
var npHasTrack = false;
var npHiddenByApp = false;
var npLatestTrack = null;
var npRenderedTrack = null;
var npCurrentTrackKey = '';
var npTrackRevision = 0;
var npMotionSettings = ${JSON.stringify(animation)};

function npEl(id) { return document.getElementById(id); }

${overlayMotionRuntime}
${state.showSpectrum ? `
${overlaySpectrumRuntime}
var npSpectrum = npCreateSpectrum({ speed: ${Math.max(0.5, Math.min(2, state.spectrumSpeed || 1))} });
function npSpectrumMotionState(phase) {
  npSpectrum.setVisible(phase !== 'hidden');
  ${mock ? "npPreviewState(phase);" : ""}
}
` : ""}
var npMotion = npCreateMotionController(npMotionSettings, ${state.showSpectrum ? "npSpectrumMotionState" : mock ? "npPreviewState" : "null"});

function npTrackKey(track) {
  return track.id !== undefined && track.id !== null && track.id !== ''
    ? String(track.id)
    : JSON.stringify([track.artist || '', track.title || '']);
}

function npStopVinyl() {
  window.clearTimeout(window.npVinylTimer);
  var vinyl = npEl('np-vinyl');
  if (vinyl) vinyl.classList.remove('show-vinyl');
}

function npShowOverlay() {
  if (!npHasTrack || npHiddenByApp) return Promise.resolve(false);
  npSyncSideArtwork();
  npScheduleSideArtwork();
  var entering = npMotion.state() === 'hidden' || npMotion.state() === 'exiting';
  var shown = npMotion.show();
  if (entering) {
    shown.then(function (completed) {
      if (!completed || npHiddenByApp || npMotion.state() !== 'visible') return;
      var vinyl = npEl('np-vinyl');
      if (vinyl) vinyl.classList.add('show-vinyl');
    });
  }
  return shown;
}

/*
 * Side artwork should begin and end on the same horizontal lines as the full
 * text stack. Measure only .np-txt so changing the artwork size cannot feed
 * back into its own measurement. Stacked/top artwork keeps the normal size.
 */
function npSyncSideArtwork() {
  var root = npEl('np-root');
  var row = root ? root.querySelector('.np-row') : null;
  var text = row ? row.querySelector('.np-txt') : null;
  if (!row || !text) return;
  // Spectrum bars transform within a fixed-height row; measure layout, not motion.
  var height = text.offsetHeight;
  var divider = row.querySelector('.np-artwork-divider');
  if (divider) divider.classList.toggle('np-hide', height <= 0);
  if (height > 0) row.style.setProperty('--np-side-art-size', height + 'px');
}

var npSideArtworkFrame = 0;
function npScheduleSideArtwork() {
  if (npSideArtworkFrame) cancelAnimationFrame(npSideArtworkFrame);
  npSideArtworkFrame = requestAnimationFrame(function () {
    // A second frame catches DOM visibility changes and late font layout.
    npSideArtworkFrame = requestAnimationFrame(function () {
      npSideArtworkFrame = 0;
      npSyncSideArtwork();
    });
  });
}

/* Fills [data-np-text] inside the element and hides it when empty. */
function npSetText(id, value) {
  var node = npEl(id);
  if (!node) return;
  var empty = value === undefined || value === null || String(value).trim() === '';
  node.classList.toggle('np-hide', empty);
  var target = node.querySelector('[data-np-text]') || node;
  target.textContent = empty ? '' : String(value);
}

function npSyncOptionalRows() {
  document.querySelectorAll('.np-inline, .np-meta-muted').forEach(function (row) {
    var visible = Array.prototype.some.call(row.children, function (item) {
      return !item.classList.contains('np-hide');
    });
    row.classList.toggle('np-hide', !visible);
  });
}

function npFmtLength(sec) {
  if (sec === undefined || sec === null || sec === '') return '';

  // Now Playing documents track.length as seconds. Some sources/plugins use
  // duration/durationMs/duration_ms instead, so this formatter is deliberately
  // strict about accepting only duration-like values.
  if (typeof sec === 'string') {
    var raw = sec.trim();
    if (!raw) return '';
    // Already formatted as m:ss / h:mm:ss. Do not convert this to a clock.
    if (/^[0-9]{1,3}:[0-9]{2}(:[0-9]{2})?$/.test(raw)) return raw;
    sec = raw;
  }

  var n = Number(sec);
  if (!isFinite(n) || n <= 0) return '';

  // If the value is clearly milliseconds, convert to seconds. Track durations
  // in seconds are usually < 7200; in ms they are usually > 60000.
  if (n > 60000) n = n / 1000;

  // Ignore timestamp-like numbers. That is not a track duration.
  if (n > 24 * 60 * 60) return '';

  n = Math.max(0, Math.round(n));
  var h = Math.floor(n / 3600);
  var m = Math.floor((n % 3600) / 60);
  var s = n % 60;
  var mm = (h > 0 && m < 10 ? '0' : '') + m;
  var ss = (s < 10 ? '0' : '') + s;
  return h > 0 ? h + ':' + mm + ':' + ss : m + ':' + ss;
}

function npTrackLength(track) {
  if (!track) return '';
  return npFmtLength(
    track.length !== undefined && track.length !== null ? track.length :
    track.duration !== undefined && track.duration !== null ? track.duration :
    track.durationSeconds !== undefined && track.durationSeconds !== null ? track.durationSeconds :
    track.durationMs !== undefined && track.durationMs !== null ? track.durationMs :
    track.duration_ms
  );
}

function npTrackRemix(track) {
  if (!track) return '';
  // ID3 TPE4 ("remixed by") surfaces under different names per source.
  var keys = ['remix', 'remixer', 'remixedBy', 'mix'];
  for (var i = 0; i < keys.length; i++) {
    var v = track[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

function npRatingValue(value) {
  if (value === undefined || value === null) return NaN;
  var m = String(value).match(/-?[0-9]*[.]?[0-9]+/);
  if (!m) return NaN;
  var n = Number(m[0]);
  if (!isFinite(n)) return NaN;
  // Normalise common rating scales to 0–5.
  if (n > 5 && n <= 10) n = n / 2;
  else if (n > 10 && n <= 100) n = n / 20;
  else if (n > 100 && n <= 255) n = (n / 255) * 5;
  else if (n > 255) return NaN;
  if (n < 0) n = 0;
  if (n > 5) n = 5;
  return n;
}

function npSetRating(id, value) {
  var node = npEl(id);
  if (!node) return;
  var fill = node.querySelector('[data-np-stars-fill]');
  if (fill) {
    var n = npRatingValue(value);
    var empty = !isFinite(n) || n <= 0;
    node.classList.toggle('np-hide', empty);
    if (empty) {
      fill.style.width = '0%';
      node.setAttribute('aria-label', 'Not rated');
      return;
    }
    // Include only the gaps preceding the filled stars, not a fraction of every gap.
    fill.style.width = 'calc(' + n + ' * var(--np-star-size) + ' +
      Math.max(0, Math.ceil(n) - 1) + ' * var(--np-star-gap))';
    node.setAttribute('aria-label', 'Rated ' + (Math.round(n * 10) / 10) + ' out of 5');
    return;
  }
  var missing = value === undefined || value === null || String(value).trim() === '';
  node.classList.toggle('np-hide', missing);
  var target = node.querySelector('[data-np-text]') || node;
  target.textContent = missing ? '' : String(value).trim();
}

/* Reveal the cover only once the browser has actually decoded it. */
(function () {
  var img = npEl('artwork');
  if (!img) return;
  img.addEventListener('load', function () {
    if (img.getAttribute('src')) img.classList.add('showArtwork');
  });
  img.addEventListener('error', function () {
    img.classList.remove('showArtwork');
    console.warn('[np-theme] artwork failed to load:', img.getAttribute('src'));
  });
})();

/* The last track before the current one, for the optional "Previous" block. */
var npPreviousTrack = null;

function npSyncCombined() {
  var wrap = npEl('np-combined');
  if (!wrap) return;
  var title = npEl('np-title');
  var artist = npEl('np-artist');
  var sep = wrap.querySelector('.np-combined-sep');
  if (!sep) return;
  var show = !!(title && artist &&
    !title.classList.contains('np-hide') && !artist.classList.contains('np-hide'));
  sep.classList.toggle('np-hide', !show);
}

function npSyncPrevious() {
  var row = npEl('np-prev');
  if (!row) return;
  var p = npPreviousTrack;
  var a = row.querySelector('[data-np-prev-artist]');
  var t = row.querySelector('[data-np-prev-title]');
  var hasArtist = !!(p && p.artist && String(p.artist).trim() !== '');
  var hasTitle = !!(p && p.title && String(p.title).trim() !== '');
  var has = hasArtist || hasTitle;
  row.classList.toggle('np-hide', !has);
  row.classList.toggle('np-prev--title-only', hasTitle && !hasArtist);
  row.classList.toggle('np-prev--artist-only', hasArtist && !hasTitle);
  if (a) a.textContent = hasArtist ? String(p.artist) : '';
  if (t) t.textContent = hasTitle ? String(p.title) : '';
}

function npApplyTrack(track) {
  // Remember the outgoing track as "previous" only on a real change.
  if (npRenderedTrack && npTrackKey(npRenderedTrack) !== npTrackKey(track)) {
    npPreviousTrack = npRenderedTrack;
  }
  npHasTrack = true;
  npRenderedTrack = track;
  npCurrentTrackKey = npTrackKey(track);

  npSetText('np-title', track.title);
  npSetText('np-artist', track.artist);
  npSetText('np-label', track.label);
  npSetText('np-comment', track.comment);
  npSetText('np-remix', npTrackRemix(track));
  npSetText('np-bpm', track.bpm);
  npSetText('np-key', track.key);
  npSetRating('np-rating', track.rating);
  npSetText('np-length', npTrackLength(track));
  npSyncOptionalRows();
  npSyncCombined();
  npSyncPrevious();

  var url = typeof track.artwork === 'string' ? track.artwork : '';
  var img = npEl('artwork');
  if (img) {
    /* Preserve the existing same-origin workaround for stale artwork host IPs. */
    try {
      if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) {
        var u = new URL(url);
        var samePort =
          (u.port || (u.protocol === 'http:' ? '80' : '443')) ===
          (location.port || (location.protocol === 'http:' ? '80' : '443'));
        if (samePort) url = u.pathname + u.search + u.hash;
      }
    } catch (e) {
      /* keep original */
    }

    if (url) {
      if (img.getAttribute('src') !== url) {
        img.classList.remove('showArtwork');
        img.setAttribute('src', url);
      }
      if (img.complete && img.naturalWidth > 0) img.classList.add('showArtwork');
    } else {
      img.classList.remove('showArtwork');
      img.removeAttribute('src');
    }
  }

  var lab = npEl('np-vinyl-label');
  if (lab) lab.style.backgroundImage = url ? 'url(' + JSON.stringify(url) + ')' : '';
  npSyncSideArtwork();
  npScheduleSideArtwork();
}

/** Called by Now Playing after its configured track delay. */
function onTrackUpdate(track) {
  if (!track || typeof track !== 'object') return;
  console.log('[np-theme] onTrackUpdate', track);
  var revision = ++npTrackRevision;
  var changed = npHasTrack && npTrackKey(track) !== npCurrentTrackKey;
  npLatestTrack = track;

  if (npHiddenByApp) {
    npApplyTrack(track);
    return;
  }

  if (changed && npMotionSettings.animateTrackChanges && !npMotion.isHidden()
      && (npMotionSettings.entrance.effect !== 'none' || npMotionSettings.exit.effect !== 'none')) {
    // Only tuck the record away when a visible swap will follow. With both
    // phases at "None" the transition is an instant text swap, so the vinyl
    // stays slid out instead of tucking in and back for no reason.
    npStopVinyl();
    npStopVinyl();
    return npMotion.hide().then(function (completed) {
      // Only the newest payload may start an entrance after the old track exits.
      if (!completed || revision !== npTrackRevision || npHiddenByApp) return false;
      npApplyTrack(npLatestTrack);
      return npShowOverlay();
    });
  }

  npApplyTrack(track);
  return npShowOverlay();
}

/** Called when "Hide After" wants the overlay hidden. */
function onHide() {
  npHiddenByApp = true;
  npTrackRevision += 1;
  npStopVinyl();
  return npMotion.hide();
}

/** Called when "Hide After" wants the overlay shown again. */
function onShow() {
  npHiddenByApp = false;
  npTrackRevision += 1;
  if (npLatestTrack && npLatestTrack !== npRenderedTrack) npApplyTrack(npLatestTrack);
  return npShowOverlay();
}

/* Belt-and-braces: some loaders look these up on window explicitly. */
window.onTrackUpdate = onTrackUpdate;
window.onHide = onHide;
window.onShow = onShow;

/* Keep side artwork locked to the text stack as fields wrap or fonts load. */
(function () {
  var root = npEl('np-root');
  var text = root ? root.querySelector('.np-row .np-txt') : null;
  if (!text) return;

  if (window.ResizeObserver) {
    var observer = new ResizeObserver(npScheduleSideArtwork);
    observer.observe(text);
  }
  window.addEventListener('resize', npScheduleSideArtwork);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(npScheduleSideArtwork);
  }
  npScheduleSideArtwork();
})();
${
    mock
      ? `
/* The sandboxed builder preview alone accepts playback commands. */
var npPreviewRevision = 0;
var npPreviewTimer = 0;
function npPreviewState(phase) {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'np-preview-state', phase: phase }, '*');
  }
}
window.addEventListener('message', function (event) {
  if (event.source !== window.parent || !event.data || event.data.type !== 'np-preview-command') return;
  var action = event.data.action;
  if (action === 'status') { npPreviewState(npMotion.state()); return; }
  if (action !== 'show' && action !== 'hide' && action !== 'replay') return;
  var revision = ++npPreviewRevision;
  window.clearTimeout(npPreviewTimer);
  if (action === 'show') {
    npStopVinyl();
    npMotion.reset();
    onShow();
  } else if (action === 'hide') {
    onHide();
  } else {
    onHide().then(function (completed) {
      if (!completed || revision !== npPreviewRevision) return;
      npPreviewTimer = window.setTimeout(function () {
        if (revision === npPreviewRevision) onShow();
      }, 350);
    });
  }
});

/* Sample data uses exactly the same callbacks as the exported theme. */
onTrackUpdate(${mockPayload(state.accentColor)});
/* Fabricate a previous track so the preview demonstrates the feature. */
npPreviousTrack = { artist: 'Aurora Lane', title: 'Afterglow' };
npSyncPrevious();
`
      : ""
  }
</script>`;
}

/* -------------------------------- document ------------------------------- */

export function cssText(): string {
  return ART;
}

export function fullTemplateHtml(
  state: BuilderState,
  opts: { mock?: boolean } = {}
): string {
  const mock = !!opts.mock;
  const importBlock = fontImportFor(state);
  const vars = resolveCssVars(state);
  const varBlock = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Now Playing · Custom HTML Theme</title>
${importBlock ? `<style data-imports>${importBlock}</style>` : ""}
<style>
:root {
${varBlock}
}
${cssText()}
</style>
</head>
<body>
${bodyHtml(state)}
${runtimeScript(state, mock)}
</body>
</html>`;
}

/** The generated stylesheet, shipped verbatim. */
const ART = `*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{font-family:var(--np-font);background:transparent;overflow:hidden}
.np-vec{position:fixed;inset:0;display:flex;align-items:center;justify-content:flex-start;
  padding:clamp(12px,3vw,34px);pointer-events:none}
.np-vec.is-hidden{opacity:0;visibility:hidden}
.np-vec.ctr{justify-content:center}
.np-vec.end{justify-content:flex-end}
/* "Live indicator above": the root stacks, so the separate NOW PLAYING title
   sits above the card without becoming part of the card's box. In a column the
   root's justify-content centres the stack and align-items carries the text
   alignment that .ctr/.end express horizontally in row mode. */
.np-vec.np-vec--above{flex-direction:column;justify-content:center;align-items:flex-start;
  gap:clamp(10px,1.6vw,16px)}
.np-vec.np-vec--above.ctr{align-items:center}
.np-vec.np-vec--above.end{align-items:flex-end}
.np-row{display:flex;flex-direction:row;align-items:center;gap:clamp(16px,2.4vw,26px)}
.np-row.rev{flex-direction:row-reverse}
.np-row.has-artwork-divider{column-gap:clamp(10px,1.4vw,18px)}
.np-artwork-divider{flex:0 0 auto;width:3px;height:var(--np-side-art-size,150px);
  border-radius:var(--np-divider-radius,999px);background:var(--np-accent);align-self:stretch}
/* artwork vertical alignment when it sits left/right of the text */
.np-row.art-y-top{align-items:flex-start}
.np-row.art-y-bottom{align-items:flex-end}
.np-col{display:flex;flex-direction:column;gap:clamp(14px,2vw,22px)}
.np-col.align-left{align-items:flex-start}
.np-col.align-center{align-items:center}
.np-col.align-right{align-items:flex-end}
.np-center{display:flex}
.np-txt{display:flex;flex-direction:column;min-width:0}
/* text justification */
.np-txt.align-center{align-items:center;text-align:center}
.np-txt.align-right{align-items:flex-end;text-align:right}
.np-panel{position:relative;isolation:isolate;width:fit-content;max-width:100%;padding:var(--np-card-pad,24px);
  border-radius:var(--np-card-radius,18px)}
.np-panel-backdrop{position:absolute;inset:0;z-index:-1;pointer-events:none;
  border-radius:inherit;background:var(--np-card);
  border:var(--np-card-border,0px solid transparent);box-shadow:var(--np-card-shadow,none)}
/* Clockwise light pulse travelling around the outside of the card border.
   A conic gradient masked down to a 2px ring, swept by an animated angle. */
@property --np-pulse-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
.np-panel.np-pulse{overflow:visible}
.np-panel.np-pulse::before{content:"";position:absolute;inset:-3px;border-radius:inherit;
  z-index:4;pointer-events:none;padding:2px;
  background:conic-gradient(from var(--np-pulse-angle,0deg),
    transparent 0 55%,color-mix(in srgb,var(--np-accent) 45%,transparent) 74%,
    var(--np-accent) 88%,#fff 94%,transparent 100%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  mask-composite:exclude;
  filter:drop-shadow(0 0 6px color-mix(in srgb,var(--np-accent) 65%,transparent));
  animation:np-pulse-spin 3.2s linear infinite}
.np-panel.np-pulse--ccw::before{animation-direction:reverse}
@keyframes np-pulse-spin{to{--np-pulse-angle:360deg}}
#np-composition,[data-np-motion],[data-np-motion-backdrop]{transform-box:border-box}
.np-hide{display:none!important}

/* ---------- cover ---------- */
 .np-dock{flex:0 0 auto;--np-art-size:calc(150px * var(--np-art-scale,1))}
 .np-row .np-dock{--np-art-size:calc(var(--np-side-art-size,150px) * var(--np-art-scale,1))}
#cover,.np-art{position:relative;width:var(--np-art-size,150px);height:var(--np-art-size,150px);
  border-radius:var(--np-radii,14px);overflow:hidden;flex:0 0 auto;
  background:linear-gradient(135deg, var(--np-accent), color-mix(in srgb, var(--np-accent) 32%, #000));
  box-shadow:0 18px 46px -18px rgba(0,0,0,.55)}
#cover::after,.np-art::after{content:"";position:absolute;inset:0;z-index:2;
  border:1px solid rgba(255,255,255,.12);border-radius:inherit;pointer-events:none}
#artwork{display:block;width:100%;height:100%;max-width:100%;max-height:100%;
  object-fit:cover;border:0;padding:0;margin:0;opacity:0;transition:opacity .6s ease-out}
#artwork.showArtwork{opacity:1}
.np-dock.dock--l{margin-right:0}.np-dock.dock--r{margin-left:0}
/* artwork horizontal alignment when it sits top/bottom of the text */
.np-dock.art-x-left{align-self:flex-start}
.np-dock.art-x-center{align-self:center}
.np-dock.art-x-right{align-self:flex-end}
.pad-l{margin-right:0}.pad-r{margin-left:0}

/* ---------- vinyl ---------- */
.np-vinyl-wrap{--np-vinyl-out:calc(var(--np-art-size,150px) * .52);position:relative}
.np-vinyl-wrap.vinyl-r{padding-right:var(--np-vinyl-out)}
.np-vinyl-wrap.vinyl-l{padding-left:var(--np-vinyl-out)}
.np-sleeve{position:relative;z-index:2;width:var(--np-art-size,150px);height:var(--np-art-size,150px);
  border-radius:var(--np-radii,14px);overflow:hidden;
  background:linear-gradient(135deg, var(--np-accent), color-mix(in srgb, var(--np-accent) 32%, #000));
  box-shadow:0 18px 46px -18px rgba(0,0,0,.6)}
.np-vinyl-disc{position:absolute;top:0;left:0;z-index:1;
  width:var(--np-art-size,150px);height:var(--np-art-size,150px);
  transform:translateX(0);transition:transform .9s cubic-bezier(.22,.9,.28,1.02);
  filter:drop-shadow(0 10px 24px rgba(0,0,0,.45))}
.np-vinyl-wrap.vinyl-l .np-vinyl-disc{left:auto;right:0}
.np-vinyl-wrap.show-vinyl.vinyl-r .np-vinyl-disc{transform:translateX(var(--np-vinyl-out))}
.np-vinyl-wrap.show-vinyl.vinyl-l .np-vinyl-disc{transform:translateX(calc(var(--np-vinyl-out) * -1))}
.np-vinyl-spin{position:absolute;inset:0;border-radius:50%;overflow:hidden;
  background:
    conic-gradient(from 20deg, rgba(255,255,255,.10) 0 6%, transparent 6% 44%,
      rgba(255,255,255,.07) 48% 54%, transparent 54% 100%),
    repeating-radial-gradient(circle at 50% 50%, #0a0a0d 0 1.5px, #17171d 1.5px 3.5px);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
  animation:np-spin 2.6s linear infinite;animation-play-state:paused}
.np-vinyl-wrap.show-vinyl .np-vinyl-spin{animation-play-state:running}
.np-vinyl-label{position:absolute;top:50%;left:50%;width:38%;height:38%;
  transform:translate(-50%,-50%);border-radius:50%;
  background-color:var(--np-accent);background-size:cover;background-position:center;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.4)}
.np-vinyl-label::after{content:"";position:absolute;top:50%;left:50%;width:16%;height:16%;
  transform:translate(-50%,-50%);border-radius:50%;background:#0a0a0d;
  box-shadow:0 0 0 1px rgba(255,255,255,.15)}
@keyframes np-spin{to{transform:rotate(360deg)}}

/* ---------- type ---------- */
.np-title{margin:0;font-size:var(--np-title,44px);line-height:.98;font-weight:900;
  letter-spacing:-.018em;color:var(--np-text);text-transform:var(--np-case,none);
  font-style:var(--np-style,normal);text-wrap:balance}
/* background plate hugging just the title text */
.np-title.has-bg{width:fit-content;max-width:100%;padding:.16em .34em;
  background:var(--np-title-bg);border-radius:var(--np-title-radius,10px);
  border:var(--np-title-border,0px solid transparent);box-shadow:var(--np-title-shadow,none)}
.np-artist-row{display:flex;align-items:center;gap:9px;margin-top:clamp(7px,1.1vw,12px)}
/* background plate hugging just the artist line */
.np-artist-row.has-bg{width:fit-content;max-width:100%;padding:.32em .55em;
  background:var(--np-artist-bg);border-radius:var(--np-artist-radius,8px);
  border:var(--np-artist-border,0px solid transparent);box-shadow:var(--np-artist-shadow,none)}
.np-mark{width:22px;height:2px;background:var(--np-accent);border-radius:2px;flex:none}
.np-artist-row h2{font-size:var(--np-artist,17px);font-weight:600;
  letter-spacing:var(--np-artist-spacing,.12em);text-transform:var(--np-artist-case,uppercase);
  font-style:var(--np-artist-style,normal);color:var(--np-muted);margin:0}
/* combined title + artist on one baseline-aligned line. The artist adopts the
   title's size, weight and tracking so the pair reads as a single line; the
   accent dash is dropped by the markup and the separator does the dividing. */
.np-combined{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px 14px}
.np-combined .np-artist-row{margin-top:0}
.np-combined .np-mark{display:none}
.np-combined .np-artist-row h2{font-size:var(--np-title,44px);font-weight:900;
  letter-spacing:-.018em;line-height:.98}
.np-combined-sep{flex:none;width:16px;height:2px;border-radius:2px;background:var(--np-accent);
  align-self:center}
/* previously played track */
.np-prev{display:flex;align-items:baseline;gap:10px;margin-top:clamp(10px,1.4vw,16px);
  font-size:var(--np-meta,15px);color:var(--np-muted);opacity:.8}
.np-prev-label{flex:none;font-size:.72em;font-weight:800;letter-spacing:.24em;
  text-transform:uppercase;color:var(--np-accent)}
#np-prev-tune{display:inline-flex;align-items:baseline;gap:8px;font-weight:600;min-width:0}
#np-prev-tune span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.np-prev-sep{font-style:normal;opacity:.55}
.np-prev--title-only .np-prev-sep,.np-prev--artist-only .np-prev-sep{display:none}

/* meta (everything that isn't the title or artist) */
.np-live{display:flex;align-items:center;gap:8px;font-size:var(--np-meta,15px);
  font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:var(--np-accent);
  margin-bottom:clamp(8px,1.3vw,14px)}
.np-live i{width:8px;height:8px;border-radius:50%;background:var(--np-accent);
  animation:pl 1.6s infinite}
/* Stacked above the card the root's gap handles the spacing, so the in-card
   bottom margin would double up. */
.np-live--above{margin-bottom:0}
.np-meta-muted{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;
  margin-top:clamp(6px,1vw,12px);font-size:var(--np-meta,15px);color:var(--np-muted)}
.np-txt.align-center .np-meta-muted{justify-content:center}
.np-txt.align-right .np-meta-muted{justify-content:flex-end}
/* shared row for every chip-capable field: chips + plain text on one line */
.np-inline{display:flex;flex-wrap:wrap;align-items:center;gap:8px;
  margin-top:clamp(8px,1.2vw,14px);font-size:var(--np-meta,15px);color:var(--np-muted)}
.np-inline .np-m{gap:2px}
.np-inline .np-m::before{content:none!important}
.np-txt.align-center .np-inline{justify-content:center}
.np-txt.align-right .np-inline{justify-content:flex-end}
.np-txt > :first-child{margin-top:0}
.np-meta-muted.np-hide,.np-inline.np-hide{margin:0}
/* The fixed-height spectrum never shifts the text or side-artwork sizing. */
.np-spectrum-row{flex:none;width:100%;min-width:160px;max-width:100%;margin-top:12px;
  height:var(--np-spectrum-height,30px);align-self:stretch}
.np-spectrum{display:flex;align-items:flex-end;justify-content:space-between;
  column-gap:0.5%;height:100%;width:100%;overflow:hidden;direction:ltr}
.np-spectrum-bar{display:block;flex:1 1 0;min-width:0;max-width:4px;height:100%;
  border-radius:2px;background:linear-gradient(to top,var(--np-spectrum-low),var(--np-accent) 55%,var(--np-spectrum-high));
  transform:scaleY(.1);transform-origin:center bottom;transition:transform .1s ease}
/* Centre style: the same scaleY grows each bar outwards from the middle line, with the
   gradient mirrored so both tips stay highlighted and the axis end stays shaded. */
.np-spectrum-center{align-items:center}
.np-spectrum-center .np-spectrum-bar{transform-origin:center center;
  background:linear-gradient(to top,var(--np-spectrum-high),var(--np-accent) 42%,var(--np-spectrum-low) 50%,var(--np-accent) 58%,var(--np-spectrum-high))}
.np-m{display:inline-flex;align-items:center;gap:2px;font-size:var(--np-meta,15px)}
.np-m:not(.np-hide) ~ .np-m:not(.np-hide)::before{content:"\\00B7";opacity:.5;margin:0 8px 0 2px}
.np-m b{font-weight:600;color:var(--np-muted)}
.np-m small{opacity:.55;font-size:.72em;font-weight:700;letter-spacing:.08em;margin-left:3px}
.np-on{color:var(--np-accent);font-style:normal;font-weight:700;margin-right:4px}
.np-chip{display:inline-flex;align-items:center;gap:6px;background:var(--np-chip);
  color:var(--np-text);font-size:var(--np-meta,15px);font-weight:700;
  letter-spacing:.03em;padding:5px 10px;border-radius:100px;white-space:nowrap;
  border:1px solid color-mix(in srgb, var(--np-text) 12%, transparent)}
.np-chip small{opacity:.5;font-size:.72em;font-weight:800;letter-spacing:.08em;margin-left:2px}
.np-ico{opacity:.75;flex:none}
/* five-star rating bar: grey base row with a gold row clipped to the rated fraction */
.np-rating{display:inline-flex;align-items:center;flex:none;font-size:var(--np-meta,15px)}
.np-stars{--np-star-size:1.05em;--np-star-gap:3px;position:relative;display:inline-flex;align-items:center;line-height:0;flex:none}
.np-stars-base{display:inline-flex;align-items:center;gap:var(--np-star-gap);color:color-mix(in srgb, var(--np-text) 24%, transparent)}
.np-stars-base svg,.np-stars-fill-inner svg{width:var(--np-star-size);height:var(--np-star-size);display:block;flex:none}
.np-stars-fill{position:absolute;left:0;top:0;bottom:0;overflow:hidden;width:0%}
.np-stars-fill-inner{display:inline-flex;align-items:center;gap:var(--np-star-gap);height:100%;color:#fbbf24}

@keyframes pl{0%{box-shadow:0 0 0 0 color-mix(in srgb, var(--np-accent) 55%, transparent)}70%{box-shadow:0 0 0 9px transparent}100%{box-shadow:0 0 0 0 transparent}}

@media (max-width:560px){
  .np-row{flex-direction:column!important;align-items:center;text-align:center}
  .np-row.rev{flex-direction:column!important}
  .np-artwork-divider{display:none}
  .np-txt{align-items:center}
}
@media (prefers-reduced-motion:reduce){
  .np-live i,.np-vinyl-spin{animation:none!important}
  #artwork,.np-vinyl-disc,.np-spectrum-bar{transition:none!important}
  .np-panel.np-pulse::before{animation:none}
}
`;
