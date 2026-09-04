import { Section, Slider, Pills } from "./ui";

export type Align = "left" | "center";

export function TunePanel({
  titleSize,
  artistSize,
  metaSize,
  titleVariant,
  align,
  showArtwork,
  onChangeTitleSize,
  onChangeArtistSize,
  onChangeMetaSize,
  onChangeVariant,
  onChangeAlign,
  onChangeArtwork,
}: {
  titleSize: number;
  artistSize: number;
  metaSize: number;
  titleVariant: string;
  align: Align;
  showArtwork: boolean;
  onChangeTitleSize: (n: number) => void;
  onChangeArtistSize: (n: number) => void;
  onChangeMetaSize: (n: number) => void;
  onChangeVariant: (v: string) => void;
  onChangeAlign: (v: Align) => void;
  onChangeArtwork: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <Section title="Sizing">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-400">Title scale</span>
            <Slider min={20} max={92} value={titleSize} suffix="px" onChange={onChangeTitleSize} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-400">Artist scale</span>
            <Slider min={12} max={40} value={artistSize} suffix="px" onChange={onChangeArtistSize} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-400">Detail scale</span>
            <Slider min={10} max={34} value={metaSize} suffix="px" onChange={onChangeMetaSize} />
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-slate-500">
            Detail controls every non‑title/non‑artist block: the tagline line, the
            "ON AIR" label and all chips together.
          </p>
        </div>
      </Section>

      <Section title="Style">
        <Pills
          value={titleVariant}
          onChange={onChangeVariant}
          options={[
            { value: "regular", label: "Regular" },
            { value: "italic", label: "Italic" },
            { value: "uppercase", label: "Uppercase" },
          ]}
        />
      </Section>

      <Section title="Alignment">
        <Pills
          value={align}
          onChange={(v) => onChangeAlign(v)}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
          ]}
        />
      </Section>

      <Section title="Artwork">
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="mb-2 text-[12px] text-slate-400">Cover art slot</p>
            <Pills
              value={showArtwork ? "yes" : "no"}
              onChange={(v) => onChangeArtwork(v === "yes")}
              cols={2}
              options={[
                { value: "yes", label: "Visible" },
                { value: "no", label: "Hidden" },
              ]}
            />
            <p className="mt-2 text-[11px] text-slate-500">
              Now Playing drops the real Rekordbox cover art into the artwork slot.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
