import { cn } from "@/lib/format";

export type LegendItem = { key: string; label: string; swatch: React.ReactNode };

export const RISK_LEGEND: LegendItem[] = [
  { key: "high", label: "High risk (70–100)", swatch: <span className="size-3 rounded-full bg-red-600/70 ring-2 ring-red-600" /> },
  { key: "moderate", label: "Moderate risk (40–69)", swatch: <span className="size-3 rounded-full bg-orange-600/60 ring-2 ring-orange-600" /> },
  { key: "low", label: "Low risk (0–39)", swatch: <span className="size-3 rounded-full bg-green-600/60 ring-2 ring-green-600" /> },
];

export const MARKER_LEGEND: LegendItem[] = [
  { key: "sos", label: "SOS – awaiting team", swatch: <span className="size-3 rounded-full bg-red-600 ring-2 ring-white" /> },
  { key: "sos-active", label: "SOS – assigned / in progress", swatch: <span className="size-3 rounded-full bg-orange-600 ring-2 ring-white" /> },
  { key: "road", label: "Flooded road (dashed = unverified)", swatch: <span className="h-1.5 w-4 rounded-full bg-sky-700" /> },
  { key: "shelter", label: "Relief shelter", swatch: <span className="size-3 rounded-[3px] bg-teal-600" /> },
  { key: "team", label: "Rescue team", swatch: <span className="size-3 rounded-[3px] bg-navy-800" /> },
];

export function MapLegend({ items, title = "Legend", className }: { items: LegendItem[]; title?: string; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white/95 p-2.5 text-[11px] shadow-md backdrop-blur", className)}>
      <p className="mb-1.5 font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-2 text-slate-700">
            <span className="grid w-4 place-items-center">{i.swatch}</span>
            {i.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
