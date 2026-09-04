import { byToken } from "../data/placeholders";
import {
  BuilderState,
  fontById,
  FONT_IMPORTS,
  googleFontUrl,
  layoutById,
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

const UNIT: Record<string, string> = { bpm: "BPM", currentBpm: "LIVE" };

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

export function resolveCssVars(state: BuilderState): CssVars {
  const f = { stack: resolveFontStack(state) };

  return {
    "--np-text": state.textColor,
    "--np-muted": state.mutedColor,
    "--np-accent": state.accentColor,
    "--np-surface": state.artworkColor,
    "--np-chip": state.chipColor,
    "--np-card": hexToRgba(state.cardColor, state.cardOpacity / 100),
    "--np-card-pad": `${state.cardPadding}px`,
    "--np-font": f.stack,
    "--np-title": `${state.titleSize}px`,
    "--np-artist": `${state.artistSize}px`,
    "--np-meta": `${state.metaSize}px`,
    "--np-radii": `${state.artworkCorner}px`,
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

function isChipKind(token: string): boolean {
  const k = byToken(token)?.kind;
  return !!k && k !== "text";
}

function chipIcon(token: string): string {
  const kind = byToken(token)?.kind;
  if (kind === "bpm")
    return `<svg class="np-ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M3 13h3l2.5-7 4 11L15 7l2 6h4"/></svg>`;
  if (kind === "key")
    return `<svg class="np-ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M7 4v9"/><path d="M17 4v2"/><circle cx="7" cy="16" r="3"/><circle cx="17" cy="14" r="3"/></svg>`;
  if (kind === "clock" || kind === "length")
    return `<svg class="np-ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`;
  if (kind === "rating")
    return `<svg class="np-ico" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>`;
  return "";
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
  slide: "l" | "r"
): string {
  const img = `<img id="artwork" src="">`;
  if (state.artStyle !== "vinyl") {
    return `<div class="np-dock ${roleClass}">
  <div class="np-art pad-${pad}" id="cover">
    ${img}
  </div>
</div>`;
  }
  return `<div class="np-dock ${roleClass}">
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
  return `<div class="np-live"><i></i>NOW PLAYING</div>`;
}

function titleBlock(state: BuilderState): string {
  if (!state.shownFields.title) return "";
  return `<h1 class="np-title" id="np-title"><span data-np-text></span></h1>`;
}

function artistRow(state: BuilderState): string {
  if (!state.shownFields.artist) return "";
  const dash = state.artistDash ? '<span class="np-mark"></span>' : "";
  return `<div class="np-artist-row" id="np-artist">${dash}<h2><span data-np-text></span></h2></div>`;
}

function chipItem(token: string): string {
  const p = byToken(token);
  if (!p) return "";
  const unit = UNIT[token] ? `<small>${UNIT[token]}</small>` : "";
  return `<span class="np-chip" id="np-${token}">${chipIcon(token)}<span data-np-text></span>${unit}</span>`;
}

function textMetaItem(token: string): string {
  const p = byToken(token);
  if (!p) return "";
  const prefix = token === "label" ? '<em class="np-on">ON</em>' : "";
  return `<span class="np-m" id="np-${token}">${prefix}<b data-np-text></b></span>`;
}

/**
 * Renders every enabled field in the exact order the user arranged them —
 * title and artist included. Consecutive text values collapse into one muted
 * tagline; consecutive chips collapse into one chip row.
 */
function orderedBlocks(state: BuilderState): string {
  const seq = state.fieldOrder.filter((t) => state.shownFields[t]);
  const out: string[] = [];
  let textRun: string[] = [];
  let chipRun: string[] = [];

  const flushText = () => {
    if (textRun.length) {
      out.push(`<div class="np-meta-muted">${textRun.join("")}</div>`);
      textRun = [];
    }
  };
  const flushChips = () => {
    if (chipRun.length) {
      out.push(`<div class="np-chiprow">${chipRun.join("")}</div>`);
      chipRun = [];
    }
  };
  const flushAll = () => {
    flushText();
    flushChips();
  };

  for (const token of seq) {
    if (token === "title") {
      flushAll();
      out.push(titleBlock(state));
    } else if (token === "artist") {
      flushAll();
      out.push(artistRow(state));
    } else if (isChipKind(token)) {
      flushText();
      chipRun.push(chipItem(token));
    } else {
      flushChips();
      textRun.push(textMetaItem(token));
    }
  }
  flushAll();

  return out.filter(Boolean).join("\n      ");
}

/* --------------------------------- body ---------------------------------- */

export function bodyHtml(state: BuilderState): string {
  const layout = layoutById(state.layoutId);
  const alignCenter =
    state.align === "center" ||
    layout.id === "card" ||
    layout.id === "stack" ||
    layout.id === "tagged";

  const showArt =
    state.showArtwork && !(layout.id === "minimal" || layout.id === "tagged");

  const artLeft = showArt && layout.art === "left";
  const artRight = showArt && layout.art === "right";
  const artTop = showArt && layout.art === "top";

  // The record always slides away from the text block.
  const artElLeft = artLeft ? coverBlock(state, "dock--l", "l", "r") : "";
  const artElRight = artRight ? coverBlock(state, "dock--r", "r", "l") : "";
  const artElTop = artTop ? coverBlock(state, "dock--t", "t", "r") : "";
  const panel = state.showCardBackground ? " np-panel" : "";

  const textBlock = `
    <div class="np-txt${alignCenter ? " ctr" : ""}">
      ${liveRow(state)}
      ${orderedBlocks(state)}
    </div>`;

  // Assemble based on layout. The root starts hidden and is revealed by the
  // runtime once the first track update arrives.
  let inner: string;
  if (layout.id === "minimal" || layout.id === "tagged") {
    inner = `<div class="np-vec${alignCenter ? " ctr" : ""} is-hidden" id="np-root"><div class="np-center${panel}">${textBlock}</div></div>`;
  } else if (layout.art === "top") {
    inner = `<div class="np-vec ctr is-hidden" id="np-root">
      <div class="np-col ctr${panel}">${artElTop}${textBlock}</div>
    </div>`;
  } else {
    inner = `<div class="np-vec${alignCenter ? " ctr" : ""} is-hidden" id="np-root">
      <div class="np-row${artRight ? " rev" : ""}${panel}">${artElLeft || artElRight}${textBlock}</div>
    </div>`;
  }

  return inner;
}

/* ------------------------------- runtime JS ------------------------------ */

const MOCK_ART =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#4f46e5'/><stop offset='1' stop-color='#ff5c9b'/></linearGradient></defs><rect width='300' height='300' fill='url(#g)'/><circle cx='150' cy='150' r='62' fill='none' stroke='rgba(255,255,255,0.55)' stroke-width='14'/><circle cx='150' cy='150' r='20' fill='rgba(255,255,255,0.9)'/></svg>`
  );

function mockPayload(): string {
  const track: Record<string, unknown> = {
    id: "mock-1",
    title: "Midnight Circuit",
    artist: "Neon District",
    artwork: MOCK_ART,
    label: "Afterdark Records",
    bpm: 126,
    currentBpm: 127.4,
    key: "8A",
    rating: 4,
    length: 402,
    comment: "Peak time weapon",
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
  const hasClock = !!state.shownFields.clock;
  return `
<script>
var npHasTrack = false;
var npHiddenByApp = false;

function npEl(id) { return document.getElementById(id); }

function npPaint() {
  var root = npEl('np-root');
  if (root) root.classList.toggle('is-hidden', !(npHasTrack && !npHiddenByApp));
}

/* Fills [data-np-text] inside the element and hides it when empty. */
function npSetText(id, value) {
  var node = npEl(id);
  if (!node) return;
  var empty = value === undefined || value === null || String(value) === '';
  node.classList.toggle('np-hide', empty);
  if (!empty) {
    var target = node.querySelector('[data-np-text]') || node;
    target.textContent = String(value);
  }
}

function npSetShown(id, on) {
  var node = npEl(id);
  if (node) node.classList.toggle('np-hide', !on);
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
    if (/^\d{1,3}:\d{2}(:\d{2})?$/.test(raw)) return raw;
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

/**
 * Called by Now Playing on every track change.
 * @param track {NowPlayingTrackId}
 */
function onTrackUpdate(track) {
  console.log('[np-theme] onTrackUpdate', track);
  if (!track) return;
  npHasTrack = true;

  npSetText('np-title', track.title);
  npSetText('np-artist', track.artist);
  npSetText('np-label', track.label);
  npSetText('np-comment', track.comment);
  npSetText('np-bpm', track.bpm);
  npSetText('np-currentBpm', track.currentBpm);
  npSetText('np-key', track.key);
  npSetText('np-rating', track.rating);
  npSetText('np-length', npTrackLength(track));

  // Artwork — identical to the official starter: $('#artwork').attr('src', track.artwork)
  var url = track.artwork || '';
  var img = npEl('artwork');
  if (img) {
    /* Chromium blocks "private network" requests: if this page loads from
       localhost:9000, it cannot fetch from 192.168.x.x:9000 unless the server
       explicitly allows PNA (Now Playing does not). Fix: if the artwork URL
       targets the same port as this page (the Now Playing web server), rewrite
       it to a same-origin relative URL. */
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

    img.classList.remove('showArtwork');
    if (url) {
      img.setAttribute('src', url);
      // If the browser served it from cache, 'load' may not re-fire.
      if (img.complete && img.naturalWidth > 0) img.classList.add('showArtwork');
    } else {
      img.removeAttribute('src');
    }
  }

  /* Vinyl mode: paint the record label and slide the disc out with a beat of
     delay so the cover lands first, exactly like the community vinyl themes. */
  var vw = npEl('np-vinyl');
  if (vw) {
    var lab = npEl('np-vinyl-label');
    if (lab) {
      lab.style.backgroundImage = url ? ('url("' + String(url).replace(/"/g, '\\"') + '")') : '';
    }
    vw.classList.remove('show-vinyl');
    void vw.offsetWidth; // force reflow so the slide re-plays per track
    window.clearTimeout(window.npVinylTimer);
    window.npVinylTimer = window.setTimeout(function () {
      vw.classList.add('show-vinyl');
    }, 350);
  }

  npPaint();
}

/** Called when "Hide After" wants the overlay hidden. */
function onHide() {
  npHiddenByApp = true;
  var vw = npEl('np-vinyl');
  if (vw) vw.classList.remove('show-vinyl'); // record tucks back into sleeve
  npPaint();
}

/** Called when "Hide After" wants the overlay shown again. */
function onShow() {
  npHiddenByApp = false;
  var vw = npEl('np-vinyl');
  if (vw && npHasTrack) vw.classList.add('show-vinyl');
  npPaint();
}

/* Belt-and-braces: some loaders look these up on window explicitly. */
window.onTrackUpdate = onTrackUpdate;
window.onHide = onHide;
window.onShow = onShow;
${
  hasClock
    ? `
(function () {
  if (!npEl('np-clock')) return;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var tick = function () {
    var d = new Date();
    npSetText('np-clock', pad(d.getHours()) + ':' + pad(d.getMinutes()));
  };
  tick();
  setInterval(tick, 1000);
})();
`
    : ""
}${
    mock
      ? `
/* Preview bootstrap: sample track so the builder shows the live layout. */
onTrackUpdate(${mockPayload()});
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
  padding:clamp(12px,3vw,34px);transition:opacity .35s ease}
.np-vec.is-hidden{opacity:0}
.np-vec.ctr,.np-center{justify-content:center}
.np-row{display:flex;flex-direction:row;align-items:center;gap:clamp(16px,2.4vw,26px)}
.np-row.rev{flex-direction:row-reverse}
.np-col{display:flex;flex-direction:column}
.np-col.ctr{justify-content:center}
.ctr{text-align:center}
.np-txt{display:flex;flex-direction:column;min-width:0}
.np-txt.ctr{align-items:center}
.np-center{display:flex}
.np-panel{width:fit-content;max-width:100%;padding:var(--np-card-pad,24px);
  border-radius:18px;background:var(--np-card);box-shadow:0 16px 50px rgba(0,0,0,.18)}
.np-hide{display:none!important}

/* ---------- cover ---------- */
.np-dock{flex:0 0 auto}
#cover,.np-art{position:relative;width:var(--np-art-size,150px);height:var(--np-art-size,150px);
  border-radius:var(--np-radii,14px);overflow:hidden;flex:0 0 auto;
  background-color:var(--np-surface);
  background-size:cover;background-position:center;
  box-shadow:0 18px 46px -18px rgba(0,0,0,.55)}
#cover::after,.np-art::after{content:"";position:absolute;inset:0;z-index:2;
  border:1px solid rgba(255,255,255,.12);border-radius:inherit;pointer-events:none}
#artwork{display:block;width:100%;height:100%;max-width:100%;max-height:100%;
  object-fit:cover;border:0;padding:0;margin:0;opacity:0;transition:opacity .6s ease-out}
#artwork.showArtwork{opacity:1}
.np-dock.dock--l{margin-right:0}.np-dock.dock--r{margin-left:0}
.pad-l{margin-right:0}.pad-r{margin-left:0}

/* ---------- vinyl ---------- */
.np-vinyl-wrap{--np-vinyl-out:calc(var(--np-art-size,150px) * .52);position:relative}
.np-vinyl-wrap.vinyl-r{padding-right:var(--np-vinyl-out)}
.np-vinyl-wrap.vinyl-l{padding-left:var(--np-vinyl-out)}
.np-sleeve{position:relative;z-index:2;width:var(--np-art-size,150px);height:var(--np-art-size,150px);
  border-radius:var(--np-radii,14px);overflow:hidden;background-color:var(--np-surface);
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
.np-artist-row{display:flex;align-items:center;gap:9px;margin-top:clamp(7px,1.1vw,12px)}
.np-mark{width:22px;height:2px;background:var(--np-accent);border-radius:2px;flex:none}
.np-artist-row h2{font-size:var(--np-artist,17px);font-weight:600;letter-spacing:.12em;
  text-transform:uppercase;color:var(--np-muted);margin:0}

/* meta (everything that isn't the title or artist) */
.np-live{display:flex;align-items:center;gap:8px;font-size:var(--np-meta,15px);
  font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:var(--np-accent);
  margin-bottom:clamp(8px,1.3vw,14px)}
.np-live i{width:8px;height:8px;border-radius:50%;background:var(--np-accent);
  animation:pl 1.6s infinite}
.np-meta-muted{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;
  margin-top:clamp(6px,1vw,12px);font-size:var(--np-meta,15px);color:var(--np-muted)}
.np-txt.ctr .np-meta-muted,.np-txt.ctr .np-chiprow{justify-content:center}
.np-txt > :first-child{margin-top:0}
.np-m{display:inline-flex;align-items:center;gap:2px;font-size:var(--np-meta,15px)}
.np-m:not(.np-hide) ~ .np-m:not(.np-hide)::before{content:"\\00B7";opacity:.5;margin:0 8px 0 2px}
.np-m b{font-weight:600;color:var(--np-muted)}
.np-on{color:var(--np-accent);font-style:normal;font-weight:700;margin-right:4px}
.np-chiprow{display:flex;flex-wrap:wrap;gap:8px;margin-top:clamp(8px,1.2vw,14px)}
.np-chips{display:flex;flex-wrap:wrap;gap:8px}
.np-chip{display:inline-flex;align-items:center;gap:6px;background:var(--np-chip);
  color:var(--np-text);font-size:var(--np-meta,15px);font-weight:700;
  letter-spacing:.03em;padding:5px 10px;border-radius:100px;white-space:nowrap;
  border:1px solid color-mix(in srgb, var(--np-text) 12%, transparent)}
.np-chip small{opacity:.5;font-size:.72em;font-weight:800;letter-spacing:.08em;margin-left:2px}
.np-ico{opacity:.75;flex:none}

@keyframes pl{0%{box-shadow:0 0 0 0 color-mix(in srgb, var(--np-accent) 55%, transparent)}70%{box-shadow:0 0 0 9px transparent}100%{box-shadow:0 0 0 0 transparent}}

@media (max-width:560px){
  .np-row{flex-direction:column!important;align-items:center;text-align:center}
  .np-row.rev{flex-direction:column!important}
  .np-txt{align-items:center}
}
`;
