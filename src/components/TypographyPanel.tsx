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
  artistVariant,
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
  artistVariant: "regular" | "italic" | "uppercase";
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
    artistVariant?: "regular" | "italic" | "uppercase";
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
        title="Sizing"
        hint="Independent sizes for each text level"
        summary={`Title ${titleSize}px / Artist ${artistSize}px / Detail ${metaSize}px`}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-400">Title scale</span>
            <Slider
              min={10}
              max={100}
              step={1}
              value={titleSize}
              suffix="px"
              label="Title font size"
              onChange={(titleSize) => onPatch({ titleSize })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-400">Artist scale</span>
            <Slider
              min={10}
              max={100}
              step={1}
              value={artistSize}
              suffix="px"
              label="Artist font size"
              onChange={(artistSize) => onPatch({ artistSize })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-400">Detail scale</span>
            <Slider
              min={10}
              max={34}
              value={metaSize}
              suffix="px"
              label="Detail font size"
              onChange={(metaSize) => onPatch({ metaSize })}
            />
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-slate-500">
            Detail controls every non‑title/non‑artist block: the tagline line, the
            "NOW PLAYING" label and all chips together.
          </p>
        </div>
      </Section>

      <Section
        title="Title style"
        hint="Treatment of the track title"
        summary={titleVariant === "italic" ? "Italic" : titleVariant === "uppercase" ? "Uppercase" : "Regular"}
      >
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
      </Section>

      <Section
        title="Artist style"
        hint="Treatment of the artist line"
        summary={artistVariant === "italic" ? "Italic" : artistVariant === "uppercase" ? "Uppercase" : "Regular"}
      >
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
        <p className="px-1 text-[11px] leading-relaxed text-slate-500">
          When title and artist are combined, the artist borrows the title&apos;s
          size and weight so the pair reads as one line.
        </p>
      </Section>
    </div>
  );
}
