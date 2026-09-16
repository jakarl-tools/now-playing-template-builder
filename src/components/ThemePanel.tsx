import type { ReactNode } from "react";
import {
  type BuilderState,
  type CornerStyle,
  type SpectrumStyle,
} from "../data/presets";
import { resolveSurfaceEffects, type SurfaceEffects } from "../data/surfaces";
import { Section, Pills, Slider, Switch } from "./ui";
import { AnimationPanel } from "./AnimationPanel";
import { LayoutPanel } from "./LayoutPanel";

/** Appearance controls for one independently styled background surface. */
function BackgroundBlock({
  title,
  subtitle,
  on,
  color,
  opacity,
  corner,
  effects,
  onToggle,
  onColor,
  onOpacity,
  onCorner,
  onEffects,
  children,
}: {
  title: string;
  subtitle: string;
  on: boolean;
  color: string;
  opacity: number;
  corner: CornerStyle;
  effects: SurfaceEffects;
  onToggle: (v: boolean) => void;
  onColor: (v: string) => void;
  onOpacity: (v: number) => void;
  onCorner: (v: CornerStyle) => void;
  onEffects: (v: SurfaceEffects) => void;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-slate-200">{title}</p>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
        <Switch on={on} onChange={onToggle} label={`${title} background`} />
      </div>

      {on && (
        <div className="space-y-3">
          <ColorField label="Fill colour" value={color} onChange={onColor} ariaLabel={`${title} fill colour`} />
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="text-[13px] text-slate-400">Transparency</span>
            <Slider
              min={0}
              max={100}
              value={100 - opacity}
              suffix="%"
              label={`${title} transparency`}
              onChange={(transparency) => onOpacity(100 - transparency)}
            />
          </div>
          <div>
            <p className="mb-1.5 px-1 text-[11px] uppercase tracking-wide text-slate-500">
              Corners
            </p>
            <Pills<CornerStyle>
              value={corner}
              cols={2}
              onChange={onCorner}
              options={[
                { value: "rounded", label: "Rounded" },
                { value: "square", label: "Square" },
              ]}
            />
          </div>
          {children}
          <div className="space-y-3 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-medium text-slate-300">Border</span>
              <Switch on={effects.borderEnabled} label={`${title} border`}
                onChange={(borderEnabled) => onEffects({ ...effects, borderEnabled })} />
            </div>
            {effects.borderEnabled && (
              <>
                <ColorField label="Border colour" value={effects.borderColor}
                  ariaLabel={`${title} border colour`}
                  onChange={(borderColor) => onEffects({ ...effects, borderColor })} />
                <div className="flex items-center justify-between gap-3 px-1">
                  <span className="text-[12px] text-slate-400">Transparency</span>
                  <Slider min={0} max={100} value={100 - effects.borderOpacity} suffix="%"
                    label={`${title} border transparency`}
                    onChange={(transparency) => onEffects({ ...effects, borderOpacity: 100 - transparency })} />
                </div>
                <div className="flex items-center justify-between gap-3 px-1">
                  <span className="text-[12px] text-slate-400">Thickness</span>
                  <Slider min={1} max={8} value={effects.borderWidth} suffix="px"
                    label={`${title} border thickness`}
                    onChange={(borderWidth) => onEffects({ ...effects, borderWidth })} />
                </div>
              </>
            )}
          </div>
          <div className="space-y-3 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-medium text-slate-300">Drop shadow</span>
              <Switch on={effects.shadowEnabled} label={`${title} drop shadow`}
                onChange={(shadowEnabled) => onEffects({ ...effects, shadowEnabled })} />
            </div>
            {effects.shadowEnabled && (
              <>
                <ColorField label="Shadow colour" value={effects.shadowColor}
                  ariaLabel={`${title} shadow colour`}
                  onChange={(shadowColor) => onEffects({ ...effects, shadowColor })} />
                <div className="flex items-center justify-between gap-3 px-1">
                  <span className="text-[12px] text-slate-400">Transparency</span>
                  <Slider min={0} max={100} value={100 - effects.shadowOpacity} suffix="%"
                    label={`${title} shadow transparency`}
                    onChange={(transparency) => onEffects({ ...effects, shadowOpacity: 100 - transparency })} />
                </div>
                <div className="flex items-center justify-between gap-3 px-1">
                  <span className="text-[12px] text-slate-400">Distance</span>
                  <Slider min={0} max={50} value={effects.shadowDistance} suffix="px"
                    label={`${title} shadow distance`}
                    onChange={(shadowDistance) => onEffects({ ...effects, shadowDistance })} />
                </div>
                <div className="flex items-center justify-between gap-3 px-1">
                  <span className="text-[12px] text-slate-400">Blur</span>
                  <Slider min={0} max={80} value={effects.shadowBlur} suffix="px"
                    label={`${title} shadow blur`}
                    onChange={(shadowBlur) => onEffects({ ...effects, shadowBlur })} />
                </div>
                <div className="flex items-center justify-between gap-3 px-1">
                  <span className="text-[12px] text-slate-400">Angle</span>
                  <Slider min={0} max={360} step={5} value={effects.shadowAngle} suffix="°"
                    label={`${title} shadow angle`}
                    onChange={(shadowAngle) => onEffects({ ...effects, shadowAngle })} />
                </div>
                <p className="text-[11px] text-slate-500">
                  45° points down-right (default). 0° = down, 90° = right.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  ariaLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <span className="text-[13px] text-slate-300">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase text-slate-500">{value}</span>
        <span
          className="relative h-7 w-9 overflow-hidden rounded-md border border-white/15 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-violet-400"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute -inset-2 h-12 w-14 cursor-pointer opacity-0"
            aria-label={ariaLabel ?? `${label} colour`}
          />
        </span>
      </span>
    </label>
  );
}

export function StyleControls({
  state,
  onPatch,
}: {
  state: BuilderState;
  onPatch: (patch: Partial<BuilderState>) => void;
}) {
  const activeBackgrounds = [
    state.showCardBackground && "Full card",
    state.showTitleBackground && "Title plate",
    state.showArtistBackground && "Artist plate",
  ].filter(Boolean);

  return (
    <div>
      <Section title="Colours" hint="Text, accents and chips" summary="4 editable colours" defaultOpen>
        <div className="divide-y divide-white/5">
          <ColorField label="Title / chip text" value={state.textColor} onChange={(textColor) => onPatch({ textColor })} />
          <ColorField label="Artist / detail text" value={state.mutedColor} onChange={(mutedColor) => onPatch({ mutedColor })} />
          <ColorField label="Accent / live / artwork" value={state.accentColor} onChange={(accentColor) => onPatch({ accentColor })} />
          <ColorField label="Chip background" value={state.chipColor} onChange={(chipColor) => onPatch({ chipColor })} />
        </div>
      </Section>

      <AnimationPanel value={state.animation} onChange={(animation) => onPatch({ animation })} />

      <Section
        title="Backgrounds"
        hint="Fills, borders, shadows and corners"
        summary={activeBackgrounds.length ? activeBackgrounds.join(", ") : "All backgrounds off"}
      >
        <div className="divide-y divide-white/10">
          <BackgroundBlock
            title="Full card"
            subtitle="Fits tightly around artwork and text"
            on={state.showCardBackground}
            color={state.cardColor}
            opacity={state.cardOpacity}
            corner={state.cardCorner}
            effects={resolveSurfaceEffects(state.cardEffects, "card")}
            onToggle={(showCardBackground) => onPatch({ showCardBackground })}
            onColor={(cardColor) => onPatch({ cardColor })}
            onOpacity={(cardOpacity) => onPatch({ cardOpacity })}
            onCorner={(cardCorner) => onPatch({ cardCorner })}
            onEffects={(cardEffects) => onPatch({ cardEffects })}
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <span className="text-[13px] text-slate-400">Inside gap</span>
              <Slider
                min={0}
                max={80}
                value={state.cardPadding}
                suffix="px"
                label="Full card inside gap"
                onChange={(cardPadding) => onPatch({ cardPadding })}
              />
            </div>
            <p className="px-1 text-[11px] leading-relaxed text-slate-500">
              Inside gap is the space between the card edge and the nearest overlay element.
            </p>
            <div className="space-y-3 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="block text-[12px] text-slate-300">Border pulse</span>
                  <span className="block text-[11px] text-slate-500">
                    A light in the accent colour sweeps around the card edge
                  </span>
                </div>
                <Switch on={!!state.cardPulse} label="Border pulse"
                  onChange={(cardPulse) => onPatch({ cardPulse })} />
              </div>
              {state.cardPulse && (
                <div role="group" aria-label="Pulse direction">
                  <p className="mb-1.5 text-[11px] text-slate-400">Direction</p>
                  <Pills<"cw" | "ccw">
                    value={state.cardPulseDirection ?? "cw"}
                    cols={2}
                    onChange={(cardPulseDirection) => onPatch({ cardPulseDirection })}
                    options={[
                      { value: "cw", label: "Clockwise" },
                      { value: "ccw", label: "Anti-clockwise" },
                    ]}
                  />
                </div>
              )}
            </div>
          </BackgroundBlock>

          <BackgroundBlock
            title="Title plate"
            subtitle="Hugs just the track title text"
            on={state.showTitleBackground}
            color={state.titleBgColor}
            opacity={state.titleBgOpacity}
            corner={state.titleBgCorner}
            effects={resolveSurfaceEffects(state.titleBgEffects, "title")}
            onToggle={(showTitleBackground) => onPatch({ showTitleBackground })}
            onColor={(titleBgColor) => onPatch({ titleBgColor })}
            onOpacity={(titleBgOpacity) => onPatch({ titleBgOpacity })}
            onCorner={(titleBgCorner) => onPatch({ titleBgCorner })}
            onEffects={(titleBgEffects) => onPatch({ titleBgEffects })}
          />

          <BackgroundBlock
            title="Artist plate"
            subtitle="Hugs just the artist line"
            on={state.showArtistBackground}
            color={state.artistBgColor}
            opacity={state.artistBgOpacity}
            corner={state.artistBgCorner}
            effects={resolveSurfaceEffects(state.artistBgEffects, "artist")}
            onToggle={(showArtistBackground) => onPatch({ showArtistBackground })}
            onColor={(artistBgColor) => onPatch({ artistBgColor })}
            onOpacity={(artistBgOpacity) => onPatch({ artistBgOpacity })}
            onCorner={(artistBgCorner) => onPatch({ artistBgCorner })}
            onEffects={(artistBgEffects) => onPatch({ artistBgEffects })}
          />
        </div>
      </Section>

      <LayoutPanel state={state} onPatch={onPatch} />
      <Section
        title="Spectrum wave"
        hint="Animated bars below the track details"
        summary={state.showSpectrum
          ? `${state.spectrumStyle === "center" ? "Centre" : "Bottom up"} · ${state.spectrumHeight ?? 30}px · ${state.spectrumSpeed ?? 1}x`
          : "Off"}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] text-slate-300">Show spectrum wave</p>
              <p className="text-[11px] text-slate-500">40 bars in your accent gradient</p>
            </div>
            <Switch
              on={!!state.showSpectrum}
              label="Show spectrum wave"
              onChange={(showSpectrum) => onPatch({ showSpectrum })}
            />
          </div>
          {state.showSpectrum && (
            <>
              <div role="group" aria-label="Spectrum animation style">
                <p className="mb-1.5 text-[11px] text-slate-400">Animation</p>
                <Pills<SpectrumStyle>
                  value={state.spectrumStyle ?? "bottom"}
                  cols={2}
                  onChange={(spectrumStyle) => onPatch({ spectrumStyle })}
                  options={[
                    { value: "bottom", label: "Bottom up" },
                    { value: "center", label: "Centre" },
                  ]}
                />
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  Bottom up grows each bar from the baseline; Centre mirrors the bars
                  around the middle line.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-slate-400">Height</span>
                <Slider min={16} max={80} step={2} value={state.spectrumHeight ?? 30} suffix="px"
                  label="Spectrum height" onChange={(spectrumHeight) => onPatch({ spectrumHeight })} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-slate-400">Speed</span>
                <Slider min={0.5} max={2} step={0.1} value={state.spectrumSpeed ?? 1} suffix="x"
                  label="Spectrum speed" onChange={(spectrumSpeed) => onPatch({ spectrumSpeed })} />
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Decorative motion, like the example; not live audio analysis. Works
                with or without artwork or vinyl, pauses when hidden, and respects reduced motion.
              </p>
            </>
          )}
        </div>
      </Section>
    </div>
  );
}