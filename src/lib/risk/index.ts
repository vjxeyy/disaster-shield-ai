import type { AppState } from "../types";
import { ruleBasedModel, type RiskAssessment, type RiskInput, type RiskModel } from "./engine";

export * from "./engine";

/**
 * Model registry. To integrate a trained ML model later, implement `RiskModel`
 * (or wrap a remote inference endpoint) and register it here.
 */
const MODELS: Record<string, RiskModel> = {
  [ruleBasedModel.id]: ruleBasedModel,
};

export function getRiskModel(id: string = ruleBasedModel.id): RiskModel {
  return MODELS[id] ?? ruleBasedModel;
}

/** Build model inputs for one zone from the shared application state. */
export function buildRiskInput(state: AppState, zoneId: string): RiskInput | null {
  const zone = state.zones.find((z) => z.id === zoneId);
  if (!zone) return null;
  const readings = state.rainfall
    .filter((r) => r.zoneId === zoneId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  return {
    zone,
    rainfall: readings[0] ?? null,
    floodReports: state.floodReports.filter((r) => r.zoneId === zoneId && r.status !== "cleared"),
    activeSOS: state.sos.filter((s) => s.zoneId === zoneId && s.status !== "resolved"),
  };
}

/** Assess every zone. Returns a map keyed by zone id. */
export function assessAllZones(state: AppState, model: RiskModel = getRiskModel()): Record<string, RiskAssessment> {
  const out: Record<string, RiskAssessment> = {};
  const now = new Date(state.meta.lastUpdated);
  for (const zone of state.zones) {
    const input = buildRiskInput(state, zone.id);
    if (input) out[zone.id] = model.assess(input, now);
  }
  return out;
}
