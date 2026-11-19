"use client";

import { Bell, CloudRain, House, LifeBuoy, Settings, ShieldCheck, Siren, Tent, WavesHorizontal } from "lucide-react";
import { useNow } from "@/lib/data/AppDataProvider";
import { cn, timeAgo } from "@/lib/format";
import type { ActivityEvent } from "@/lib/types";

const ICONS: Record<ActivityEvent["type"], typeof Bell> = {
  sos: Siren,
  assignment: LifeBuoy,
  status: ShieldCheck,
  alert: Bell,
  report: WavesHorizontal,
  shelter: Tent,
  risk: CloudRain,
  team: House,
  system: Settings,
};

export function ActivityFeed({ events, limit = 10 }: { events: ActivityEvent[]; limit?: number }) {
  const now = useNow();
  return (
    <ol className="relative space-y-3 px-4 py-3">
      {events.slice(0, limit).map((ev) => {
        const Icon = ICONS[ev.type] ?? Bell;
        return (
          <li key={ev.id} className="flex gap-3 animate-fade-in">
            <span
              className={cn(
                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                ev.severity === "critical" ? "bg-red-50 text-red-600" : ev.severity === "warning" ? "bg-orange-50 text-orange-600" : "bg-slate-100 text-slate-600",
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs leading-snug text-slate-800">{ev.message}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(ev.createdAt, now)}</p>
            </div>
          </li>
        );
      })}
      {events.length === 0 && <li className="text-xs text-slate-500">No activity yet.</li>}
    </ol>
  );
}
