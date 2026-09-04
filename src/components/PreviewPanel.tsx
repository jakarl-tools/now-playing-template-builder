import { memo, useMemo, useState } from "react";
import { fullTemplateHtml } from "../lib/makeTemplate";
import type { BuilderState } from "../data/presets";
import { TabBar, IconBtn } from "./ui";

type View = "preview" | "source";

function PreviewPane({ state }: { state: BuilderState }) {
  const doc = useMemo(() => fullTemplateHtml(state, { mock: true }), [state]);
  // A subtle "on-air" backdrop behind the transparent iframe lets every theme
  // read well (real overlays sit transparently over the OBS scene).
  const isLight = relativeLuminance(state.textColor) < 0.45;
  const backdrop = isLight
    ? "radial-gradient(circle at 30% 20%, rgba(255,255,255,0) , rgba(120,60,200,0.10)), linear-gradient(135deg, #f4f4f8, #cfd6e2)"
    : "radial-gradient(circle at 32% 22%, rgba(255,255,255,0.05) , transparent 42%), linear-gradient(160deg, rgba(18,22,38,0.9), #07080c)";
  const dotColor = state.mutedColor;

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `${backdrop}, radial-gradient(${dotColor}22 1px, transparent 1px)`,
        backgroundSize: "100% 100%, 18px 18px",
      }}
    >
      <iframe
        title="Live preview of your Now Playing theme"
        className="h-full w-full border-0"
        sandbox="allow-scripts"
        srcDoc={doc}
      />
    </div>
  );
}

function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) return 1;
  const rgb = [0, 2, 4].map((i) => Number.parseInt(raw.slice(i, i + 2), 16) / 255);
  return rgb.reduce((sum, value, index) => {
    const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
}

export const PreviewPanel = memo(function PreviewPanel({
  state,
}: {
  state: BuilderState;
}) {
  const [view, setView] = useState<View>("preview");
  const source = useMemo(() => fullTemplateHtml(state), [state]);

  const download = () => {
    const blob = new Blob([source], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "custom_html_template.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = source;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <TabBar<View>
          value={view}
          onChange={setView}
          options={[
            { value: "preview", label: "Live preview" },
            { value: "source", label: "HTML source" },
          ]}
        />
        <div className="flex gap-1.5">
          <IconBtn onClick={copy} title="Copy template HTML">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
          </IconBtn>
          <IconBtn onClick={download} title="Download custom_html_template.html">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M4 21h16" />
            </svg>
          </IconBtn>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {view === "preview" ? (
          <PreviewPane state={state} />
        ) : (
          <div className="h-full overflow-auto bg-[#0b0e16]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-[11px] text-slate-500">
              <span className="text-slate-300">custom_html_template.html</span>
              <span className="text-emerald-400">{source.length.toLocaleString()} bytes</span>
            </div>
            <div className="p-4 px-0">
              <pre className="px-4 text-[12px] leading-relaxed text-zinc-300">
                <code>{highlight(source)}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/** Lightweight syntax highlight for the source view. */
function highlight(html: string) {
  // Tags in blue, track.* field reads in amber, lifecycle hooks in violet.
  const parts = html.split(
    /(<\/?[a-zA-Z][^>]*>|track\.[a-zA-Z]+|window\.on[A-Za-z]+|onTrackUpdate|onHide|onShow)/g
  );
  return parts.map((p, i) => {
    if (/^track\./.test(p))
      return (
        <span key={i} className="text-amber-300">
          {p}
        </span>
      );
    if (/^(window\.on|onTrackUpdate|onHide|onShow)/.test(p))
      return (
        <span key={i} className="text-violet-300">
          {p}
        </span>
      );
    if (p.startsWith("<")) return <span key={i} className="text-sky-300">{p}</span>;
    return <span key={i}>{p}</span>;
  });
}
