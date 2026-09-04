import { CHIP_FIELDS, TEXT_FIELDS } from "../data/presets";
import { byToken } from "../data/placeholders";
import { Section, Switch } from "./ui";

const META = [
  ...TEXT_FIELDS.filter((t) => t !== "title" && t !== "artist"),
  ...CHIP_FIELDS,
];

const KIND_LABEL: Record<string, string> = {
  text: "TEXT",
  bpm: "BPM",
  key: "KEY",
  clock: "TIME",
  rating: "STARS",
  length: "LEN",
};

function TokenMeta({ token }: { token: string }) {
  const p = byToken(token);
  if (!p) return null;
  return (
    <span className="flex items-center gap-2 text-[11px] text-slate-500">
      <span className="font-mono text-amber-200/80">
        {p.trackProp ? `track.${p.trackProp}` : "local clock"}
      </span>
      {p.optional && (
        <span className="rounded bg-white/10 px-1 text-[9px] uppercase tracking-wide text-slate-400">
          optional
        </span>
      )}
      <span className="truncate">{p.hint}</span>
    </span>
  );
}

export function ContentPanel({
  shownFields,
  showBar,
  artistDash,
  onChangeShown,
  onChangeShowBar,
  onChangeDash,
}: {
  shownFields: Record<string, boolean>;
  showBar: boolean;
  artistDash: boolean;
  onChangeShown: (t: string, on: boolean) => void;
  onChangeShowBar: (v: boolean) => void;
  onChangeDash: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <Section title="Track card" hint="shown on the air">
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] text-slate-200">
              <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">
                TITLE
              </span>
              Track title
            </div>
            <Switch on={!!shownFields.title} onChange={(v) => onChangeShown("title", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] text-slate-200">
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                ARTIST
              </span>
              Artist
            </div>
            <Switch on={!!shownFields.artist} onChange={(v) => onChangeShown("artist", v)} />
          </div>
        </div>
      </Section>

      <Section title="Extra metadata" hint="variables Now Playing fills in">
        <div className="space-y-2">
          {META.map((token) => {
            const on = !!shownFields[token];
            const p = byToken(token);
            const isChip = CHIP_FIELDS.includes(token);
            return (
              <div
                key={token}
                className={
                  "rounded-lg border px-3 py-2 transition " +
                  (on ? "border-white/10 bg-white/[0.03]" : "border-white/5 opacity-45")
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                      {KIND_LABEL[p?.kind ?? "text"] ?? "TEXT"}
                    </span>
                    <span className="text-[13px] text-slate-200">{p?.label}</span>
                    {isChip && (
                      <span className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/80">
                        chip
                      </span>
                    )}
                  </div>
                  <Switch on={on} onChange={(v) => onChangeShown(token, v)} />
                </div>
                {on && (
                  <div className="mt-1.5 pl-0.5">
                    <TokenMeta token={token} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Options">
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-300">Live "NOW PLAYING" dot bar</span>
            <Switch on={showBar} onChange={onChangeShowBar} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-300">Accent dash before artist</span>
            <Switch on={artistDash} onChange={onChangeDash} />
          </div>
        </div>
      </Section>
    </div>
  );
}

export function OrderChips({
  fieldOrder,
  shownFields,
  onChangeOrder,
}: {
  fieldOrder: string[];
  shownFields: Record<string, boolean>;
  onChangeOrder: (o: string[]) => void;
}) {
  const order = fieldOrder.filter((t) => shownFields[t]);
  const move = (i: number, dir: -1 | 1) => {
    const arr = [...order];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChangeOrder(arr);
  };

  const kindOf = (t: string) => {
    if (t === "title") return "title";
    if (t === "artist") return "artist";
    const p = byToken(t);
    if (p && p.kind !== "text") return "chip";
    return "text";
  };
  const tone: Record<string, string> = {
    title: "bg-violet-500/20 text-violet-200",
    artist: "bg-sky-500/20 text-sky-200",
    chip: "bg-amber-400/15 text-amber-200",
    text: "bg-white/10 text-slate-400",
  };

  if (!order.length)
    return (
      <p className="text-[12px] text-slate-500">
        Nothing enabled yet — switch a field on above.
      </p>
    );

  return (
    <div className="space-y-1.5">
      {order.map((t, i) => (
        <div
          key={t}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5"
        >
          <span className="w-4 text-center font-mono text-[10px] text-slate-600">
            {i + 1}
          </span>
          <span className="flex-1 truncate text-[13px] text-slate-200">
            {byToken(t)?.label ?? t}
          </span>
          <span
            className={
              "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide " +
              tone[kindOf(t)]
            }
          >
            {kindOf(t)}
          </span>
          <div className="flex">
            <button
              type="button"
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="rounded px-1.5 text-slate-500 transition hover:text-white disabled:opacity-25"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={i === order.length - 1}
              onClick={() => move(i, 1)}
              className="rounded px-1.5 text-slate-500 transition hover:text-white disabled:opacity-25"
              title="Move down"
            >
              ↓
            </button>
          </div>
        </div>
      ))}
      <p className="px-1 pt-1 text-[11px] leading-relaxed text-slate-500">
        Neighbouring text values merge into one tagline, and neighbouring chips
        merge into one row.
      </p>
    </div>
  );
}
