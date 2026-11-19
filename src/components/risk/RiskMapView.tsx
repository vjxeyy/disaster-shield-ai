"use client";

import { BrainCircuit, Info, Layers, Server } from "lucide-react";
import { useMemo, useState } from "react";
import { RainfallTrendChart } from "@/components/charts/Charts";
import { MapLegend, MARKER_LEGEND, RISK_LEGEND } from "@/components/map/MapLegend";
import { MapView } from "@/components/map/MapView";
import { reportLayers, shelterMarkers, sosMarkers, teamMarkers, zoneCircles } from "@/components/map/layers";
import { RiskBadge, SimulatedTag } from "@/components/ui/badges";
import { Badge, Button, Card, CardHeader, SectionTitle } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { can } from "@/lib/auth/permissions";
import { useReadyData, useRiskAssessments } from "@/lib/data/AppDataProvider";
import { latestRainfall } from "@/lib/data/selectors";
import { cn } from "@/lib/format";
import { buildRiskInput, getRiskModel, imdRainfallClass } from "@/lib/risk";
import type { MapFocus } from "@/components/map/LeafletMap";
import { RiskBreakdown } from "./RiskBreakdown";
import { ScenarioPanel } from "./ScenarioPanel";

type LayerKey = "sos" | "roads" | "shelters" | "teams";

export function RiskMapView() {
  const { state, user } = useReadyData();
  const assessments = useRiskAssessments(state);
  const toast = useToast();
  const [selectedZoneId, setSelectedZoneId] = useState("velachery");
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ sos: true, roads: true, shelters: false, teams: false });
  const [serverResult, setServerResult] = useState<string | null>(null);
  const [serverBusy, setServerBusy] = useState(false);

  const model = getRiskModel();
  const zone = state.zones.find((z) => z.id === selectedZoneId) ?? state.zones[0];
  const assessment = assessments[zone.id];
  const canSimulate = can(user?.role, "risk:simulate");

  const ranking = useMemo(
    () => state.zones.map((z) => ({ zone: z, a: assessments[z.id] })).sort((x, y) => (y.a?.score ?? 0) - (x.a?.score ?? 0)),
    [state.zones, assessments],
  );

  const circles = useMemo(() => zoneCircles(state, assessments, selectedZoneId), [state, assessments, selectedZoneId]);
  const roads = useMemo(() => reportLayers(state.floodReports), [state.floodReports]);
  const markers = useMemo(
    () => [
      ...(layers.roads ? roads.markers : []),
      ...(layers.shelters ? shelterMarkers(state.shelters) : []),
      ...(layers.teams ? teamMarkers(state.teams) : []),
      ...(layers.sos ? sosMarkers(state.sos.filter((s) => s.status !== "resolved")) : []),
    ],
    [layers, roads.markers, state.shelters, state.teams, state.sos],
  );

  function selectZone(id: string, fly = true) {
    setSelectedZoneId(id);
    setServerResult(null);
    const z = state.zones.find((x) => x.id === id);
    if (z && fly) setFocus({ lat: z.lat, lng: z.lng, zoom: 13, key: Date.now() });
  }

  async function runServerAssessment() {
    const input = buildRiskInput(state, zone.id);
    if (!input) return;
    setServerBusy(true);
    try {
      const res = await fetch("/api/risk/assess", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Request failed");
      setServerResult(`Server (${body.assessment.modelId} v${body.assessment.modelVersion}) returned ${body.assessment.score}/100 · ${body.assessment.category}`);
    } catch (err) {
      toast.fromError(err, "Server-side assessment failed");
    } finally {
      setServerBusy(false);
    }
  }

  const rain = latestRainfall(state, zone.id);

  return (
    <div className="space-y-4">
      <SectionTitle
        title="AI Risk Heatmap"
        subtitle="Flood-risk score (0–100) for each Chennai locality with a plain-language explanation."
        action={
          <>
            <SimulatedTag label="Simulated inputs" />
            <Badge tone="navy">
              <BrainCircuit className="size-3" /> {model.name} v{model.version}
            </Badge>
          </>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>Prototype risk assessment engine.</strong> Scores come from transparent weighted rules applied to simulated rainfall,
          citizen reports and SOS incidents — not a trained or scientifically validated forecasting model. The engine is built
          behind a model interface so a trained ML model can replace it later.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="overflow-hidden">
          <div className="relative h-[460px] sm:h-[600px]">
            <MapView
              circles={circles}
              lines={layers.roads ? roads.lines : []}
              markers={markers}
              focus={focus}
              onSelect={(kind, id) => kind === "zone" && selectZone(id, false)}
              className="h-full"
              ariaLabel="Flood risk heatmap of Chennai"
            />
            <div className="absolute left-3 top-3 z-[400] w-44 rounded-lg border border-slate-200 bg-white/95 p-2.5 shadow-md backdrop-blur sm:left-14">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <Layers className="size-3.5" /> Layers
              </p>
              {(
                [
                  ["sos", "Active SOS"],
                  ["roads", "Flooded roads"],
                  ["shelters", "Relief shelters"],
                  ["teams", "Rescue teams"],
                ] as [LayerKey, string][]
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 py-0.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    className="accent-teal-600"
                    checked={layers[key]}
                    onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="absolute bottom-6 left-3 z-[400] hidden gap-2 sm:flex">
              <MapLegend items={RISK_LEGEND} title="Risk zones" />
              <MapLegend items={MARKER_LEGEND} title="Markers" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500 sm:hidden">
            {RISK_LEGEND.map((l) => (
              <span key={l.key} className="flex items-center gap-1.5">
                {l.swatch} {l.label}
              </span>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Selected locality" subtitle="Click a zone on the map or in the ranking below" />
            <div className="p-4">
              {assessment ? <RiskBreakdown assessment={assessment} zone={zone} /> : <p className="text-sm text-slate-500">No data.</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={runServerAssessment} loading={serverBusy}>
                  <Server className="size-3.5" /> Re-run on server API
                </Button>
                {serverResult && <span className="text-[11px] font-medium text-teal-700">{serverResult}</span>}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          {canSimulate && <ScenarioPanel key={selectedZoneId} selectedZoneId={selectedZoneId} onApplied={(id) => selectZone(id)} />}
          <Card>
            <CardHeader
              title={`Rainfall trend — ${zone.name} and neighbours`}
              subtitle={rain ? `Latest: ${rain.rainfall24hMm} mm in 24 h (${imdRainfallClass(rain.rainfall24hMm)}), ${rain.intensityMmHr} mm/hr` : "No readings"}
              action={<SimulatedTag />}
            />
            <div className="p-3">
              <RainfallTrendChart
                state={state}
                zoneIds={[zone.id, ...ranking.filter((r) => r.zone.id !== zone.id).slice(0, 2).map((r) => r.zone.id)]}
              />
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Locality ranking" subtitle="Highest risk first" />
          <ul className="divide-y divide-slate-100">
            {ranking.map(({ zone: z, a }) => {
              const r = latestRainfall(state, z.id);
              return (
                <li key={z.id}>
                  <button
                    type="button"
                    onClick={() => selectZone(z.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50",
                      z.id === selectedZoneId && "bg-teal-50/60",
                    )}
                  >
                    <span className="w-8 text-right text-lg font-bold text-navy-950 tabular">{a?.score ?? "–"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{z.name}</span>
                      <span className="block text-[11px] text-slate-500">
                        {r ? `${r.rainfall24hMm} mm / 24 h · ${r.intensityMmHr} mm/hr` : "No readings"}
                      </span>
                    </span>
                    {a && <RiskBadge category={a.category} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
