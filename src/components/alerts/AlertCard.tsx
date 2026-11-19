"use client";

import { Bot, CircleCheck, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { AlertLevelBadge, ALERT_STYLES, SimulatedTag } from "@/components/ui/badges";
import { formatDateTime, cn, timeAgo } from "@/lib/format";
import type { AppState, DisasterAlert } from "@/lib/types";

export function AlertCard({ alert, state, now, actions, highlightZoneId }: { alert: DisasterAlert; state: AppState; now: number; actions?: ReactNode; highlightZoneId?: string }) {
  const s = ALERT_STYLES[alert.level];
  return (
    <article className={cn("overflow-hidden rounded-xl border-2 bg-white", alert.active ? s.border : "border-slate-200 opacity-70")}>
      <div className={cn("flex flex-wrap items-center justify-between gap-2 px-4 py-2.5", alert.active ? s.bg : "bg-slate-50")}>
        <div className="flex flex-wrap items-center gap-2">
          <AlertLevelBadge level={alert.level} />
          {!alert.active && <span className="text-[11px] font-semibold uppercase text-slate-500">Withdrawn</span>}
          {alert.source === "risk_engine" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-700">
              <Bot className="size-3.5" /> Risk-engine recommended
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-500" title={formatDateTime(alert.issuedAt)}>
          {timeAgo(alert.issuedAt, now)} · {alert.issuedByName}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className={cn("text-base font-bold", alert.active ? s.text : "text-slate-700")}>{alert.title}</h3>
          <p className="mt-1 text-sm text-slate-700">{alert.message}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <MapPin className="size-3.5 text-slate-400" />
          {alert.zoneIds.map((z) => (
            <span
              key={z}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                z === highlightZoneId ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-700",
              )}
            >
              {state.zones.find((x) => x.id === z)?.name ?? z}
            </span>
          ))}
        </div>
        {alert.instructions.length > 0 && (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Safety instructions</p>
            <ul className="space-y-1">
              {alert.instructions.map((ins, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-800">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-teal-600" />
                  {ins}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SimulatedTag label="Simulated alert" />
          {actions}
        </div>
      </div>
    </article>
  );
}
