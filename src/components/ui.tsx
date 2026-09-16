import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

type SectionState = {
  scope: string;
  expanded: Record<string, boolean>;
  groupOpen?: boolean;
  setOpen: (key: string, open: boolean) => void;
};

const SectionContext = createContext<SectionState | null>(null);

/** Retains disclosure state across sidebar tabs, separately from overlay settings. */
export function SectionGroup({
  scope,
  label,
  children,
}: {
  scope: string;
  label: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [groupDefaults, setGroupDefaults] = useState<Record<string, boolean>>({});

  const setAll = (open: boolean) => {
    setExpanded((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${scope}:`)) delete next[key];
      }
      return next;
    });
    setGroupDefaults((current) => ({ ...current, [scope]: open }));
  };

  return (
    <SectionContext.Provider
      value={{
        scope,
        expanded,
        groupOpen: groupDefaults[scope],
        setOpen: (key, open) => setExpanded((current) => ({ ...current, [key]: open })),
      }}
    >
      <div className="flex items-center justify-between gap-2 px-1 pb-2 pt-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Sections
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAll(true)}
            aria-label={`Expand all ${label} sections`}
            className="section-bulk-action"
          >
            Expand all
          </button>
          <span className="h-3 w-px bg-white/10" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setAll(false)}
            aria-label={`Collapse all ${label} sections`}
            className="section-bulk-action"
          >
            Collapse all
          </button>
        </div>
      </div>
      {children}
    </SectionContext.Provider>
  );
}

export function Section({
  title,
  hint,
  summary,
  children,
  action,
  defaultOpen = false,
  nested = false,
}: {
  title: string;
  hint?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  defaultOpen?: boolean;
  nested?: boolean;
}) {
  const id = useId();
  const sections = useContext(SectionContext);
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const key = `${sections?.scope ?? "section"}:${title}`;
  const open = sections
    ? (sections.expanded[key] ?? sections.groupOpen ?? defaultOpen)
    : localOpen;
  const description = !open && summary != null ? summary : hint;
  const Heading = nested ? "h4" : "h3";

  return (
    <section className={cn("settings-section", nested && "settings-section-nested")} data-expanded={open} aria-labelledby={`${id}-trigger`}>
      <header className="flex items-center gap-2">
        <Heading className="min-w-0 flex-1">
          <button
            id={`${id}-trigger`}
            type="button"
            className="settings-section-toggle"
            aria-label={title}
            aria-expanded={open}
            aria-controls={`${id}-content`}
            aria-describedby={description ? `${id}-description` : undefined}
            onClick={() => {
              if (sections) sections.setOpen(key, !open);
              else setLocalOpen(!open);
            }}
          >
            <span className="min-w-0 flex-1">
              <span className="settings-section-title">{title}</span>
              {description && (
                <span id={`${id}-description`} className="settings-section-description">
                  {description}
                </span>
              )}
            </span>
            <svg
              className="settings-section-chevron"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>
        </Heading>
        {action}
      </header>
      <div
        id={`${id}-content`}
        role="region"
        aria-labelledby={`${id}-trigger`}
        aria-hidden={!open}
        inert={!open}
        className="settings-section-content"
      >
        <div className="settings-section-clip">
          <div className="settings-section-body">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-slate-300">{label}</span>
      {children}
    </div>
  );
}

/* Pills / segmented control ------------------------------------------------- */
export interface PillOption<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
  disabled?: boolean;
}

export function Pills<T extends string>({
  value,
  options,
  onChange,
  cols,
  size = "md",
}: {
  value: T;
  options: PillOption<T>[];
  onChange: (v: T) => void;
  cols?: number;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className="grid gap-1.5"
      style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` } : undefined}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={o.disabled}
            title={o.title}
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "cursor-pointer rounded-lg border text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400",
              size === "lg"
                ? "px-3 py-2.5 text-[13px]"
                : size === "sm"
                ? "px-2 py-1 text-[11px]"
                : "px-2.5 py-1.5 text-[12px]",
              active
                ? "border-violet-500/60 bg-violet-500/15 text-white ring-1 ring-violet-400/40"
                : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200",
              o.disabled && "cursor-not-allowed opacity-40"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* Horizontal tab bar -------------------------------------------------------- */
export function TabBar<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: PillOption<T>[];
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition",
            o.value === value
              ? "bg-white/10 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* Thin on/off switch -------------------------------------------------------- */
export function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400",
        on ? "bg-violet-500" : "bg-white/15"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
          on ? "left-[18px]" : "left-0.5"
        )}
      />
    </button>
  );
}

/* Range slider -------------------------------------------------------------- */
export function Slider({
  value,
  min,
  max,
  step = 1,
  suffix,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  label?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-white/15 accent-violet-500"
      />
      <span className="w-12 text-right font-mono text-[11px] text-slate-300">
        {value}
        {suffix ?? ""}
      </span>
    </div>
  );
}

/* Icon button --------------------------------------------------------------- */
export function IconBtn({
  children,
  onClick,
  title,
  active,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel ?? title}
      onClick={onClick}
      className={cn(
        "rounded-lg border border-white/10 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white",
        active && "border-violet-500/50 bg-violet-500/15 text-white"
      )}
    >
      {children}
    </button>
  );
}
