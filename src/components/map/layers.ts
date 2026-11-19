import {
  EMERGENCY_TYPE_LABELS,
  RISK_HEX,
  RISK_LABELS,
  SEVERITY_SHORT,
  SHELTER_STATUS_LABELS,
  SOS_STATUS_LABELS,
  TEAM_STATUS_LABELS,
  URGENCY_LABELS,
} from "@/lib/constants";
import { shelterAvailable } from "@/lib/data/selectors";
import { escapeHtml as e } from "@/lib/format";
import type { RiskAssessment } from "@/lib/risk";
import type { AppState, FloodReport, RescueTeam, SOSRequest, Shelter } from "@/lib/types";
import type { MapCircle, MapLine, MapMarker, MarkerKind } from "./LeafletMap";

export function zoneCircles(
  state: AppState,
  assessments: Record<string, RiskAssessment>,
  selectedZoneId?: string | null,
): MapCircle[] {
  return state.zones.map((z) => {
    const a = assessments[z.id];
    const category = a?.category ?? "low";
    return {
      id: z.id,
      lat: z.lat,
      lng: z.lng,
      radius: z.radiusM,
      color: RISK_HEX[category],
      selected: selectedZoneId === z.id,
      label: `${e(z.name)} · ${a?.score ?? "–"}`,
      tooltip: `<strong>${e(z.name)}</strong><br/>Risk: ${RISK_LABELS[category]} (${a?.score ?? "–"}/100)<br/><span style="opacity:.7">Click for explanation</span>`,
    };
  });
}

const SOS_KIND: Record<SOSRequest["status"], MarkerKind> = {
  submitted: "sos",
  assigned: "sos-assigned",
  in_progress: "sos-progress",
  resolved: "sos-resolved",
};

export function sosMarkers(list: SOSRequest[], selectedId?: string | null): MapMarker[] {
  return list.map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    kind: SOS_KIND[s.status],
    pulse: s.status === "submitted",
    selected: s.id === selectedId,
    tooltip: `<strong>${e(s.reference)}</strong> · ${URGENCY_LABELS[s.urgency]}<br/>${e(EMERGENCY_TYPE_LABELS[s.emergencyType])}<br/>${e(s.landmark || "")}<br/>Status: ${SOS_STATUS_LABELS[s.status]}`,
  }));
}

export function shelterMarkers(list: Shelter[], selectedId?: string | null): MapMarker[] {
  return list.map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    kind: s.status === "open" ? "shelter" : s.status === "full" ? "shelter-full" : "shelter-closed",
    selected: s.id === selectedId,
    tooltip: `<strong>${e(s.name)}</strong><br/>${SHELTER_STATUS_LABELS[s.status]} · ${shelterAvailable(s)} of ${s.capacity} places free`,
  }));
}

export function teamMarkers(list: RescueTeam[]): MapMarker[] {
  return list
    .filter((t) => t.status !== "off_duty")
    .map((t) => ({
      id: t.id,
      lat: t.lat,
      lng: t.lng,
      kind: t.status === "available" ? "team" : "team-deployed",
      size: 24,
      tooltip: `<strong>${e(t.name)}</strong><br/>${TEAM_STATUS_LABELS[t.status]} · ${t.members} members`,
    }));
}

const REPORT_COLOR: Record<FloodReport["severity"], string> = { low: "#38bdf8", moderate: "#0284c7", severe: "#1e3a8a" };

export function reportLayers(list: FloodReport[]): { lines: MapLine[]; markers: MapMarker[] } {
  const active = list.filter((r) => r.status !== "cleared");
  const tooltip = (r: FloodReport) =>
    `<strong>${e(r.roadName)}</strong><br/>Flooded road · ${SEVERITY_SHORT[r.severity]}${r.waterDepthCm ? ` (~${r.waterDepthCm} cm)` : ""}<br/>${r.status === "verified" ? "Verified" : "Unverified report"}`;
  return {
    lines: active
      .filter((r) => r.path && r.path.length > 1)
      .map((r) => ({ id: r.id, path: r.path!, color: REPORT_COLOR[r.severity], dashed: r.status !== "verified", tooltip: tooltip(r) })),
    markers: active
      .filter((r) => !r.path || r.path.length < 2)
      .map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, kind: "report" as const, size: 22, tooltip: tooltip(r) })),
  };
}
