export type BackgroundSurface = "card" | "title" | "artist";

export interface SurfaceEffects {
  borderEnabled: boolean;
  borderColor: string;
  borderOpacity: number;
  borderWidth: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowOpacity: number;
  shadowDistance: number;
  shadowBlur: number;
  /** Degrees, 0 = down, 90 = right, 180 = up. Default 45 → down & right. */
  shadowAngle: number;
}

const TEXT_SURFACE_EFFECTS: SurfaceEffects = {
  borderEnabled: false,
  borderColor: "#ffffff",
  borderOpacity: 40,
  borderWidth: 1,
  shadowEnabled: false,
  shadowColor: "#000000",
  shadowOpacity: 30,
  shadowDistance: 6,
  shadowBlur: 16,
  shadowAngle: 45,
};

export const DEFAULT_SURFACE_EFFECTS: Record<BackgroundSurface, SurfaceEffects> = {
  card: {
    ...TEXT_SURFACE_EFFECTS,
    shadowEnabled: true,
    shadowOpacity: 18,
    shadowDistance: 16,
    shadowBlur: 50,
    shadowAngle: 45,
  },
  title: { ...TEXT_SURFACE_EFFECTS },
  artist: { ...TEXT_SURFACE_EFFECTS },
};

function bounded(value: number | undefined, fallback: number, max: number, min = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function color(value: string | undefined, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

// Preserve the old appearance when an existing draft has no surface settings yet.
export function resolveSurfaceEffects(value: Partial<SurfaceEffects> | undefined, surface: BackgroundSurface): SurfaceEffects {
  const fallback = DEFAULT_SURFACE_EFFECTS[surface];
  return {
    borderEnabled: value?.borderEnabled ?? fallback.borderEnabled,
    borderColor: color(value?.borderColor, fallback.borderColor),
    borderOpacity: bounded(value?.borderOpacity, fallback.borderOpacity, 100),
    borderWidth: bounded(value?.borderWidth, fallback.borderWidth, 8, 1),
    shadowEnabled: value?.shadowEnabled ?? fallback.shadowEnabled,
    shadowColor: color(value?.shadowColor, fallback.shadowColor),
    shadowOpacity: bounded(value?.shadowOpacity, fallback.shadowOpacity, 100),
    shadowDistance: bounded(value?.shadowDistance, fallback.shadowDistance, 50),
    shadowBlur: bounded(value?.shadowBlur, fallback.shadowBlur, 80),
    shadowAngle: bounded(value?.shadowAngle, fallback.shadowAngle, 360),
  };
}