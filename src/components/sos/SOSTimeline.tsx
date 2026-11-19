"use client";

import { Check, Phone, Users } from "lucide-react";
import { SOS_STATUS_LABELS, SOS_STATUS_ORDER } from "@/lib/constants";
import { useNow } from "@/lib/data/AppDataProvider";
import { cn, formatTime, timeAgo } from "@/lib/format";
import type { AppState, SOSRequest } from "@/lib/types";

const STEP_HELP: Record<SOSRequest["status"], string> = {
  submitted: "Request received by the control room",
  assigned: "A rescue team has been assigned",
  in_progress: "Team is on the way / on site",
  resolved: "Operation completed",
};

/** Horizontal stepper: Submitted → Assigned → In Progress → Resolved */
export function SOSStepper({ status, compact = false }: { status: SOSRequest["status"]; compact?: boolean }) {
  const current = SOS_STATUS_ORDER.indexOf(status);
  return (
    <ol className="flex items-start" aria-label="Request progress">
      {SOS_STATUS_ORDER.map((s, i) => {
        const done = i <= current;
        const isCurrent = i === current;
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span className={cn("absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2", i <= current ? "bg-teal-600" : "bg-slate-200")} aria-hidden />
            )}
            <span
              className={cn(
                "relative z-10 grid size-7 place-items-center rounded-full border-2 text-xs font-bold transition-colors",
                done ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white text-slate-400",
                isCurrent && status !== "resolved" && "ring-4 ring-teal-100",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("mt-1.5 text-[11px] font-semibold leading-tight", done ? "text-navy-950" : "text-slate-400")}>{SOS_STATUS_LABELS[s]}</span>
            {!compact && <span className="mt-0.5 hidden text-[10px] leading-tight text-slate-500 sm:block">{STEP_HELP[s]}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Vertical event log for a request + assigned team card. */
export function SOSTimeline({ state, sos }: { state: AppState; sos: SOSRequest }) {
  const now = useNow();
  const events = state.sosEvents.filter((e) => e.sosId === sos.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const team = sos.assignedTeamId ? state.teams.find((t) => t.id === sos.assignedTeamId) : null;
  return (
    <div className="space-y-4">
      {team && (
        <div className="flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 p-3">
          <Users className="mt-0.5 size-4 text-teal-700" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-teal-900">{team.name}</p>
            <p className="text-xs text-teal-800">
              {team.agency} · {team.members} members
            </p>
          </div>
          <a href={`tel:${team.contact.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline">
            <Phone className="size-3.5" /> {team.contact}
          </a>
        </div>
      )}
      <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
        {events.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[23px] top-1 size-3 rounded-full border-2 border-white bg-teal-600 ring-1 ring-teal-600" aria-hidden />
            <p className="text-xs font-semibold text-navy-950">
              {SOS_STATUS_LABELS[e.status]} <span className="font-normal text-slate-400">· {formatTime(e.createdAt)} ({timeAgo(e.createdAt, now)})</span>
            </p>
            <p className="text-xs text-slate-600">{e.note}</p>
            <p className="text-[11px] text-slate-400">by {e.actorName}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
