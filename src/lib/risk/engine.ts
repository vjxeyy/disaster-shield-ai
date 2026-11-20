/**
 * RESCURA — Flood Risk Engine
 *
 * PROTOTYPE. This is a transparent, rule-based scoring model that runs on SIMULATED inputs.
 * It is NOT a trained machine-learning model and has NOT been scientifically validated.
 *
 * Every model implements the `RiskModel` interface, so a trained ML model (e.g. a gradient-boosted
 * classifier served from an API) can be dropped in later by registering another implementation in
 * `./index.ts` without touching any UI code.
 */
import type { FloodReport, RainfallReading, RiskCategory, RiskZone, SOSRequest } from "../types";

export interface RiskInput {
  zone: RiskZone;
  /** Latest rainfall reading for the zone (null if none available). */
  rainfall: RainfallReading | null;
  /** Active (not cleared) flood / waterlogging reports located in the zone. */
  floodReports: FloodReport[];
  /** Unresolved SOS requests located in the zone. */
  activeSOS: SOSRequest[];
}

export interface RiskFactor {
  key: "rainfall" | "intensity" | "reports" | "incidents" | "history";
  label: string;
  /** Human-readable input value, e.g. "182 mm in 24 h". */
  input: string;
  points: number;
  maxPoints: number;
  explanation: string;
}

export interface RiskAssessment {
  zoneId: string;
  score: number;
  category: RiskCategory;
  factors: RiskFactor[];
  summary: string;
  modelId: string;
  modelVersion: string;
  assessedAt: string;
}

export interface RiskModel {
  id: string;
  name: string;
  version: string;
  description: string;
  assess(input: RiskInput, now?: Date): RiskAssessment;
}

/* ------------------------------------------------------------------ */
/* Thresholds                                                          */
/* ------------------------------------------------------------------ */

export const CATEGORY_THRESHOLDS = { high: 70, moderate: 40 } as const;

export function categorize(score: number): RiskCategory {
  if (score >= CATEGORY_THRESHOLDS.high) return "high";
  if (score >= CATEGORY_THRESHOLDS.moderate) return "moderate";
  return "low";
}

/** IMD 24-hour rainfall intensity classes (mm). Used only to label the input. */
export function imdRainfallClass(mm24h: number): string {
  if (mm24h >= 204.5) return "Extremely heavy";
  if (mm24h >= 115.6) return "Very heavy";
  if (mm24h >= 64.5) return "Heavy";
  if (mm24h >= 15.6) return "Moderate";
  if (mm24h >= 2.5) return "Light";
  if (mm24h > 0) return "Very light";
  return "No rain";
}

/* Factor weights — the maximum points each factor can contribute (sum = 100). */
export const WEIGHTS = {
  rainfall: 35,
  intensity: 10,
  reports: 20,
  incidents: 15,
  history: 20,
} as const;

/** Rainfall (24 h) at which the rainfall factor saturates — IMD "extremely heavy" threshold. */
const RAIN_SATURATION_MM = 204.5;
/** Hourly intensity at which the intensity factor saturates (prototype assumption). */
const INTENSITY_SATURATION_MM_HR = 40;

const REPORT_POINTS = { low: 4, moderate: 7, severe: 10 } as const;
const INCIDENT_POINTS = { critical: 5, high: 5, medium: 3, low: 3 } as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

/* ------------------------------------------------------------------ */
/* Rule-based model                                                    */
/* ------------------------------------------------------------------ */

const RULE_MODEL_ID = "rule-based";
const RULE_MODEL_VERSION = "1.0.0-prototype";

export const ruleBasedModel: RiskModel = {
  id: RULE_MODEL_ID,
  name: "Rule-based flood risk engine",
  version: RULE_MODEL_VERSION,
  description:
    "Transparent weighted scoring of rainfall, waterlogging reports, active SOS incidents and a sample historical susceptibility index. Simulated inputs; not a validated forecast.",

  assess(input: RiskInput, now: Date = new Date()): RiskAssessment {
    const { zone, rainfall, floodReports, activeSOS } = input;
    const rain = rainfall?.rainfall24hMm ?? 0;
    const intensity = rainfall?.intensityMmHr ?? 0;

    // 1. Accumulated rainfall
    const rainPts = Math.min(WEIGHTS.rainfall, (rain / RAIN_SATURATION_MM) * WEIGHTS.rainfall);

    // 2. Short-duration intensity
    const intensityPts = Math.min(
      WEIGHTS.intensity,
      (intensity / INTENSITY_SATURATION_MM_HR) * WEIGHTS.intensity,
    );

    // 3. Citizen / field waterlogging reports
    const reportRaw = floodReports.reduce((sum, r) => sum + REPORT_POINTS[r.severity], 0);
    const reportPts = Math.min(WEIGHTS.reports, reportRaw);
    const severeCount = floodReports.filter((r) => r.severity === "severe").length;

    // 4. Active SOS incidents nearby
    const incidentRaw = activeSOS.reduce((sum, s) => sum + INCIDENT_POINTS[s.urgency], 0);
    const incidentPts = Math.min(WEIGHTS.incidents, incidentRaw);

    // 5. Historical susceptibility (sample index)
    const historyPts = zone.historicalSusceptibility * WEIGHTS.history;

    const factors: RiskFactor[] = [
      {
        key: "rainfall",
        label: "Rainfall (last 24 h)",
        input: `${Math.round(rain)} mm · ${imdRainfallClass(rain)}`,
        points: round1(rainPts),
        maxPoints: WEIGHTS.rainfall,
        explanation:
          rain >= 115.6
            ? `${Math.round(rain)} mm fell in 24 h (IMD "${imdRainfallClass(rain).toLowerCase()}" class). Soil and drains are likely saturated.`
            : rain >= 64.5
              ? `${Math.round(rain)} mm in 24 h is heavy rain; low-lying streets may start to collect water.`
              : `${Math.round(rain)} mm in 24 h — limited contribution to flood risk.`,
      },
      {
        key: "intensity",
        label: "Rainfall intensity (now)",
        input: `${Math.round(intensity)} mm/hr`,
        points: round1(intensityPts),
        maxPoints: WEIGHTS.intensity,
        explanation:
          intensity >= 30
            ? `Intense bursts of ${Math.round(intensity)} mm/hr can exceed storm-water drain capacity quickly.`
            : `Current intensity of ${Math.round(intensity)} mm/hr is within what drains usually handle.`,
      },
      {
        key: "reports",
        label: "Waterlogging reports",
        input: `${floodReports.length} active${severeCount ? ` (${severeCount} severe)` : ""}`,
        points: round1(reportPts),
        maxPoints: WEIGHTS.reports,
        explanation:
          floodReports.length > 0
            ? `${floodReports.length} flooded-road report${floodReports.length > 1 ? "s" : ""} from residents/field staff confirm water on the ground.`
            : "No active waterlogging reports in this locality.",
      },
      {
        key: "incidents",
        label: "Active SOS incidents",
        input: `${activeSOS.length} unresolved`,
        points: round1(incidentPts),
        maxPoints: WEIGHTS.incidents,
        explanation:
          activeSOS.length > 0
            ? `${activeSOS.length} unresolved emergency request${activeSOS.length > 1 ? "s" : ""} indicate people are already affected.`
            : "No unresolved emergency requests in this locality.",
      },
      {
        key: "history",
        label: "Historical susceptibility",
        input: `Index ${zone.historicalSusceptibility.toFixed(2)} (sample)`,
        points: round1(historyPts),
        maxPoints: WEIGHTS.history,
        explanation: `${zone.drainageNote} Sample susceptibility index — replace with surveyed data.`,
      },
    ];

    const score = Math.max(0, Math.min(100, Math.round(rainPts + intensityPts + reportPts + incidentPts + historyPts)));
    const category = categorize(score);

    const top = [...factors].sort((a, b) => b.points - a.points).slice(0, 2);
    const summary =
      category === "high"
        ? `High risk in ${zone.name}, driven mainly by ${top.map((f) => f.label.toLowerCase()).join(" and ")}.`
        : category === "moderate"
          ? `Moderate risk in ${zone.name}; watch ${top.map((f) => f.label.toLowerCase()).join(" and ")}.`
          : `Low risk in ${zone.name} under current conditions.`;

    return {
      zoneId: zone.id,
      score,
      category,
      factors,
      summary,
      modelId: RULE_MODEL_ID,
      modelVersion: RULE_MODEL_VERSION,
      assessedAt: now.toISOString(),
    };
  },
};
