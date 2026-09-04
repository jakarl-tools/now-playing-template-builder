import { useState, type ReactNode } from "react";
import { defaultState, type BuilderState } from "./data/presets";
import { StyleControls } from "./components/ThemePanel";
import { FontPanel } from "./components/FontPanel";
import { ContentPanel, OrderChips } from "./components/ContentPanel";
import { TunePanel, type Align } from "./components/TunePanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { ReferencePanel } from "./components/ReferencePanel";
import { Section } from "./components/ui";

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-900/40">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-[14px] font-semibold text-white">Now Playing</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
          custom theme builder
        </div>
      </div>
    </div>
  );
}

type Tab = "design" | "fonts" | "content" | "tune" | "reference";

const NAV: {
  id: Tab;
  label: string;
  icon: "palette" | "type" | "list" | "sliders" | "book";
}[] = [
  { id: "design", label: "Appearance", icon: "palette" },
  { id: "fonts", label: "Fonts", icon: "type" },
  { id: "content", label: "Card content", icon: "list" },
  { id: "tune", label: "Typography", icon: "sliders" },
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
    sliders: (
      <>
        <path d="M21 4h-7M10 4H3" />
        <path d="M21 12h-9M8 12H3" />
        <path d="M21 20h-5M12 20H3" />
        <path d="M14 2v4M8 10v4M16 18v4" />
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

  const setOrder = (ordered: string[]) =>
    setState((s) => {
      // keep any field not shown in order after shown ones
      const tail = s.fieldOrder.filter((t) => !s.shownFields[t]);
      return { ...s, fieldOrder: [...ordered, ...tail] };
    });

  const reset = () => setState(defaultState);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0a0c11] text-slate-200">
      {/* top header */}
      <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#0d1017] px-3">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Rekordbox → OBS
          </span>
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
        <aside className="flex w-full shrink-0 flex-col border-r border-white/10 bg-[#0d1017] lg:w-[360px] lg:basis-[360px]">
          <nav className="grid grid-cols-5 gap-1 p-2 lg:flex lg:flex-col">
            {NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setActive(n.id)}
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

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            {active === "design" && (
              <StyleControls
                state={state}
                onPatch={patch}
              />
            )}
            {active === "fonts" && (
              <FontPanel
                fontMode={state.fontMode}
                fontId={state.fontId}
                googleFamily={state.googleFamily}
                googleWeights={state.googleWeights}
                customStack={state.customStack}
                customCss={state.customCss}
                onPatch={patch}
              />
            )}
            {active === "content" && (
              <div className="space-y-4">
                <ContentPanel
                  shownFields={state.shownFields}
                  showBar={state.showBar}
                  artistDash={state.artistDash}
                  onChangeShown={setShown}
                  onChangeShowBar={(v) => patch({ showBar: v })}
                  onChangeDash={(v) => patch({ artistDash: v })}
                />
                <Section title="Stack order" hint="shown top → bottom">
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <OrderChips
                      fieldOrder={state.fieldOrder}
                      shownFields={state.shownFields}
                      onChangeOrder={setOrder}
                    />
                  </div>
                </Section>
              </div>
            )}
            {active === "tune" && (
              <TunePanel
                titleSize={state.titleSize}
                artistSize={state.artistSize}
                metaSize={state.metaSize}
                titleVariant={state.titleVariant}
                align={(state.align as Align) || "left"}
                showArtwork={state.showArtwork}
                artStyle={state.artStyle}
                onChangeTitleSize={(v) => patch({ titleSize: v })}
                onChangeArtistSize={(v) => patch({ artistSize: v })}
                onChangeMetaSize={(v) => patch({ metaSize: v })}
                onChangeVariant={(v) => patch({ titleVariant: v })}
                onChangeAlign={(v) => patch({ align: v })}
                onChangeArtwork={(v) => patch({ showArtwork: v })}
                onChangeArtStyle={(v) => patch({ artStyle: v })}
              />
            )}
            {active === "reference" && <ReferencePanel />}
          </div>
        </aside>

        {/* preview + source */}
        <main className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-[#0a0c11] to-[#0e1220]">
          <PreviewPanel state={state} />
        </main>
      </div>
    </div>
  );
}
