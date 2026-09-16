export type AnimationEffect =
  | "none"
  | "fade"
  | "slide"
  | "slideOnly"
  | "scale"
  | "blur"
  | "flip";
export type AnimationDirection = "left" | "right" | "top" | "bottom";
export type AnimationSequence = "together" | "staggered";

/** Effects that need a direction (travel along, or rotate about, an axis). */
export const DIRECTIONAL_EFFECTS: AnimationEffect[] = ["slide", "slideOnly", "flip"];

export const EFFECT_LABELS: Record<AnimationEffect, string> = {
  none: "None",
  fade: "Fade",
  slide: "Slide + fade",
  slideOnly: "Slide only",
  scale: "Scale",
  blur: "Blur",
  flip: "Flip",
};

const EFFECTS = Object.keys(EFFECT_LABELS) as AnimationEffect[];

export interface AnimationPhase {
  effect: AnimationEffect;
  direction: AnimationDirection;
  sequence: AnimationSequence;
  duration: number;
  stagger: number;
}

/**
 * "custom"  — the exit phase is configured independently.
 * "reverse" — the exit is derived from the entrance and plays it backwards:
 *             same effect, opposite direction, same timing. Kept as a mode
 *             rather than copied values so it tracks later entrance edits.
 */
export type ExitMode = "custom" | "reverse";

export interface AnimationSettings {
  entrance: AnimationPhase;
  exit: AnimationPhase;
  exitMode: ExitMode;
  animateTrackChanges: boolean;
}

export const DEFAULT_ANIMATIONS: AnimationSettings = {
  // The card slides in from the left and the exit retraces that path, so the
  // overlay leaves the way it arrived by default.
  entrance: { effect: "slideOnly", direction: "left", sequence: "together", duration: 400, stagger: 90 },
  // Inert while exitMode is "reverse"; these are the values the exit reverts to
  // if the mode is switched to "custom".
  exit: { effect: "fade", direction: "right", sequence: "together", duration: 350, stagger: 70 },
  exitMode: "reverse",
  animateTrackChanges: true,
};

/**
 * The exit that actually plays. In reverse mode the item retraces its
 * entrance exactly, ending back where it started.
 *
 * Direction is a *position* — the hidden spot an item occupies when it is
 * out of view. Entering from `bottom` means it rose up from below; to
 * retrace that it must sink back down to the same spot, so the direction is
 * kept identical. (The exit's visible→hidden keyframe order is already the
 * mirror of the entrance, and the controller reverses staged order on exit,
 * so the whole phase can be reused as-is.)
 */
export function effectiveExit(settings: AnimationSettings): AnimationPhase {
  return settings.exitMode === "reverse" ? settings.entrance : settings.exit;
}

function bounded(value: number | undefined, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function resolvePhase(value: Partial<AnimationPhase> | undefined, fallback: AnimationPhase): AnimationPhase {
  return {
    effect: value?.effect && EFFECTS.includes(value.effect)
      ? value.effect : fallback.effect,
    direction: value?.direction === "left" || value?.direction === "right" || value?.direction === "top" || value?.direction === "bottom"
      ? value.direction : fallback.direction,
    sequence: value?.sequence === "together" || value?.sequence === "staggered"
      ? value.sequence : fallback.sequence,
    duration: bounded(value?.duration, fallback.duration, 100, 3000),
    stagger: bounded(value?.stagger, fallback.stagger, 0, 300),
  };
}

// Old builder state can survive hot reload without these newly added settings.
export function resolveAnimationSettings(value?: Partial<AnimationSettings>): AnimationSettings {
  return {
    entrance: resolvePhase(value?.entrance, DEFAULT_ANIMATIONS.entrance),
    exit: resolvePhase(value?.exit, DEFAULT_ANIMATIONS.exit),
    exitMode: value?.exitMode === "reverse" ? "reverse" : "custom",
    animateTrackChanges: value?.animateTrackChanges ?? DEFAULT_ANIMATIONS.animateTrackChanges,
  };
}