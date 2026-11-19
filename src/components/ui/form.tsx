import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/format";

const base =
  "w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:bg-slate-50 disabled:text-slate-500";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600" aria-hidden>*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(base, "h-10", invalid ? "border-red-400" : "border-slate-300 focus:border-teal-600", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function Textarea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(base, "min-h-24 py-2", invalid ? "border-red-400" : "border-slate-300 focus:border-teal-600", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function Select({ className, invalid, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn(base, "h-10 pr-8", invalid ? "border-red-400" : "border-slate-300 focus:border-teal-600", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {children}
    </select>
  );
}

/** Large tappable option tiles — used for emergency type / urgency / severity choices. */
export function ChoiceTiles<T extends string>({
  value,
  onChange,
  options,
  columns = "grid-cols-2 sm:grid-cols-3",
  invalid,
  name,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string; description?: string; icon?: ReactNode; tone?: string }[];
  columns?: string;
  invalid?: boolean;
  name: string;
}) {
  return (
    <div className={cn("grid gap-2", columns)} role="radiogroup" aria-label={name}>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-14 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
              selected
                ? cn("border-navy-800 bg-navy-900 text-white", o.tone)
                : cn("bg-white text-slate-800 hover:border-slate-400", invalid ? "border-red-300" : "border-slate-300"),
            )}
          >
            {o.icon && <span className={cn("shrink-0", selected ? "text-white" : "text-navy-600")}>{o.icon}</span>}
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight">{o.label}</span>
              {o.description && (
                <span className={cn("mt-0.5 block text-[11px] leading-tight", selected ? "text-white/80" : "text-slate-500")}>
                  {o.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
