import { LAYOUTS, type BuilderState, type LayoutId } from "../data/presets";
import { Section, Pills, Slider, Switch } from "./ui";

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2">
      <span className="text-[13px] text-slate-300">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase text-slate-500">{value}</span>
        <span
          className="relative h-7 w-9 overflow-hidden rounded-md border border-white/15 shadow-inner"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute -inset-2 h-12 w-14 cursor-pointer opacity-0"
            aria-label={`${label} colour`}
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
  return (
    <div className="space-y-5">
      <Section title="Colours" hint="used by the exported overlay">
        <div className="space-y-1.5">
          <ColorField label="Title / chip text" value={state.textColor} onChange={(textColor) => onPatch({ textColor })} />
          <ColorField label="Artist / detail text" value={state.mutedColor} onChange={(mutedColor) => onPatch({ mutedColor })} />
          <ColorField label="Accent / live indicator" value={state.accentColor} onChange={(accentColor) => onPatch({ accentColor })} />
          <ColorField label="Chip background" value={state.chipColor} onChange={(chipColor) => onPatch({ chipColor })} />
          <ColorField label="Artwork fallback" value={state.artworkColor} onChange={(artworkColor) => onPatch({ artworkColor })} />
        </div>
      </Section>

      <Section title="Fitted background" hint="wraps the complete overlay">
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-slate-200">Coloured background card</p>
              <p className="text-[11px] text-slate-500">Fits tightly around artwork and text</p>
            </div>
            <Switch
              on={state.showCardBackground}
              onChange={(showCardBackground) => onPatch({ showCardBackground })}
            />
          </div>

          {state.showCardBackground && (
            <div className="space-y-3 border-t border-white/10 pt-3">
              <ColorField label="Card colour" value={state.cardColor} onChange={(cardColor) => onPatch({ cardColor })} />
              <div className="flex items-center justify-between gap-3 px-1">
                <span className="text-[13px] text-slate-400">Transparency</span>
                <Slider
                  min={0}
                  max={100}
                  value={100 - state.cardOpacity}
                  suffix="%"
                  onChange={(transparency) => onPatch({ cardOpacity: 100 - transparency })}
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-1">
                <span className="text-[13px] text-slate-400">Inside gap</span>
                <Slider
                  min={0}
                  max={80}
                  value={state.cardPadding}
                  suffix="px"
                  onChange={(cardPadding) => onPatch({ cardPadding })}
                />
              </div>
              <p className="px-1 text-[11px] leading-relaxed text-slate-500">
                Inside gap is the space between the card edge and the nearest overlay element.
              </p>
            </div>
          )}
        </div>
      </Section>

      <Section title="Layout">
        <Pills<LayoutId>
          value={state.layoutId}
          cols={2}
          onChange={(layoutId) => onPatch({ layoutId })}
          options={LAYOUTS.map((layout) => ({
            value: layout.id,
            label: (
              <span>
                <span className="block text-[13px]">{layout.name}</span>
                <span className="block text-[10px] font-normal normal-case opacity-60">
                  {layout.tagline}
                </span>
              </span>
            ),
          }))}
        />
      </Section>
    </div>
  );
}