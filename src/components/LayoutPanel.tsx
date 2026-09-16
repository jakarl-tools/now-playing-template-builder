import type { ArtPosition, ArtworkShape, BuilderState, TextAlign } from "../data/presets";
import { Pills, Section, Slider, Switch } from "./ui";

function ArtworkStyleIcon({ vinyl }: { vinyl: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      {vinyl ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5.5" opacity=".55" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="12" cy="12" r="4" />
        </>
      )}
    </svg>
  );
}

export function LayoutPanel({ state, onPatch }: {
  state: BuilderState;
  onPatch: (patch: Partial<BuilderState>) => void;
}) {
  const sideArtwork = state.showArtwork && (state.artPosition === "left" || state.artPosition === "right");
  const textAlignment = state.align === "center" ? "Centre" : state.align === "right" ? "Right" : "Left";
  const artworkSummary = state.showArtwork
    ? `${state.artStyle === "vinyl" ? "Vinyl" : "Sleeve"} ${state.artPosition}, ${state.artworkScale}x`
    : "Hidden";
  const dividerSummary = !sideArtwork ? "Requires left or right artwork"
    : state.showArtworkDivider ? `${state.artworkDividerWidth ?? 3}px / accent colour` : "Off";

  return (
    <Section title="Layout" hint="Artwork, divider and text alignment"
      summary={`${state.showArtwork ? artworkSummary : "Text only"} / ${textAlignment.toLowerCase()} text`}>
      <div className="border-l border-white/10 pl-2">
        <Section title="Artwork" hint="Visibility, position, shape and style"
          summary={artworkSummary} nested defaultOpen>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] text-slate-300">Show artwork</p>
              <p className="text-[11px] text-slate-500">Cover art supplied by Now Playing</p>
            </div>
            <Switch on={state.showArtwork} label="Show artwork"
              onChange={(showArtwork) => onPatch({ showArtwork })} />
          </div>

          {state.showArtwork && (
            <>
              <div role="group" aria-label="Artwork position">
                <p className="mb-1.5 text-[11px] text-slate-400">Position</p>
                <Pills<ArtPosition>
                  value={state.artPosition}
                  cols={4}
                  onChange={(artPosition) => onPatch({ artPosition })}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "right", label: "Right" },
                    { value: "top", label: "Top" },
                    { value: "bottom", label: "Bottom" },
                  ]}
                />
              </div>

              <div role="group" aria-label="Artwork alignment">
                <p className="mb-1.5 text-[11px] text-slate-400">Alignment against text</p>
                {sideArtwork ? (
                  <Pills<"top" | "center" | "bottom">
                    value={state.artAlignY}
                    cols={3}
                    onChange={(artAlignY) => onPatch({ artAlignY })}
                    options={[
                      { value: "top", label: "Top" },
                      { value: "center", label: "Centre" },
                      { value: "bottom", label: "Bottom" },
                    ]}
                  />
                ) : (
                  <Pills<"left" | "center" | "right">
                    value={state.artAlignX}
                    cols={3}
                    onChange={(artAlignX) => onPatch({ artAlignX })}
                    options={[
                      { value: "left", label: "Left" },
                      { value: "center", label: "Centre" },
                      { value: "right", label: "Right" },
                    ]}
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-slate-400">Size</span>
                <Slider min={1} max={2} step={0.1} value={state.artworkScale} suffix="x"
                  label="Artwork size multiplier" onChange={(artworkScale) => onPatch({ artworkScale })} />
              </div>

              <div role="group" aria-label="Artwork shape">
                <p className="mb-1.5 text-[11px] text-slate-400">Shape</p>
                <Pills<ArtworkShape>
                  value={state.artworkShape ?? "rounded"}
                  cols={3}
                  onChange={(artworkShape) => onPatch({ artworkShape })}
                  options={[
                    { value: "square", label: "Square" },
                    { value: "rounded", label: "Rounded" },
                    { value: "circle", label: "Circle" },
                  ]}
                />
              </div>

              <div role="group" aria-label="Artwork style">
                <p className="mb-1.5 text-[11px] text-slate-400">Style</p>
                <Pills<"sleeve" | "vinyl">
                  value={state.artStyle}
                  cols={2}
                  onChange={(artStyle) => onPatch({ artStyle })}
                  options={[
                    { value: "sleeve", label: <span className="flex items-center justify-center gap-2"><ArtworkStyleIcon vinyl={false} />Sleeve</span> },
                    { value: "vinyl", label: <span className="flex items-center justify-center gap-2"><ArtworkStyleIcon vinyl />Vinyl</span> },
                  ]}
                />
                {state.artStyle === "vinyl" && (
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                    A spinning record slides out on each track change and tucks back in when the overlay hides.
                  </p>
                )}
              </div>
            </>
          )}
        </Section>

        <Section title="Vertical divider" hint="Accent bar between artwork and text"
          summary={dividerSummary} nested>
          {sideArtwork ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-slate-300">Show divider</span>
                <Switch on={!!state.showArtworkDivider} label="Artwork and text divider"
                  onChange={(showArtworkDivider) => onPatch({ showArtworkDivider })} />
              </div>
              {state.showArtworkDivider && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-slate-400">Thickness</span>
                    <Slider min={2} max={12} value={state.artworkDividerWidth ?? 3} suffix="px"
                      label="Artwork divider thickness"
                      onChange={(artworkDividerWidth) => onPatch({ artworkDividerWidth })} />
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Uses the accent colour. Corners follow the artwork shape.
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="text-[11px] leading-relaxed text-slate-500">
              Show artwork on the left or right to use the vertical divider. Your divider settings are kept when artwork is hidden or moved.
            </p>
          )}
        </Section>

        <Section title="Text justification" hint="Align all text and the shared metadata row"
          summary={textAlignment} nested>
          <Pills<TextAlign>
            value={state.align}
            cols={3}
            onChange={(align) => onPatch({ align })}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Centre" },
              { value: "right", label: "Right" },
            ]}
          />
        </Section>
      </div>
    </Section>
  );
}