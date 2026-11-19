"use client";

import { CloudLightning, CloudRain, RotateCcw, SlidersHorizontal, Sun } from "lucide-react";
import { useState } from "react";
import { SimulatedTag } from "@/components/ui/badges";
import { Field, Select } from "@/components/ui/form";
import { Button, Card, CardHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { RISK_LABELS } from "@/lib/constants";
import { useReadyData } from "@/lib/data/AppDataProvider";
import { latestRainfall } from "@/lib/data/selectors";
import { SCENARIOS, type ScenarioId } from "@/lib/data/seed";
import { assessAllZones, imdRainfallClass } from "@/lib/risk";
import type { AppState } from "@/lib/types";

/** Runs a rainfall simulation and reports how risk changed. */
export function useRunScenario() {
  const { backend } = useReadyData();
  const toast = useToast();
  return async (readings: Record<string, [number, number]>, label: string, focusZoneId?: string) => {
    const before = backend.getSnapshot().state;
    const beforeScores = before ? assessAllZones(before) : {};
    try {
      await backend.recordRainfall(
        Object.entries(readings).map(([zoneId, [rainfall24hMm, intensityMmHr]]) => ({ zoneId, rainfall24hMm, intensityMmHr })),
        label,
      );
      const after = backend.getSnapshot().state as AppState;
      const afterScores = assessAllZones(after);
      const zoneId = focusZoneId ?? Object.keys(readings)[0];
      const z = after.zones.find((x) => x.id === zoneId);
      const b = beforeScores[zoneId];
      const a = afterScores[zoneId];
      if (z && a) {
        toast.success(
          `${label} applied`,
          `${z.name} risk ${b ? `${b.score} → ` : ""}${a.score} (${RISK_LABELS[a.category]})`,
        );
      }
      return true;
    } catch (err) {
      toast.fromError(err, "Simulation failed");
      return false;
    }
  };
}

const PRESET_ICONS: Record<ScenarioId, typeof CloudRain> = {
  velacheryHeavyRain: CloudRain,
  citywideCyclone: CloudLightning,
  rainSubsides: Sun,
};

export function ScenarioPanel({ selectedZoneId, onApplied }: { selectedZoneId: string; onApplied?: (zoneId: string) => void }) {
  const { state } = useReadyData();
  const run = useRunScenario();
  const [busy, setBusy] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState(selectedZoneId);
  const current = latestRainfall(state, zoneId);
  const [rain, setRain] = useState<number | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const rainValue = rain ?? current?.rainfall24hMm ?? 0;
  const intensityValue = intensity ?? current?.intensityMmHr ?? 0;

  async function preset(id: ScenarioId) {
    setBusy(id);
    const s = SCENARIOS[id];
    const focus = id === "velacheryHeavyRain" ? "velachery" : selectedZoneId;
    const ok = await run(s.readings, s.title, focus);
    setBusy(null);
    if (ok) onApplied?.(focus);
  }

  async function applyCustom() {
    setBusy("custom");
    const z = state.zones.find((x) => x.id === zoneId);
    const ok = await run({ [zoneId]: [rainValue, intensityValue] }, `Custom rainfall for ${z?.name ?? zoneId}`, zoneId);
    setBusy(null);
    if (ok) {
      setRain(null);
      setIntensity(null);
      onApplied?.(zoneId);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Scenario simulator"
        subtitle="Feed simulated rainfall into the risk engine — every module updates instantly."
        icon={<SlidersHorizontal className="size-4" />}
        action={<SimulatedTag label="Simulation" />}
      />
      <div className="space-y-4 p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => {
            const s = SCENARIOS[id];
            const Icon = PRESET_ICONS[id];
            const primary = id === "velacheryHeavyRain";
            return (
              <button
                key={id}
                type="button"
                disabled={!!busy}
                onClick={() => preset(id)}
                className={
                  primary
                    ? "rounded-xl border-2 border-red-200 bg-red-50 p-3 text-left transition-colors hover:border-red-400 disabled:opacity-60"
                    : "rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-navy-300 disabled:opacity-60"
                }
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-navy-950">
                  {id === "rainSubsides" ? <RotateCcw className="size-4 text-teal-700" /> : <Icon className={primary ? "size-4 text-red-600" : "size-4 text-navy-600"} />}
                  {busy === id ? "Applying…" : s.title}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-slate-500">{s.description}</span>
                {primary && <span className="mt-1.5 inline-block rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Demo step 1</span>}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Custom reading</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Locality" htmlFor="sim-zone">
              <Select
                id="sim-zone"
                value={zoneId}
                onChange={(e) => {
                  setZoneId(e.target.value);
                  setRain(null);
                  setIntensity(null);
                }}
              >
                {state.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`Rainfall, 24 h: ${rainValue} mm`} htmlFor="sim-rain" hint={imdRainfallClass(rainValue)}>
              <input
                id="sim-rain"
                type="range"
                min={0}
                max={300}
                step={1}
                value={rainValue}
                onChange={(e) => setRain(Number(e.target.value))}
                className="w-full accent-teal-600"
              />
            </Field>
            <Field label={`Intensity: ${intensityValue} mm/hr`} htmlFor="sim-int" hint="Current hourly rate">
              <input
                id="sim-int"
                type="range"
                min={0}
                max={80}
                step={1}
                value={intensityValue}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full accent-teal-600"
              />
            </Field>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={applyCustom} loading={busy === "custom"} disabled={!!busy && busy !== "custom"}>
              Apply reading
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
