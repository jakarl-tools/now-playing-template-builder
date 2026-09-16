import { memo, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { fullTemplateHtml } from "../lib/makeTemplate";
import type { BuilderState } from "../data/presets";
import { IconBtn } from "./ui";

type View = "preview" | "source";
type Notice = { kind: "ok" | "warn" | "err"; text: string } | null;
type MotionStatus = "loading" | "hidden" | "entering" | "visible" | "exiting";
type PlaybackAction = "show" | "hide" | "replay";

const MOTION_STATUS: Record<MotionStatus, string> = {
  loading: "Loading preview",
  hidden: "Hidden",
  entering: "Entering",
  visible: "Visible",
  exiting: "Exiting",
};

function PreviewPane({ state, doc, frame, motionStatus, onLoad }: {
  state: BuilderState;
  doc: string;
  frame: RefObject<HTMLIFrameElement | null>;
  motionStatus: MotionStatus;
  onLoad: () => void;
}) {
  // A subtle "on-air" backdrop behind the transparent iframe lets every theme
  // read well (real overlays sit transparently over the OBS scene).
  const isLight = relativeLuminance(state.textColor) < 0.45;
  const backdrop = isLight
    ? "radial-gradient(circle at 30% 20%, rgba(255,255,255,0) , rgba(120,60,200,0.10)), linear-gradient(135deg, #f4f4f8, #cfd6e2)"
    : "radial-gradient(circle at 32% 22%, rgba(255,255,255,0.05) , transparent 42%), linear-gradient(160deg, rgba(18,22,38,0.9), #07080c)";
  const dotColor = state.mutedColor;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          backgroundImage: `${backdrop}, radial-gradient(${dotColor}22 1px, transparent 1px)`,
          backgroundSize: "100% 100%, 18px 18px",
        }}
      >
        <iframe
          ref={frame}
          title="Live preview of your Now Playing theme"
          className="block h-full w-full border-0"
          sandbox="allow-scripts"
          srcDoc={doc}
          onLoad={onLoad}
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0d1017] px-3 py-2">
        <span className="text-[11px] text-slate-500" role="status">
          Sample data <span className="px-1 text-slate-600" aria-hidden="true">/</span>
          <span className="text-slate-400">{MOTION_STATUS[motionStatus]}</span>
        </span>
      </div>
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
  const [notice, setNotice] = useState<Notice>(null);
  const [motionStatus, setMotionStatus] = useState<MotionStatus>("loading");
  const frame = useRef<HTMLIFrameElement>(null);
  const playbackFrame = useRef<number | null>(null);
  const panelId = useId();
  const source = useMemo(() => fullTemplateHtml(state), [state]);
  const previewDoc = useMemo(() => fullTemplateHtml(state, { mock: true }), [state]);

  const send = (action: PlaybackAction | "status") => {
    // The srcDoc sandbox has an opaque origin; both sides validate the sender window.
    frame.current?.contentWindow?.postMessage({ type: "np-preview-command", action }, "*");
  };

  const play = (action: PlaybackAction) => {
    setView("preview");
    if (playbackFrame.current !== null) window.cancelAnimationFrame(playbackFrame.current);
    // Reveal the existing iframe before the animation measures its layout.
    playbackFrame.current = window.requestAnimationFrame(() => {
      playbackFrame.current = null;
      send(action);
    });
  };

  useEffect(() => {
    setMotionStatus("loading");
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== "np-preview-state") return;
      const phase: unknown = event.data.phase;
      if (phase === "hidden" || phase === "entering" || phase === "visible" || phase === "exiting") {
        setMotionStatus(phase);
      }
    };
    window.addEventListener("message", receive);
    frame.current?.contentWindow?.postMessage({ type: "np-preview-command", action: "status" }, "*");
    return () => {
      window.removeEventListener("message", receive);
      if (playbackFrame.current !== null) window.cancelAnimationFrame(playbackFrame.current);
      playbackFrame.current = null;
    };
  }, [previewDoc]);

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(id);
  }, [notice]);

  const download = () => {
    if (!source) return;
    try {
      const blob = new Blob([source], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "custom_html_template.html";
      a.rel = "noopener";
      a.style.display = "none";
      // Append → click → remove so Chrome / Firefox / Safari all honour
      // the download even though the anchor is created in JS.
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice({ kind: "ok", text: "Downloaded custom_html_template.html" });
    } catch (err) {
      console.error("Download failed", err);
      setNotice({
        kind: "err",
        text: "Download blocked — copy the source from the HTML tab instead.",
      });
    }
  };

  const copy = async () => {
    if (!source) return;
    // Clipboard.writeText requires a focused document.
    if (document.hasFocus && !document.hasFocus()) window.focus();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(source);
        setNotice({ kind: "ok", text: "Copied template to clipboard" });
        return;
      }
    } catch (err) {
      console.warn("Clipboard API failed, falling back to execCommand", err);
    }
    // Fallback for http://, older browsers, or permission denial.
    try {
      const ta = document.createElement("textarea");
      ta.value = source;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) setNotice({ kind: "ok", text: "Copied template to clipboard" });
      else
        setNotice({
          kind: "warn",
          text: "Copy not allowed — use the HTML source tab.",
        });
    } catch (err) {
      console.error("Copy failed", err);
      setNotice({
        kind: "err",
        text: "Copy failed — switch to the HTML source tab to grab it manually.",
      });
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/10 bg-[#0d1017] px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="preview-view-button"
            aria-pressed={view === "preview"}
            aria-controls={`${panelId}-preview`}
            onClick={() => setView("preview")}
          >
            Live Preview
          </button>
          <span className="h-4 w-px shrink-0 bg-white/10" aria-hidden="true" />
          <div className="flex items-center gap-1.5" role="group" aria-label="Animation preview controls">
            <button type="button" className="preview-motion-button" disabled={motionStatus === "loading"}
              onClick={() => play("show")} title="Preview the entrance animation">Show</button>
            <button type="button" className="preview-motion-button" disabled={motionStatus === "loading"}
              onClick={() => play("hide")} title="Preview the exit animation">Hide</button>
            <button type="button" className="preview-motion-button" disabled={motionStatus === "loading"}
              onClick={() => play("replay")} title="Play the exit, then the entrance">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 10a9 9 0 1 1 1 8M3 4v6h6" />
              </svg>
              Replay Cycle
            </button>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5" role="group" aria-label="HTML source and export">
          <button
            type="button"
            className="preview-view-button"
            aria-pressed={view === "source"}
            aria-controls={`${panelId}-source`}
            onClick={() => setView("source")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16" />
            </svg>
            HTML Source
          </button>
          <IconBtn
            onClick={copy}
            title="Copy template HTML"
            aria-label="Copy template HTML"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
          </IconBtn>
          <IconBtn
            onClick={download}
            title="Download custom_html_template.html"
            aria-label="Download custom_html_template.html"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M4 21h16" />
            </svg>
          </IconBtn>
        </div>
      </div>

      {notice && (
        <div role="status" aria-live="polite" className={`np-notice np-notice-${notice.kind}`}>
          {notice.text}
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Keep the preview mounted and sized so header playback works from the source view too. */}
        <div
          id={`${panelId}-preview`}
          className={`absolute inset-0 ${view === "preview" ? "" : "invisible pointer-events-none"}`}
          aria-hidden={view !== "preview"}
          inert={view !== "preview"}
        >
          <PreviewPane
            state={state}
            doc={previewDoc}
            frame={frame}
            motionStatus={motionStatus}
            onLoad={() => send("status")}
          />
        </div>
        <div
          id={`${panelId}-source`}
          hidden={view !== "source"}
          role="region"
          aria-label="HTML source"
          tabIndex={view === "source" ? 0 : -1}
          className="relative h-full overflow-auto bg-[#0b0e16]"
        >
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
