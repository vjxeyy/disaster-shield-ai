import { Accessibility, Baby, BriefcaseMedical, Droplet, HeartPulse, Plug, ShowerHead, Utensils } from "lucide-react";
import { FACILITY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/format";
import type { FacilityKey } from "@/lib/types";

export const FACILITY_ICONS: Record<FacilityKey, typeof Droplet> = {
  water: Droplet,
  food: Utensils,
  medical: HeartPulse,
  first_aid: BriefcaseMedical,
  electricity: Plug,
  accessible: Accessibility,
  sanitation: ShowerHead,
  child_care: Baby,
};

export function FacilityList({ facilities, size = "sm" }: { facilities: FacilityKey[]; size?: "sm" | "md" }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {facilities.map((f) => {
        const Icon = FACILITY_ICONS[f];
        return (
          <li
            key={f}
            className={cn(
              "inline-flex items-center gap-1 rounded-md bg-teal-50 font-medium text-teal-800",
              size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
            )}
            title={FACILITY_LABELS[f]}
          >
            <Icon className={size === "sm" ? "size-3" : "size-3.5"} />
            {FACILITY_LABELS[f]}
          </li>
        );
      })}
      {facilities.length === 0 && <li className="text-[11px] text-slate-400">No facilities listed</li>}
    </ul>
  );
}
