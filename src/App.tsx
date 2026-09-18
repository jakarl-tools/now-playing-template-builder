import { useState, type ReactNode } from "react";
import { defaultState, type BuilderState } from "./data/presets";
import { StyleControls } from "./components/ThemePanel";
import { TypographyPanel } from "./components/TypographyPanel";
import { ContentPanel } from "./components/ContentPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { ReferencePanel } from "./components/ReferencePanel";
import { SectionGroup } from "./components/ui";

function Logo() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-blue-800 shadow-md shadow-blue-950/40 ring-1 ring-inset ring-white/15">
        <svg width="36" height="36" viewBox="100 125 390 390" fill="currentColor" className="text-white" aria-hidden="true" focusable="false">
          <path d="m280 320-66-65c-7-6-16-4-23 1-5 4-7 9-6 18 2 13-7 23-16 31-9 10-18 9-27 0l-18-18c-10-9-8-19 0-28l7-8c7-8 14-9 23-7 13 4 24-4 23-17-1-6-3-11-1-18 1-5 9-12 17-20l20-19c24-22 59-23 79-13 8 3 17 7 18 11 4 7-3 11-8 10-21-5-46 2-58 12-10 8-11 20-4 28l72 71Z" />
          <path d="m361 337 93 93c12 12 11 21 0 32-11 11-21 12-31 2l-95-95Z" />
          <path d="m238 377 131-130c-8-22-1-43 15-58 14-11 32-14 50-10l-29 30c-5 5-5 11 0 17l16 16c7 7 13 6 19 0l28-28c7 20 1 40-14 55-16 13-34 16-53 9L271 409c8 20 2 41-12 55-13 14-33 18-52 12l28-29c5-5 5-11 0-16l-16-17c-6-6-12-6-18-1l-30 28c-6-20 1-39 14-52 14-14 34-18 53-12Z" />
        </svg>
      </div>
      <h1 className="min-w-0 text-base font-semibold leading-tight tracking-tight text-white sm:text-xl lg:text-[22px]">
        Now Playing <span className="font-normal text-slate-300">Custom Theme Builder</span>
      </h1>
    </div>
  );
}

type Tab = "design" | "typography" | "content" | "reference";

const NAV: {
  id: Tab;
  label: string;
  icon: "palette" | "type" | "list" | "book";
}[] = [
  { id: "design", label: "Appearance", icon: "palette" },
  { id: "typography", label: "Typography", icon: "type" },
  { id: "content", label: "Card content", icon: "list" },
  { id: "reference", label: "Binder & install", icon: "book" },
];

function Icon({ name }: { name: (typeof NAV)[number]["icon"] }) {
  const map: Record<string, ReactNodeFix> = {
    palette: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a7 7 0 0 0 0 14h3l2-2 2-2a3 3 0 0 0-3-3h-3z" />
      </>
    ),
    type: (
      <>
        <path d="M4 7V5h16v2" />
        <path d="M12 5v14" />
        <path d="M9 19h6" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </>
    ),
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {map[name]}
    </svg>
  );
}

type ReactNodeFix = ReactNode;

export default function App() {
  const [active, setActive] = useState<Tab>("design");
  const [state, setState] = useState<BuilderState>(defaultState);

  const patch = (p: Partial<BuilderState>) => setState((s) => ({ ...s, ...p }));

  const setShown = (token: string, on: boolean) =>
    setState((s) => {
      const shown = { ...s.shownFields };
      if (on) {
        shown[token] = true;
        // append to ordering if missing
        if (!s.fieldOrder.includes(token))
          return { ...s, shownFields: shown, fieldOrder: [...s.fieldOrder, token] };
      } else {
        shown[token] = false;
      }
      return { ...s, shownFields: shown };
    });

  const setChip = (token: string, on: boolean) =>
    setState((s) => ({
      ...s,
      chipFields: { ...s.chipFields, [token]: on },
    }));

  const setOrder = (ordered: string[]) =>
    setState((s) => ({
      ...s,
      // The unified editor supplies visible and hidden fields. Deduping also
      // preserves any future field that is absent from an older saved order.
      fieldOrder: Array.from(new Set([...ordered, ...s.fieldOrder])),
    }));

  const reset = () => setState(defaultState);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#0a0c11] text-slate-200">
      {/* top header */}
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0d1017] px-4 py-2">
        <Logo />
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-300 transition hover:bg-white/10"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* side rail + controls */}
        <aside className="flex max-h-[55dvh] min-h-0 w-full shrink-0 flex-col border-r border-white/10 bg-[#0d1017] lg:max-h-none lg:w-[360px] lg:basis-[360px]">
          <nav aria-label="Builder settings" className="grid shrink-0 grid-cols-4 gap-1 border-b border-white/10 p-2 lg:flex lg:flex-col">
            {NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setActive(n.id)}
                aria-label={n.label}
                aria-current={active === n.id ? "page" : undefined}
                className={
                  "flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-[12px] font-medium transition lg:justify-start lg:px-3 " +
                  (active === n.id
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200")
                }
              >
                <span className={active === n.id ? "text-violet-300" : "text-slate-500"}>
                  <Icon name={n.icon} />
                </span>
                <span className="hidden lg:inline">{n.label}</span>
                <span className="min-w-0 truncate text-center text-[10px] uppercase tracking-wide lg:hidden">
                  {n.label.split(" ")[0]}
                </span>
              </button>
            ))}
          </nav>

          <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <SectionGroup
              scope={active}
              label={NAV.find((tab) => tab.id === active)?.label ?? "Settings"}
            >
              {active === "design" && (
                <StyleControls state={state} onPatch={patch} />
              )}
              {active === "typography" && (
                <TypographyPanel
                  fontMode={state.fontMode}
                  fontId={state.fontId}
                  googleFamily={state.googleFamily}
                  googleWeights={state.googleWeights}
                  customStack={state.customStack}
                  customCss={state.customCss}
                  titleSize={state.titleSize}
                  artistSize={state.artistSize}
                  metaSize={state.metaSize}
                  titleVariant={state.titleVariant}
                  titleWeight={state.titleWeight}
                  titleTracking={state.titleTracking}
                  artistVariant={state.artistVariant}
                  artistWeight={state.artistWeight}
                  artistTracking={state.artistTracking}
                  onPatch={patch}
                />
              )}
              {active === "content" && (
                <ContentPanel
                  shownFields={state.shownFields}
                  chipFields={state.chipFields}
                  fieldOrder={state.fieldOrder}
                  ratingStyle={state.ratingStyle}
                  showBar={state.showBar}
                  livePlacement={state.livePlacement}
                  artistDash={state.artistDash}
                  onChangeShown={setShown}
                  onChangeChip={setChip}
                  onChangeOrder={setOrder}
                  onChangeRatingStyle={(v) => patch({ ratingStyle: v })}
                  onChangeShowBar={(v) => patch({ showBar: v })}
                  onChangeLivePlacement={(v) => patch({ livePlacement: v })}
                  onChangeDash={(v) => patch({ artistDash: v })}
                  combineTitleArtist={state.combineTitleArtist}
                  showPrevious={state.showPrevious}
                  onChangeCombine={(v) => patch({ combineTitleArtist: v })}
                  onChangePrevious={(v) => patch({ showPrevious: v })}
                />
              )}
              {active === "reference" && <ReferencePanel />}
            </SectionGroup>
          </div>
        </aside>

        {/* preview + source */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-gradient-to-br from-[#0a0c11] to-[#0e1220]">
          <PreviewPanel state={state} />
        </main>
      </div>
    </div>
  );
}
