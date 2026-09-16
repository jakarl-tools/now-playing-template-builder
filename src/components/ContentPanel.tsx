import { CHIP_FIELDS, type LivePlacement, type RatingStyle } from "../data/presets";
import { PLACEHOLDERS, byToken } from "../data/placeholders";
import { Pills, Section, Switch } from "./ui";

type Block = { type: "item"; token: string } | { type: "group" };

function fieldType(token: string, chipFields: Record<string, boolean>, ratingStyle: RatingStyle) {
  if (token === "title") return "title";
  if (token === "artist") return "artist";
  if (CHIP_FIELDS.includes(token) && chipFields[token] !== false) return "chip";
  if (token === "rating" && ratingStyle === "stars") return "stars";
  return "text";
}

const TONE: Record<string, string> = {
  title: "bg-violet-500/20 text-violet-200",
  artist: "bg-sky-500/20 text-sky-200",
  chip: "bg-amber-400/15 text-amber-200",
  stars: "bg-white/5 text-amber-200",
  text: "bg-white/10 text-slate-400",
};

function ReorderButtons({
  upDisabled,
  downDisabled,
  onUp,
  onDown,
  withinGroup = false,
}: {
  upDisabled: boolean;
  downDisabled: boolean;
  onUp: () => void;
  onDown: () => void;
  withinGroup?: boolean;
}) {
  return (
    <div className="flex shrink-0">
      <button
        type="button"
        disabled={upDisabled}
        onClick={onUp}
        className="rounded px-1.5 text-slate-500 transition hover:text-white disabled:opacity-25"
        title={withinGroup ? "Move up within shared row" : "Move row up"}
        aria-label={withinGroup ? "Move up within shared row" : "Move row up"}
      >
        ↑
      </button>
      <button
        type="button"
        disabled={downDisabled}
        onClick={onDown}
        className="rounded px-1.5 text-slate-500 transition hover:text-white disabled:opacity-25"
        title={withinGroup ? "Move down within shared row" : "Move row down"}
        aria-label={withinGroup ? "Move down within shared row" : "Move row down"}
      >
        ↓
      </button>
    </div>
  );
}

export function ContentPanel({
  shownFields,
  chipFields,
  fieldOrder,
  ratingStyle,
  showBar,
  livePlacement,
  artistDash,
  onChangeShown,
  onChangeChip,
  onChangeOrder,
  onChangeRatingStyle,
  onChangeShowBar,
  onChangeLivePlacement,
  onChangeDash,
  combineTitleArtist,
  showPrevious,
  onChangeCombine,
  onChangePrevious,
}: {
  shownFields: Record<string, boolean>;
  chipFields: Record<string, boolean>;
  fieldOrder: string[];
  ratingStyle: RatingStyle;
  showBar: boolean;
  livePlacement: LivePlacement;
  artistDash: boolean;
  combineTitleArtist: boolean;
  showPrevious: boolean;
  onChangeShown: (token: string, on: boolean) => void;
  onChangeChip: (token: string, on: boolean) => void;
  onChangeOrder: (order: string[]) => void;
  onChangeRatingStyle: (value: RatingStyle) => void;
  onChangeShowBar: (value: boolean) => void;
  onChangeLivePlacement: (value: LivePlacement) => void;
  onChangeDash: (value: boolean) => void;
  onChangeCombine: (value: boolean) => void;
  onChangePrevious: (value: boolean) => void;
}) {
  const allTokens = PLACEHOLDERS.map((field) => field.token);
  const order = [...fieldOrder, ...allTokens.filter((token) => !fieldOrder.includes(token))];
  const solos = order.filter((token) => !CHIP_FIELDS.includes(token));
  const group = order.filter((token) => CHIP_FIELDS.includes(token));

  // The shared row remains a fixed stack block. Only its children can move.
  const firstGroupIndex = order.findIndex((token) => CHIP_FIELDS.includes(token));
  const groupSlot = firstGroupIndex < 0
    ? solos.length
    : order.slice(0, firstGroupIndex).filter((token) => !CHIP_FIELDS.includes(token)).length;
  const blocks: Block[] = [
    ...solos.slice(0, groupSlot).map((token): Block => ({ type: "item", token })),
    { type: "group" },
    ...solos.slice(groupSlot).map((token): Block => ({ type: "item", token })),
  ];

  const expand = (nextBlocks: Block[], nextGroup: string[]) =>
    nextBlocks.flatMap((block) => block.type === "group" ? nextGroup : [block.token]);

  const moveSolo = (blockIndex: number, direction: -1 | 1) => {
    const target = blockIndex + direction;
    const a = blocks[blockIndex];
    const b = blocks[target];
    if (!a || !b || a.type !== "item" || b.type !== "item") return;
    const next = [...blocks];
    next[blockIndex] = b;
    next[target] = a;
    onChangeOrder(expand(next, group));
  };

  const moveInGroup = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= group.length) return;
    const next = [...group];
    [next[index], next[target]] = [next[target], next[index]];
    onChangeOrder(expand(blocks, next));
  };

  const styleToggle = (token: string) => {
    const type = fieldType(token, chipFields, ratingStyle);
    const isStars = token === "rating" && ratingStyle === "stars";
    return (
      <button
        type="button"
        aria-pressed={chipFields[token] !== false}
        aria-label={isStars ? "Rating stars chip background" : `${byToken(token)?.label ?? token} chip styling`}
        title={isStars
          ? `${chipFields[token] !== false ? "Remove" : "Add"} chip background for rating stars`
          : `Switch to ${chipFields[token] !== false ? "plain text" : "a chip"}`}
        onClick={() => onChangeChip(token, chipFields[token] === false)}
        className={
          "min-h-6 min-w-11 shrink-0 rounded border border-current/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition hover:border-current/50 hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 " +
          TONE[type]
        }
      >
        {type}
      </button>
    );
  };

  const visibleCount = allTokens.filter((token) => shownFields[token]).length;

  return (
    <Section
      title="Card content"
      hint="Show, style and arrange every field"
      summary={`${visibleCount} of ${allTokens.length} fields visible`}
      defaultOpen
    >
      <div className="space-y-1.5">
        {blocks.map((block, blockIndex) => {
          if (block.type === "group") {
            const enabledInGroup = group.filter((token) => shownFields[token]).length;
            return (
              <div
                key="__shared-row"
                className="rounded-lg border border-amber-400/25 bg-amber-400/[0.04] px-2 py-2"
              >
                <div className="flex items-start gap-2 px-1 pb-2">
                  <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
                    Shared row
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {enabledInGroup} visible · group position is fixed
                  </span>
                </div>
                <div className="space-y-1.5 border-l-2 border-amber-400/30 pl-2">
                  {group.map((token, index) => {
                    const field = byToken(token);
                    const on = !!shownFields[token];
                    return (
                      <div
                        key={token}
                        className={`rounded-lg border px-2 py-2 transition ${on
                          ? "border-white/10 bg-white/[0.04]"
                          : "border-white/5 bg-transparent opacity-55"}`}
                      >
                        <div className="flex items-center gap-2">
                          <Switch
                            on={on}
                            onChange={(value) => onChangeShown(token, value)}
                            label={`Show ${field?.label ?? token}`}
                          />
                          <span className="min-w-0 flex-1 truncate text-[13px] text-slate-200">
                            {field?.label ?? token}
                          </span>
                          {styleToggle(token)}
                          <ReorderButtons
                            withinGroup
                            upDisabled={index === 0}
                            downDisabled={index === group.length - 1}
                            onUp={() => moveInGroup(index, -1)}
                            onDown={() => moveInGroup(index, 1)}
                          />
                        </div>
                        {on && (
                          <div className="mt-1.5 pl-11 text-[11px] text-slate-500">
                            <span className="font-mono text-amber-200/80">track.{field?.trackProp}</span>
                            {field?.optional && <span className="ml-2 uppercase tracking-wide">optional</span>}
                          </div>
                        )}
                        {on && token === "rating" && (
                          <div className="mt-2 pl-11">
                            <Pills<RatingStyle>
                              value={ratingStyle}
                              cols={2}
                              onChange={onChangeRatingStyle}
                              options={[
                                { value: "numeric", label: "Numeric · 4 ★" },
                                { value: "stars", label: "★★★★★ bar" },
                              ]}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          const token = block.token;
          const field = byToken(token);
          const on = !!shownFields[token];
          const type = fieldType(token, chipFields, ratingStyle);
          const upBlocked = blockIndex === 0 || blocks[blockIndex - 1]?.type === "group";
          const downBlocked = blockIndex === blocks.length - 1 || blocks[blockIndex + 1]?.type === "group";
          return (
            <div
              key={token}
              className={`rounded-lg border px-2 py-2 transition ${on
                ? "border-white/10 bg-white/[0.03]"
                : "border-white/5 opacity-55"}`}
            >
              <div className="flex items-center gap-2">
                <Switch
                  on={on}
                  onChange={(value) => onChangeShown(token, value)}
                  label={`Show ${field?.label ?? token}`}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-slate-200">
                  {field?.label ?? token}
                </span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${TONE[type]}`}>
                  {type}
                </span>
                <ReorderButtons
                  upDisabled={upBlocked}
                  downDisabled={downBlocked}
                  onUp={() => moveSolo(blockIndex, -1)}
                  onDown={() => moveSolo(blockIndex, 1)}
                />
              </div>
              {on && field && (
                <div className="mt-1.5 pl-11 text-[11px] text-slate-500">
                  <span className="font-mono text-amber-200/80">track.{field.trackProp}</span>
                  {field.optional && <span className="ml-2 uppercase tracking-wide">optional</span>}
                  <span className="ml-2">{field.hint}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-white/10 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Display options
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-slate-300">Live “NOW PLAYING” indicator</span>
          <Switch on={showBar} onChange={onChangeShowBar} label="Show live indicator" />
        </div>
        {showBar && (
          <div className="mt-1.5 pl-0">
            <p className="mb-1.5 text-[11px] text-slate-400">Placement</p>
            <Pills<LivePlacement>
              value={livePlacement}
              cols={2}
              onChange={onChangeLivePlacement}
              options={[
                { value: "nested", label: "In the card" },
                { value: "above", label: "Above the card" },
              ]}
            />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              {livePlacement === "above"
                ? "Its own title stacked above the card, outside its background, following the text alignment."
                : "Sits inside the card as the first line of the text block."}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-slate-300">Accent dash before artist</span>
          <Switch on={artistDash} onChange={onChangeDash} label="Accent dash before artist" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="block text-[13px] text-slate-300">Combine title + artist</span>
            <span className="block text-[11px] text-slate-500">
              One line when they sit next to each other in the order
            </span>
          </div>
          <Switch on={combineTitleArtist} onChange={onChangeCombine} label="Combine title and artist" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="block text-[13px] text-slate-300">Show previous track</span>
            <span className="block text-[11px] text-slate-500">
              Last played track under the card — its artist/title order mirrors
              the current track&apos;s arranged order
            </span>
          </div>
          <Switch on={showPrevious} onChange={onChangePrevious} label="Show previous track" />
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Solo fields each use their own row. Chip-capable fields stay inside one
        fixed shared row; reorder only the items within that group.
      </p>
    </Section>
  );
}