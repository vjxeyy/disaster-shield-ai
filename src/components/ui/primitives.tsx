import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/format";

/* ---------------- Button ---------------- */

type ButtonVariant = "primary" | "teal" | "danger" | "outline" | "ghost" | "soft";
type ButtonSize = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-navy-900 text-white hover:bg-navy-800 shadow-sm",
  teal: "bg-teal-600 text-white hover:bg-teal-700 shadow-sm",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  soft: "bg-navy-50 text-navy-800 hover:bg-navy-100",
};
const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-5 text-base gap-2 rounded-lg",
  xl: "h-16 px-6 text-lg gap-3 rounded-xl",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <div className="mt-0.5 text-navy-600">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-navy-950">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ---------------- Badge ---------------- */

export type Tone = "neutral" | "navy" | "teal" | "green" | "orange" | "red" | "yellow" | "blue" | "violet";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  navy: "bg-navy-50 text-navy-800 ring-navy-200",
  teal: "bg-teal-50 text-teal-800 ring-teal-200",
  green: "bg-green-50 text-green-800 ring-green-200",
  orange: "bg-orange-50 text-orange-800 ring-orange-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  yellow: "bg-yellow-50 text-yellow-800 ring-yellow-300",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  dot,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/* ---------------- Misc ---------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      {icon && <div className="mb-3 grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500">{icon}</div>}
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, tone = "teal", className }: { value: number; max: number; tone?: "teal" | "orange" | "red" | "navy"; className?: string }) {
  const pctValue = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = { teal: "bg-teal-600", orange: "bg-orange-500", red: "bg-red-600", navy: "bg-navy-700" }[tone];
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pctValue}%` }} />
    </div>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md font-semibold transition-colors",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            value === o.value ? "bg-white text-navy-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn("rounded-full px-1.5 text-[10px]", value === o.value ? "bg-navy-100 text-navy-800" : "bg-slate-200 text-slate-600")}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
