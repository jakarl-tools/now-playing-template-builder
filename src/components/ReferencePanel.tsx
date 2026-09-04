import { PLACEHOLDERS } from "../data/placeholders";
import { Section } from "./ui";

const CONTRACT = `<!-- the contract your theme must honour -->
<script>
  function onTrackUpdate(track) {
    // called by Now Playing on every track change
    document.getElementById('np-title').textContent = track.title;
    document.getElementById('artwork').src = track.artwork;
  }
  function onHide() { /* "Hide After" elapsed */ }
  function onShow() { /* visible again */ }
</script>`;

export function ReferencePanel() {
  return (
    <div className="space-y-5 px-px">
      <Section title="How the data binds" hint="onTrackUpdate(track)">
        <div className="rounded-xl border border-white/10 bg-[#0b0e16] p-3">
          <p className="mb-2 text-[12px] leading-relaxed text-slate-400">
            Custom themes are <strong className="text-slate-200">plain HTML/CSS/JS</strong>.
            Now Playing injects jQuery + socket.io into the head when serving, then
            calls <code className="rounded bg-white/10 px-1 text-amber-200">window.onTrackUpdate(track)</code>{" "}
            whenever the playing track changes. There is{" "}
            <em>no</em> token substitution — <code className="text-rose-300">{"{{ … }}"}</code>{" "}
            or <code className="text-rose-300">{"{ … }"}</code> would render literally.
          </p>
          <pre className="overflow-x-auto text-[11px] leading-relaxed text-zinc-300">
            <code>{CONTRACT}</code>
          </pre>
          <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-400">
            <li>
              • The generated file defines <code className="text-sky-200">onTrackUpdate</code>,{" "}
              <code className="text-sky-200">onHide</code> and{" "}
              <code className="text-sky-200">onShow</code> and paints each value into the
              matching element id.
            </li>
            <li>
              • Empty or missing fields hide their element automatically, so optional
              tags never leave gaps or stray separators.
            </li>
            <li>
              • The overlay stays invisible until the first track update arrives, so
              nothing flashes on stream between tracks.
            </li>
          </ul>
        </div>
      </Section>

      <Section title="Track object fields" hint="click to copy">
        <div className="grid grid-cols-1 gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <TokenRow
              key={p.token}
              code={p.trackProp ? `track.${p.trackProp}` : "new Date()"}
              label={p.label}
              hint={p.hint}
              optional={p.optional}
            />
          ))}
        </div>
      </Section>

      <Section title="Install it" hint="a 20 second walkthrough">
        <ol className="space-y-2.5">
          {[
            {
              n: "1",
              t: "In Now Playing, open History → the app settings folder.",
              d: "It ships a read-only custom_html_template.html starter — copy, never edit it in place.",
            },
            {
              n: "2",
              t: "Download this generator's .html output.",
              d: "Name it custom_html_template.html (or copy your starter's filename exactly).",
            },
            {
              n: "3",
              t: "Open Settings → Theme editor, choose “Custom HTML”.",
              d: "Pro required — unlock it free for 30 days.",
            },
            {
              n: "4",
              t: "Click “Select HTML file” and pick the downloaded file.",
              d: "Use the app's text button to fire test track updates and check artwork.",
            },
            {
              n: "5",
              t: "In OBS add a Browser Source → set URL to the Overlay URL.",
              d: "Usually http://localhost:9000 — check the bottom of the app window for your port.",
            },
          ].map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-violet-500/20 text-[11px] font-bold text-violet-200">
                {s.n}
              </span>
              <div>
                <p className="text-[13px] font-medium text-slate-200">{s.t}</p>
                <p className="text-[12px] text-slate-500">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

function TokenRow({
  code,
  label,
  hint,
  optional,
}: {
  code: string;
  label: string;
  hint: string;
  optional: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          navigator.clipboard.writeText(code);
        } catch {
          /* clipboard unavailable */
        }
      }}
      title="Click to copy"
      className="group flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition hover:border-violet-400/50 hover:bg-violet-500/5"
    >
      <div className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-mono text-[12px] text-amber-200">{code}</span>
          {optional && (
            <span className="rounded bg-white/10 px-1 text-[9px] uppercase tracking-wide text-slate-400">
              optional
            </span>
          )}
        </span>
        <div className="truncate text-[11px] text-slate-500">
          {label} · {hint}
        </div>
      </div>
      <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-400 opacity-0 transition group-hover:opacity-100">
        copy
      </span>
    </button>
  );
}
