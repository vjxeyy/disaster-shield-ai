import type { ReactNode } from "react";
import { cn } from "@/lib/format";

const TONES = {
  navy: "bg-navy-50 text-navy-700",
  teal: "bg-teal-50 text-teal-700",
  red: "bg-red-50 text-red-600",
  orange: "bg-orange-50 text-orange-600",
  green: "bg-green-50 text-green-700",
  slate: "bg-slate-100 text-slate-600",
};

export function StatCard({
  label,
  value,
  icon,
  tone = "navy",
  hint,
  highlight,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: keyof typeof TONES;
  hint?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors",
        highlight ? "border-red-300 ring-2 ring-red-100" : "border-slate-200",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", TONES[tone])}>{icon}</span>
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight text-navy-950 tabular">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
