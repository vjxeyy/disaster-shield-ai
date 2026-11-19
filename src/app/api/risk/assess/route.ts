/**
 * POST /api/risk/assess
 * Server-side flood-risk assessment. Accepts a RiskInput (zone + latest rainfall + active reports +
 * active SOS) and returns the model's assessment. This is the integration point for a future
 * trained ML model or for external systems (IoT gauges, SMS gateways) that need a score.
 */
import { getRiskModel, type RiskInput } from "@/lib/risk";

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export async function POST(request: Request) {
  let body: Partial<RiskInput>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const zone = body.zone;
  if (!zone || typeof zone.id !== "string" || !isNum(zone.historicalSusceptibility) || zone.historicalSusceptibility < 0 || zone.historicalSusceptibility > 1) {
    return Response.json({ error: "zone with id and historicalSusceptibility (0..1) is required" }, { status: 400 });
  }
  const rainfall = body.rainfall ?? null;
  if (rainfall && (!isNum(rainfall.rainfall24hMm) || !isNum(rainfall.intensityMmHr) || rainfall.rainfall24hMm < 0 || rainfall.intensityMmHr < 0)) {
    return Response.json({ error: "rainfall values must be non-negative numbers" }, { status: 400 });
  }
  const floodReports = Array.isArray(body.floodReports) ? body.floodReports.slice(0, 500) : [];
  const activeSOS = Array.isArray(body.activeSOS) ? body.activeSOS.slice(0, 500) : [];
  if (floodReports.some((r) => !["low", "moderate", "severe"].includes(r?.severity)) || activeSOS.some((s) => !["low", "medium", "high", "critical"].includes(s?.urgency))) {
    return Response.json({ error: "invalid report severity or SOS urgency" }, { status: 400 });
  }

  const model = getRiskModel();
  const assessment = model.assess({
    zone: { ...zone, drainageNote: String(zone.drainageNote ?? "").slice(0, 300), name: String(zone.name ?? zone.id).slice(0, 80) },
    rainfall,
    floodReports,
    activeSOS,
  });
  return Response.json({ assessment, model: { id: model.id, name: model.name, version: model.version, description: model.description } });
}

export async function GET() {
  const model = getRiskModel();
  return Response.json({ model: { id: model.id, name: model.name, version: model.version, description: model.description }, usage: "POST a RiskInput JSON body to receive an assessment." });
}
