/**
 * Now Playing's custom HTML contract (from the shipped starter template):
 *
 *  - jQuery + socket.io are injected into <head> when the file is served.
 *  - `window.onTrackUpdate(track)` MUST exist; the app calls it whenever the
 *    playing track changes (after any configured track delay).
 *  - Optional `window.onHide()` / `window.onShow()` are called for the
 *    "Hide After" setting.
 *  - The artwork <img> src is set from `track.artwork` inside onTrackUpdate.
 *
 * There is NO `{{ token }}` or `{token}` substitution in custom themes — the
 * theme is plain HTML/CSS/JS that paints the track object into the DOM.
 *
 * interface NowPlayingTrackId {
 *   id, title, artist, artwork: string;
 *   label?, bpm?, rating?, length?, comment?, key?, currentBpm?: number|string;
 *   createdAt?: Date;
 * }
 *
 * Note: this builder intentionally does NOT expose track.beatportUrl,
 * track.spotifyUrl, track.beatportId or track.filePath. OBS browser sources
 * cannot receive mouse input, so link chips would be useless on stream.
 * It also omits track.currentBpm (live BPM) and the local wall clock —
 * neither is needed on this overlay.
 *
 * The Remix field reads track.remix first, then falls back to track.remixer,
 * track.remixedBy and track.mix, since the ID3 "remixed by" tag surfaces
 * under different names depending on the source.
 */

export type PlaceholderKind =
  | "text"
  | "bpm"
  | "key"
  | "rating"
  | "length";

export interface Placeholder {
  /** stable id used in builder state */
  token: string;
  /** property on the track object */
  trackProp: string | null;
  label: string;
  hint: string;
  kind: PlaceholderKind;
  /** optional fields may be absent depending on DJ software / tags */
  optional: boolean;
  /** sample value used by the mock preview payload */
  sample: string | number;
}

export const PLACEHOLDERS: Placeholder[] = [
  {
    token: "title",
    trackProp: "title",
    label: "Title",
    hint: "Track name incl. remix",
    kind: "text",
    optional: false,
    sample: "Midnight Circuit",
  },
  {
    token: "artist",
    trackProp: "artist",
    label: "Artist",
    hint: "Artist of the track",
    kind: "text",
    optional: false,
    sample: "Neon District",
  },
  {
    token: "label",
    trackProp: "label",
    label: "Label",
    hint: "Record label",
    kind: "text",
    optional: true,
    sample: "Afterdark Records",
  },
  {
    token: "comment",
    trackProp: "comment",
    label: "Comment",
    hint: "User comment tag",
    kind: "text",
    optional: true,
    sample: "Peak time weapon",
  },
  {
    token: "remix",
    trackProp: "remix",
    label: "Remix",
    hint: "Remix/version tag (remix, remixer, mix)",
    kind: "text",
    optional: true,
    sample: "Extended Mix",
  },
  {
    token: "bpm",
    trackProp: "bpm",
    label: "BPM",
    hint: "Original BPM",
    kind: "bpm",
    optional: true,
    sample: 126,
  },
  {
    token: "key",
    trackProp: "key",
    label: "Key",
    hint: "Key signature",
    kind: "key",
    optional: true,
    sample: "8A",
  },
  {
    token: "rating",
    trackProp: "rating",
    label: "Rating",
    hint: "Track rating",
    kind: "rating",
    optional: true,
    sample: 4,
  },
  {
    token: "length",
    trackProp: "length",
    label: "Length",
    hint: "Track duration only (seconds/ms → m:ss)",
    kind: "length",
    optional: true,
    sample: 402,
  },
];

export const byToken = (t: string) => PLACEHOLDERS.find((p) => p.token === t);
