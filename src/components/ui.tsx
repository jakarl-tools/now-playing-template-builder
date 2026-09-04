import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

/* Section wrapper ---------------------------------------------------------- */
export function Section({
  title,
  hint,
  children,
  action,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </h3>
          {hint && (
            <span className="text-[11px] text-slate-500">{hint}</span>
          )}
        </div>
        {action}
      </header>
      {children}
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
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-lg border text-left transition",
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
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-5 w-9 rounded-full transition",
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
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
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
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
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
