import { URGENCY_RANK } from "../constants";
import { distanceKm } from "../geo";
import type { RiskAssessment } from "../risk";
import type { AppState, RainfallReading, RescueTeam, RiskCategory, SOSRequest, Shelter } from "../types";

export const zoneName = (state: AppState, id?: string | null) => state.zones.find((z) => z.id === id)?.name ?? "—";
export const teamById = (state: AppState, id?: string | null) => state.teams.find((t) => t.id === id) ?? null;

export function latestRainfall(state: AppState, zoneId: string): RainfallReading | null {
  let best: RainfallReading | null = null;
  for (const r of state.rainfall) {
    if (r.zoneId === zoneId && (!best || r.recordedAt > best.recordedAt)) best = r;
  }
  return best;
}

export function shelterAvailable(s: Shelter): number {
  return s.status === "closed" ? 0 : Math.max(0, s.capacity - s.occupied);
}

const CATEGORY_RANK: Record<RiskCategory, number> = { low: 0, moderate: 1, high: 2 };

export function overallRisk(assessments: Record<string, RiskAssessment>): RiskCategory {
  let worst: RiskCategory = "low";
  for (const a of Object.values(assessments)) if (CATEGORY_RANK[a.category] > CATEGORY_RANK[worst]) worst = a.category;
  return worst;
}

export function dashboardStats(state: AppState, assessments: Record<string, RiskAssessment>) {
  const activeSOS = state.sos.filter((s) => s.status !== "resolved");
  const affectedZoneIds = new Set<string>();
  for (const a of Object.values(assessments)) if (a.category !== "low") affectedZoneIds.add(a.zoneId);
  for (const r of state.floodReports) if (r.status !== "cleared" && r.severity !== "low") affectedZoneIds.add(r.zoneId);
  const openShelters = state.shelters.filter((s) => s.status !== "closed");
  const counts = { low: 0, moderate: 0, high: 0 } as Record<RiskCategory, number>;
  for (const a of Object.values(assessments)) counts[a.category]++;
  return {
    affectedAreas: affectedZoneIds.size,
    totalZones: state.zones.length,
    activeSOS: activeSOS.length,
    criticalSOS: activeSOS.filter((s) => s.urgency === "critical" || s.urgency === "high").length,
    unassignedSOS: activeSOS.filter((s) => s.status === "submitted").length,
    availableTeams: state.teams.filter((t) => t.status === "available").length,
    totalTeams: state.teams.length,
    totalShelters: state.shelters.length,
    openShelters: openShelters.length,
    totalCapacity: openShelters.reduce((n, s) => n + s.capacity, 0),
    availableCapacity: state.shelters.reduce((n, s) => n + shelterAvailable(s), 0),
    occupied: openShelters.reduce((n, s) => n + s.occupied, 0),
    riskCounts: counts,
    overall: overallRisk(assessments),
    activeReports: state.floodReports.filter((r) => r.status !== "cleared").length,
    activeAlerts: state.alerts.filter((a) => a.active).length,
  };
}

/** Sort: unresolved first, then by urgency, then oldest first (longest waiting). */
export function sortSOSForTriage(list: SOSRequest[]): SOSRequest[] {
  return [...list].sort((a, b) => {
    const ar = a.status === "resolved" ? 1 : 0;
    const br = b.status === "resolved" ? 1 : 0;
    if (ar !== br) return ar - br;
    if (ar === 1) return b.updatedAt.localeCompare(a.updatedAt);
    const u = URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency];
    if (u !== 0) return u;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export interface TeamRecommendation {
  team: RescueTeam;
  km: number;
  match: boolean;
  reason: string;
}

const PREFERRED_TYPE: Record<SOSRequest["emergencyType"], RescueTeam["type"][]> = {
  trapped: ["boat", "fire"],
  medical: ["medical"],
  evacuation: ["boat", "general"],
  food_water: ["general"],
  electrical: ["general", "fire"],
  structural: ["fire", "general"],
  other: ["general", "boat"],
};

/** Rank rescue teams for an SOS: available first, capability match, then distance. */
export function recommendTeams(state: AppState, sos: SOSRequest): TeamRecommendation[] {
  const preferred = PREFERRED_TYPE[sos.emergencyType];
  return state.teams
    .map((team) => {
      const km = distanceKm(sos.lat, sos.lng, team.lat, team.lng);
      const match = preferred.includes(team.type);
      return {
        team,
        km,
        match,
        reason: `${km.toFixed(1)} km away${match ? " · capability match" : ""}`,
      };
    })
    .sort((a, b) => {
      const av = a.team.status === "available" ? 0 : 1;
      const bv = b.team.status === "available" ? 0 : 1;
      if (av !== bv) return av - bv;
      // capability match is worth ~3 km of travel
      return a.km - (a.match ? 3 : 0) - (b.km - (b.match ? 3 : 0));
    });
}

/** High-risk zones without an active orange/red alert covering them. */
export function zonesNeedingAlert(state: AppState, assessments: Record<string, RiskAssessment>): string[] {
  return Object.values(assessments)
    .filter((a) => a.category === "high")
    .filter(
      (a) => !state.alerts.some((al) => al.active && al.level === "red" && al.zoneIds.includes(a.zoneId)),
    )
    .map((a) => a.zoneId);
}
