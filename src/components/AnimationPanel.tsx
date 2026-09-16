import { useId } from "react";
import {
  DIRECTIONAL_EFFECTS,
  EFFECT_LABELS,
  effectiveExit,
  resolveAnimationSettings,
  type AnimationDirection,
  type AnimationEffect,
  type AnimationPhase,
  type AnimationSequence,
  type AnimationSettings,
  type ExitMode,
} from "../data/animations";

const EFFECT_ORDER: AnimationEffect[] = [
  "none",
  "fade",
  "slide",
  "slideOnly",
  "scale",
  "blur",
  "flip",
];
import { Pills, Section, Slider, Switch } from "./ui";

function PhaseControls({ phase, value, onChange, hideLegend = false }: {
  phase: "Entrance" | "Exit";
  value: AnimationPhase;
  onChange: (patch: Partial<AnimationPhase>) => void;
  hideLegend?: boolean;
}) {
  const id = useId();
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className={hideLegend ? "sr-only" : "mb-2 text-[13px] font-semibold text-slate-200"}>
        {phase}
      </legend>
      <div role="group" aria-label={`${phase} effect`}>
        <Pills<AnimationEffect>
          value={value.effect}
          cols={3}
          onChange={(effect) => onChange({ effect })}
          options={EFFECT_ORDER.map((effect) => ({
            value: effect,
            label: EFFECT_LABELS[effect],
          }))}
        />
      </div>
      {value.effect !== "none" && (
        <>
          {DIRECTIONAL_EFFECTS.includes(value.effect) && (
            <div role="group" aria-labelledby={`${id}-direction`}>
              <p id={`${id}-direction`} className="mb-1.5 text-[11px] text-slate-400">
                {value.effect === "flip"
                  ? "Axis"
                  : phase === "Entrance"
                    ? "Enter from"
                    : "Exit towards"}
              </p>
              <Pills<AnimationDirection>
                value={value.direction}
                cols={4}
                onChange={(direction) => onChange({ direction })}
                options={[
                  { value: "left", label: "Left" },
                  { value: "right", label: "Right" },
                  { value: "top", label: "Top" },
                  { value: "bottom", label: "Bottom" },
                ]}
              />
            </div>
          )}
          <div role="group" aria-labelledby={`${id}-sequence`}>
            <p id={`${id}-sequence`} className="mb-1.5 text-[11px] text-slate-400">Sequence</p>
            <Pills<AnimationSequence>
              value={value.sequence}
              cols={2}
              onChange={(sequence) => onChange({ sequence })}
              options={[
                { value: "together", label: "All together" },
                { value: "staggered", label: "Staged per item" },
              ]}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-slate-400">Duration</span>
            <Slider min={100} max={3000} step={50} value={value.duration} suffix="ms"
              label={`${phase} duration`} onChange={(duration) => onChange({ duration })} />
          </div>
          {value.sequence === "staggered" && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] text-slate-400">Between items</span>
              <Slider min={0} max={300} step={10} value={value.stagger} suffix="ms"
                label={`${phase} stagger delay`} onChange={(stagger) => onChange({ stagger })} />
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}

export function AnimationPanel({ value, onChange }: {
  value: AnimationSettings;
  onChange: (value: AnimationSettings) => void;
}) {
  const settings = resolveAnimationSettings(value);
  const exit = effectiveExit(settings);
  const summary = (phase: AnimationPhase) => {
    const effect = DIRECTIONAL_EFFECTS.includes(phase.effect)
      ? `${EFFECT_LABELS[phase.effect]} ${phase.direction}`
      : EFFECT_LABELS[phase.effect];
    return phase.effect !== "none" && phase.sequence === "staggered" ? `${effect}, staged` : effect;
  };
  const outSummary =
    settings.exitMode === "reverse" ? `${summary(exit)} (reversed)` : summary(exit);

  return (
    <Section title="Animations" hint="Entrance, exit and item sequencing"
      summary={`In: ${summary(settings.entrance)} / Out: ${outSummary}`}>
      <div className="space-y-4">
        <PhaseControls phase="Entrance" value={settings.entrance}
          onChange={(patch) => onChange({ ...settings, entrance: { ...settings.entrance, ...patch } })} />
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div role="group" aria-label="Exit mode">
            <p className="mb-2 text-[13px] font-semibold text-slate-200">Exit</p>
            <Pills<ExitMode>
              value={settings.exitMode}
              cols={2}
              onChange={(exitMode) => onChange({ ...settings, exitMode })}
              options={[
                { value: "reverse", label: "Reverse entrance" },
                { value: "custom", label: "Custom" },
              ]}
            />
          </div>
          {settings.exitMode === "reverse" ? (
            <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-slate-400">
              Plays the entrance backwards, so items retrace exactly how they came in
              {settings.entrance.effect !== "none" && (
                <>
                  : <span className="text-slate-200">{summary(exit)}</span>, {exit.duration}ms
                  {exit.sequence === "staggered" && `, ${exit.stagger}ms between items`}
                </>
              )}
              . Changes to the entrance carry over automatically.
            </p>
          ) : (
            <PhaseControls phase="Exit" value={settings.exit} hideLegend
              onChange={(patch) => onChange({ ...settings, exit: { ...settings.exit, ...patch } })} />
          )}
        </div>
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] text-slate-300">Animate track changes</p>
              <p className="text-[11px] text-slate-500">Exit the old track, then bring in the new one</p>
            </div>
            <Switch on={settings.animateTrackChanges} label="Animate track changes"
              onChange={(animateTrackChanges) => onChange({ ...settings, animateTrackChanges })} />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Staging follows the visible items; exit reverses the sequence. Empty fields are skipped.
            Use Show, Hide or Replay Cycle beside Live Preview to try it. Reduced-motion preferences are respected.
          </p>
        </div>
      </div>
    </Section>
  );
}