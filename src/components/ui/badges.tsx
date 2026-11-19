import { FlaskConical } from "lucide-react";
import {
  ALERT_LEVEL_LABELS,
  RISK_LABELS,
  SHELTER_STATUS_LABELS,
  SOS_STATUS_LABELS,
  TEAM_STATUS_LABELS,
  URGENCY_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/format";
import type { AlertLevel, RiskCategory, SOSStatus, ShelterStatus, TeamStatus, Urgency } from "@/lib/types";
import { Badge, type Tone } from "./primitives";

export const RISK_TONE: Record<RiskCategory, Tone> = { low: "green", moderate: "orange", high: "red" };

export function RiskBadge({ category, score }: { category: RiskCategory; score?: number }) {
  return (
    <Badge tone={RISK_TONE[category]} dot>
      {RISK_LABELS[category]}
      {score !== undefined && <span className="tabular opacity-80">· {score}</span>}
    </Badge>
  );
}

const SOS_TONE: Record<SOSStatus, Tone> = { submitted: "red", assigned: "orange", in_progress: "blue", resolved: "green" };
export function SOSStatusBadge({ status }: { status: SOSStatus }) {
  return (
    <Badge tone={SOS_TONE[status]} dot>
      {SOS_STATUS_LABELS[status]}
    </Badge>
  );
}

const URGENCY_TONE: Record<Urgency, Tone> = { critical: "red", high: "orange", medium: "yellow", low: "neutral" };
export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return <Badge tone={URGENCY_TONE[urgency]}>{URGENCY_LABELS[urgency]}</Badge>;
}

const TEAM_TONE: Record<TeamStatus, Tone> = { available: "teal", deployed: "orange", off_duty: "neutral" };
export function TeamStatusBadge({ status }: { status: TeamStatus }) {
  return (
    <Badge tone={TEAM_TONE[status]} dot>
      {TEAM_STATUS_LABELS[status]}
    </Badge>
  );
}

const SHELTER_TONE: Record<ShelterStatus, Tone> = { open: "teal", full: "orange", closed: "neutral" };
export function ShelterStatusBadge({ status }: { status: ShelterStatus }) {
  return (
    <Badge tone={SHELTER_TONE[status]} dot>
      {SHELTER_STATUS_LABELS[status]}
    </Badge>
  );
}

export const ALERT_STYLES: Record<AlertLevel, { badge: string; border: string; bg: string; text: string }> = {
  red: { badge: "bg-red-600 text-white", border: "border-red-300", bg: "bg-red-50", text: "text-red-800" },
  orange: { badge: "bg-orange-500 text-white", border: "border-orange-300", bg: "bg-orange-50", text: "text-orange-800" },
  yellow: { badge: "bg-yellow-400 text-yellow-950", border: "border-yellow-300", bg: "bg-yellow-50", text: "text-yellow-900" },
};

export function AlertLevelBadge({ level, className }: { level: AlertLevel; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", ALERT_STYLES[level].badge, className)}>
      {ALERT_LEVEL_LABELS[level].name} · {ALERT_LEVEL_LABELS[level].meaning}
    </span>
  );
}

/** Marks anything driven by simulated / sample data. */
export function SimulatedTag({ label = "Simulated data", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-dashed border-violet-300 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700",
        className,
      )}
      title="This information is simulated sample data for demonstration purposes."
    >
      <FlaskConical className="size-3" aria-hidden />
      {label}
    </span>
  );
}
