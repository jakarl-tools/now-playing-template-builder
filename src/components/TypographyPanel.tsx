import { useEffect } from "react";
import {
  FONTS,
  GOOGLE_SUGGESTIONS,
  GOOGLE_WEIGHT_SETS,
  googleFontUrl,
  type FontMode,
} from "../data/presets";
import { Section, Pills, Slider } from "./ui";

/** Loads a Google family into the *builder* document so previews match. */
export function useGoogleFontPreview(family: string, weights: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const url = googleFontUrl(family, weights);
    if (!url) return;
    const id = "gf-" + url;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }, [family, weights, enabled]);
}

/** Loads user-supplied CSS (URL or raw @font-face) into the builder document. */
function useCustomFontPreview(css: string, enabled: boolean) {
  useEffect(() => {
    const id = "np-custom-font-preview";
    document.getElementById(id)?.remove();
    const raw = css.trim();
    if (!enabled || !raw) return;
    const timer = window.setTimeout(() => {
      let el: HTMLElement;
      if (/^https?:\/\//i.test(raw)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = raw;
        el = link;
      } else {
        const style = document.createElement("style");
        style.textContent = raw;
        el = style;
      }
      el.id = id;
      document.head.appendChild(el);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [css, enabled]);
}

/** Tracking defaults, mirrored from resolveCssVars in makeTemplate.ts. */
const TITLE_TRACKING_DEFAULT = -0.018;
const artistTrackingDefault = (variant: "regular" | "italic" | "uppercase") =>
  variant === "uppercase" ? 0.12 : -0.01;

/** Font-size slider, shared by the title, artist and detail sections. */
function ScaleRow({
  label,
  ariaLabel,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-slate-400">{label}</span>
      <Slider min={min} max={max} step={1} value={value} suffix="px" label={ariaLabel} onChange={onChange} />
    </div>
  );
}

/** Stroke-weight slider, 100–900. */
function WeightRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-slate-400">{label}</span>
      <Slider min={100} max={900} step={50} value={value} label={label} onChange={onChange} />
    </div>
  );
}

/**
 * Letter-spacing slider. `value` null means "follow the style default", which
 * keeps the built-in tracking until the user actually drags the slider.
 */
function TrackingRow({
  label,
  value,
  autoValue,
  onChange,
}: {
  label: string;
  value: number | null;
  autoValue: number;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <Slider
          min={-0.1}
          max={0.4}
          step={0.002}
          value={value ?? autoValue}
          suffix="em"
          label={label}
          onChange={onChange}
        />
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            title="Reset to the style default"
            aria-label={`Reset ${label} to the style default`}
            className="text-[10px] font-medium uppercase tracking-wide text-slate-500 transition hover:text-slate-300"
          >
            Auto
          </button>
        )}
      </div>
    </div>
  );
}

export function TypographyPanel({
  fontMode,
  fontId,
  googleFamily,
  googleWeights,
  customStack,
  customCss,
  titleSize,
  artistSize,
  metaSize,
  titleVariant,
  titleWeight,
  titleTracking,
  artistVariant,
  artistWeight,
  artistTracking,
  onPatch,
}: {
  fontMode: FontMode;
  fontId: string;
  googleFamily: string;
  googleWeights: string;
  customStack: string;
  customCss: string;
  titleSize: number;
  artistSize: number;
  metaSize: number;
  titleVariant: string;
  /** Stroke weight, 100–900. */
  titleWeight: number;
  /** null = the built-in default tracking. */
  titleTracking: number | null;
  artistVariant: "regular" | "italic" | "uppercase";
  /** Stroke weight, 100–900. */
  artistWeight: number;
  /** null = tracking derived from the artist style. */
  artistTracking: number | null;
  onPatch: (p: {
    fontMode?: FontMode;
    fontId?: string;
    googleFamily?: string;
    googleWeights?: string;
    customStack?: string;
    customCss?: string;
    titleSize?: number;
    artistSize?: number;
    metaSize?: number;
    titleVariant?: string;
    titleWeight?: number;
    titleTracking?: number | null;
    artistVariant?: "regular" | "italic" | "uppercase";
    artistWeight?: number;
    artistTracking?: number | null;
  }) => void;
}) {
  useGoogleFontPreview(googleFamily, googleWeights, fontMode === "google");
  useCustomFontPreview(customCss, fontMode === "custom");

  return (
    <div>
      <Section
        title="Font family"
        hint="Preset, Google or custom fonts"
        summary={fontMode === "google" ? googleFamily || "Choose a Google font" : fontMode === "custom" ? customStack || "Custom font" : FONTS.find((font) => font.id === fontId)?.label}
        defaultOpen
      >
        <Pills<FontMode>
          value={fontMode}
          cols={3}
          onChange={(fontMode) => onPatch({ fontMode })}
          options={[
            { value: "preset", label: "Presets" },
            { value: "google", label: "Google" },
            { value: "custom", label: "Custom" },
          ]}
        />

        {fontMode === "preset" && (
          <div className="grid grid-cols-2 gap-1.5">
            {FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onPatch({ fontId: f.id })}
                aria-pressed={f.id === fontId}
                className={
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-left transition " +
                  (f.id === fontId
                    ? "border-violet-500/60 bg-violet-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20")
                }
              >
                <span className="text-[13px] text-slate-200">{f.label.split(" (")[0]}</span>
                <span className="text-base text-slate-400" style={{ fontFamily: f.stack }}>
                  Aa
                </span>
              </button>
            ))}
          </div>
        )}

        {fontMode === "google" && (
          <div className="mt-2 space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">
                Family name
              </label>
              <input
                value={googleFamily}
                spellCheck={false}
                aria-label="Google font family"
                onChange={(e) => onPatch({ googleFamily: e.target.value })}
                placeholder="e.g. Bebas Neue"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[13px] text-white outline-none placeholder:text-slate-600 focus:border-violet-500/60"
              />
              <div
                className="mt-2 truncate rounded-lg bg-black/30 px-3 py-2 text-2xl text-slate-200"
                style={{ fontFamily: `'${googleFamily}', Inter, sans-serif` }}
              >
                At Night
              </div>
              <p className="mt-2 break-all text-[10px] leading-relaxed text-slate-600">
                {googleFontUrl(googleFamily, googleWeights) || "— enter a family —"}
              </p>
            </div>

            <div>
              <p className="mb-1.5 px-1 text-[11px] uppercase tracking-wider text-slate-500">
                Weights
              </p>
              <Pills
                value={googleWeights}
                cols={2}
                onChange={(googleWeights) => onPatch({ googleWeights })}
                options={GOOGLE_WEIGHT_SETS.map((w) => ({
                  value: w.id,
                  label: w.label,
                }))}
              />
            </div>

            <div>
              <p className="mb-1.5 px-1 text-[11px] uppercase tracking-wider text-slate-500">
                Popular on stream
              </p>
              <div className="flex flex-wrap gap-1.5">
                {GOOGLE_SUGGESTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onPatch({ googleFamily: g })}
                    className={
                      "rounded-md border px-2 py-1 text-[11px] transition " +
                      (g.toLowerCase() === googleFamily.trim().toLowerCase()
                        ? "border-violet-500/60 bg-violet-500/15 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200")
                    }
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {fontMode === "custom" && (
          <div className="mt-2 space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">
                font-family stack
              </label>
              <input
                value={customStack}
                spellCheck={false}
                aria-label="Custom font family stack"
                onChange={(e) => onPatch({ customStack: e.target.value })}
                placeholder="'My Font', Inter, sans-serif"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12px] text-white outline-none placeholder:text-slate-600 focus:border-violet-500/60"
              />
              <div
                className="mt-2 truncate rounded-lg bg-black/30 px-3 py-2 text-2xl text-slate-200"
                style={{ fontFamily: customStack || "inherit" }}
              >
                At Night
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">
                Stylesheet URL or @font-face CSS
              </label>
              <textarea
                value={customCss}
                spellCheck={false}
                aria-label="Custom font stylesheet URL or CSS"
                rows={5}
                onChange={(e) => onPatch({ customCss: e.target.value })}
                placeholder={`https://use.typekit.net/abc123.css

— or paste raw CSS —

@font-face {
  font-family: 'My Font';
  src: url('https://cdn.site/myfont.woff2') format('woff2');
}`}
                className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-white outline-none placeholder:text-slate-600 focus:border-violet-500/60"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                A bare URL is wrapped in <code className="text-sky-200">@import</code>{" "}
                automatically. Local file paths won&apos;t load — host the font or use a
                base64 <code className="text-sky-200">src:</code> data URI.
              </p>
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Title style"
        hint="Size, treatment and spacing of the track title"
        summary={`${titleSize}px · ${titleVariant === "italic" ? "Italic" : titleVariant === "uppercase" ? "Uppercase" : "Regular"} · ${titleWeight}${titleTracking === null ? "" : ` · ${titleTracking}em`}`}
      >
        <ScaleRow
          label="Scale"
          ariaLabel="Title font size"
          value={titleSize}
          min={10}
          max={100}
          onChange={(titleSize) => onPatch({ titleSize })}
        />
        <Pills
          value={titleVariant}
          cols={3}
          onChange={(titleVariant) => onPatch({ titleVariant })}
          options={[
            { value: "regular", label: "Regular" },
            { value: "italic", label: "Italic" },
            { value: "uppercase", label: "Uppercase" },
          ]}
        />
        <WeightRow
          label="Weight"
          value={titleWeight}
          onChange={(titleWeight) => onPatch({ titleWeight })}
        />
        <TrackingRow
          label="Letter spacing"
          value={titleTracking}
          autoValue={TITLE_TRACKING_DEFAULT}
          onChange={(v) =>
            onPatch({ titleTracking: v === null ? null : Math.round(v * 1000) / 1000 })
          }
        />
      </Section>

      <Section
        title="Artist style"
        hint="Size, treatment and spacing of the artist line"
        summary={`${artistSize}px · ${artistVariant === "italic" ? "Italic" : artistVariant === "uppercase" ? "Uppercase" : "Regular"} · ${artistWeight}${artistTracking === null ? "" : ` · ${artistTracking}em`}`}
      >
        <ScaleRow
          label="Scale"
          ariaLabel="Artist font size"
          value={artistSize}
          min={10}
          max={100}
          onChange={(artistSize) => onPatch({ artistSize })}
        />
        <Pills
          value={artistVariant}
          cols={3}
          onChange={(artistVariant) => onPatch({ artistVariant })}
          options={[
            { value: "regular", label: "Regular" },
            { value: "italic", label: "Italic" },
            { value: "uppercase", label: "Uppercase" },
          ]}
        />
        <WeightRow
          label="Weight"
          value={artistWeight}
          onChange={(artistWeight) => onPatch({ artistWeight })}
        />
        <TrackingRow
          label="Letter spacing"
          value={artistTracking}
          autoValue={artistTrackingDefault(artistVariant)}
          onChange={(v) =>
            onPatch({ artistTracking: v === null ? null : Math.round(v * 1000) / 1000 })
          }
        />
        <p className="px-1 text-[11px] leading-relaxed text-slate-500">
          When title and artist are combined, the artist borrows the title&apos;s
          size, weight and spacing so the pair reads as one line.
        </p>
      </Section>

      <Section
        title="Detail"
        hint="Size of the tagline, label and chips"
        summary={`${metaSize}px`}
      >
        <ScaleRow
          label="Scale"
          ariaLabel="Detail font size"
          value={metaSize}
          min={10}
          max={34}
          onChange={(metaSize) => onPatch({ metaSize })}
        />
        <p className="px-1 text-[11px] leading-relaxed text-slate-500">
          Controls every non‑title/non‑artist block: the tagline line, the
          "NOW PLAYING" label and all chips together.
        </p>
      </Section>
    </div>
  );
}
